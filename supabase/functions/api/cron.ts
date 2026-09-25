// cron-tick — internal, every 5 minutes (pg_cron → public.call_internal('cron-tick')).
// Each job decides what is due by looking at data, never at the clock alone, and is safe to run twice.
import { admin, APP_URL, captureError, emailLayout, esc, isInternal, jobLog, json, ownerEmails, sendEmail } from "../_shared/kabsi.ts";
import { acceptInvitationsAndListLocations, googleMode } from "../_shared/google.ts";
import { activeLocations, draftPending, notifyLocation, syncLocation } from "../_shared/reviews.ts";

// Job: Google access. Owner added hello@kabsi.co as Manager → mark access granted, refresh status, email the owner.
async function accessJob() {
  const db = admin();
  const { data: pending } = await db.from("locations")
    .select("id, name, place_id, consent_at")
    .eq("status", "access_pending").is("access_granted_at", null);
  if (!pending?.length) return { pending: 0, granted: 0 };

  let matches: { id: string; accountId: string; locationId: string }[] = [];
  let accepted = 0;
  if (googleMode() === "mock") {
    // Mock: pretend the invite arrived two minutes after the owner gave consent.
    const cutoff = Date.now() - 2 * 60_000;
    matches = pending.filter((l) => l.consent_at && Date.parse(l.consent_at) < cutoff)
      .map((l) => ({ id: l.id, accountId: "accounts/mock", locationId: `locations/mock-${l.id.slice(0, 8)}` }));
  } else {
    const result = await acceptInvitationsAndListLocations();
    accepted = result.accepted;
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
async function syncJob() {
  let added = 0;
  const failed: string[] = [];
  for (const loc of await activeLocations()) {
    try { added += await syncLocation(loc); } catch (e) { failed.push(loc.id); await captureError("cron-tick", e, { job: "sync", location: loc.id }); }
  }
  return { added, failed: failed.length };
}

// Job: draft replies for new reviews (at most 10 per tick to bound AI cost and run time).
async function draftJob() {
  return { drafted: await draftPending(10) };
}

// Job: owner emails — urgent and ≤3★ right away, 4–5★ in the daily digest, one backlog summary.
async function notifyJob() {
  let emails = 0;
  for (const loc of await activeLocations()) {
    try { emails += await notifyLocation(loc); } catch (e) { await captureError("cron-tick", e, { job: "notify", location: loc.id }); }
  }
  return { emails };
}

const JOBS: Record<string, () => Promise<Record<string, unknown>>> = {
  access: accessJob, sync: syncJob, draft: draftJob, notify: notifyJob,
};

export async function cronTick(req: Request): Promise<Response> {
  if (!(await isInternal(req))) return json({ error: "forbidden" }, 403);
  const results: Record<string, unknown> = {};
  for (const [name, job] of Object.entries(JOBS)) {
    const started = Date.now();
    try {
      const detail = await job();
      results[name] = detail;
      if (Object.values(detail).some((v) => typeof v === "number" && v > 0)) await jobLog(name, true, { ...detail, ms: Date.now() - started });
    } catch (e) {
      results[name] = { error: String(e) };
      await jobLog(name, false, { error: String(e).slice(0, 500) });
      await captureError("cron-tick", e, { job: name });
    }
  }
  return json({ ok: true, results });
}
