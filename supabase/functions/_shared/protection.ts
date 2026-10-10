// Google Protection (K-19, K-20, K-77, P0.2-04): detect, show before and after, explain, ask, then the owner decides.
// Nothing is ever put back by itself (guardrail 7): the only write is "Keep my information", which goes through the one
// publication pipeline after the owner chose it (decide_profile_change). The reference is Business Knowledge: the
// owner's confirmed facts (K-18). A field the owner never confirmed is still watched, and its change says "Not yet
// confirmed by you" and is never offered for restore.
import { PROTECTION_FIELDS, type ProtectionField, type ProtectionRead, readProtection } from "./google/index.ts";

// Loaded on first use, so the rules below can be tested without the function's secrets.
const kabsi = () => import("./kabsi.ts");
const admin = async () => (await kabsi()).admin();

export const LABEL: Record<ProtectionField, string> = {
  name: "business name", phone: "phone number", website: "website", address: "address", regular_hours: "opening hours",
  main_category: "main category", open_status: "open status", map_pin: "map pin",
};
// K-19, K-64, K-116.2, K-117: a change to these can make Google ask the business to verify again.
export const HIGH_RISK: readonly ProtectionField[] = ["name", "address", "main_category", "open_status", "map_pin"];
export const VERIFY_WARNING = "Changing this can make Google ask you to verify your business again.";

// ─── Explain (K-19 step 3) ──────────────────────────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_INDEX: Record<string, number> = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };
type Day = { open: string; close: string } | "closed";

