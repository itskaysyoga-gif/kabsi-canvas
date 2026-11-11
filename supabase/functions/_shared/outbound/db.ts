// Outbound's database and outside services for the three outbound functions (Harvey 4A). Service role only. Secrets come
// from Supabase secrets by name and are never logged: HARVEY_REPO_TOKEN (kabsi-harvey contents), ZOHO_SMTP_PASSWORD,
// OUTBOUND_TEST_RECIPIENTS. There is no Companies House key: the status comes from Harvey's register (30.39 item 12).
import { admin, internalSecret } from "../kabsi.ts";
import type { EventRow, Matched } from "./inbox.ts";
import type { NewDraft, Settings } from "./prepare.ts";
import type { DueMessage } from "./send.ts";

export const HARVEY_REPO = "itskaysyoga-gif/kabsi-harvey";
export const SENDER = { name: "Rashid Abou Hamzy", address: "rashid@getkabsi.com" };

export function testRecipients(): string[] {
  return String(Deno.env.get("OUTBOUND_TEST_RECIPIENTS") ?? "").split(/[,\s]+/).map((x) => x.trim().toLowerCase())
    .filter((x) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/.test(x));
}

export async function settings(): Promise<Settings & { next_send_at: string | null }> {
  const { data, error } = await admin().from("outbound_settings").select("*").single();
  if (error) throw new Error(`outbound_settings: ${error.message}`);
  return data as Settings & { next_send_at: string | null };
}

export async function refreshSuppression() {
  const { error } = await admin().rpc("outbound_refresh_suppression");
  if (error) throw new Error(`outbound_refresh_suppression: ${error.message}`);
}

export async function suppressed(address: string): Promise<boolean> {
  const { data, error } = await admin().rpc("outbound_is_suppressed", { p_address: address });
  if (error) throw new Error(`outbound_is_suppressed: ${error.message}`);
  return data === true;
}

/** GitHub contents API, raw: kabsi-harvey's data/register.csv (fine-grained token for that one repository). */
export async function harveyRegister(): Promise<string> {
  const token = Deno.env.get("HARVEY_REPO_TOKEN");
  if (!token) throw new Error("HARVEY_REPO_TOKEN is not set");
  const res = await fetch(`https://api.github.com/repos/${HARVEY_REPO}/contents/data/register.csv`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github.raw+json", "user-agent": "kabsi-outbound" },
  });
  if (!res.ok) throw new Error(`register.csv: HTTP ${res.status}`);
  return await res.text();
}

export async function eligible(c: { email: string; domain: string; name: string; country: string; company_id: string }) {
  if (await suppressed(c.email)) return false;
  const known = await admin().rpc("outbound_known_business", { p_name: c.name, p_country: c.country });
  if (known.error || known.data === true) return false;
  for (const [col, val] of [["email", c.email], ["email_domain", c.domain], ["harvey_company_id", c.company_id]]) {
    const { data, error } = await admin().from("outbound_prospects").select("id").eq(col, val).limit(1);
    if (error || (data ?? []).length > 0) return false;
  }
  return true;
}

/** Messages waiting (draft or approved, first or follow-up) whose send_after falls on that London date. */
export async function queuedFor(date: string): Promise<number> {
  const from = new Date(`${date}T00:00:00Z`).getTime() - 2 * 3600_000;
  const { data, error } = await admin().from("outbound_messages").select("send_after").in("status", ["draft", "approved"])
    .in("kind", ["first", "follow_up"]).gte("send_after", new Date(from).toISOString())
    .lt("send_after", new Date(from + 28 * 3600_000).toISOString());
  if (error) throw new Error(`queuedFor: ${error.message}`);
  return (data ?? []).filter((r) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(r.send_after as string)) === date).length;
}

export async function sentThisMonth(now = new Date()): Promise<number> {
  const month = now.toISOString().slice(0, 7);
  const { data, error } = await admin().from("outbound_days").select("day, sent").gte("day", `${month}-01`);
  if (error) throw new Error(`sentThisMonth: ${error.message}`);
  return (data ?? []).filter((r) => String(r.day).startsWith(month)).reduce((a, r) => a + Number(r.sent), 0);
}

