// Shared helpers for every Kabsi Edge Function.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

export const APP_URL = Deno.env.get("APP_URL") ?? "https://kabsi-app.lovable.app";
const LOGO = "https://ynjdqjlmdwjgbfezevxy.supabase.co/functions/v1/brand/mark.png";
const SENTRY_DSN = Deno.env.get("SENTRY_DSN_EDGE") ??
  "https://59fbe71e08e8d7db4f7c5e477acb2fb5@o4512003528720384.ingest.de.sentry.io/4512145412456528";

// ─── responses
export const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};
export function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...CORS, ...extra } });
}
export function fail(code: string, message: string, status = 400) {
  return json({ error: code, message }, status);
}

// ─── clients
let adminClient: SupabaseClient | null = null;
export function admin(): SupabaseClient {
  adminClient ??= createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  return adminClient;
}

// The signed-in user behind a browser call (verify_jwt already checked the signature).
export async function currentUser(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin().auth.getUser(token);
  return error ? null : data.user;
}

// ─── internal calls (pg_cron and DB triggers send x-cron-secret)
let cronSecret: string | null = null;
export async function isInternal(req: Request) {
  const given = req.headers.get("x-cron-secret");
  if (!given) return false;
  if (!cronSecret) {
    const { data } = await admin().rpc("internal_secret", { p_name: "cron_secret" });
    cronSecret = (data as string | null) ?? null;
  }
  return !!cronSecret && timingSafeEqual(given, cronSecret);
}
export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// D266: sensitive/expensive routes (Google writes, AI calls, action-link execution, paid lookups) pass
// failClosed so a limiter outage blocks them instead of removing the limit; cheap public routes (leads,
// review-link redirects) keep the old fail-open default so a DB blip never turns away a real customer.
export async function rateLimit(key: string, max: number, windowSeconds: number, opts: { failClosed?: boolean } = {}) {
  const { data, error } = await admin().rpc("hit_rate_limit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
  if (error) {
    log("rate_limit", { ok: false, key, failClosed: !!opts.failClosed, err: error.message });
    return !opts.failClosed;
  }
  return Boolean(data);
}

// ─── logging + Sentry (minimal envelope client, no SDK)
export function log(fn: string, fields: Record<string, unknown>) {
  console.log(JSON.stringify({ fn, ...fields }));
}
// D266: review text, reviewer names, emails and tokens must never reach Sentry or jobs_log — this is the
// one choke point every captureError call goes through, so scrubbing here covers every call site at once.
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const SENSITIVE_KEYS = new Set([
  "comment", "reviewer_name", "body", "instruction", "text", "payload", "email", "to", "token", "authorization",
  "sig", "signature", "x-nowpayments-sig", "pay_address", "api_key", "x-api-key",
]);
function scrub(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return value.replace(EMAIL_RE, "[email]").slice(0, 300);
  if (depth >= 3 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => scrub(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? "[redacted]" : scrub(v, depth + 1);
  }
  return out;
}
export async function captureError(fn: string, error: unknown, extra: Record<string, unknown> = {}) {
  const err = error instanceof Error ? error : new Error(String(error));
  const safeMessage = String(err.message ?? "").replace(EMAIL_RE, "[email]").slice(0, 300);
  log(fn, { ok: false, err: safeMessage });
  try {
    const m = SENTRY_DSN.match(/^https:\/\/([^@]+)@([^/]+)\/(\d+)$/);
    if (!m) return;
    const [, key, host, project] = m;
    const eventId = crypto.randomUUID().replace(/-/g, "");
    const event = {
      event_id: eventId, timestamp: Date.now() / 1000, platform: "javascript", level: "error",
      environment: Deno.env.get("KABSI_ENV") ?? "production", server_name: fn, tags: { function: fn },
      exception: { values: [{ type: err.name, value: safeMessage, stacktrace: { frames: parseStack(err.stack) } }] },
      extra: scrub(extra),
    };
    const body = `${JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() })}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(event)}`;
    await fetch(`https://${host}/api/${project}/envelope/`, {
      method: "POST",
      headers: { "content-type": "application/x-sentry-envelope", "x-sentry-auth": `Sentry sentry_version=7, sentry_key=${key}, sentry_client=kabsi-edge/1.0` },
      body,
    });
  } catch { /* reporting must never throw */ }
}
function parseStack(stack?: string) {
  return (stack ?? "").split("\n").slice(1, 20).reverse().map((line) => ({ function: line.trim() }));
}
export async function jobLog(job: string, ok: boolean, detail: Record<string, unknown> = {}) {
  await admin().from("jobs_log").insert({ job, ok, detail: scrub(detail) });
}

// D266: shared by every publish path (reviews, posts, photos). Google's own 400/401/403/404 mean the
// request was rejected before anything was written, so it's safe to hand the item back to the owner.
// Anything else (timeout, network, 5xx) is uncertain — the write may already be live on Google even though
// we never saw a clean response — so it must NOT auto-revert; that would let a retry create a duplicate.
export function isDefiniteGoogleRejection(e: unknown) {
  return /^Error: google (400|401|403|404) /.test(String(e));
}

// ─── email (Resend). Same look as emails/build.py.
const FONT = "'Readex Pro',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
export function emailLayout(o: { preheader: string; title: string; bodyHtml: string; button?: { label: string; url: string }; note?: string }) {
  const button = o.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0 0;"><tr><td style="background:#FFD60A;border-radius:14px;"><a href="${esc(o.button.url)}" style="display:inline-block;padding:15px 26px;font-family:${FONT};font-size:17px;font-weight:700;color:#000000;text-decoration:none;">${esc(o.button.label)}</a></td></tr></table>`
    : "";
  const note = o.note ? `<p style="margin:20px 0 0 0;font-size:14px;line-height:1.6;color:#5E5B55;">${o.note}</p>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(o.title)}</title></head>
<body style="margin:0;padding:0;background:#F6F4EF;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F4EF;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 4px 20px 4px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle;"><img src="${LOGO}" width="32" height="32" alt="Kabsi" style="display:block;border:0;width:32px;height:32px;"></td>
<td style="vertical-align:middle;padding-left:10px;font-family:${FONT};font-size:22px;font-weight:700;color:#000000;">kabsi</td></tr></table></td></tr>
<tr><td style="background:#FFFFFF;border-radius:14px;padding:36px 32px;font-family:${FONT};color:#111111;font-size:16px;line-height:1.6;">
<h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;font-weight:700;">${esc(o.title)}</h1>${o.bodyHtml}${button}${note}</td></tr>
<tr><td style="padding:20px 4px 0 4px;font-family:${FONT};font-size:13px;line-height:1.6;color:#5E5B55;">Nothing is published until you approve it.<br>Questions? Reply to this email or write to <a href="mailto:hello@kabsi.co" style="color:#111111;">hello@kabsi.co</a>.<br>Google and Google Business Profile are trademarks of Google LLC. Kabsi is independent and not affiliated with, sponsored by or endorsed by Google.<br>Kabsi is operated by Hussein Slim, Dubai, United Arab Emirates. Contact: hello@kabsi.co</td></tr>
</table></td></tr></table></body></html>`;
}

// The From address lives in app_settings.email_from (migration 016), so switching sender is one SQL update.
let fromCache: { value: string; at: number } | null = null;
async function emailFrom() {
  if (fromCache && Date.now() - fromCache.at < 300_000) return fromCache.value;
  const { data } = await admin().from("app_settings").select("value").eq("key", "email_from").maybeSingle();
  fromCache = { value: (data?.value as string | undefined) || "Kabsi <hello@send.kabsi.co>", at: Date.now() };
  return fromCache.value;
}

export async function sendEmail(o: {
  kind: string; to: string; subject: string; html: string; text: string; dedupeKey: string;
  locationId?: string | null; partnerId?: string | null; replyTo?: string;
}) {
  const db = admin();
  const { data: row, error } = await db.from("emails").insert({
    kind: o.kind, to_address: o.to, subject: o.subject, dedupe_key: o.dedupeKey,
    location_id: o.locationId ?? null, partner_id: o.partnerId ?? null,
  }).select("id").single();
  if (error) {
    if (error.code === "23505") return { skipped: "duplicate" }; // already sent: jobs are safe to re-run
    throw error;
  }
  if (/@(test\.local|example\.(com|org))$/i.test(o.to)) {
    await db.from("emails").update({ status: "failed", error: "test address, not sent" }).eq("id", row.id);
    return { skipped: "test_address" };
  }
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    await db.from("emails").update({ status: "failed", error: "RESEND_API_KEY not set" }).eq("id", row.id);
    return { skipped: "no_resend_key" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json", "idempotency-key": o.dedupeKey.slice(0, 256) },
    body: JSON.stringify({ from: await emailFrom(), reply_to: o.replyTo ?? "hello@kabsi.co", to: [o.to], subject: o.subject, html: o.html, text: o.text }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    await db.from("emails").update({ status: "failed", error: JSON.stringify(payload).slice(0, 500) }).eq("id", row.id);
    throw new Error(`resend ${res.status}`);
  }
  await db.from("emails").update({ status: "sent", resend_id: payload.id ?? null }).eq("id", row.id);
  return { sent: payload.id };
}

// Owner addresses for a location: members' login emails plus extra alert emails.
export async function ownerEmails(locationId: string): Promise<string[]> {
  const { data, error } = await admin().rpc("location_owner_emails", { p_location: locationId });
  if (error) throw error;
  return (data as string[] | null) ?? [];
}

// Cloudflare Turnstile (Q10). The secret lives in Supabase secrets as TURNSTILE_SECRET_KEY.
// Until the secret is set the check passes, so a missing secret never takes a public form down;
// once it is set, a missing or bad token is refused.
export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const j = (await res.json()) as { success?: boolean };
    return j.success === true;
  } catch (e) {
    log("turnstile", { ok: false, err: String(e) });
    return false;
  }
}
