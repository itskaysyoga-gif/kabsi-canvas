// Shared helpers for every Kabsi Edge Function.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { unsubscribeHeaders } from "./email/unsubscribe.ts";
import { carriesUser } from "./jwt-user.ts";
import { RELEASE } from "./release.ts";
import { scrubFields as scrub, scrubText } from "./log-scrub.ts";

export const APP_URL = Deno.env.get("APP_URL") ?? "https://kabsi.co";
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
  if (!token || !carriesUser(token)) return null;
  const { data, error } = await admin().auth.getUser(token);
  return error ? null : data.user;
}

// ─── internal calls (pg_cron and DB triggers send x-cron-secret)
let cronSecret: string | null = null;
// The shared internal secret (also the key that signs one-click unsubscribe links), read once from the database.
export async function internalSecret(): Promise<string | null> {
  if (!cronSecret) {
    const { data } = await admin().rpc("internal_secret", { p_name: "cron_secret" });
    cronSecret = (data as string | null) ?? null;
  }
  return cronSecret;
}
export async function isInternal(req: Request) {
  const given = req.headers.get("x-cron-secret");
  if (!given) return false;
  const secret = await internalSecret();
  return !!secret && timingSafeEqual(given, secret);
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
    // Sec 1: only the key's kind ("authcode", "wa_voice"), never the id, address or number after it.
    log("rate_limit", { ok: false, key: key.split(":")[0], failClosed: !!opts.failClosed, err: error.message });
    return !opts.failClosed;
  }
  return Boolean(data);
}

