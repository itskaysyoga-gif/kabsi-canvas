// /api/dispatch: the job dispatcher (K-35, R-06, P0.1-12a, P0.1-12b). pg_cron runs private.dispatch_tick() every
// minute; it offers the work and calls this route only when a job is due. Each run claims a few jobs at a time
// (claim_jobs, FOR UPDATE SKIP LOCKED) and runs them side by side until about 40 seconds have passed, so a second run
// started meanwhile takes other jobs, never the same ones. Google calls inside the jobs pass the shared rate limiter
// and circuit breaker (_shared/google/client.ts); a job that meets a paused Google is postponed, not failed.
// Review jobs: sync_reviews reads one business's reviews and offers a draft for each new one; draft_reply drafts one
// review and offers the owner email run; notify_owner sends that business's due emails (the rules in reviews.ts).
// protection_check compares one business's Google profile with its Business Knowledge (protection.ts). The
// whole-system steps the 5 minute cron ran (cron.ts) are one job each, offered every 5 minutes. photo_files, offered
// by the daily retention run, removes
// the uploaded photo files past their K-40 limit (P0.2-01, _shared/retention.ts). process_photo hands one uploaded
// photo to the `photos` function (P0.5-01). detect_tasks runs the task
// detectors for one business every 5 minutes (P0.3-05, _shared/tasks.ts).
// Publications (P0.1-13a and P0.1-13b, _shared/publish.ts): publish sends one approved reply, post, photo, special
// hours period or Google Protection put-back once its undo window has passed; reconcile_publication reads Google for
// one whose outcome is not known yet. Neither ever sends a write twice. These are the only Google writes in Kabsi,
// apart from disconnect (P0.2-02, _shared/disconnect.ts), which removes Kabsi's own Manager entry after the signed-in
// owner asked for it in Settings, and never touches the profile itself.
import { admin, APP_URL, captureError, internalSecret, isInternal, jobLog, json, sha256Hex } from "../_shared/kabsi.ts";
import { notify, notifyDue } from "../_shared/notify.ts";
import { lifecycleJob } from "../_shared/lifecycle-db.ts";
import * as copy from "../_shared/email/copy.ts";
import { type Job, type JobHandler, type JobState, PermanentJobError, runJob } from "../_shared/jobs.ts";
import { activeLocation, draftReview, isSyncable, notifyLocation, syncLocation } from "../_shared/reviews.ts";
import { AiBudgetError } from "../_shared/ai-budget.ts";
import { protectionCheck } from "../_shared/protection.ts";
import {
  addSpecialHours, coachRead, createLocalPost, hasSpecialHours, localPostGone, localPostState, mediaExists, patchListing, protectionShown, removeLocalPost,
  profileIdentity, readGoogleState, readReply, removeKabsiAccess, sendReply, type SpecialDay, uploadPhoto,
} from "../_shared/google/index.ts";
import { googleAction, stateDue, stateSummary } from "../_shared/google/state/merchant.ts";
import { accessChangeEmail, type DisconnectDeps, runDisconnect } from "../_shared/disconnect.ts";
import {
  type CheckClaim, type Claim, type Item, NotSent, type Outcome, type PublishDeps, publishOne, reconcileOne, replySeen, type Seen, type Sent,
} from "../_shared/publish.ts";
import { accessJob, deletionsJob, ratingsJob, renewalsJob, trialsJob, weeklyJob } from "./cron.ts";
import { photoFileStore, removeDuePhotoFiles } from "../_shared/retention.ts";
import { detectTasks } from "../_shared/tasks.ts";
import { type Cadence, careMonth, type Planned } from "../_shared/posts/plan.ts";
import { checkContext, postMaterial } from "../_shared/posts/context.ts";
import { type CoachRefreshDeps, refreshCoach } from "../_shared/coach/refresh.ts";
import { type HolidayAsk, type HolidayAskDeps, sendHolidayAsks } from "../_shared/holiday.ts";
import { sendTeamInvite, type TeamInvite, teamInviteEmail } from "../_shared/team.ts";
import { whatsappPostAlert } from "../_shared/whatsapp/db.ts";
import { useTool } from "../_shared/ai/agents.ts";

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

