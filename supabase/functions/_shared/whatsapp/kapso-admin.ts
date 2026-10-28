// Staff-only Kapso actions (master plan 9.8, 9.5, 29.9), run inside the `whatsapp` function so KAPSO_API_KEY never
// leaves Supabase secrets: nobody sees it, and no session uses the Kapso connector for Kabsi (R-49).
//   - setup: register the phone-number webhook to this function. Kapso does not generate the signing secret: Kabsi
//     makes 48 random characters, sends them as `secret_key` and keeps them in Supabase Vault; never returned, logged
//     or printed. A webhook that already points at this function is updated, never duplicated; Kapso's own inbox
//     webhook is never touched.
//   - templates: submit the utility templates (templates.ts, v2 names included) that are not there yet, and report each one's status.
//   - templatestatus: read only. Each template's status and category as Meta has them now; nothing is submitted.
//   - health: read the number's health and quality rating (hourly, from pg_cron).
//   - automations: confirm no Kapso workflow or Kapso agent answers the number, so only Kabsi's own code replies.
// Answers carry ids, names and statuses only. The network is a dep, so tests never call Kapso.
import { allDefs, isReplacement, submission } from "./templates.ts";

const PLATFORM = "https://api.kapso.ai/platform/v1";
const META = "https://api.kapso.ai/meta/whatsapp/v24.0";

export type KapsoEnv = { apiKey: string; phoneNumberId: string; wabaId?: string | null; fetch?: typeof fetch };
type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const list = (v: unknown): Obj[] => (Array.isArray(v) ? v.map(obj) : Array.isArray(obj(v).data) ? (obj(v).data as unknown[]).map(obj) : []);
const unwrap = (v: unknown): Obj => (obj(v).data && !Array.isArray(obj(v).data) ? obj(obj(v).data) : obj(v));

export class KapsoError extends Error {
  constructor(readonly status: number, readonly where: string, readonly detail = "") {
    super(`kapso ${where} ${status}${detail ? `: ${detail}` : ""}`);
  }
}

/** What an error body says, for the log: Meta's error fields (message, error_user_title, error_user_msg, code,
 *  error_subcode) wherever Kapso puts them, else the start of the text. Long token-like strings (keys, secrets) are cut out. */
export function describeError(text: string, max = 600): string {
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  const root = obj(parsed);
  const e = typeof root.error === "object" && root.error ? obj(root.error) : root;
  const fields = ["message", "error_user_title", "error_user_msg", "code", "error_subcode", "type"]
    .map((k) => [k, e[k] ?? root[k]] as const)
    .filter(([, v]) => v !== undefined && v !== null && v !== "" && typeof v !== "object")
    .map(([k, v]) => `${k}=${String(v)}`);
  if (typeof root.error === "string") fields.unshift(`error=${root.error}`);
  const detail = root.errors ?? e.errors ?? e.details;
  if (detail && typeof detail === "object") fields.push(`errors=${JSON.stringify(detail)}`);
  const out = fields.length ? fields.join("; ") : text;
  return out.replace(/[A-Za-z0-9_\-]{32,}/g, "[redacted]").replace(/\s+/g, " ").trim().slice(0, max);
}