// "Mon to Fri 07:00 to 18:00, Sat Closed, Sun 08:00 to 15:00" (the mock and the owner) or "Mon 08:00 to 19:00, ..."
// (Google's periods): one entry per day, or null when the text is not in that form.
export function parseHours(s: string): (Day | undefined)[] | null {
  const days: (Day | undefined)[] = new Array(7).fill(undefined);
  const parts = s.split(/[,;]/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  for (const part of parts) {
    const m = part.match(/^([A-Za-z]{3})[a-z]*(?:\s+to\s+([A-Za-z]{3})[a-z]*)?\s+(?:(closed)|(\d{1,2}:\d{2})\s+to\s+(\d{1,2}:\d{2}))$/i);
    if (!m) return null;
    const from = DAY_INDEX[m[1].toLowerCase()], to = m[2] ? DAY_INDEX[m[2].toLowerCase()] : from;
    if (from === undefined || to === undefined) return null;
    const v: Day = m[3] ? "closed" : { open: m[4].padStart(5, "0"), close: m[5].padStart(5, "0") };
    for (let d = from; ; d = (d + 1) % 7) {
      days[d] = v;
      if (d === to) break;
    }
  }
  return days;
}

// "Google shows Sunday closing at 18:00. You approved 22:00." The first day that differs, or null.
export function hoursDifference(approved: string, google: string): { google: string; approved: string; more: boolean } | null {
  const a = parseHours(approved), g = parseHours(google);
  if (!a || !g) return null;
  const differing = DAY_NAMES.map((_, i) => i).filter((i) => JSON.stringify(a[i] ?? "closed") !== JSON.stringify(g[i] ?? "closed"));
  if (!differing.length) return null;
  const i = differing[0], day = DAY_NAMES[i];
  const av = a[i] ?? "closed", gv = g[i] ?? "closed";
  let out: { google: string; approved: string };
  if (gv === "closed" && av !== "closed") out = { google: `${day} closed`, approved: `${av.open} to ${av.close}` };
  else if (av === "closed" && gv !== "closed") out = { google: `${day} open ${gv.open} to ${gv.close}`, approved: "closed" };
  else if (av !== "closed" && gv !== "closed" && av.open === gv.open) out = { google: `${day} closing at ${gv.close}`, approved: av.close };
  else if (av !== "closed" && gv !== "closed" && av.close === gv.close) out = { google: `${day} opening at ${gv.open}`, approved: av.open };
  else if (av !== "closed" && gv !== "closed") out = { google: `${day} ${gv.open} to ${gv.close}`, approved: `${av.open} to ${av.close}` };
  else return null;
  return { ...out, more: differing.length > 1 };
}

const quoted = (s: string) => (s ? `“${s}”` : "nothing");

// One or two sentences: what Google shows and what the owner approved (or, for a value never confirmed, what Kabsi saw
// before). Never Google's word for who changed it; the screen adds that from the change's source.
export function explain(field: ProtectionField, before: string, now: string, confirmed: boolean): string {
  const you = confirmed ? "You approved" : "Kabsi saw";
  const tail = confirmed ? "" : " before. Not yet confirmed by you";
  if (field === "regular_hours") {
    const d = hoursDifference(before, now);
    if (d) return `Google shows ${d.google}. ${you} ${d.approved}${tail}.${d.more ? " Other days differ too." : ""}`;
  }
  return `Google shows ${quoted(now)} as your ${LABEL[field]}. ${you} ${quoted(before)}${tail}.`;
}

// ─── Google's naming rules (K-77) ────────────────────────────────────────────────────────────────────────────────

const WEB = /(https?:\/\/|www\.|\.(com|net|org|co|io|biz|info|me|shop|store|online|site|app|lb|ae|sa|uk|us)\b)/i;
const SEPARATOR = /\s[-|:]\s|\s?\|\s?|:\s|,\s/;

// What Google took out of the old name, when the new name is the old one with something removed; else null.
function removedPart(before: string, now: string): string | null {
  const b = before.trim(), n = now.trim();
  if (!n || n.length >= b.length) return null;
  const at = b.toLowerCase().indexOf(n.toLowerCase());
  if (at >= 0) return `${b.slice(0, at)} ${b.slice(at + n.length)}`.replace(/^[\s\-|:,]+|[\s\-|:,]+$/g, "").trim() || null;
  const kept = new Set(n.toLowerCase().split(/\s+/));
  const words = b.split(/\s+/).filter((w) => !kept.has(w.toLowerCase()));
  return words.length && words.length < b.split(/\s+/).length ? words.join(" ") : null;
}

// K-77: before showing a name change, check the old and new names against Google's rules. When Google only removed a
// web address, a city or area, or a slogan or keywords from the name, Kabsi recommends "Google is right" and says why.
// address: the business's address as shown ("street, town, country"); its parts after the street are the places.
export function nameCheck(before: string, now: string, address = ""): { recommend: "accept"; reason: string } | null {
  const removed = removedPart(before, now);
  if (!removed) return null;
  const start = `Google removed '${removed}'. Business names on Google can't include`;
  const end = ", and putting it back can lead to a suspension.";
  if (WEB.test(removed)) return { recommend: "accept", reason: `${start} web addresses${end}` };
  const parts = address.split(",").map((p) => p.trim().toLowerCase()).filter(Boolean);
  const places = new Set((parts.length > 1 ? parts.slice(1) : []).flatMap((p) => p.split(/\s+/)).filter((w) => w.length >= 3 && !/\d/.test(w)));
  if (removed.toLowerCase().split(/[\s,\-|:]+/).some((w) => places.has(w))) {
    return { recommend: "accept", reason: `${start} a city or area that is not part of the real name${end}` };
  }
  if (SEPARATOR.test(before) || removed.split(/\s+/).length >= 3) {
    return { recommend: "accept", reason: `${start} slogans or extra keywords${end}` };
  }
  return null;
}

// ─── Detect (K-19 steps 1 and 2) ─────────────────────────────────────────────────────────────────────────────────

type Fact = { key: string; value: { display?: string } | null; status: string };
export type Read = {
  field: ProtectionField; value: { display: string; raw: unknown }; google_updated: boolean; previous: string | null;
  explanation: string | null; recommend: "accept" | null; reason: string | null;
};

// What the detector hands to record_protection_check: every watched field, with the explanation written against the
// value it compared with. The database decides whether it is a new change (it holds the lock and the history).
export function buildReads(now: ProtectionRead, facts: Fact[]): Read[] {
  const byKey = new Map(facts.map((f) => [f.key, f]));
  const address = byKey.get("address")?.value?.display || now.listing.address.display;
  return PROTECTION_FIELDS.map((field) => {
    const fact = byKey.get(field);
    const previous = fact?.value && fact.status !== "outdated" && fact.status !== "rejected" ? fact.value.display ?? "" : null;
    const shown = now.listing[field];
    const differs = previous !== null && previous !== shown.display;
    const check = differs && field === "name" ? nameCheck(previous!, shown.display, address) : null;
    return {
      field, value: { display: shown.display, raw: shown.raw }, google_updated: now.googleUpdated.includes(field), previous,
      explanation: differs ? explain(field, previous!, shown.display, fact!.status === "verified") : null,
      recommend: check?.recommend ?? null, reason: check?.reason ?? null,
    };
  });
}

type Loc = { id: string; name: string; address: string | null; google_location_id: string | null; knowledge_card: Record<string, unknown> };
const LOC_COLS = "id, name, address, google_location_id, knowledge_card";

// Job protection_check (P0.1-12b): one business, offered every 5 minutes on the mock and once an hour on live
// Google. A Google error is thrown, so the job retries with backoff.
export async function protectionCheck(locationId: string) {
  const { data, error } = await (await admin()).from("locations").select(LOC_COLS).eq("id", locationId)
    .eq("status", "active").eq("concierge", false).not("google_location_id", "is", null).maybeSingle();
  if (error) throw error;
  return data ? await checkProfile(data as Loc) : 0; // paused, removed or concierge since the job was offered
}

// The old 5 minute cron route (api/cron-tick, kept for its test hook): every active business once.
export async function shieldCheck() {
  const { captureError } = await kabsi();
  const { data } = await (await admin()).from("locations").select("id")
    .eq("status", "active").eq("concierge", false).not("google_location_id", "is", null);
  let alerts = 0;
  // One business Google refuses (e.g. access removed) must not stop the check for the others.
  for (const loc of (data ?? []) as { id: string }[]) {
    alerts += await protectionCheck(loc.id).catch(async (e) => { await captureError("shield", e, { location: loc.id }); return 0; });
  }
  return alerts;
}

async function checkProfile(loc: Loc) {
  const db = await admin();
  const card = loc.knowledge_card ?? {};
  const now = await readProtection(loc.google_location_id!, {
    name: loc.name, address: loc.address, phone: card.contact_phone as string | undefined, hours: card.hours_note as string | undefined,
  });
  const { data: facts, error: fe } = await db.from("knowledge_facts").select("key, value, status")
    .eq("location_id", loc.id).like("slot", "profile.%").is("superseded_by", null);
  if (fe) throw fe;
  const { data, error } = await db.rpc("record_protection_check", { p_location: loc.id, p_reads: buildReads(now, (facts ?? []) as Fact[]) });
  if (error) throw error;
  const created = ((data as { changes?: { id: string }[] })?.changes ?? []);
  for (const c of created) await alertOwner(loc, c.id);
  return created.length;
}

// ─── Ask (K-19 step 4): one email per change, to every member; the choice is made in the app ─────────────────────

type Change = {
  id: string; field: ProtectionField; previous_value: { display?: string } | null; google_value: { display?: string } | null;
  previous_fact_id: string | null; source: string; explanation: string | null; recommend: string | null; recommend_reason: string | null;
};

export const whoChanged = (source: string) => source === "google_update"
  ? "Google changed this itself, or accepted a suggestion from the public."
  : "We don't know who changed it. Google sometimes accepts edits suggested by the public.";

async function alertOwner(loc: Loc, changeId: string) {
  const { admin, APP_URL, emailLayout, esc, sendEmail } = await kabsi();
  const db = admin();
  const { data: ch, error } = await db.from("profile_changes")
    .select("id, field, previous_value, google_value, previous_fact_id, source, explanation, recommend, recommend_reason")
    .eq("id", changeId).single();
  if (error) throw error;
  const c = ch as Change;
  const label = LABEL[c.field] ?? c.field;
  const before = c.previous_value?.display ?? "", after = c.google_value?.display ?? "";
  const lines = [c.explanation ?? explain(c.field, before, after, !!c.previous_fact_id), whoChanged(c.source)];
  if (c.recommend === "accept" && c.recommend_reason) lines.push(`Kabsi recommends "Google is right". ${c.recommend_reason}`);
  if (HIGH_RISK.includes(c.field)) lines.push(`Sign in to Kabsi to choose. ${VERIFY_WARNING}`);
  if (!c.previous_fact_id) lines.push("You have not confirmed this detail yet, so Kabsi will not put the old value back.");
  const { data: members } = await db.rpc("location_member_recipients", { p_location: loc.id });
  for (const m of (members ?? []) as { user_id: string; email: string }[]) {
    const box = (s: string) => `<div style="margin:0 0 12px 0;padding:12px 14px;background:#F6F4EF;border-radius:14px;white-space:pre-wrap;">${esc(s || "(empty)")}</div>`;
    await sendEmail({
      kind: "shield_alert", to: m.email, locationId: loc.id, dedupeKey: `shield:${c.id}:${m.email}`,
      subject: `${loc.name}: your ${label} changed on Google`,
      html: emailLayout({
        preheader: lines[0], title: `Your ${label} changed on Google`,
        bodyHtml: lines.map((l) => `<p style="margin:0 0 12px 0;">${esc(l)}</p>`).join("") +
          `<p style="margin:0 0 6px 0;font-size:14px;color:#5E5B55;">${c.previous_fact_id ? "You approved" : "Kabsi saw before"}</p>${box(before)}` +
          `<p style="margin:0 0 6px 0;font-size:14px;color:#5E5B55;">Google shows now</p>${box(after)}`,
        button: { label: "Open Google Protection", url: `${APP_URL}/app/shield` },
        note: "Nothing changes on Google until you choose in Kabsi.",
      }),
      text: `${lines.join("\n")}\n\nOpen Google Protection: ${APP_URL}/app/shield`,
    });
  }
}

// ─── Decide (K-19 steps 4 and 5) ──────────────────────────────────────────────────────────────────────────────────

// "Google is right" (accept: Google's value becomes the approved fact) or "Keep my information" (reject: the approved
// value goes back to Google through the publication pipeline, after the 10 second undo window). The guards live in
// decide_profile_change: the high-risk fields need the owner signed in (never an email link), 7 days between
// high-risk put-backs, and a third conflict in 30 days goes to Google support instead.
export async function decideChange(changeId: string, decision: "accept" | "reject", userId: string, channel: "dashboard" | "email_link", audit?: Record<string, string>) {
  const db = audit ? (await import("./audit.ts")).auditedAdmin(audit) : await admin();
  const { data, error } = await db.rpc("decide_profile_change", {
    p_change: changeId, p_decision: decision, p_user: userId, p_channel: channel,
  });
  if (error) throw new Error(error.message);
  return data as { state: "accepted" | "rejected" | "support"; publication_id?: string; publish_after?: string | null };
}

// Owner-facing words for the refusals of decide_profile_change. Null for anything else.
export function decisionRefusal(message: string): { code: string; text: string; status: number } | null {
  if (message.includes("already_decided")) return { code: "already_decided", text: "This change was already handled.", status: 409 };
  if (message.includes("sign_in_required")) return { code: "sign_in_required", text: `Sign in to Kabsi to choose this. ${VERIFY_WARNING}`, status: 403 };
  if (message.includes("owner_only")) return { code: "owner_only", text: "Only the owner can choose this one.", status: 403 };
  if (message.includes("not_confirmed")) return { code: "not_confirmed", text: "You have not confirmed this detail yet, so Kabsi can't put the old value back.", status: 409 };
  const wait = message.match(/high_risk_wait (\S+)/);
  if (wait) {
    const when = new Date(wait[1]).toUTCString().slice(0, 16);
    return { code: "high_risk_wait", text: `Kabsi changed another important detail on Google this week. To keep your profile safe, this one can go on ${when}.`, status: 409 };
  }
  if (message.includes("values_cleared")) return { code: "values_cleared", text: "Google's value is no longer kept (after 30 days). Kabsi will show it again if it is still there.", status: 409 };
  if (message.includes("location_not_active")) return { code: "not_active", text: "Kabsi can't reach your Google profile right now.", status: 409 };
  return null;
}
