// Launch 2 part A (master plan 30.36 item 4, docs/EVENTS.md): server copies of the two browser events Meta's ads learn
// from before sign-up, Lead and FreeScanCompleted, through the Conversions API with the event id the browser's Pixel used,
// so Meta keeps one of the pair (deduplication). Sent only for a visitor whose stored privacy choice (the latest
// consent_records row for their visitor id, within 12 months) allows ad measurement; a browser that merely has no choice
// yet is not enough. The only person field is external_id, the SHA-256 of the random visitor id (EVENTS.md); fbp and fbc
// are Meta's own cookies. No email, phone, name, IP address or business is sent or logged.
// Called by the consent function (POST /consent/meta). Mock: without META_PIXEL_ID and META_CAPI_TOKEN nothing is sent and
// the payload is logged without its hashed id, so a session can show the pair without Meta.
import { log, sha256Hex } from "./kabsi.ts";

export const WEB_EVENTS = ["Lead", "FreeScanCompleted"] as const;
export type WebEvent = (typeof WEB_EVENTS)[number];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CONTENT = new Set(["free_check_report", "founding_25"]);
const CONSENT_DAYS = 365;
const GRAPH = "https://graph.facebook.com/v21.0";

export type WebInput = {
  visitorId: string;
  eventName: WebEvent;
  eventId: string;
  sourceUrl: string;
  fbp: string | null;
  fbc: string | null;
  contentName: string | null;
};

/** The request body as one event to send, or the reason it is refused. Pure. */
export function readWebEvent(b: Record<string, unknown>): WebInput | { error: string } {
  const visitorId = typeof b.visitor_id === "string" ? b.visitor_id.toLowerCase() : "";
  if (!UUID.test(visitorId)) return { error: "bad_visitor" };
  const eventName = b.event_name as WebEvent;
  if (!WEB_EVENTS.includes(eventName)) return { error: "bad_event" };
  const eventId = typeof b.event_id === "string" ? b.event_id.toLowerCase() : "";
  if (!UUID.test(eventId)) return { error: "bad_event_id" };
  let sourceUrl = "";
  try {
    const u = new URL(String(b.event_source_url ?? ""));
    // Only kabsi.co's own pages, and only the path: never a query string (a UTM tag is not needed, a token never sent).
    if (u.protocol === "https:" && (u.hostname === "kabsi.co" || u.hostname === "www.kabsi.co")) {
      sourceUrl = `https://kabsi.co${u.pathname}`.slice(0, 300);
    }
  } catch { /* refused below */ }
  if (!sourceUrl) return { error: "bad_url" };
  const cookie = (v: unknown, re: RegExp) => (typeof v === "string" && re.test(v) ? v : null);
  const content = typeof b.content_name === "string" && CONTENT.has(b.content_name) ? b.content_name : null;
  return {
    visitorId,
    eventName,
    eventId,
    sourceUrl,
    fbp: cookie(b.fbp, /^fb\.\d\.\d{10,13}\.\d{1,25}$/),
    fbc: cookie(b.fbc, /^fb\.\d\.\d{10,13}\.[A-Za-z0-9_-]{1,500}$/),
    contentName: eventName === "Lead" ? content : null,
  };
}

/** The visitor's stored choice allows ad measurement: their latest record says yes and is under 12 months old. */
export function storedAdsYes(latest: { advertising: boolean; created_at: string } | null, now = Date.now()): boolean {
  if (!latest || latest.advertising !== true) return false;
  return now - Date.parse(latest.created_at) < CONSENT_DAYS * 86_400_000;
}

/** The one event Meta receives, with the browser's event id and name. */
export async function webCapiEvent(i: WebInput, now = Date.now()): Promise<Record<string, unknown>> {
  const user: Record<string, unknown> = { external_id: [await sha256Hex(i.visitorId)] };
  if (i.fbp) user.fbp = i.fbp;
  if (i.fbc) user.fbc = i.fbc;
  return {
    event_name: i.eventName,
    event_time: Math.floor(now / 1000),
    event_id: i.eventId,
    action_source: "website",
    event_source_url: i.sourceUrl,
    user_data: user,
    ...(i.contentName ? { custom_data: { content_name: i.contentName } } : {}),
  };
}

/** The payload as the log shows it: everything but the hashed id and Meta's cookies. */
export function loggable(ev: Record<string, unknown>): Record<string, unknown> {
  const u = (ev.user_data ?? {}) as Record<string, unknown>;
  return {
    event_name: ev.event_name,
    event_id: ev.event_id,
    event_time: ev.event_time,
    action_source: ev.action_source,
    event_source_url: ev.event_source_url,
    user_data_fields: Object.keys(u).sort(),
    ...(ev.custom_data ? { custom_data: ev.custom_data } : {}),
  };
}

export type WebResult = "sent" | "skipped_mock" | "skipped_no_consent";

type Latest = { advertising: boolean; created_at: string } | null;
/**
 * Checks the stored choice, then sends (or, in mock, logs) the event. `latest` reads the visitor's newest consent record.
 * `env` and `fetchImpl` are passed in so the tests run it without Meta.
 */
export async function sendWebCapi(
  i: WebInput,
  latest: (visitorId: string) => Promise<Latest>,
  env: (k: string) => string | undefined = (k) => Deno.env.get(k),
  fetchImpl: typeof fetch = fetch,
): Promise<WebResult> {
  if (!storedAdsYes(await latest(i.visitorId))) {
    log("meta_capi_web", { ok: true, skipped: "no_consent", event: i.eventName });
    return "skipped_no_consent";
  }
  const ev = await webCapiEvent(i);
  const pixel = env("META_PIXEL_ID") ?? "";
  const token = env("META_CAPI_TOKEN") ?? "";
  if (!pixel || !token) {
    log("meta_capi_web", { ok: true, mock: true, sent_fields: loggable(ev) });
    return "skipped_mock";
  }
  const test = env("META_TEST_EVENT_CODE") ?? "";
  const res = await fetchImpl(`${GRAPH}/${encodeURIComponent(pixel)}/events`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ data: [ev], ...(test ? { test_event_code: test } : {}) }),
  });
  if (!res.ok) throw new Error(`meta_capi_web ${res.status}: ${(await res.text()).slice(0, 200)}`);
  log("meta_capi_web", { ok: true, sent_fields: loggable(ev), test_event: Boolean(test) });
  return "sent";
}
