// Listing Shield (D218): watch the Google listing, alert the owner when a field changes, and put it back
// with one tap if they want. Kabsi cannot stop Google or the public from editing; it can only restore.
import { admin, APP_URL, captureError, emailLayout, esc, sendEmail, sha256Hex } from "./kabsi.ts";
import { getListing, googleMode, patchListing, SHIELD_FIELDS, type FieldValue, type Listing, type ShieldField } from "./google.ts";

const LABEL: Record<ShieldField, string> = { title: "business name", phone: "phone number", address: "address", website: "website", hours: "opening hours", categories: "main category" };
type Loc = { id: string; name: string; address: string | null; google_location_id: string | null; knowledge_card: Record<string, unknown>; shield_checked_at: string | null };

async function tokenLink(locationId: string, userId: string, action: "revert" | "keep", changeId: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const { error } = await admin().from("action_tokens").insert({
    token_hash: await sha256Hex(token), location_id: locationId, user_id: userId, action,
    target_type: "listing_change", target_id: changeId, expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
  });
  if (error) throw error;
  return `${APP_URL}/a/${token}`;
}

async function alertOwner(loc: Loc, changeId: string, field: ShieldField, before: FieldValue, after: FieldValue) {
  const { data: members } = await admin().rpc("location_member_recipients", { p_location: loc.id });
  for (const m of (members ?? []) as { user_id: string; email: string }[]) {
    const [revert, keep] = await Promise.all([tokenLink(loc.id, m.user_id, "revert", changeId), tokenLink(loc.id, m.user_id, "keep", changeId)]);
    const box = (s: string) => `<div style="margin:0 0 12px 0;padding:12px 14px;background:#F6F4EF;border-radius:14px;white-space:pre-wrap;">${esc(s || "(empty)")}</div>`;
    await sendEmail({
      kind: "shield_alert", to: m.email, locationId: loc.id, dedupeKey: `shield:${changeId}:${m.email}`,
      subject: `Your ${LABEL[field]} changed on Google: ${loc.name}`,
      html: emailLayout({
        preheader: `Your ${LABEL[field]} on Google is now different.`, title: `Your ${LABEL[field]} changed`,
        bodyHtml: `<p style="margin:0 0 12px 0;">The ${LABEL[field]} on <strong>${esc(loc.name)}</strong>'s Google profile is now different. Google sometimes accepts edits suggested by the public, or updates listings itself.</p>
<p style="margin:0 0 6px 0;font-size:14px;color:#5E5B55;">Before</p>${box(before.display)}<p style="margin:0 0 6px 0;font-size:14px;color:#5E5B55;">Now</p>${box(after.display)}
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#FFD60A;border-radius:14px;"><a href="${esc(revert)}" style="display:inline-block;padding:13px 24px;font-weight:700;color:#000000;text-decoration:none;">Put mine back</a></td><td style="padding-left:18px;"><a href="${esc(keep)}" style="color:#111111;font-weight:700;">Keep the new one</a></td></tr></table>`,
        note: "Nothing changes until you choose.",
      }),
      text: `Your ${LABEL[field]} on Google changed.\nBefore: ${before.display}\nNow: ${after.display}\n\nPut mine back: ${revert}\nKeep the new one: ${keep}`,
    });
  }
}

// Cron job. Mock: every tick. Live: at most once an hour per location (Pub/Sub will make it faster later).
export async function shieldCheck() {
  const db = admin();
  const { data } = await db.from("locations").select("id, name, address, google_location_id, knowledge_card, shield_checked_at")
    .eq("status", "active").not("google_location_id", "is", null);
  let alerts = 0;
  for (const loc of (data ?? []) as Loc[]) {
    if (googleMode() === "live" && loc.shield_checked_at && Date.parse(loc.shield_checked_at) > Date.now() - 55 * 60_000) continue;
    const card = loc.knowledge_card ?? {};
    // One business Google refuses (e.g. access removed) must not stop the check for the others.
    const now = await getListing(loc.google_location_id!, { name: loc.name, address: loc.address, phone: card.contact_phone as string | undefined, hours: card.hours_note as string | undefined })
      .catch(async (e) => { await captureError("shield", e, { location: loc.id }); return null; });
    if (!now) continue;
    await db.from("locations").update({ shield_checked_at: new Date().toISOString() }).eq("id", loc.id);
    const { data: base } = await db.from("listing_baselines").select("fields").eq("location_id", loc.id).maybeSingle();
    if (!base) { await db.from("listing_baselines").insert({ location_id: loc.id, fields: now }); continue; }
    const before = base.fields as Listing;
    for (const f of SHIELD_FIELDS) {
      if (!before[f] || before[f].display === now[f].display) continue;
      const { data: open } = await db.from("listing_changes").select("id, new_value").eq("location_id", loc.id).eq("field", f).eq("state", "open").maybeSingle();
      if (open && (open.new_value as FieldValue)?.display === now[f].display) continue; // already alerted about this value
      if (open) await db.from("listing_changes").update({ state: "kept", decided_at: new Date().toISOString() }).eq("id", open.id); // superseded
      const { data: ch, error } = await db.from("listing_changes").insert({ location_id: loc.id, field: f, old_value: before[f], new_value: now[f], detected_by: "scheduled_check" }).select("id").single();
      if (error) throw error;
      await alertOwner(loc, ch.id, f, before[f], now[f]);
      alerts++;
    }
  }
  return alerts;
}

// Owner decision (email link or dashboard). Revert writes the old value back to Google (D202: userId approved it).
export async function decideChange(changeId: string, decision: "revert" | "keep", userId: string, channel: "dashboard" | "email_link") {
  const db = admin();
  const { data: ch } = await db.from("listing_changes").select("id, location_id, field, old_value, new_value, state, locations(google_location_id)").eq("id", changeId).single();
  if (!ch) throw new Error("not_found");
  if (ch.state !== "open") throw new Error("already_decided");
  const field = ch.field as ShieldField;
  const gl = (ch.locations as unknown as { google_location_id: string }).google_location_id;
  if (decision === "keep") {
    const { data: base } = await db.from("listing_baselines").select("fields").eq("location_id", ch.location_id).single();
    await db.from("listing_baselines").update({ fields: { ...(base!.fields as Listing), [field]: ch.new_value }, updated_by: "owner", updated_at: new Date().toISOString() }).eq("location_id", ch.location_id);
    await db.from("listing_changes").update({ state: "kept", decided_at: new Date().toISOString() }).eq("id", ch.id);
    return { state: "kept" };
  }
  const old = ch.old_value as FieldValue;
  const { data: pub, error } = await db.from("publications").insert({
    location_id: ch.location_id, target_type: "listing_revert", target_id: ch.id, payload: { field, value: old.display },
    approved_by: userId, channel, status: "queued",
  }).select("id").single();
  if (error) throw error;
  try {
    const r = await patchListing(gl, field, old.raw);
    await db.from("publications").update({ status: r.state, google_response: r.response }).eq("id", pub.id);
    await db.from("listing_changes").update({ state: "reverted", decided_at: new Date().toISOString() }).eq("id", ch.id);
    return { state: "reverted" };
  } catch (e) {
    await db.from("publications").update({ status: "failed", error: String(e).slice(0, 500) }).eq("id", pub.id);
    await db.from("listing_changes").update({ state: "revert_failed", decided_at: new Date().toISOString() }).eq("id", ch.id);
    throw e;
  }
}
