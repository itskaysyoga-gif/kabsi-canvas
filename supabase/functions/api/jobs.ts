// /api/dispatch: the job dispatcher (K-35, R-06, P0.1-12a). pg_cron runs private.dispatch_tick() every minute; it
// offers the work (review syncs spread through the hour, drafts, owner emails) and calls this route only when a job
// is due. Each run claims a few jobs at a time (claim_jobs, FOR UPDATE SKIP LOCKED) until about 40 seconds have
// passed, so a second run started meanwhile takes other jobs, never the same ones.
// Review jobs: sync_reviews reads one business's reviews and offers a draft for each new one; draft_reply drafts one
// review and offers the owner email run; notify_owner sends that business's due emails (the rules in reviews.ts).
import { admin, APP_URL, captureError, emailLayout, esc, isInternal, jobLog, json, ownerEmails, sendEmail } from "../_shared/kabsi.ts";
import { type Job, type JobHandler, type JobState, PermanentJobError, runJob } from "../_shared/jobs.ts";
import { activeLocation, draftReview, isSyncable, notifyLocation, syncLocation } from "../_shared/reviews.ts";
import { AiBudgetError } from "../_shared/ai-budget.ts";

// Offer a job. Returns its id, or null when the same dedupe key is already pending, running or retrying.
async function enqueueJob(kind: string, locationId: string | null, dedupeKey: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await admin().rpc("enqueue_job", {
    p_kind: kind, p_location: locationId, p_dedupe_key: dedupeKey, p_payload: payload,
  });
  if (error) throw error;
  return data as number | null;
}

async function claimJobs(n: number, worker: string): Promise<Job[]> {
  const { data, error } = await admin().rpc("claim_jobs", { p_n: n, p_worker: worker });
  if (error) throw error;
  return (data ?? []) as Job[];
}

async function finishJob(job: Job, worker: string, ok: boolean, error?: string, retry = true) {
  const { data, error: err } = await admin().rpc("finish_job", {
    p_id: job.id, p_worker: worker, p_ok: ok, p_error: error ?? null, p_retry: retry,
  });
  if (err) throw err;
  return data as JobState | null;
}

const BATCH = 3;
const RUN_MS = 40_000;

// Google answering 403/404 for one business means Kabsi's Manager access was removed (or the listing is gone).
// After 30 minutes of that, access is marked lost (migration 017) and the owner is told how to fix it. That is
// handled here, not retried: the next sync 5 minutes later is the retry.
const ACCESS_GRACE_MS = 30 * 60_000;
const accessRefused = (e: unknown) => /^Error: google (403|404) /.test(String(e));

async function recordSync(locationId: string, ok: boolean, error?: string) {
  const { error: err } = await admin().rpc("record_sync_result", { p_location: locationId, p_ok: ok, p_error: error ?? null });
  if (err) throw err;
}

async function syncReviews(job: Job) {
  const db = admin();
  const loc = await activeLocation(job.location_id!);
  if (!loc || !isSyncable(loc)) return; // paused, removed or concierge since the job was offered
  try {
    await syncLocation(loc);
  } catch (e) {
    await recordSync(loc.id, false, String(e));
    if (!accessRefused(e)) throw e;
    if (!loc.access_error_since) {
      await db.from("locations").update({ access_error_since: new Date().toISOString() }).eq("id", loc.id);
      await captureError("dispatch", e, { job: "sync_reviews", location: loc.id, note: "Google refused access; lost after 30 min" });
    } else if (Date.now() - Date.parse(loc.access_error_since) > ACCESS_GRACE_MS) {
      await db.rpc("mark_access_lost", { p_location: loc.id });
      await emailAccessLost(loc.id, loc.name);
    }
    return;
  }
  if (loc.access_error_since) await db.from("locations").update({ access_error_since: null }).eq("id", loc.id);
  await recordSync(loc.id, true);
  // Draft this business's new reviews now rather than at the next producer run (newest first, as before).
  const { data: fresh, error } = await db.from("reviews").select("id").eq("location_id", loc.id).eq("state", "new")
    .lt("draft_attempts", 3).order("review_created_at", { ascending: false }).limit(10);
  if (error) throw error;
  for (const r of fresh ?? []) await enqueueJob("draft_reply", loc.id, `draft_reply:${r.id}`, { review_id: r.id });
}