async function call(env: KapsoEnv, url: string, init: RequestInit = {}): Promise<unknown> {
  const res = await (env.fetch ?? fetch)(url, {
    ...init,
    redirect: "error",
    headers: { "X-API-Key": env.apiKey, "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new KapsoError(res.status, `${init.method ?? "GET"} ${new URL(url).pathname.split("/").slice(0, 7).join("/")}`, describeError(text));
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export const WEBHOOK_EVENTS = ["whatsapp.message.received", "whatsapp.message.sent", "whatsapp.message.delivered",
  "whatsapp.message.read", "whatsapp.message.failed"];

/** 48 random characters (letters and digits) for the webhook's signing key. */
export function makeWebhookSecret(len = 48): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len * 2));
  let out = "";
  for (const b of bytes) {
    if (b < 248 && out.length < len) out += chars[b % 62]; // 248 = 4 * 62: no modulo bias
  }
  return out.length === len ? out : makeWebhookSecret(len);
}

export type WebhookState = { id: string; url: string; active: boolean };

/** Kabsi's webhooks on the number, as Kapso lists them (ids, URLs and active flags only). */
export async function listWebhooks(env: KapsoEnv, url: string): Promise<WebhookState[]> {
  const base = `${PLATFORM}/whatsapp/phone_numbers/${encodeURIComponent(env.phoneNumberId)}/webhooks`;
  return list(await call(env, base)).filter((w) => w.url === url).map((w) => ({ id: String(w.id ?? ""), url: String(w.url), active: w.active !== false }));
}

/** Makes sure one active webhook points at Kabsi's function, signed with a key Kabsi holds. A webhook already on Kabsi's
 *  URL is updated; one that is not Kabsi's (Kapso's own inbox webhook) is never changed or deleted. The secret is kept
 *  only after Kapso accepted it. Returns ids and flags only. */
export async function setupWebhook(env: KapsoEnv, url: string, o: { haveSecret: boolean; storeSecret: (s: string) => Promise<void> }) {
  const base = `${PLATFORM}/whatsapp/phone_numbers/${encodeURIComponent(env.phoneNumberId)}/webhooks`;
  const existing = await listWebhooks(env, url);
  const active = existing.find((w) => w.active);
  if (active && o.haveSecret) return { id: active.id, created: false, updated: false };
  const secret = makeWebhookSecret();
  const body = { whatsapp_webhook: { url, events: WEBHOOK_EVENTS, kind: "kapso", payload_version: "v2", active: true, secret_key: secret } };
  let id: string;
  let updated = false;
  if (existing.length) {
    id = existing[0].id;
    await call(env, `${base}/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) });
    updated = true;
  } else {
    id = String(unwrap(await call(env, base, { method: "POST", body: JSON.stringify(body) })).id ?? "");
  }
  await o.storeSecret(secret);
  return { id, created: !updated, updated };
}

/** The WhatsApp business account of the number (needed for templates): the setting, else Kapso's record of the number. */
export async function wabaId(env: KapsoEnv): Promise<string> {
  if (env.wabaId) return env.wabaId;
  const n = unwrap(await call(env, `${PLATFORM}/whatsapp/phone_numbers/${encodeURIComponent(env.phoneNumberId)}`));
  const id = String(n.business_account_id ?? n.waba_id ?? obj(n.whatsapp_business_account).id ?? "");
  if (!/^\d{5,25}$/.test(id)) throw new Error("kapso_no_business_account_id");
  return id;
}

export type TemplateRow = { name: string; status: string; category: string | null; reason?: string };

const FIELDS = "name,status,category,language,rejected_reason";
const rows = (v: unknown): TemplateRow[] => list(v).map((t) => ({
  name: String(t.name), status: String(t.status ?? ""), category: t.category ? String(t.category) : null,
  ...(t.rejected_reason && t.rejected_reason !== "NONE" ? { reason: String(t.rejected_reason) } : {}),
}));

/** Read only: every template on the business account with its status and category. Nothing is submitted or changed. */
export async function readTemplates(env: KapsoEnv): Promise<TemplateRow[]> {
  const waba = await wabaId(env);
  return rows(await call(env, `${META}/${waba}/message_templates?fields=${FIELDS}&limit=200`));
}

/** The statuses Kabsi's sender needs: only the names in templates.ts, status by name (nothing else is stored). */
export function statusMap(found: TemplateRow[]): Record<string, string> {
  const ours = new Set(allDefs().map((d) => d.name));
  // A replacement (v2 or later) only counts when Meta filed it as Utility: marketing templates do not reach US numbers.
  return Object.fromEntries(found.filter((t) => ours.has(t.name))
    .map((t) => [t.name, isReplacement(t.name) && t.category !== "UTILITY" ? "NOT_UTILITY" : t.status]));
}

/** Submits every utility template that is not there yet (the v2 names too). Never re-submits one Meta already has. A template
 *  Meta refuses is reported with Meta's own reason (message, error_user_title, error_user_msg, code, error_subcode) and the rest go on. */
export async function submitTemplates(env: KapsoEnv) {
  const waba = await wabaId(env);
  const url = `${META}/${waba}/message_templates`;
  const have = new Map(rows(await call(env, `${url}?fields=${FIELDS}&limit=200`)).map((t) => [t.name, t]));
  const out: { name: string; status: string; category?: string | null; error?: string }[] = [];
  for (const def of allDefs()) {
    const there = have.get(def.name);
    if (there) {
      out.push({ name: def.name, status: there.status, category: there.category });
      continue;
    }
    try {
      const r = obj(await call(env, url, { method: "POST", body: JSON.stringify(submission(def)) }));
      out.push({ name: def.name, status: String(r.status ?? "PENDING"), category: r.category ? String(r.category) : "UTILITY" });
    } catch (e) {
      if (!(e instanceof KapsoError)) throw e;
      out.push({ name: def.name, status: "REFUSED", error: e.detail });
    }
  }
  return out;
}

export type Health = { status: string; quality: string | null; messaging: string | null; tier: string | null; detail: Record<string, unknown> };

/** Kapso's health check of the number and Meta's quality rating and tier. */
export async function readHealth(env: KapsoEnv): Promise<Health> {
  const h = unwrap(await call(env, `${PLATFORM}/whatsapp/phone_numbers/${encodeURIComponent(env.phoneNumberId)}/health`));
  const checks = obj(h.checks);
  let q: Obj = {};
  try {
    q = obj(await call(env, `${META}/${encodeURIComponent(env.phoneNumberId)}?fields=quality_rating,messaging_limit_tier,name_status,status`));
  } catch {
    q = {};
  }
  const passed = Object.fromEntries(Object.entries(checks).map(([k, v]) => [k, obj(v).passed ?? obj(v).overall_status ?? null]));
  return {
    status: String(h.status ?? "unknown"),
    quality: q.quality_rating ? String(q.quality_rating) : null,
    messaging: obj(checks.messaging_health).overall_status ? String(obj(checks.messaging_health).overall_status) : null,
    tier: q.messaging_limit_tier ? String(q.messaging_limit_tier) : null,
    detail: { checks: passed, name_status: q.name_status ?? null, number_status: q.status ?? null, checked_at: h.checked_at ?? null },
  };
}

/** Is this health reading worth an email to the team? Only YELLOW or RED quality, or BLOCKED messaging. LIMITED at tier
 *  250 is normal for a business Meta has not verified. Keep in step with public.whatsapp_health_record. */
export const healthIsBad = (h: Pick<Health, "quality" | "messaging">) =>
  ["YELLOW", "RED"].includes((h.quality ?? "").toUpperCase()) || (h.messaging ?? "").toUpperCase() === "BLOCKED";

/** The plain text of the team email: what the reading is and what Kabsi does about it. */
export function healthAlertText(h: Pick<Health, "status" | "quality" | "messaging" | "tier">): string {
  const parts = [`Kabsi's WhatsApp number needs a look. Quality: ${h.quality ?? "unknown"}. Messaging: ${h.messaging ?? "unknown"}.`];
  if (h.tier) parts.push(`Daily limit: ${h.tier.replace(/^TIER_/, "")} business-started conversations.`);
  if (["YELLOW", "RED"].includes((h.quality ?? "").toUpperCase())) parts.push("While quality is YELLOW or RED Kabsi sends digests only.");
  if ((h.messaging ?? "").toUpperCase() === "BLOCKED") parts.push("Messaging is blocked, so nothing reaches customers or owners.");
  parts.push("Check the number in Kapso.");
  return parts.join(" ");
}

/** Is anything other than Kabsi's own code set to answer the number? Active workflows with a trigger on it, and any
 *  agent or auto-reply flag on Kapso's record of the number. */
export async function checkAutomations(env: KapsoEnv) {
  const flows = list(await call(env, `${PLATFORM}/workflows`));
  const onNumber: string[] = [];
  for (const w of flows.filter((f) => ["active", "published", "enabled"].includes(String(f.status ?? "").toLowerCase()))) {
    const triggers = list(await call(env, `${PLATFORM}/workflows/${encodeURIComponent(String(w.id))}/triggers`));
    if (triggers.some((t) => JSON.stringify(t).includes(env.phoneNumberId) || String(t.trigger_type ?? t.type ?? "") === "inbound_message")) {
      onNumber.push(String(w.name ?? w.id));
    }
  }
  const n = unwrap(await call(env, `${PLATFORM}/whatsapp/phone_numbers/${encodeURIComponent(env.phoneNumberId)}`));
  const agentFlags = Object.entries(n).filter(([k, v]) => /agent|auto_?reply|ai_/i.test(k) && v !== null && v !== false && v !== "" && !(Array.isArray(v) && !v.length))
    .map(([k]) => k);
  return { workflows: flows.length, answering_workflows: onNumber, agent_flags: agentFlags, clear: !onNumber.length && !agentFlags.length };
}
