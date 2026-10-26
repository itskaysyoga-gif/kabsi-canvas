// The whole-system steps: access, ratings, weekly reports, deletions, trial and renewal reminders.
// Each decides what is due by looking at data, never at the clock alone, and is safe to run twice.
// Since P0.1-12b each runs as its own job from the dispatcher (api/jobs.ts), offered every 5 minutes; Protection is
// one job per business (protection.ts). /api/cron-tick still runs them all in one go for the weekly_now test hook and
// until the migration that unschedules kabsi_cron_tick (20261004200100_cron_to_jobs.sql) is applied.
import { admin, APP_URL, captureError, isInternal, jobLog, json } from "../_shared/kabsi.ts";
import { notify } from "../_shared/notify.ts";
import * as copy from "../_shared/email/copy.ts";
import { dueRenewalEmail, localDateHour, PLAN_LABEL, type RenewalStage } from "../_shared/plans.ts";
import { acceptInvitationsAndListLocations, googleMode } from "../_shared/google/index.ts";
import { CONCIERGE_COPY } from "../_shared/concierge.ts";
import { accessChangeEmail } from "../_shared/disconnect.ts";
import { liveAccessWhatsapp } from "../_shared/access-notice.ts";
import { snapshotRatings, weeklyReports } from "../_shared/report.ts";
import { shieldCheck } from "../_shared/protection.ts";

// Early access (D267): staff accepted the invitation by hand and stamped access, so tell the owner. The dedupe key
// is the same as the normal "access granted" email, so nobody gets both.
async function conciergeAccessEmails() {
  const db = admin();
  const { data } = await db.from("locations").select("id, name").eq("concierge", true)
    .gt("access_granted_at", new Date(Date.now() - 2 * 86_400_000).toISOString());
  let n = 0;
  for (const l of data ?? []) {
    const r = await sendAccessNotice(l.id, l.name, `${CONCIERGE_COPY.banner} When a new review arrives you'll get an email with a reply ready. You approve every word.`);
    if (r) n += r.sent;
  }
  return n;
}

// The access-change notice (K-113.1, P0.2-02): sent in the same run that accepts the Manager invitation, saying what
// changed and how to remove Kabsi. Same kind and dedupe key as before, so nobody who already had it gets it again.
// 30.10 point 5: the same notice on WhatsApp to the owners who connected it (never fails the email or the job).
async function sendAccessNotice(locationId: string, name: string, nextStep: string) {
  const m = accessChangeEmail({ change: "granted", name, at: new Date().toISOString(), nextStep }, APP_URL);
  const sent = await notify({
    category: "access", kind: "access_granted", key: `access_granted:${locationId}`, locationId, to: "owners",
    inApp: { title: "Kabsi is now a Manager of your Google profile", link: "/app/settings" },
    content: m,
  }).catch((e) => { captureError("cron-tick", e, { job: "access", location: locationId }); return null; });
  await liveAccessWhatsapp(locationId, { change: "granted", business: name }, `access_granted:${locationId}`)
    .catch((e) => captureError("cron-tick", e, { job: "access_whatsapp", location: locationId }));
  return sent;
}