export async function insertDraft(d: NewDraft) {
  const db = admin();
  const p = await db.from("outbound_prospects").insert(d.prospect).select("id").single();
  if (p.error) throw new Error(`insert prospect: ${p.error.message}`);
  const first = await db.from("outbound_messages").insert({ prospect_id: p.data.id, kind: "first", ...d.first }).select("id").single();
  if (first.error) {
    await db.from("outbound_prospects").delete().eq("id", p.data.id);
    throw new Error(`insert first: ${first.error.message}`);
  }
  const follow = await db.from("outbound_messages").insert({ prospect_id: p.data.id, parent_id: first.data.id, kind: "follow_up", ...d.follow });
  if (follow.error) {
    await db.from("outbound_prospects").delete().eq("id", p.data.id);
    throw new Error(`insert follow-up: ${follow.error.message}`);
  }
}

/** The private Founding 25 invite (Outbound 2, R-151): app_settings.founding_invite_slug and founding_places().left,
 *  the count the private page uses. Service role only. Null when either cannot be read; an error never carries the
 *  slug. The caller builds the link with foundingInviteUrl and never logs it. */
export async function foundingInvite(): Promise<{ slug: string | null; left: number } | null> {
  const db = admin();
  const s = await db.from("app_settings").select("value").eq("key", "founding_invite_slug").maybeSingle();
  if (s.error) return null;
  const p = await db.rpc("founding_places");
  if (p.error || !p.data) return null;
  const left = Number((p.data as { left?: unknown }).left);
  return { slug: typeof s.data?.value === "string" ? s.data.value : null, left: Number.isFinite(left) ? left : 0 };
}

// ─── outbound-send (part D)

/** Approved messages that are due, replies first, oldest first, with their business and their Email 1. */
export async function due(now: Date, testOnly: boolean): Promise<DueMessage[]> {
  let q = admin().from("outbound_messages")
    .select("id, prospect_id, parent_id, kind, to_address, subject, body, send_after, in_reply_to, references_ids, prospect:outbound_prospects!inner(email, email_domain, time_zone, test, status), parent:outbound_messages!parent_id(status, message_id, sent_at)")
    .eq("status", "approved").is("claimed_at", null).lte("send_after", now.toISOString());
  if (testOnly) q = q.eq("prospect.test", true);
  const { data, error } = await q.order("send_after").limit(20);
  if (error) throw new Error(`due: ${error.message}`);
  const rows = (data ?? []) as unknown as DueMessage[];
  return [...rows.filter((m) => m.kind === "reply"), ...rows.filter((m) => m.kind !== "reply")];
}

export async function heardFrom(prospectId: string, domain: string): Promise<boolean> {
  const own = await admin().from("outbound_events").select("id").eq("prospect_id", prospectId)
    .in("kind", ["reply", "bounce", "opt_out", "complaint"]).limit(1);
  if (own.error) throw new Error(`heardFrom: ${own.error.message}`);
  if ((own.data ?? []).length) return true;
  const same = await admin().from("outbound_prospects").select("id").eq("email_domain", domain).neq("id", prospectId)
    .in("status", ["needs_you", "answered", "interested", "opted_out", "bounced"]).limit(1);
  if (same.error) throw new Error(`heardFrom: ${same.error.message}`);
  return (same.data ?? []).length > 0;
}

/** Messages sent on a local date in a time zone. */
export async function sentOn(localDate: string, timeZone: string): Promise<number> {
  const from = new Date(Date.parse(`${localDate}T00:00:00Z`) - 14 * 3600_000).toISOString();
  const to = new Date(Date.parse(`${localDate}T00:00:00Z`) + 38 * 3600_000).toISOString();
  const { data, error } = await admin().from("outbound_messages").select("sent_at").eq("status", "sent").gte("sent_at", from).lt("sent_at", to);
  if (error) throw new Error(`sentOn: ${error.message}`);
  const f = new Intl.DateTimeFormat("en-CA", { timeZone });
  return (data ?? []).filter((r) => f.format(new Date(r.sent_at as string)) === localDate).length;
}

