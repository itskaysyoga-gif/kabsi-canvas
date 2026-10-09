// Google Protection (D218): watch the Google listing and alert the owner when a field changes. The email says what
// changed and links to the app, where the owner chooses. Kabsi cannot stop Google or the public from editing.
import { admin, APP_URL, captureError, emailLayout, esc, sendEmail } from "./kabsi.ts";
import { getListing, googleMode, SHIELD_FIELDS, type FieldValue, type Listing, type ShieldField } from "./google/index.ts";
import { auditedAdmin } from "./audit.ts";

const LABEL: Record<ShieldField, string> = { title: "business name", phone: "phone number", address: "address", website: "website", hours: "opening hours", categories: "main category" };
type Loc = { id: string; name: string; address: string | null; google_location_id: string | null; knowledge_card: Record<string, unknown>; shield_checked_at: string | null };

async function alertOwner(loc: Loc, changeId: string, field: ShieldField, before: FieldValue, after: FieldValue) {
  const { data: members } = await admin().rpc("location_member_recipients", { p_location: loc.id });
  for (const m of (members ?? []) as { user_id: string; email: string }[]) {
    const box = (s: string) => `<div style="margin:0 0 12px 0;padding:12px 14px;background:#F6F4EF;border-radius:14px;white-space:pre-wrap;">${esc(s || "(empty)")}</div>`;
    await sendEmail({
      kind: "shield_alert", to: m.email, locationId: loc.id, dedupeKey: `shield:${changeId}:${m.email}`,
      subject: `Your ${LABEL[field]} changed on Google: ${loc.name}`,
      html: emailLayout({
        preheader: `Your ${LABEL[field]} on Google is now different.`, title: `Your ${LABEL[field]} changed`,
        bodyHtml: `<p style="margin:0 0 12px 0;">The ${LABEL[field]} on <strong>${esc(loc.name)}</strong>'s Google profile is now different. Google sometimes accepts edits suggested by the public, or updates listings itself.</p>
<p style="margin:0 0 6px 0;font-size:14px;color:#5E5B55;">Before</p>${box(before.display)}<p style="margin:0 0 6px 0;font-size:14px;color:#5E5B55;">Now</p>${box(after.display)}`,
        button: { label: "Open Google Protection", url: `${APP_URL}/app/shield` },
        note: "Nothing changes on Google until you choose in the app.",
      }),
      text: `Your ${LABEL[field]} on Google changed.\nBefore: ${before.display}\nNow: ${after.display}\n\nOpen Google Protection: ${APP_URL}/app/shield`,
    });
  }
}

const LOC_COLS = "id, name, address, google_location_id, knowledge_card, shield_checked_at";

// Cron job (until kabsi_cron_tick is retired, P0.1-12b). Mock: every tick. Live: at most once an hour per location.
export async function shieldCheck() {
  const db = admin();
  const { data } = await db.from("locations").select(LOC_COLS)
    .eq("status", "active").eq("concierge", false).not("google_location_id", "is", null);
  let alerts = 0;
  for (const loc of (data ?? []) as Loc[]) {
    if (googleMode() === "live" && loc.shield_checked_at && Date.parse(loc.shield_checked_at) > Date.now() - 55 * 60_000) continue;
    // One business Google refuses (e.g. access removed) must not stop the check for the others.
    alerts += await checkListing(loc).catch(async (e) => { await captureError("shield", e, { location: loc.id }); return 0; });
  }
  return alerts;
}

// Job protection_check (P0.1-12b): one business, offered every 5 minutes on the mock and once an hour on live
// Google. A Google error is thrown, so the job retries with backoff.
export async function protectionCheck(locationId: string) {
  const { data, error } = await admin().from("locations").select(LOC_COLS).eq("id", locationId)
    .eq("status", "active").eq("concierge", false).not("google_location_id", "is", null).maybeSingle();
  if (error) throw error;
  return data ? await checkListing(data as Loc) : 0; // paused, removed or concierge since the job was offered
}

