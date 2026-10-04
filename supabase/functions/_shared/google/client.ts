// The one place Kabsi talks to Google (K-34, guardrail 9). Every Google URL lives in this folder; nothing else in
// the repo may call googleapis.com (scripts/check-google-calls.mjs in CI).
// Google Business Profile runs as hello@kabsi.co (one central Manager account). GOOGLE_MODE=mock (the default
// until the Business Profile API grant) answers from the mock modules; GOOGLE_MODE=live uses GOOGLE_CLIENT_ID,
// GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN. A demo business is always mock (R-17). The browser banner reads
// app_settings.google_mode through google_mode(); these functions read GOOGLE_MODE.
// Places API (New) is separate: it runs on PLACES_API_KEY and works before the grant.
import { isConciergeLocationId } from "../concierge.ts";
import { googleModeFor } from "../demo.ts";

export const AM = "https://mybusinessaccountmanagement.googleapis.com/v1";
export const BI = "https://mybusinessbusinessinformation.googleapis.com/v1";
export const V4 = "https://mybusiness.googleapis.com/v4";
export const PERF = "https://businessprofileperformance.googleapis.com/v1";
export const NOTIF = "https://mybusinessnotifications.googleapis.com/v1";
export const VERIF = "https://mybusinessverifications.googleapis.com/v1";
export const PLACE_ACTIONS = "https://mybusinessplaceactions.googleapis.com/v1";
export const PLACES = "https://places.googleapis.com/v1";
const TOKEN = "https://oauth2.googleapis.com/token";

export type Mode = "mock" | "live";
export const googleMode = (): Mode => (Deno.env.get("GOOGLE_MODE") === "live" ? "live" : "mock");
export const modeFor = (locationId: string): Mode => googleModeFor(locationId, googleMode());

// A concierge business has no Google location: a person does the Google steps by hand (Q07). Any call that would
// reach Google, or the mock, for one of those ids is a bug, so it fails loudly before touching anything.
export function assertNotConcierge(locationId: string | null | undefined) {
  if (isConciergeLocationId(locationId)) throw new Error("concierge_location");
}

// The mock modules keep their state in Kabsi's database (mock_google_reviews, mock_listings). Loaded on first use so
// the mock modules can be imported by the Deno tests without database secrets.
export async function mockDb() {
  const { admin } = await import("../kabsi.ts");
  return admin();
}

let cached: { token: string; exp: number } | null = null;
async function accessToken() {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const data = await refreshToken();
  if (!data.ok) throw new Error(`google token ${data.status}: ${data.body.error ?? ""}`);
  cached = { token: String(data.body.access_token), exp: Date.now() + Number(data.body.expires_in) * 1000 };
  return cached.token;
}

// One refresh of the central account's token. Also used by the health check, which reports the scope.
export async function refreshToken(): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
      refresh_token: Deno.env.get("GOOGLE_REFRESH_TOKEN") ?? "",
      grant_type: "refresh_token",
    }),
  });
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) };
}

// Business Profile request. Retries with truncated exponential backoff and full jitter (base 500 ms, cap 8 s,
// 4 tries): always on 429 (Google didn't process the call); on 5xx only for GET/PUT/PATCH/DELETE, because a POST
// (new post, new photo) may have gone through and must not be sent twice.
const RETRIES = 4;
// deno-lint-ignore no-explicit-any
export async function gbp(url: string, init: RequestInit = {}): Promise<any> {
  const method = (init.method ?? "GET").toUpperCase();
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { ...init, headers: { authorization: `Bearer ${await accessToken()}`, "content-type": "application/json", ...(init.headers ?? {}) } });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;
    const retryable = res.status === 429 || (res.status >= 500 && method !== "POST");
    if (!retryable || attempt >= RETRIES - 1) {
      throw new Error(`google ${res.status} ${url.split("?")[0]}: ${JSON.stringify(data).slice(0, 300)}`);
    }
    const wait = Math.random() * Math.min(8000, 500 * 2 ** attempt);
    await new Promise((r) => setTimeout(r, wait));
  }
}

// Places API (New) request with a field mask (always required by Google). Returns the raw response so callers keep
// their own error handling.
export function places(path: string, key: string, fieldMask: string, init: RequestInit = {}) {
  return fetch(`${PLACES}${path}`, {
    ...init,
    headers: { "content-type": "application/json", "x-goog-api-key": key, "x-goog-fieldmask": fieldMask, ...(init.headers ?? {}) },
  });
}