async function postponeJob(job: Job, worker: string, until: Date, reason: string) {
  const { data, error } = await admin().rpc("postpone_job", {
    p_id: job.id, p_worker: worker, p_until: until.toISOString(), p_reason: reason,
  });
  if (error) throw error;
  return data as JobState | null;
}

// Jobs claimed and run side by side per round. Five keeps one run inside its 40 seconds with 500 businesses (the
// load test, scripts/load/mock-500.ts); Google's own pace is set by the limiter, not by this number.
const BATCH = 5;
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
  // 30.10.1: on the first successful sync the name and address picked from Places at sign-up are replaced with the
  // Business Profile's own. Never fails the sync; the next sync tries again until it has worked once.
  await adoptProfileIdentity(loc.id, loc.google_location_id).catch((e) => captureError("dispatch", e, { job: "profile_identity", location: loc.id }));
  // Draft this business's new reviews now rather than at the next producer run (newest first, as before).
  const { data: fresh, error } = await db.from("reviews").select("id").eq("location_id", loc.id).eq("state", "new")
    .lt("draft_attempts", 3).order("review_created_at", { ascending: false }).limit(10);
  if (error) throw error;
  for (const r of fresh ?? []) await enqueueJob("draft_reply", loc.id, `draft_reply:${r.id}`, { review_id: r.id });
}

async function adoptProfileIdentity(locationId: string, googleLocationId: string | null) {
  if (!googleLocationId) return;
  const db = admin();
  const { data: l, error } = await db.from("locations").select("profile_identity_at").eq("id", locationId).maybeSingle();
  if (error) throw error;
  if (!l || l.profile_identity_at) return;
  const p = await profileIdentity(googleLocationId);
  const next: Record<string, unknown> = { profile_identity_at: new Date().toISOString() };
  if (p.name) next.name = p.name;
  if (p.address) next.address = p.address;
  if (p.country) next.country = p.country;
  const { error: ue } = await db.from("locations").update(next).eq("id", locationId).is("profile_identity_at", null);
  if (ue) throw ue;
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

async function protection(job: Job) {
  const alerts = await protectionCheck(job.location_id!);
  if (alerts) await jobLog("shield", true, { alerts, location: job.location_id });
  // 18.2: the Guard reads Google's state for the profile once a day in this hourly job. Never fails Protection.
  try {
    const { data: g } = await admin().from("google_connections").select("google_state_checked_at").eq("location_id", job.location_id!).maybeSingle();
    if (stateDue(g?.google_state_checked_at ?? null)) await googleStateCheck(job);
  } catch (e) {
    await captureError("dispatch", e, { job: "google_state", location: job.location_id });
  }
}

// 18.2: read VoiceOfMerchantState and hand it to the database, which pauses or resumes publishing, opens or closes the
// owner's task and writes the ops event (record_google_state). Also offered at once by every Pub/Sub notification.
async function googleStateCheck(job: Job) {
  const loc = await activeLocation(job.location_id!);
  if (!loc || !isSyncable(loc) || !loc.google_location_id) return;
  useTool("guard", "read_google_state");
  const state = await readGoogleState(loc.google_location_id);
  const action = googleAction(state);
  const out = await rpcJson<string>("record_google_state", { p_location: loc.id, p_state: stateSummary(state), p_action: action });
  if (out !== "ok" && out !== "still_needs_action") await jobLog("google_state", true, { location: loc.id, action, out });
}

async function rpcJson<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await admin().rpc(fn, args);
  if (error) throw error;
  return data as T;
}

const POST_SEEN: Record<string, Seen> = { live: "shown", in_review: "pending", rejected: "rejected" };
const str = (v: unknown) => (v == null ? "" : String(v));
const hoursOf = (p: Record<string, unknown>): SpecialDay => ({
  startDate: str(p.start_date), endDate: str(p.end_date || p.start_date), closed: p.closed === true,
  openTime: p.open_time ? str(p.open_time) : null, closeTime: p.close_time ? str(p.close_time) : null,
});

