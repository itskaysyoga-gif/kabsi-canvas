// Outbound's database and outside services for the three outbound functions (Harvey 4A). Service role only. Secrets come
// from Supabase secrets by name and are never logged: HARVEY_REPO_TOKEN (kabsi-harvey contents), COMPANIES_HOUSE_API_KEY,
// ZOHO_SMTP_PASSWORD, OUTBOUND_TEST_RECIPIENTS.
import { admin } from "../kabsi.ts";
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

/** Companies House public data API: the company's status, or null when it cannot be read. */
export async function companyStatus(number: string): Promise<string | null> {
  const key = Deno.env.get("COMPANIES_HOUSE_API_KEY");
  if (!key || !/^[A-Z0-9]{8}$/.test(number)) return null;
  const res = await fetch(`https://api.company-information.service.gov.uk/company/${number}`, {
    headers: { authorization: `Basic ${btoa(`${key}:`)}` },
  }).catch(() => null);
  if (!res) return null;
  if (res.status === 404) return "not_found";
  if (!res.ok) return null;
  const j = await res.json().catch(() => null) as { company_status?: string } | null;
  return j?.company_status ? String(j.company_status).toLowerCase() : null;
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

// ─── outbound-send (part D)

/** Approved messages that are due, replies first, oldest first, with their business and their Email 1. */
export async function due(now: Date): Promise<DueMessage[]> {
  const { data, error } = await admin().from("outbound_messages")
    .select("id, prospect_id, parent_id, kind, to_address, subject, body, send_after, in_reply_to, references_ids, prospect:outbound_prospects(email, email_domain, time_zone, test, status), parent:outbound_messages!parent_id(status, message_id, sent_at)")
    .eq("status", "approved").lte("send_after", now.toISOString()).order("send_after").limit(20);
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

export async function setNextSendAt(at: Date) {
  const { error } = await admin().from("outbound_settings").update({ next_send_at: at.toISOString() }).eq("id", true);
  if (error) throw new Error(`setNextSendAt: ${error.message}`);
}