// Read the listing, compare it with the baseline and alert the owner once per new value.
async function checkListing(loc: Loc) {
  const db = admin();
  const card = loc.knowledge_card ?? {};
  const now = await getListing(loc.google_location_id!, { name: loc.name, address: loc.address, phone: card.contact_phone as string | undefined, hours: card.hours_note as string | undefined });
  await db.from("locations").update({ shield_checked_at: new Date().toISOString() }).eq("id", loc.id);
  const { data: base } = await db.from("listing_baselines").select("fields").eq("location_id", loc.id).maybeSingle();
  if (!base) { await db.from("listing_baselines").insert({ location_id: loc.id, fields: now }); return 0; }
  const before = base.fields as Listing;
  let alerts = 0;
  for (const f of SHIELD_FIELDS) {
    if (!before[f] || before[f].display === now[f].display) continue;
    // The owner already chose to put this field back and it is on its way (P0.1-13b): Google may show the new value
    // until the put-back lands or while it holds the edit for review. The publication pipeline checks it; no new alert.
    const { count: reverting, error: re } = await db.from("listing_changes").select("id", { count: "exact", head: true })
      .eq("location_id", loc.id).eq("field", f).eq("state", "reverting");
    if (re) throw re;
    if (reverting) continue;
    // Already alerted about this value: still open, or expired after 14 days without an answer (K-20, raised again in
    // the weekly report, not by a new alert). A newer value supersedes the open change in the database (P0.2-03, A5).
    const { data: last, error: le } = await db.from("listing_changes").select("new_value").eq("location_id", loc.id).eq("field", f)
      .in("state", ["open", "expired"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (le) throw le;
    if (last && (last.new_value as FieldValue)?.display === now[f].display) continue;
    const { data: ch, error } = await db.from("listing_changes").insert({ location_id: loc.id, field: f, old_value: before[f], new_value: now[f], detected_by: "scheduled_check" }).select("id").single();
    if (error) throw error;
    await alertOwner(loc, ch.id, f, before[f], now[f]);
    alerts++;
  }
  return alerts;
}

// Owner decision (email link or dashboard). "keep" makes Google's value the new baseline. "revert" is the owner's
// approval to put the old value back (D202): it goes through the one publication pipeline (P0.1-13b), which sends it
// after the 10 second undo window and marks the change reverted once Google shows it.
export async function decideChange(changeId: string, decision: "revert" | "keep", userId: string, channel: "dashboard" | "email_link", audit?: Record<string, string>) {
  const db = admin();
  const { data: ch } = await db.from("listing_changes").select("id, location_id, field, new_value, state").eq("id", changeId).single();
  if (!ch) throw new Error("not_found");
  if (ch.state !== "open") throw new Error("already_decided");
  const field = ch.field as ShieldField;
  if (decision === "keep") {
    // Only an open change can be kept: a put-back on its way (reverting) is not overtaken.
    const { data: kept } = await db.from("listing_changes").update({ state: "kept", decided_at: new Date().toISOString(), decided_by: userId })
      .eq("id", ch.id).eq("state", "open").select("id").maybeSingle();
    if (!kept) throw new Error("already_decided");
    const { data: base } = await db.from("listing_baselines").select("fields").eq("location_id", ch.location_id).single();
    await db.from("listing_baselines").update({ fields: { ...(base!.fields as Listing), [field]: ch.new_value }, updated_by: "owner", updated_at: new Date().toISOString() }).eq("location_id", ch.location_id);
    return { state: "kept" };
  }
  const { data, error } = await (audit ? auditedAdmin(audit) : db).rpc("approve_publication", {
    p_target_type: "listing_revert", p_target_id: ch.id, p_payload: {}, p_approved_by: userId, p_channel: channel,
  });
  if (error) {
    if (String(error.message).includes("already_decided")) throw new Error("already_decided");
    throw new Error(error.message);
  }
  const r = data as { publication_id: string; publish_after: string | null };
  return { state: "reverting", publication: r.publication_id, publish_after: r.publish_after };
}