// The one write for each kind, with exactly what the owner approved (the publication's payload).
async function send(i: Item): Promise<Sent> {
  const account = i.google_account_id ?? "", location = i.google_location_id, p = i.payload;
  switch (i.target_type) {
    case "review_reply":
      return await sendReply(account, location, i.google_review_id ?? "", i.text ?? "");
    case "local_post": {
      // P0.5-02: the post's one photo goes as a link Google can fetch for one hour, made now, not at approval
      // (Google takes a post's photo only by link).
      let photoUrl: string | null = null;
      if (p.photo_path) {
        const { data, error } = await admin().storage.from("owner-photos").createSignedUrl(str(p.photo_path), 3600);
        if (error || !data) throw new NotSent(`post photo not available: ${error?.message ?? "sign_failed"}`);
        photoUrl = data.signedUrl;
      }
      const opt = (v: unknown) => (v ? str(v) : null);
      const type = str(p.topic_type);
      const r = await createLocalPost(account, location, {
        summary: str(p.summary), languageCode: str(p.language) || "en", ctaType: opt(p.cta_type), ctaUrl: opt(p.cta_url),
        topicType: type === "OFFER" || type === "EVENT" ? type : "STANDARD", title: opt(p.event_title), startDate: opt(p.start_date),
        endDate: opt(p.end_date), startTime: opt(p.start_time), endTime: opt(p.end_time), terms: opt(p.offer_terms),
        couponCode: opt(p.coupon_code), redeemUrl: opt(p.redeem_url), photoUrl,
      });
      return { ref: r.ref, response: r.response, seen: POST_SEEN[r.state] };
    }
    case "local_post_removal": {
      // P0.7-05: the owner approved removing a post Kabsi published; the post's Google name is in the payload. Google
      // no longer having it (404) means it is already gone, which is what was approved.
      const ref = str(p.post_ref);
      if (!ref) throw new NotSent("no Google post to remove");
      const r = await removeLocalPost(location, ref);
      return { ref, response: r.response, seen: r.alreadyGone ? "shown" : undefined };
    }
    case "photo": {
      // The processed JPEG (no metadata, P0.5-01) goes up as bytes; Google never gets a link to Kabsi's storage.
      const { data, error } = await admin().storage.from("owner-photos").download(str(p.storage_path));
      if (error || !data) throw new NotSent(`photo file not available: ${error?.message ?? "download_failed"}`);
      const r = await uploadPhoto(account, location, new Uint8Array(await data.arrayBuffer()), str(p.category) || "ADDITIONAL");
      return { ref: r.ref, response: r.response, seen: r.ref ? "shown" : undefined };
    }
    case "special_hours": {
      const r = await addSpecialHours(location, hoursOf(p));
      return { ref: null, response: r.response };
    }
    case "listing_revert": {
      const r = await patchListing(location, str(p.field), p.raw ?? null, str(p.value));
      return { ref: null, response: r.response };
    }
  }
}

// What Google shows for each kind now.
async function read(i: Item): Promise<Seen> {
  const account = i.google_account_id ?? "", location = i.google_location_id, p = i.payload;
  switch (i.target_type) {
    case "review_reply":
      return replySeen(await readReply(account, location, i.google_review_id ?? ""), i.text ?? "");
    case "local_post": {
      const state = await localPostState(account, location, i.google_ref ?? null, str(p.summary));
      return state ? POST_SEEN[state] : "absent";
    }
    case "local_post_removal": {
      // Removed means the post is no longer in the business's post list; still listed means Google has not applied it.
      const gone = await localPostGone(account, location, str(p.post_ref));
      return gone ? "shown" : "pending";
    }
    case "photo":
      return i.google_ref && (await mediaExists(location, i.google_ref)) ? "shown" : "absent";
    case "special_hours":
      return (await hasSpecialHours(location, hoursOf(p))) ? "shown" : "absent";
    case "listing_revert": {
      // Google may hold an owner's edit for review before it shows: not shown yet is "pending", not a failure. Shown
      // means the approved value is back and Google no longer marks the field as its own update (K-19).
      return (await protectionShown(location, str(p.field), str(p.value))) ? "shown" : "pending";
    }
  }
}

const PUBLISH: PublishDeps = {
  claim: (id) => rpcJson<Claim>("claim_publication", { p_publication: id }),
  claimCheck: (id) => rpcJson<CheckClaim>("claim_publication_check", { p_publication: id }),
  record: (id, o: Outcome) => rpcJson<string>("record_publication", {
    p_publication: id, p_state: o.state, p_reason: o.reason ?? null, p_error: o.error ?? null, p_google_ref: o.googleRef ?? null,
    p_moderation: o.moderation ?? null, p_response: o.response ?? null,
  }),
  send,
  read,
};

