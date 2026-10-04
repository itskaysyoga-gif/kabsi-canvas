// cron-tick: internal, every 5 minutes (pg_cron → public.call_internal('cron-tick')).
// Each job decides what is due by looking at data, never at the clock alone, and is safe to run twice.
// Review sync, drafting and owner emails run as jobs since P0.1-12a (api/jobs.ts); what is left here moves to jobs
// in P0.1-12b.
import { admin, APP_URL, captureError, emailLayout, esc, isInternal, jobLog, json, ownerEmails, sendEmail } from "../_shared/kabsi.ts";
import { dueRenewalEmail, dueTrialEmail, localDateHour, PLAN_LABEL, type RenewalStage, type TrialStage } from "../_shared/plans.ts";
import { acceptInvitationsAndListLocations, googleMode } from "../_shared/google/index.ts";
import { CONCIERGE_COPY } from "../_shared/concierge.ts";
import { snapshotRatings, weeklyReports } from "../_shared/report.ts";
import { shieldCheck } from "../_shared/shield.ts";

// Early access (D267): staff accepted the invitation by hand and stamped access, so tell the owner. The dedupe key
// is the same as the normal "access granted" email, so nobody gets both.
async function conciergeAccessEmails() {
  const db = admin();
  const { data } = await db.from("locations").select("id, name").eq("concierge", true)
    .gt("access_granted_at", new Date(Date.now() - 2 * 86_400_000).toISOString());
  let n = 0;
  for (const l of data ?? []) {
    for (const to of await ownerEmails(l.id)) {
      const r = await sendEmail({
        kind: "access_granted", to, locationId: l.id, dedupeKey: `access_granted:${l.id}:${to}`,
        subject: `Kabsi is connected to ${l.name}`,
        html: emailLayout({
          preheader: "Early access is on.", title: "You're connected",
          bodyHtml: `<p style="margin:0 0 16px 0;">Our team accepted your invitation for <strong>${esc(l.name)}</strong>.</p><p style="margin:0 0 20px 0;">${esc(CONCIERGE_COPY.banner)} When a new review arrives you'll get an email with a reply ready. You approve every word.</p>`,
          button: { label: "Open Kabsi", url: `${APP_URL}/app` },
          note: "You can remove Kabsi at any time from your Google profile under People and access.",
        }),
        text: `Our team accepted your invitation for ${l.name}.\n\n${CONCIERGE_COPY.banner} When a new review arrives you'll get an email with a reply ready. You approve every word.\n\nOpen Kabsi: ${APP_URL}/app`,
      }).catch((e) => captureError("cron-tick", e, { job: "access", location: l.id }));
      if (r && "sent" in r) n++;
    }
  }
  return n;
}

// Job: Google access. Owner invited the Kabsi business group as Manager → mark access granted, refresh status, email the owner.
async function accessJob() {
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
    // A free trial starts with access (Q05): say when it ends, in the business's own time zone.
    const { data: trial } = await db.from("plans").select("ends_at, locations(time_zone)").eq("location_id", m.id).eq("kind", "trial").eq("status", "active").maybeSingle();
    const trialLine = trial ? ` Your free trial runs until ${formatDay(localDateHour(new Date(new Date(trial.ends_at).getTime() - 1000), (trial.locations as unknown as { time_zone: string | null } | null)?.time_zone ?? "UTC").date)}.` : "";
    for (const to of await ownerEmails(m.id)) {
      const name = esc(updated.name);
      const next = status === "active"
        ? `Kabsi is now watching your reviews. When the next one arrives you'll get an email with a reply ready.${trialLine}`
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

async function reportLocations() {
  const { data, error } = await admin().from("locations").select("id, name, place_id, time_zone, emails_paused_until").eq("status", "active");
  if (error) throw error;
  return data ?? [];
}

// Job: one public-rating snapshot per location per day (feeds the weekly change).
async function ratingsJob() {
  return { snapshots: await snapshotRatings(await reportLocations()) };
}

// Job: Google Protection (D218): detect listing changes and alert the owner.
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
            bodyHtml: `<p style="margin:0 0 16px 0;">You asked Kabsi to delete <strong>${esc(l.name)}</strong>. On <strong>${dueText}</strong> we delete its reviews, drafts, posts, photos, reports and settings. Payment records are kept where the law requires.</p><p style="margin:0 0 20px 0;">Changed your mind? Cancel it in Settings before then. To stop Kabsi reaching your Google profile, also remove the Kabsi Clients group (ID 5481006796) under People and access.</p>`,
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
          bodyHtml: `<p style="margin:0 0 16px 0;">We deleted <strong>${esc(l.name)}</strong> and its data from Kabsi. Your NFC cards no longer open your review page. If Kabsi is still a Manager on your Google profile, remove the Kabsi Clients group (ID 5481006796) under People and access.</p>`,
        }),
        text: `We deleted ${l.name} and its data from Kabsi. If Kabsi is still a Manager on your Google profile, remove the Kabsi Clients group (ID 5481006796) under People and access.`,
      }).catch((e) => captureError("cron-tick", e, { job: "deletions", location: l.id }));
    }
  }
  return { notices, deleted };
}