async function draftReplyJob(job: Job) {
  const db = admin();
  const reviewId = String(job.payload.review_id ?? "");
  const { data: rv, error } = await db.from("reviews").select("id, state, draft_attempts, location_id, locations(status)")
    .eq("id", reviewId).maybeSingle();
  if (error) throw error;
  const status = (rv?.locations as unknown as { status: string } | null)?.status;
  if (!rv || rv.state !== "new" || status !== "active") return; // drafted, answered or paused since it was offered
  if (rv.draft_attempts >= 3) throw new PermanentJobError("draft_attempts_exhausted: the review stays in the owner's inbox");
  try {
    await draftReview(rv.id);
  } catch (e) {
    // The daily AI budget is used up: no attempt is counted and the producer offers the review again later.
    if (e instanceof AiBudgetError) return;
    // After 3 failed drafts the review stays 'new' and shows in the inbox for the owner to write.
    await db.from("reviews").update({ draft_attempts: rv.draft_attempts + 1 }).eq("id", rv.id);
    throw e;
  }
  await enqueueJob("notify_owner", rv.location_id, `notify_owner:${rv.location_id}`);
}

async function notifyOwner(job: Job) {
  const loc = await activeLocation(job.location_id!);
  if (loc) await notifyLocation(loc);
}

const HANDLERS: Record<string, JobHandler> = {
  sync_reviews: syncReviews,
  draft_reply: draftReplyJob,
  notify_owner: notifyOwner,
};

export async function dispatch(req: Request): Promise<Response> {
  if (!(await isInternal(req))) return json({ error: "forbidden" }, 403);
  const worker = `dispatch-${crypto.randomUUID().slice(0, 8)}`;
  const started = Date.now();
  const counts: Record<string, number> = {};
  const deps = {
    finish: (j: Job, ok: boolean, error?: string, retry?: boolean) => finishJob(j, worker, ok, error, retry),
    report: (j: Job, e: unknown) => captureError("dispatch", e, { job: j.kind, id: j.id, location: j.location_id }),
  };
  try {
    while (Date.now() - started < RUN_MS) {
      const jobs = await claimJobs(BATCH, worker);
      if (!jobs.length) break;
      for (const job of jobs) {
        const key = `${job.kind}:${(await runJob(job, HANDLERS, deps)) ?? "handed_on"}`;
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }
  } catch (e) {
    await captureError("dispatch", e, { worker });
    await jobLog("dispatch", false, { error: String(e).slice(0, 500), ...counts });
    return json({ error: "dispatch_failed" }, 500);
  }
  // A job that stopped (dead or failed) raises its own alert from finish_job, so this line is a record, not an alert.
  if (Object.keys(counts).length) await jobLog("dispatch", true, { ...counts, ms: Date.now() - started });
  return json({ ok: true, counts });
}

async function emailAccessLost(locationId: string, name: string) {
  const day = new Date().toISOString().slice(0, 10);
  for (const to of await ownerEmails(locationId)) {
    await sendEmail({
      kind: "access_lost", to, locationId, dedupeKey: `access_lost:${locationId}:${day}:${to}`,
      subject: `Kabsi can't reach ${name} on Google`,
      html: emailLayout({
        preheader: "Invite the Kabsi group again to continue.", title: "Kabsi lost access to your Google profile",
        bodyHtml: `<p style="margin:0 0 16px 0;">Google stopped letting Kabsi read <strong>${esc(name)}</strong>'s reviews. This usually means the Kabsi group was removed from the profile's managers.</p>
<p style="margin:0 0 16px 0;">To continue: on your Business Profile open <strong>Menu</strong>, then <strong>Business Profile settings</strong>, then <strong>People and access</strong>, and invite the <strong>Kabsi group ID 5481006796</strong> as a <strong>Manager</strong>. Kabsi reconnects on its own within a few minutes.</p>
<p style="margin:0 0 20px 0;">Until then no replies are drafted and nothing is posted. If you removed Kabsi on purpose, you don't need to do anything.</p>`,
        button: { label: "Open Kabsi", url: `${APP_URL}/app` },
      }),
      text: `Google stopped letting Kabsi read ${name}'s reviews, usually because the Kabsi group was removed as a Manager.\n\nTo continue, invite the Kabsi group ID 5481006796 as a Manager again under People and access on your Business Profile. Kabsi reconnects within a few minutes.\n\nOpen Kabsi: ${APP_URL}/app`,
    }).catch((e) => captureError("dispatch", e, { job: "access_lost", location: locationId }));
  }
}