const publicationId = (job: Job) => {
  const id = String(job.payload.publication_id ?? "");
  if (!id) throw new PermanentJobError("no publication_id in the job");
  return id;
};

// Disconnect (K-41, P0.2-02): remove Kabsi's Manager entry, record it, and email the owner what changed.
const DISCONNECT: DisconnectDeps = {
  async load(locationId) {
    const db = admin();
    const { data: l, error } = await db.from("locations")
      .select("id, name, google_location_id, concierge, disconnect_requested_at, access_removed_at").eq("id", locationId).maybeSingle();
    if (error) throw error;
    if (!l) return null;
    const { data: f, error: fe } = await db.from("staff_followups").select("due_at")
      .eq("location_id", locationId).eq("kind", "google_access_removal").is("done_at", null).maybeSingle();
    if (fe) throw fe;
    return {
      locationId, name: l.name, googleLocationId: l.google_location_id, concierge: l.concierge,
      requestedAt: l.disconnect_requested_at, removedAt: l.access_removed_at, followupDueAt: f?.due_at ?? null,
    };
  },
  remove: (googleLocationId) => removeKabsiAccess(googleLocationId),
  async record(locationId, ok, error) {
    const r = await rpcJson<{ removed_at: string | null; due_at: string | null }>("record_disconnect_result", {
      p_location: locationId, p_ok: ok, p_error: error,
    });
    return { removedAt: r.removed_at, dueAt: r.due_at };
  },
  async notify(locationId, notice, dedupe) {
    const m = accessChangeEmail(notice, APP_URL);
    await notify({
      category: "access", kind: "access_change", key: dedupe, locationId, to: "owners",
      inApp: { title: m.title, link: "/app/settings" },
      content: m,
    });
  },
};

async function disconnectJob(job: Job) {
  const outcome = await runDisconnect(job.location_id!, DISCONNECT);
  await jobLog("disconnect", true, { location: job.location_id, outcome });
}

// A whole-system step, logged under the name the cron used when it did something (staff job health lists these).
const step = (name: string, run: () => Promise<Record<string, unknown>>): JobHandler => async () => {
  const started = Date.now();
  const detail = await run();
  if (Object.values(detail).some((v) => typeof v === "number" && v > 0)) await jobLog(name, true, { ...detail, ms: Date.now() - started });
};

// The holiday questions: which ones to email, the link's hash, and the email itself (P0.5-03, _shared/holiday.ts).
const HOLIDAY_ASKS: HolidayAskDeps = {
  toSend: (locationId) => rpcJson<HolidayAsk[]>("holiday_prompts_to_send", { p_location: locationId }),
  async markSent(promptId, tokenHash, expires) {
    await rpcJson("mark_holiday_prompt_sent", { p_prompt: promptId, p_token_hash: tokenHash, p_expires: expires.toISOString() });
  },
  notify,
  sha256: sha256Hex,
  random: () => crypto.getRandomValues(new Uint8Array(32)),
  now: () => new Date(),
  appUrl: APP_URL,
};

// The Profile Coach's weekly read of the profile (P0.8-09, _shared/coach/refresh.ts): the database says when it is due.
const COACH_READ: CoachRefreshDeps = {
  due: async (locationId) => (await rpcJson<boolean>("coach_read_due", { p_location: locationId })) === true,
  read: coachRead,
  async save(locationId, n) {
    await rpcJson("coach_profile_put", {
      p_location: locationId, p_description_length: n.descriptionLength, p_additional_categories: n.additionalCategories,
      p_attributes: n.attributes, p_source: n.source,
    });
  },
};