export async function markSent(m: DueMessage, messageId: string, at: Date, followUpAt: Date | null) {
  const db = admin();
  const u = await db.from("outbound_messages").update({
    status: "sent", sent_at: at.toISOString(), message_id: messageId,
    in_reply_to: m.kind === "follow_up" ? m.parent?.message_id ?? null : m.in_reply_to,
    references_ids: m.kind === "follow_up" ? m.parent?.message_id ?? null : m.references_ids,
  }).eq("id", m.id).eq("status", "approved");
  if (u.error) throw new Error(`markSent: ${u.error.message}`);
  const status = m.kind === "first" ? "written" : undefined;
  await db.from("outbound_prospects").update({ last_email_at: at.toISOString(), ...(status ? { status } : {}), updated_at: at.toISOString() })
    .eq("id", m.prospect_id);
  if (followUpAt) {
    await db.from("outbound_messages").update({ send_after: followUpAt.toISOString() }).eq("parent_id", m.id).eq("kind", "follow_up");
  }
}

export async function markCancelled(ids: string[], why: string) {
  if (!ids.length) return;
  const { error } = await admin().from("outbound_messages").update({ status: "cancelled", error: why }).in("id", ids).in("status", ["draft", "approved"]);
  if (error) throw new Error(`markCancelled: ${error.message}`);
}

export async function markFailed(id: string, why: string) {
  const { error } = await admin().from("outbound_messages").update({ status: "failed", error: why.slice(0, 300) }).eq("id", id);
  if (error) throw new Error(`markFailed: ${error.message}`);
}

export async function failStale(now: Date): Promise<number> {
  const { data, error } = await admin().from("outbound_messages").update({ status: "failed", error: "delivery_unknown" })
    .eq("status", "approved").not("claimed_at", "is", null).lt("claimed_at", new Date(now.getTime() - 30 * 60_000).toISOString()).select("id");
  if (error) throw new Error(`failStale: ${error.message}`);
  return (data ?? []).length;
}

export async function reserveSlot(gapMs: number): Promise<boolean> {
  const { data, error } = await admin().rpc("outbound_reserve_slot", { p_gap_seconds: Math.round(gapMs / 1000) });
  if (error) throw new Error(`reserveSlot: ${error.message}`);
  return data === true;
}

export async function claim(id: string): Promise<boolean> {
  const { data, error } = await admin().from("outbound_messages").update({ claimed_at: new Date().toISOString() })
    .eq("id", id).eq("status", "approved").is("claimed_at", null).select("id");
  if (error) throw new Error(`claim: ${error.message}`);
  return (data ?? []).length === 1;
}

// ─── outbound-inbox (part E)

export async function inboxState(): Promise<{ inbox_last_uid: number | null; inbox_uid_validity: string | null }> {
  const { data, error } = await admin().from("outbound_settings").select("inbox_last_uid, inbox_uid_validity").single();
  if (error) throw new Error(`inboxState: ${error.message}`);
  return data as { inbox_last_uid: number | null; inbox_uid_validity: string | null };
}

export async function saveInboxState(lastUid: number | null, validity: string | null) {
  const { error } = await admin().from("outbound_settings").update({ inbox_last_uid: lastUid, inbox_uid_validity: validity }).eq("id", true);
  if (error) throw new Error(`saveInboxState: ${error.message}`);
}

export async function seen(inboundId: string): Promise<boolean> {
  const { data, error } = await admin().from("outbound_events").select("id").eq("inbound_id", inboundId).limit(1);
  if (error) throw new Error(`seen: ${error.message}`);
  return (data ?? []).length > 0;
}

