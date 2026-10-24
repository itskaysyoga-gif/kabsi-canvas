// Staff-only Kapso actions (master plan 9.8, 9.5, 29.9), run inside the `whatsapp` function so KAPSO_API_KEY never
// leaves Supabase secrets: nobody sees it, and no session uses the Kapso connector for Kabsi (R-49).
//   - setup: register the phone-number webhook to this function; the signing secret Kapso returns goes straight into
//     Supabase Vault and is never returned, logged or printed.
//   - templates: submit the utility templates (templates.ts) that are not there yet, and report each one's status.
//   - health: read the number's health and quality rating (hourly, from pg_cron).
//   - automations: confirm no Kapso workflow or Kapso agent answers the number, so only Kabsi's own code replies.
// Answers carry ids, names and statuses only. The network is a dep, so tests never call Kapso.
import { submission, TEMPLATES } from "./templates.ts";

const PLATFORM = "https://api.kapso.ai/platform/v1";
const META = "https://api.kapso.ai/meta/whatsapp/v24.0";

export type KapsoEnv = { apiKey: string; phoneNumberId: string; wabaId?: string | null; fetch?: typeof fetch };
type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const list = (v: unknown): Obj[] => (Array.isArray(v) ? v.map(obj) : Array.isArray(obj(v).data) ? (obj(v).data as unknown[]).map(obj) : []);
const unwrap = (v: unknown): Obj => (obj(v).data && !Array.isArray(obj(v).data) ? obj(obj(v).data) : obj(v));

export class KapsoError extends Error {
  constructor(readonly status: number, readonly where: string) {
    super(`kapso ${where} ${status}`);
  }
}

async function call(env: KapsoEnv, url: string, init: RequestInit = {}): Promise<unknown> {
  const res = await (env.fetch ?? fetch)(url, {
    ...init,
    redirect: "error",
    headers: { "X-API-Key": env.apiKey, "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new KapsoError(res.status, new URL(url).pathname.split("/").slice(0, 5).join("/"));
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export const WEBHOOK_EVENTS = ["whatsapp.message.received", "whatsapp.message.sent", "whatsapp.message.delivered",
  "whatsapp.message.read", "whatsapp.message.failed"];

/** Registers the webhook (or re-registers it when its secret is not in Vault yet). Returns the webhook id only. */
export async function setupWebhook(env: KapsoEnv, url: string, o: { haveSecret: boolean; storeSecret: (s: string) => Promise<void> }) {
  const base = `${PLATFORM}/whatsapp/phone_numbers/${encodeURIComponent(env.phoneNumberId)}/webhooks`;
  const existing = list(await call(env, base)).filter((w) => w.url === url);
  if (existing.length && o.haveSecret) return { id: String(existing[0].id ?? ""), created: false };
  // A webhook whose secret Kabsi does not hold cannot be verified: replace it.
  for (const w of existing) await call(env, `${base}/${encodeURIComponent(String(w.id))}`, { method: "DELETE" });
  const made = unwrap(await call(env, base, {
    method: "POST",
    body: JSON.stringify({ whatsapp_webhook: { url, events: WEBHOOK_EVENTS, kind: "kapso", payload_version: "v2", active: true } }),
  }));
  const secret = String(made.secret_key ?? made.secret ?? "");
  if (secret.length < 16) throw new Error("kapso_webhook_no_secret");
  await o.storeSecret(secret);
  return { id: String(made.id ?? ""), created: true };
}

/** The WhatsApp business account of the number (needed for templates): the setting, else Kapso's record of the number. */
export async function wabaId(env: KapsoEnv): Promise<string> {
  if (env.wabaId) return env.wabaId;
  const n = unwrap(await call(env, `${PLATFORM}/whatsapp/phone_numbers/${encodeURIComponent(env.phoneNumberId)}`));
  const id = String(n.business_account_id ?? n.waba_id ?? obj(n.whatsapp_business_account).id ?? "");
  if (!/^\d{5,25}$/.test(id)) throw new Error("kapso_no_business_account_id");
  return id;
}

/** Submits every utility template that is not there yet. Never re-submits one Meta already has. */
export async function submitTemplates(env: KapsoEnv) {
  const waba = await wabaId(env);
  const url = `${META}/${waba}/message_templates`;
  const have = new Map(list(await call(env, `${url}?limit=200`)).map((t) => [String(t.name), String(t.status ?? "")]));
  const out: { name: string; status: string }[] = [];
  for (const def of Object.values(TEMPLATES)) {
    if (have.has(def.name)) {
      out.push({ name: def.name, status: have.get(def.name)! });
      continue;
    }
    const r = obj(await call(env, url, { method: "POST", body: JSON.stringify(submission(def)) }));
    out.push({ name: def.name, status: String(r.status ?? "PENDING") });
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