// The posts care routine's database side. No model writes a post until the AI credit is on (K-146, R-43), so
// `write` is left out and the routine asks the owner its one question instead.
async function carePosts(locationId: string) {
  const db = admin();
  const { data: l, error } = await db.from("locations").select("id, time_zone, posts_per_month, post_slot, category, status, concierge, auto_posts")
    .eq("id", locationId).maybeSingle();
  if (error) throw error;
  if (!l || l.status !== "active" || l.concierge || !l.auto_posts) return;
  const tz = l.time_zone || "UTC";
  const local = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(d).replace(" ", "T");
  const nowLocal = local(new Date());
  const [y, m] = nowLocal.slice(0, 7).split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const slot = l.post_slot === "pro" ? "pro" : "retail";
  const results = [];
  for (const month of [nowLocal.slice(0, 7), next]) {
    results.push(await careMonth(month, (l.posts_per_month ?? 4) as Cadence, slot, nowLocal, {
      planned: async (mo) => ((await rpcJson<{ publish_local: string; state: string; summary: string }[]>("post_month_plan", { p_location: locationId, p_month: mo })) ?? [])
        .map((x): Planned => ({ publishLocal: x.publish_local, state: x.state, summary: x.summary })),
      material: () => postMaterial(db, locationId),
      context: () => checkContext(db, locationId),
      prepare: async (p) => {
        const id = await rpcJson<string>("post_prepare", { p_location: locationId, p_publish_local: p.publishLocal, p_summary: p.summary, p_photo: p.photoId, p_checks: [] });
        // P0.8-03 (K-129): the prepared post on WhatsApp too, with Approve and the 10 second undo. Never fails the routine.
        if (id) await whatsappPostAlert(locationId, id, p.summary).catch((e) => captureError("whatsapp", e, { step: "post_alert" }));
        return id;
      },
      ask: async (mo, q) => void await rpcJson("post_question", { p_location: locationId, p_month: mo, p_question: q }),
    }));
  }
  if (results.some((r) => r.prepared || r.asked)) await jobLog("care_posts", true, { location: locationId, results });
}

const HANDLERS: Record<string, JobHandler> = {
  sync_reviews: syncReviews,
  draft_reply: draftReplyJob,
  notify_owner: notifyOwner,
  protection_check: protection,
  google_state_check: googleStateCheck,
  publish: async (job) => void await publishOne(publicationId(job), PUBLISH),
  reconcile_publication: async (job) => void await reconcileOne(publicationId(job), PUBLISH),
  access_check: step("access", accessJob),
  ratings_snapshot: step("ratings", ratingsJob),
  weekly_reports: step("weekly", weeklyJob),
  deletions: step("deletions", deletionsJob),
  trial_reminders: step("trials", trialsJob),
  renewal_reminders: step("renewals", renewalsJob),
  photo_files: step("photo_files", () => removeDuePhotoFiles(photoFileStore(admin()))),
  // P0.5-02: the posts care routine for one business, this month and the next (_shared/posts/plan.ts). It prepares
  // only from something true and asks one question otherwise; it never publishes.
  care_posts: async (job) => void await carePosts(job.location_id!),
  // P0.5-01: one uploaded photo, processed by the `photos` function (its own call, so a large photo has that
  // function's time to itself and never holds up the other jobs here).
  process_photo: async (job) => {
    const photoId = String(job.payload.photo_id ?? "");
    if (!photoId) throw new PermanentJobError("process_photo needs a photo");
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/photos`, {
      method: "POST",
      headers: {
        "content-type": "application/json", "x-cron-secret": (await internalSecret()) ?? "",
        authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") ?? ""}`,
      },
      body: JSON.stringify({ do: "process", photo_id: photoId }),
    });
    if (!res.ok) throw new Error(`photos ${res.status}: ${(await res.text()).slice(0, 200)}`);
  },
  disconnect: disconnectJob,
  // P0.3-05: the task detectors for one business (K-08); they also run at once in the database when a source changes.
  // P0.3-06: the invitation email for one team invite (Settings, Team); sent only while the invite is open.
  team_invite_email: async (job) => {
    const inviteId = String(job.payload.invite_id ?? "");
    if (!inviteId) throw new PermanentJobError("team_invite_email needs an invite");
    await sendTeamInvite(inviteId, {
      read: (id) => rpcJson<TeamInvite | null>("team_invite_for_email", { p_invite: id }),
      async send(i) {
        const m = teamInviteEmail(i, APP_URL);
        // Sent because the owner just invited this person: no choices and no quiet hours (category direct).
        await notify({
          category: "direct", kind: "team_invite", key: `team_invite:${inviteId}`, locationId: job.location_id ?? null, to: [{ email: i.email, userId: null }],
          content: m,
        });
      },
    });
  },
  // P0.4-03: "Send these steps to my other device": one email to the signed-in person's own address, with a link back to
  // the step. The address is read from the database for that person and that business, never taken from the request.
  manager_steps_email: async (job) => {
    const userId = String(job.payload.user_id ?? "");
    if (!userId || !job.location_id) throw new PermanentJobError("manager_steps_email needs a person and a business");
    const t = await rpcJson<{ name: string; email: string } | null>("manager_steps_target", { p_location: job.location_id, p_user: userId });
    if (!t) return;
    await notify({
      category: "direct", kind: "manager_steps", key: `manager_steps:${job.id}`, locationId: job.location_id, to: [{ email: t.email, userId }],
      content: copy.managerSteps(t.name, APP_URL, Number(job.payload.step ?? 1)),
    });
  },
  // P0.4-09: held and digested emails come due (K-46). Offered every 5 minutes once app_settings.notify_due is 'on'.
  // P0.4-10: the lifecycle emails ride on the same 5 minute clock (they are sent through the same outbox); off until
  // app_settings.lifecycle_emails is 'on'. A failure there never stops held and digested mail from going out.
  notify_due: step("notify_due", async () => {
    const released = await notifyDue();
    const life = await lifecycleJob().catch(async (e) => { await captureError("dispatch", e, { job: "lifecycle" }); return null; });
    return { ...released, ...(life ? { life_checked: life.checked, life_due: life.due, life_sent: life.sent, life_failed: life.failed } : {}) };
  }),
  detect_tasks: async (job) => {
    const made = await detectTasks(job.location_id, (id) => rpcJson<Record<string, number> | null>("run_task_detectors", { p_location: id }));
    if (Object.values(made).some((n) => n > 0)) await jobLog("detect_tasks", true, { location: job.location_id, ...made });
    // P0.5-03: the holiday questions the detector just opened are emailed. A failure here never fails the detectors.
    if (job.location_id) {
      try {
        const sent = await sendHolidayAsks(job.location_id, HOLIDAY_ASKS);
        if (sent > 0) await jobLog("holiday_asks", true, { location: job.location_id, sent });
      } catch (e) {
        await captureError("dispatch", e, { job: "holiday_asks", location: job.location_id });
      }
      // P0.8-09: the Coach reads the profile once a week; when it did, the gaps are looked at again. Never fails the detectors.
      try {
        if ((await refreshCoach(job.location_id, COACH_READ)) === "read") {
          await detectTasks(job.location_id, (id) => rpcJson<Record<string, number> | null>("run_task_detectors", { p_location: id }));
          await jobLog("coach_read", true, { location: job.location_id });
        }
      } catch (e) {
        await captureError("dispatch", e, { job: "coach_read", location: job.location_id });
      }
    }
  },
};