/** The sent message one of these Message-IDs names, its business, and everything Kabsi sent that business. */
export async function match(ids: string[]): Promise<Matched | null> {
  const { data, error } = await admin().from("outbound_messages")
    .select("id, kind, message_id, prospect:outbound_prospects(id, email, email_domain, business_name, industry, city, country, test)")
    .in("message_id", ids).eq("status", "sent").limit(1);
  if (error) throw new Error(`match: ${error.message}`);
  const row = (data ?? [])[0] as unknown as { id: string; kind: string; message_id: string; prospect: Matched["prospect"] } | undefined;
  if (!row?.prospect) return null;
  const sent = await admin().from("outbound_messages").select("body").eq("prospect_id", row.prospect.id).eq("status", "sent");
  return { message: { id: row.id, kind: row.kind, message_id: row.message_id }, prospect: row.prospect, sentBodies: (sent.data ?? []).map((r) => r.body as string) };
}

/** The latest message Kabsi sent to this address (a test inbox, or a business's own address). */
export async function matchBySender(address: string): Promise<Matched | null> {
  if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/.test(address)) return null;
  const { data, error } = await admin().from("outbound_messages").select("message_id").eq("to_address", address.toLowerCase())
    .eq("status", "sent").order("sent_at", { ascending: false }).limit(1);
  if (error) throw new Error(`matchBySender: ${error.message}`);
  const id = (data ?? [])[0]?.message_id as string | undefined;
  return id ? await match([id]) : null;
}

export async function record(e: EventRow) {
  const { error } = await admin().from("outbound_events").insert(e);
  if (error && !/duplicate key/.test(error.message)) throw new Error(`record: ${error.message}`);
}

export async function suppress(address: string, reason: string, domain: boolean) {
  const { error } = await admin().rpc("outbound_suppress", { p_address: address, p_reason: reason, p_domain: domain });
  if (error) throw new Error(`suppress: ${error.message}`);
}

export async function cancelQueue(prospectId: string, onlyFollowUp: boolean) {
  let q = admin().from("outbound_messages").update({ status: "cancelled", error: "heard_from_business" }).eq("prospect_id", prospectId)
    .in("status", ["draft", "approved"]).neq("kind", "reply");
  if (onlyFollowUp) q = q.eq("kind", "follow_up");
  const { error } = await q;
  if (error) throw new Error(`cancelQueue: ${error.message}`);
}

export async function setStatus(prospectId: string, status: string, interested?: boolean) {
  const { error } = await admin().from("outbound_prospects")
    .update({ status, updated_at: new Date().toISOString(), ...(interested ? { interested: true } : {}) }).eq("id", prospectId);
  if (error) throw new Error(`setStatus: ${error.message}`);
}

export async function checkStops(reason: "complaint" | "bounce") {
  const { error } = await admin().rpc("outbound_check_stops", { p_reason: reason });
  if (error) throw new Error(`checkStops: ${error.message}`);
}

/** The staff WhatsApp alert, with no business detail (urgent, staff-alerts.ts). */
export async function alert(key: string) {
  const { error } = await admin().rpc("ops_emit", {
    p_kind: "outbound_reply", p_channel: "alerts", p_title: "New reply to Kabsi outbound",
    p_body: "Open kabsi.co/staff/outbound to read it.", p_dedupe: `outbound_reply:${key}`,
  });
  if (error) throw new Error(`alert: ${error.message}`);
}

/** The free check of a business that said yes, inside places_daily_cap. Test businesses never spend: a fixed test code. */
export async function freeCheck(p: Matched["prospect"]): Promise<string | null> {
  if (p.test) return "TESTCHECK";
  const day = new Date().toISOString().slice(0, 10);
  const cap = await admin().from("app_settings").select("value").eq("key", "places_daily_cap").maybeSingle();
  const used = await admin().from("places_usage").select("calls").eq("day", day);
  const limit = Number(cap.data?.value ?? 0);
  if (!(limit > 0) || (used.data ?? []).some((r) => Number(r.calls) >= limit)) return null;
  const secret = await internalSecret();
  if (!secret) return null;
  const { data, error } = await admin().functions.invoke("visibility/check", {
    body: { name: p.business_name, country: p.country, city: p.city, term: p.industry },
    headers: { "x-cron-secret": secret },
  });
  if (error) return null;
  const code = (data as { code?: string } | null)?.code;
  return typeof code === "string" ? code : null;
}