// Job: Google access. Owner invited the Kabsi business group as Manager → mark access granted, refresh status, email the owner.
export async function accessJob() {
  const db = admin();
  const { data: pending } = await db.from("locations")
    .select("id, name, address, place_id, consent_at")
    .eq("status", "access_pending").is("access_granted_at", null).eq("concierge", false);
  const told = await conciergeAccessEmails();
  if (!pending?.length) return { pending: 0, granted: 0, concierge_told: told };

  let matches: { id: string; accountId: string; locationId: string }[] = [];
  let accepted = 0;
  if (googleMode() === "mock") {
    // Mock: pretend the invite arrived two minutes after consent, but only for Kabsi staff and test
    // accounts. Real customers wait for real Google access (D235): no fake "connected" emails.
    const cutoff = Date.now() - 2 * 60_000;
    const { data: staff } = await db.from("staff").select("user_id");
    const staffIds = new Set((staff ?? []).map((s) => s.user_id));
    for (const l of pending.filter((l) => l.consent_at && Date.parse(l.consent_at) < cutoff)) {
      const { data: members } = await db.rpc("location_member_recipients", { p_location: l.id });
      const testOwner = ((members ?? []) as { user_id: string; email: string }[]).some((m) => staffIds.has(m.user_id) || m.email.endsWith("@test.local"));
      if (testOwner) matches.push({ id: l.id, accountId: "accounts/mock", locationId: `locations/mock-${l.id.slice(0, 8)}` });
    }
  } else {
    const result = await acceptInvitationsAndListLocations(pending.filter((l) => l.consent_at).map((l) => ({ name: l.name, address: l.address, placeId: l.place_id })));
    accepted = result.accepted;
    if (result.skipped.length) await captureError("cron-tick", new Error("Google invitations left pending (D270)"), { job: "access", skipped: result.skipped.slice(0, 10) });
    const byPlace = new Map(result.locations.filter((l) => l.placeId).map((l) => [l.placeId!, l]));
    matches = pending.flatMap((l) => {
      const m = l.place_id ? byPlace.get(l.place_id) : undefined;
      return m ? [{ id: l.id, accountId: m.accountId, locationId: m.locationId }] : [];
    });
  }

  let granted = 0;
  for (const m of matches) {
    const { data: updated } = await db.from("locations")
      .update({ access_granted_at: new Date().toISOString(), google_account_id: m.accountId, google_location_id: m.locationId })
      .eq("id", m.id).is("access_granted_at", null).select("id, name").maybeSingle();
    if (!updated) continue;
    granted++;
    // K-94: Google lets only a verified profile add a Manager, so a location that reached Kabsi's group is verified.
    // P0.4-04 reads Google's VoiceOfMerchantState for the other scenarios. The trial starts only on a verified profile.
    await db.from("google_connections").update({ voice_of_merchant: true }).eq("location_id", m.id);
    const { data: status } = await db.rpc("refresh_location_status", { p_location: m.id });
    // A free trial starts with working access (K-101, P0.4-06): say when it ends, in the business's own time zone.
    const [{ data: ent }, { data: loc }] = await Promise.all([
      db.rpc("entitlements", { p_org: null, p_location: m.id }),
      db.from("locations").select("time_zone").eq("id", m.id).maybeSingle(),
    ]);
    const trialEnds = (ent as { state?: string; trial?: { ends_at?: string } | null } | null)?.state === "trial"
      ? (ent as { trial?: { ends_at?: string } | null }).trial?.ends_at ?? null : null;
    const trialLine = trialEnds ? ` Your free trial runs until ${formatDay(localDateHour(new Date(Date.parse(trialEnds) - 1000), (loc as { time_zone: string | null } | null)?.time_zone ?? "UTC").date)}.` : "";
    const next = status === "active"
      ? `Kabsi is now watching your reviews. When the next one arrives you'll get an email with a reply ready.${trialLine}`
      : "One step left: your plan. As soon as it's confirmed, Kabsi starts drafting replies to your reviews.";
    await sendAccessNotice(m.id, updated.name, next);
  }
  // Access 1: an accepted invitation that matched no business by place ID leaves Kabsi as Manager of a listing
  // nobody here consented for. Staff remove it by hand (docs/LATER.md), so say so loudly.
  if (accepted > granted) await captureError("cron-tick", new Error("Accepted Google invitation matched no business (Access 1)"), { job: "access", accepted, granted });
  return { mode: googleMode(), pending: pending.length, accepted, granted };
}

async function reportLocations() {
  const { data, error } = await admin().from("locations").select("id, name, place_id, time_zone, emails_paused_until, google_location_id, google_account_id").eq("status", "active");
  if (error) throw error;
  return data ?? [];
}

// Job: one public-rating snapshot per location per day (feeds the weekly change).
export async function ratingsJob() {
  return { snapshots: await snapshotRatings(await reportLocations()) };
}

// Job: Google Protection (D218): detect listing changes and alert the owner.
async function shieldJob() {
  return { alerts: await shieldCheck() };
}

// Job: weekly report, Monday from 08:00 local (D222, K-28).
export async function weeklyJob() {
  return { reports: await weeklyReports(await reportLocations()) };
}

// Job: owner-requested deletion (migration 019). Notice email when requested; after 7 days remove stored
// photos, email the confirmation, then delete_location_now (cards unassigned, business data deleted).
export async function deletionsJob() {
  const db = admin();
  const { data: rows, error } = await db.from("locations")
    .select("id, name, deletion_requested_at, deletion_notice_at").not("deletion_requested_at", "is", null);
  if (error) throw error;
  let notices = 0, deleted = 0;
  for (const l of rows ?? []) {
    const due = new Date(Date.parse(l.deletion_requested_at!) + 7 * 86400_000);
    const dueText = due.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    // The addresses are read now: once the business is deleted there is nobody left to look up.
    const { data: who, error: we } = await db.rpc("notification_recipients", { p_location: l.id, p_roles: ["owner"] });
    if (we) throw we;
    const recipients = ((who ?? []) as { user_id: string | null; email: string }[]).map((r) => ({ email: r.email, userId: r.user_id }));
    if (!l.deletion_notice_at) {
      await notify({
        category: "account", kind: "deletion_scheduled", key: `deletion_scheduled:${l.id}:${l.deletion_requested_at}`, locationId: l.id, to: recipients,
        inApp: { title: `${l.name} will be deleted on ${dueText}`, link: "/app/settings" },
        content: copy.deletionScheduled(l.name, dueText, APP_URL),
      }).catch((e) => captureError("cron-tick", e, { job: "deletions", location: l.id }));
      await db.from("locations").update({ deletion_notice_at: new Date().toISOString() }).eq("id", l.id);
      notices++;
    }
    if (Date.now() < due.getTime()) continue;
    const { data: files } = await db.storage.from("owner-photos").list(l.id, { limit: 1000 });
    if (files?.length) await db.storage.from("owner-photos").remove(files.map((f) => `${l.id}/${f.name}`));
    const { error: de } = await db.rpc("delete_location_now", { p_location: l.id });
    if (de) throw de;
    deleted++;
    await notify({
      category: "account", kind: "deletion_done", key: `deletion_done:${l.id}`, locationId: null, to: recipients,
      content: copy.deletionDone(l.name, APP_URL),
    }).catch((e) => captureError("cron-tick", e, { job: "deletions", location: l.id }));
  }
  return { notices, deleted };
}