// ─── logging + Sentry (minimal envelope client, no SDK)
// Sec 1: every log line goes through the same scrub as Sentry: sensitive keys become "[redacted]", and emails, phone
// numbers and tokens in a link's query lose their value, whatever field they ride in.
export function log(fn: string, fields: Record<string, unknown>) {
  console.log(JSON.stringify({ fn, ...(scrub(fields) as Record<string, unknown>) }));
}
// D266: review text, reviewer names, emails and tokens must never reach Sentry or jobs_log: captureError, jobLog and log
// are the choke points, and they share one scrub (log-scrub.ts, pure so the Node tests can run it too).
export { scrubText };
export async function captureError(fn: string, error: unknown, extra: Record<string, unknown> = {}) {
  const err = error instanceof Error ? error : new Error(String(error));
  const safeMessage = scrubText(String(err.message ?? "")).slice(0, 300);
  log(fn, { ok: false, err: safeMessage });
  try {
    const m = SENTRY_DSN.match(/^https:\/\/([^@]+)@([^/]+)\/(\d+)$/);
    if (!m) return;
    const [, key, host, project] = m;
    const eventId = crypto.randomUUID().replace(/-/g, "");
    const event = {
      event_id: eventId, timestamp: Date.now() / 1000, platform: "javascript", level: "error",
      // P0.6-08 (K-118), Ops 1 part B (29.9): the release is the commit deploy.yml built (release.ts); before that file is
      // stamped, Supabase's own DENO_DEPLOYMENT_ID still names the version.
      environment: Deno.env.get("KABSI_ENV") ?? "production", server_name: fn, tags: { function: fn },
      release: RELEASE !== "dev" ? RELEASE : Deno.env.get("DENO_DEPLOYMENT_ID") ?? undefined,
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

// ─── email (Resend). Layout and buttons live in email-layout.ts (no environment access, so Deno tests can import it).
export { emailButton, emailLink, esc } from "./email-layout.ts";

// The From address lives in app_settings.email_from (migration 016), so switching sender is one SQL update.
// Two sending subdomains (G-22, R-03): send.kabsi.co for account and product mail, news.kabsi.co for lifecycle mail.
// Master plan 30.4: Kabsi's own product mail goes from "Kabsi <hello@send.kabsi.co>" with Reply-To hello@kabsi.co (below),
// so the root domain keeps its reputation for people's own mail. app_settings.email_from must hold the same address
// (migration 20261024215145); the value there wins over the fallback in this constant.
const FROM = { send: { key: "email_from", fallback: "Kabsi <hello@send.kabsi.co>" }, news: { key: "email_from_news", fallback: "Kabsi <hello@news.kabsi.co>" } } as const;
export type Stream = keyof typeof FROM;
const fromCache = new Map<Stream, { value: string; at: number }>();
async function emailFrom(stream: Stream) {
  const hit = fromCache.get(stream);
  if (hit && Date.now() - hit.at < 300_000) return hit.value;
  const { data } = await admin().from("app_settings").select("value").eq("key", FROM[stream].key).maybeSingle();
  const value = (data?.value as string | undefined) || FROM[stream].fallback;
  fromCache.set(stream, { value, at: Date.now() });
  return value;
}

// The outbox: one emails row per email (the delivery log), then Resend. Callers do not use this directly: everything
// goes through notify() (notify.ts), which applies each person's choices, quiet hours, the digest and dedupe first.
export async function sendEmail(o: {
  kind: string; to: string; subject: string; html: string; text: string; dedupeKey: string;
  locationId?: string | null; replyTo?: string; category?: string | null; notificationId?: string | null;
  /** Mail the owner can switch off: the one-click unsubscribe link, sent as the List-Unsubscribe headers (RFC 8058). */
  unsubscribeUrl?: string | null; stream?: Stream;
}) {
  const db = admin();
  // Demo workspace (P0.1-06, R-17): a demo business only ever emails the demo login. Nothing else is written or sent.
  if (o.locationId) {
    const { data: allowed, error: ae } = await db.rpc("email_allowed_for_location", { p_location: o.locationId, p_to: o.to });
    if (ae) throw ae;
    if (allowed === false) return { skipped: "demo" };
  }
  let rowId: string;
  const { data: row, error } = await db.from("emails").insert({
    kind: o.kind, to_address: o.to, subject: o.subject, dedupe_key: o.dedupeKey, category: o.category ?? null,
    notification_id: o.notificationId ?? null, location_id: o.locationId ?? null,
  }).select("id").single();
  if (error) {
    if (error.code !== "23505") throw error;
    // Already sent: jobs are safe to re-run. A send Resend refused (its answer is stored as JSON) is tried once more.
    const { data: prior } = await db.from("emails").select("id, status, error").eq("dedupe_key", o.dedupeKey).maybeSingle();
    if (!prior || prior.status !== "failed" || !String(prior.error ?? "").startsWith("{")) return { skipped: "duplicate" };
    rowId = prior.id as string;
  } else {
    rowId = row.id as string;
  }
  if (/@(test\.local|example\.(com|org))$/i.test(o.to)) {
    await db.from("emails").update({ status: "failed", error: "test address, not sent" }).eq("id", rowId);
    return { skipped: "test_address" };
  }
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    await db.from("emails").update({ status: "failed", error: "RESEND_API_KEY not set" }).eq("id", rowId);
    return { skipped: "no_resend_key" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json", "idempotency-key": o.dedupeKey.slice(0, 256) },
    body: JSON.stringify({
      from: await emailFrom(o.stream ?? "send"), reply_to: o.replyTo ?? "hello@kabsi.co", to: [o.to], subject: o.subject, html: o.html, text: o.text,
      ...(o.unsubscribeUrl ? { headers: unsubscribeHeaders(o.unsubscribeUrl) } : {}),
    }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    await db.from("emails").update({ status: "failed", error: JSON.stringify(payload).slice(0, 500) }).eq("id", rowId);
    throw new Error(`resend ${res.status}`);
  }
  await db.from("emails").update({ status: "sent", resend_id: payload.id ?? null, error: null }).eq("id", rowId);
  return { sent: payload.id as string, id: rowId };
}

// Cloudflare Turnstile (Q10). The secret lives in Supabase secrets as TURNSTILE_SECRET_KEY.
// Sec 2: a missing secret fails closed (every token is refused and Sentry is told), except on a local stack, where the
// forms are tried without Cloudflare. A missing or bad token is always refused once the secret is set.
export function isLocalRun(env: (name: string) => string | undefined = (n) => Deno.env.get(n)): boolean {
  const url = env("SUPABASE_URL") ?? "";
  return /^https?:\/\/(127\.0\.0\.1|localhost|kong|host\.docker\.internal)([:/]|$)/.test(url) || env("KABSI_ENV") === "local";
}
let turnstileMissingReported = false;
export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) {
    if (isLocalRun()) return true;
    if (!turnstileMissingReported) {
      turnstileMissingReported = true;
      await captureError("turnstile", new Error("TURNSTILE_SECRET_KEY is not set: public forms refuse every visitor"));
    }
    return false;
  }
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const j = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (j.success === true) return true;
    // Hotfix 20h: the codes say whether the visitor failed or Kabsi's own secret is wrong (invalid-input-secret).
    const codes = j["error-codes"] ?? [];
    log("turnstile", { ok: false, codes });
    if (codes.includes("invalid-input-secret") || codes.includes("missing-input-secret")) {
      await captureError("turnstile", new Error(`siteverify rejected the secret: ${codes.join(",")}`));
    }
    return false;
  } catch (e) {
    log("turnstile", { ok: false, err: String(e) });
    return false;
  }
}