export async function draftReply(r: { prospect_id: string; to_address: string; subject: string; body: string; in_reply_to: string; references_ids: string }) {
  const have = await admin().from("outbound_messages").select("id").eq("prospect_id", r.prospect_id).eq("kind", "reply").eq("status", "draft").limit(1);
  if ((have.data ?? []).length) return;
  const { error } = await admin().from("outbound_messages").insert({ ...r, kind: "reply", status: "draft" });
  if (error) throw new Error(`draftReply: ${error.message}`);
}

/** Queue hashes for kabsi-harvey's kabsi/suppression.txt; flushHarvey sends the queue. */
export async function harveyHashes(hashes: string[]) {
  const rows = [...new Set(hashes)].filter((h) => /^[0-9a-f]{64}$/.test(h)).map((hash) => ({ hash }));
  if (!rows.length) return;
  const { error } = await admin().from("outbound_harvey_queue").upsert(rows, { onConflict: "hash", ignoreDuplicates: true });
  if (error) throw new Error(`harveyHashes: ${error.message}`);
}

/** Append the queued hashes to kabsi-harvey's kabsi/suppression.txt (contents write on that one repository), so Harvey
 *  deletes them and never adds them again. Hashes only; the commit message carries a count. The queue is emptied only
 *  after GitHub accepted the file; on any doubt the file is left alone and the queue waits for the next run. */
export async function flushHarvey(): Promise<number> {
  const token = Deno.env.get("HARVEY_REPO_TOKEN");
  if (!token) return 0;
  const q = await admin().from("outbound_harvey_queue").select("hash").limit(500);
  if (q.error) throw new Error(`flushHarvey: ${q.error.message}`);
  const hashes = (q.data ?? []).map((r) => r.hash as string);
  if (!hashes.length) return 0;
  const url = `https://api.github.com/repos/${HARVEY_REPO}/contents/kabsi/suppression.txt`;
  const headers = { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "user-agent": "kabsi-outbound" };
  for (let attempt = 0; attempt < 3; attempt++) {
    const got = await fetch(url, { headers });
    if (!got.ok) throw new Error(`suppression.txt: HTTP ${got.status}`);
    const j = await got.json() as { content?: string; encoding?: string; sha: string; size: number };
    // Past 1 MB the contents API returns no content: never write the file back from an empty read.
    if (j.encoding !== "base64" || typeof j.content !== "string") throw new Error("suppression.txt: not readable through the contents API");
    const bytesIn = Uint8Array.from(atob(j.content.replace(/\s+/g, "")), (c) => c.charCodeAt(0));
    if (bytesIn.length !== j.size) throw new Error("suppression.txt: size mismatch");
    const text = new TextDecoder().decode(bytesIn);
    const have = new Set(text.split(/\r?\n/).map((l) => l.split("#")[0].trim().toLowerCase()).filter(Boolean));
    const add = hashes.filter((h) => !have.has(h));
    if (add.length) {
      const next = (text.endsWith("\n") || text === "" ? text : `${text}\n`) + add.join("\n") + "\n";
      let bin = "";
      for (const b of new TextEncoder().encode(next)) bin += String.fromCharCode(b);
      const put = await fetch(url, {
        method: "PUT", headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ message: `Outbound: ${add.length} coded entr${add.length === 1 ? "y" : "ies"} added`, content: btoa(bin), sha: j.sha }),
      });
      if (put.status === 409) continue;
      if (!put.ok) throw new Error(`suppression.txt: HTTP ${put.status}`);
    }
    const del = await admin().from("outbound_harvey_queue").delete().in("hash", hashes);
    if (del.error) throw new Error(`flushHarvey: ${del.error.message}`);
    return add.length;
  }
  throw new Error("suppression.txt: changed under us three times");
}