export async function dispatch(req: Request): Promise<Response> {
  if (!(await isInternal(req))) return json({ error: "forbidden" }, 403);
  const worker = `dispatch-${crypto.randomUUID().slice(0, 8)}`;
  const started = Date.now();
  const counts: Record<string, number> = {};
  const deps = {
    finish: (j: Job, ok: boolean, error?: string, retry?: boolean) => finishJob(j, worker, ok, error, retry),
    postpone: (j: Job, until: Date, reason: string) => postponeJob(j, worker, until, reason),
    report: (j: Job, e: unknown) => captureError("dispatch", e, { job: j.kind, id: j.id, location: j.location_id }),
  };
  try {
    while (Date.now() - started < RUN_MS) {
      const jobs = await claimJobs(BATCH, worker);
      if (!jobs.length) break;
      // Different businesses or different steps: safe side by side (the dedupe key keeps one job per piece of work).
      const states = await Promise.all(jobs.map((job) => runJob(job, HANDLERS, deps)));
      jobs.forEach((job, i) => {
        const key = `${job.kind}:${states[i] ?? "handed_on"}`;
        counts[key] = (counts[key] ?? 0) + 1;
      });
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
  await notify({
    category: "access", kind: "access_lost", key: `access_lost:${locationId}:${day}`, locationId, to: "owners",
    inApp: { title: `Kabsi can't reach ${name} on Google`, body: "Invite the Kabsi group again to continue.", link: "/app/settings" },
    content: copy.accessLost(name, APP_URL),
  }).catch((e) => captureError("dispatch", e, { job: "access_lost", location: locationId }));
}