const formatDay = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// Job: free trial reminders. Retired (P0.8-02b): the trial emails are the lifecycle set (P0.4-10: day 2, day 7, day 11,
// day 14, in _shared/lifecycle.ts), so an owner never gets two sets. The job kind stays registered because
// private.produce_jobs() still offers it every 5 minutes; it does nothing, and a later migration stops offering it.
export function trialsJob() {
  return Promise.resolve({ reminders: 0, retired: true });
}

// Job: renewal reminders for paid monthly and yearly plans (Q06), 5 days and 1 day before the last day, from 09:00
// local. The link opens the Plan page: invoices are created there, never from cron, because they expire.
export async function renewalsJob() {
  const db = admin();
  const { data, error } = await db.rpc("renewal_reminder_candidates");
  if (error) throw error;
  let reminders = 0;
  for (const c of (data ?? []) as { plan_id: string; location_id: string; name: string; time_zone: string; kind: string; last_day: string; continues: boolean }[]) {
    const now = localDateHour(new Date(), c.time_zone);
    const { data: done } = await db.from("emails").select("kind").eq("location_id", c.location_id).like("dedupe_key", `renew_%:${c.plan_id}:%`);
    const sent = (done ?? []).map((r) => String(r.kind).replace("renew_", "")) as RenewalStage[];
    const stage = dueRenewalEmail(c.last_day, now.date, now.hour, sent, c.continues);
    if (!stage) continue;
    const day = formatDay(c.last_day);
    const label = PLAN_LABEL[c.kind] ?? "Kabsi Pro";
    await notify({
      category: "billing", kind: `renew_${stage}`, key: `renew_${stage}:${c.plan_id}`, locationId: c.location_id, to: "owners",
      inApp: { title: stage === "r1" ? "Your Kabsi plan ends tomorrow" : `Your Kabsi plan ends on ${day}`, link: "/app/plan" },
      content: copy.renewalReminder(stage, c.name, label, day, c.kind, APP_URL),
    }).catch((e) => captureError("cron-tick", e, { job: "renewals", location: c.location_id }));
    reminders++;
  }
  return { renewals: reminders };
}

const JOBS: Record<string, () => Promise<Record<string, unknown>>> = {
  access: accessJob, ratings: ratingsJob, weekly: weeklyJob, shield: shieldJob, deletions: deletionsJob, trials: trialsJob, renewals: renewalsJob,
};

export async function cronTick(req: Request): Promise<Response> {
  if (!(await isInternal(req))) return json({ error: "forbidden" }, 403);
  // Internal test hook: { "weekly_now": "<location id>" } sends that location's report immediately.
  const body = await req.json().catch(() => ({})) as { weekly_now?: string };
  if (body.weekly_now) {
    await snapshotRatings((await reportLocations()).filter((l) => l.id === body.weekly_now));
    return json({ ok: true, reports: await weeklyReports(await reportLocations(), { forceLocation: body.weekly_now }) });
  }
  const results: Record<string, unknown> = {};
  let failed = 0;
  for (const [name, job] of Object.entries(JOBS)) {
    const started = Date.now();
    try {
      const detail = await job();
      results[name] = detail;
      if (Object.values(detail).some((v) => typeof v === "number" && v > 0)) await jobLog(name, true, { ...detail, ms: Date.now() - started });
    } catch (e) {
      results[name] = { error: String(e) };
      failed++;
      await jobLog(name, false, { error: String(e).slice(0, 500) });
      await captureError("cron-tick", e, { job: name });
    }
  }
  // Heartbeat: quiet ticks log nothing above, so health could not tell "idle" from "not running" (D295).
  if (!failed) await jobLog("cron-tick", true, { heartbeat: true });
  return json({ ok: true, results });
}