const formatDay = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// Job: free trial reminders, 7 days, 1 day and the last day (Q05). Sent from 09:00 local time; one per stage per
// address (the emails table's dedupe_key makes re-runs safe). This is a billing notice, so a pause on other emails
// does not stop it. Nothing is sent when a paid plan or a partner already continues the business.
const TRIAL_COPY: Record<TrialStage, { subject: (d: string) => string; lead: (name: string, d: string) => string }> = {
  d7: { subject: (d) => `Your Kabsi free trial ends on ${d}`, lead: (n, d) => `Your free trial for <strong>${n}</strong> runs until ${d}.` },
  d1: { subject: () => "Your Kabsi free trial ends tomorrow", lead: (n, d) => `Your free trial for <strong>${n}</strong> ends tomorrow, ${d}.` },
  d0: { subject: () => "Your Kabsi free trial ends today", lead: (n) => `Today is the last day of your free trial for <strong>${n}</strong>.` },
};
async function trialsJob() {
  const db = admin();
  const { data, error } = await db.rpc("trial_reminder_candidates");
  if (error) throw error;
  let reminders = 0;
  for (const c of (data ?? []) as { plan_id: string; location_id: string; name: string; time_zone: string; last_day: string; continues: boolean }[]) {
    const now = localDateHour(new Date(), c.time_zone);
    const { data: done } = await db.from("emails").select("kind").eq("location_id", c.location_id).like("dedupe_key", `trial_%:${c.plan_id}:%`);
    const sent = (done ?? []).map((r) => String(r.kind).replace("trial_", "")) as TrialStage[];
    const stage = dueTrialEmail(c.last_day, now.date, now.hour, sent, c.continues);
    if (!stage) continue;
    const day = formatDay(c.last_day);
    const copy = TRIAL_COPY[stage];
    const body = `${copy.lead(esc(c.name), day)} After that the business moves to Free: reply drafts, Google Protection and the Weekly Care Report stop. Your Review Link and Card keep working.`;
    const plain = `${copy.lead(c.name, day).replace(/<\/?strong>/g, "")} After that the business moves to Free: reply drafts, Google Protection and the Weekly Care Report stop. Your Review Link and Card keep working.`;
    for (const to of await ownerEmails(c.location_id)) {
      await sendEmail({
        kind: `trial_${stage}`, to, locationId: c.location_id, dedupeKey: `trial_${stage}:${c.plan_id}:${to}`,
        subject: copy.subject(day),
        html: emailLayout({
          preheader: "Choose a plan to keep everything going.", title: "Your free trial",
          bodyHtml: `<p style="margin:0 0 16px 0;">${body}</p><p style="margin:0 0 20px 0;">To keep everything going, choose a plan before the trial ends.</p>`,
          button: { label: "Choose a plan", url: `${APP_URL}/app/plan` },
        }),
        text: `${plain}\n\nTo keep everything going, choose a plan before the trial ends.\n\nChoose a plan: ${APP_URL}/app/plan`,
      }).catch((e) => captureError("cron-tick", e, { job: "trials", location: c.location_id }));
    }
    reminders++;
  }
  return { reminders };
}

// Job: renewal reminders for paid monthly and yearly plans (Q06), 5 days and 1 day before the last day, from 09:00
// local. The link opens the Plan page: invoices are created there, never from cron, because they expire.
const RENEW_COPY: Record<RenewalStage, string> = { r5: "in a few days", r1: "tomorrow" };
async function renewalsJob() {
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
    const plain = `Your ${label} plan for ${c.name} ends ${RENEW_COPY[stage]}, on ${day}. To keep reply drafts, Google Protection and the Weekly Care Report going, pay before then. Paying early adds the new period after this one, so you lose no days. Your Review Link and Card keep working either way.`;
    for (const to of await ownerEmails(c.location_id)) {
      await sendEmail({
        kind: `renew_${stage}`, to, locationId: c.location_id, dedupeKey: `renew_${stage}:${c.plan_id}:${to}`,
        subject: stage === "r1" ? "Your Kabsi plan ends tomorrow" : `Your Kabsi plan ends on ${day}`,
        html: emailLayout({
          preheader: "Pay before it ends and you lose no days.", title: "Your plan is ending",
          bodyHtml: `<p style="margin:0 0 16px 0;">${esc(plain)}</p>`,
          button: { label: "Renew your plan", url: `${APP_URL}/app/plan?pay=${encodeURIComponent(c.kind)}` },
        }),
        text: `${plain}\n\nRenew your plan: ${APP_URL}/app/plan?pay=${encodeURIComponent(c.kind)}`,
      }).catch((e) => captureError("cron-tick", e, { job: "renewals", location: c.location_id }));
    }
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
