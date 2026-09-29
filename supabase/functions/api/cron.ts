// cron-tick: internal, every 5 minutes (pg_cron → public.call_internal('cron-tick')).
// Each job decides what is due by looking at data, never at the clock alone, and is safe to run twice.
import { admin, APP_URL, captureError, emailLayout, esc, isInternal, jobLog, json, ownerEmails, sendEmail } from "../_shared/kabsi.ts";
import { acceptInvitationsAndListLocations, googleMode } from "../_shared/google.ts";
import { activeLocations, draftPending, notifyLocation, syncLocation } from "../_shared/reviews.ts";
import { snapshotRatings, weeklyReports } from "../_shared/report.ts";
import { shieldCheck } from "../_shared/shield.ts";

// Job: Google access. Owner invited the Kabsi business group as Manager → mark access granted, refresh status, email the owner.
async function accessJob() {
  const db = admin();
  const { data: pending } = await db.from("locations")
    .select("id, name, address, place_id, consent_at")
    .eq("status", "access_pending").is("access_granted_at", null);
  if (!pending?.length) return { pending: 0, granted: 0 };

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
    const result = await acceptInvitationsAndListLocations(pending.filter((l) => l.consent_at).map((l) => ({ name: l.name, address: l.address })));
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
    const { data: status } = await db.rpc("refresh_location_status", { p_location: m.id });
    for (const to of await ownerEmails(m.id)) {
      const name = esc(updated.name);
      const next = status === "active"
        ? "Kabsi is now watching your reviews. When the next one arrives you'll get an email with a reply ready."
        : "One step left: your plan. As soon as it's confirmed, Kabsi starts drafting replies to your reviews.";
      await sendEmail({
        kind: "access_granted", to, locationId: m.id, dedupeKey: `access_granted:${m.id}:${to}`,
        subject: `Kabsi is connected to ${updated.name}`,
        html: emailLayout({
          preheader: "Google access received.", title: "Access received",
          bodyHtml: `<p style="margin:0 0 16px 0;">Kabsi is now a Manager on <strong>${name}</strong>'s Google profile.</p><p style="margin:0 0 20px 0;">${next}</p>`,
          button: { label: "Open Kabsi", url: `${APP_URL}/app` },
          note: "You can remove Kabsi at any time from your Google profile under People and access.",
        }),
        text: `Kabsi is now a Manager on ${updated.name}'s Google profile.\n\n${next}\n\nOpen Kabsi: ${APP_URL}/app`,
      }).catch((e) => captureError("cron-tick", e, { job: "access", location: m.id }));
    }
  }
  return { mode: googleMode(), pending: pending.length, accepted, granted };
}

// Job: pull new reviews for every active location (Pub/Sub will trigger this sooner once live).
// Google answering 403/404 for one business means Kabsi's Manager access was removed (or the listing is gone).
// After 30 minutes of that, access is marked lost (migration 017) and the owner is told how to fix it.
const ACCESS_GRACE_MS = 30 * 60_000;
const accessRefused = (e: unknown) => /^Error: google (403|404) /.test(String(e));

async function syncJob() {
  const db = admin();
  let added = 0, lost = 0;
  const failed: string[] = [];
  for (const loc of await activeLocations()) {
    try {
      added += await syncLocation(loc);
      if (loc.access_error_since) await db.from("locations").update({ access_error_since: null }).eq("id", loc.id);
    } catch (e) {
      failed.push(loc.id);
      if (!accessRefused(e)) { await captureError("cron-tick", e, { job: "sync", location: loc.id }); continue; }
      if (!loc.access_error_since) {
        await db.from("locations").update({ access_error_since: new Date().toISOString() }).eq("id", loc.id);
        await captureError("cron-tick", e, { job: "sync", location: loc.id, note: "Google refused access; lost after 30 min" });
      } else if (Date.now() - Date.parse(loc.access_error_since) > ACCESS_GRACE_MS) {
        await db.rpc("mark_access_lost", { p_location: loc.id });
        await emailAccessLost(loc.id, loc.name);
        lost++;
      }
    }
  }
  return { added, failed: failed.length, lost };
}

async function emailAccessLost(locationId: string, name: string) {
  const day = new Date().toISOString().slice(0, 10);
  for (const to of await ownerEmails(locationId)) {
    await sendEmail({
      kind: "access_lost", to, locationId, dedupeKey: `access_lost:${locationId}:${day}:${to}`,
      subject: `Kabsi can't reach ${name} on Google`,
      html: emailLayout({
        preheader: "Add hello@kabsi.co as a Manager again to continue.", title: "Kabsi lost access to your Google profile",
        bodyHtml: `<p style="margin:0 0 16px 0;">Google stopped letting Kabsi read <strong>${esc(name)}</strong>'s reviews. This usually means hello@kabsi.co was removed from the profile's managers.</p>
<p style="margin:0 0 16px 0;">To continue: on your Business Profile open <strong>Menu</strong>, then <strong>Business Profile settings</strong>, then <strong>People and access</strong>, and add <strong>hello@kabsi.co</strong> as a <strong>Manager</strong>. Kabsi reconnects on its own within a few minutes.</p>
<p style="margin:0 0 20px 0;">Until then no replies are drafted and nothing is posted. If you removed Kabsi on purpose, you don't need to do anything.</p>`,
        button: { label: "Open Kabsi", url: `${APP_URL}/app` },
      }),
      text: `Google stopped letting Kabsi read ${name}'s reviews, usually because hello@kabsi.co was removed as a Manager.\n\nTo continue, add hello@kabsi.co as a Manager again under People and access on your Business Profile. Kabsi reconnects within a few minutes.\n\nOpen Kabsi: ${APP_URL}/app`,
    }).catch((e) => captureError("cron-tick", e, { job: "access_lost", location: locationId }));
  }
}

// Job: draft replies for new reviews (at most 10 per tick to bound AI cost and run time).
async function draftJob() {
  return { drafted: await draftPending(10) };
}

// Job: owner emails: urgent and ≤3★ right away, 4–5★ in the daily digest, one backlog summary.
async function notifyJob() {
  let emails = 0;
  for (const loc of await activeLocations()) {
    try { emails += await notifyLocation(loc); } catch (e) { await captureError("cron-tick", e, { job: "notify", location: loc.id }); }
  }
  return { emails };
}

async function reportLocations() {
  const { data, error } = await admin().from("locations").select("id, name, place_id, time_zone, emails_paused_until").eq("status", "active");
  if (error) throw error;
  return data ?? [];
}

// Job: one public-rating snapshot per location per day (feeds the weekly change).
async function ratingsJob() {
  return { snapshots: await snapshotRatings(await reportLocations()) };
}

// Job: Listing Shield (D218): detect listing changes and alert the owner.
async function shieldJob() {
  return { alerts: await shieldCheck() };
}

// Job: weekly report, Monday from 09:00 local (D222).
async function weeklyJob() {
  return { reports: await weeklyReports(await reportLocations()) };
}

// Job: owner-requested deletion (migration 019). Notice email when requested; after 7 days remove stored
// photos, email the confirmation, then delete_location_now (cards unassigned, business data deleted).
async function deletionsJob() {
  const db = admin();
  const { data: rows, error } = await db.from("locations")
    .select("id, name, deletion_requested_at, deletion_notice_at").not("deletion_requested_at", "is", null);
  if (error) throw error;
  let notices = 0, deleted = 0;
  for (const l of rows ?? []) {
    const due = new Date(Date.parse(l.deletion_requested_at!) + 7 * 86400_000);
    const dueText = due.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const recipients = await ownerEmails(l.id);
    if (!l.deletion_notice_at) {
      for (const to of recipients) {
        await sendEmail({
          kind: "deletion_scheduled", to, locationId: l.id, dedupeKey: `deletion_scheduled:${l.id}:${l.deletion_requested_at}:${to}`,
          subject: `${l.name} will be deleted from Kabsi on ${dueText}`,
          html: emailLayout({
            preheader: "You can cancel until then.", title: "Deletion scheduled",
            bodyHtml: `<p style="margin:0 0 16px 0;">You asked Kabsi to delete <strong>${esc(l.name)}</strong>. On <strong>${dueText}</strong> we delete its reviews, drafts, posts, photos, reports and settings. Payment records are kept where the law requires.</p><p style="margin:0 0 20px 0;">Changed your mind? Cancel it in Settings before then. To stop Kabsi reaching your Google profile, also remove hello@kabsi.co under People and access.</p>`,
            button: { label: "Open Settings", url: `${APP_URL}/app/settings` },
          }),
          text: `You asked Kabsi to delete ${l.name}. On ${dueText} we delete its reviews, drafts, posts, photos, reports and settings. Cancel in Settings before then: ${APP_URL}/app/settings`,
        }).catch((e) => captureError("cron-tick", e, { job: "deletions", location: l.id }));
      }
      await db.from("locations").update({ deletion_notice_at: new Date().toISOString() }).eq("id", l.id);
      notices++;
    }
    if (Date.now() < due.getTime()) continue;
    const { data: files } = await db.storage.from("owner-photos").list(l.id, { limit: 1000 });
    if (files?.length) await db.storage.from("owner-photos").remove(files.map((f) => `${l.id}/${f.name}`));
    const { error: de } = await db.rpc("delete_location_now", { p_location: l.id });
    if (de) throw de;
    deleted++;
    for (const to of recipients) {
      await sendEmail({
        kind: "deletion_done", to, locationId: null, dedupeKey: `deletion_done:${l.id}:${to}`,
        subject: `${l.name} was deleted from Kabsi`,
        html: emailLayout({
          preheader: "Your business data is deleted.", title: "Deleted",
          bodyHtml: `<p style="margin:0 0 16px 0;">We deleted <strong>${esc(l.name)}</strong> and its data from Kabsi. Your NFC cards no longer open your review page. If Kabsi is still a Manager on your Google profile, remove hello@kabsi.co under People and access.</p>`,
        }),
        text: `We deleted ${l.name} and its data from Kabsi. If Kabsi is still a Manager on your Google profile, remove hello@kabsi.co under People and access.`,
      }).catch((e) => captureError("cron-tick", e, { job: "deletions", location: l.id }));
    }
  }
  return { notices, deleted };
}

const JOBS: Record<string, () => Promise<Record<string, unknown>>> = {
  access: accessJob, sync: syncJob, draft: draftJob, notify: notifyJob, ratings: ratingsJob, weekly: weeklyJob, shield: shieldJob,
  deletions: deletionsJob,
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
