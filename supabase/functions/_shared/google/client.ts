// The one place Kabsi talks to Google (K-34, guardrail 9). Every Google URL lives in this folder; nothing else in
// the repo may call googleapis.com (scripts/check-google-calls.mjs in CI).
// Google Business Profile runs as hello@kabsi.co (one central Manager account). GOOGLE_MODE=mock (the default
// until the Business Profile API grant) answers from the mock modules; GOOGLE_MODE=live uses GOOGLE_CLIENT_ID,
// GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN. A demo business is always mock (R-17). The browser banner reads
// app_settings.google_mode through google_mode(); these functions read GOOGLE_MODE.
// Places API (New) is separate: it runs on PLACES_API_KEY and works before the grant.
import { isConciergeLocationId } from "../concierge.ts";
import { googleModeFor } from "../demo.ts";
import { RetryLater } from "../jobs.ts";

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

// Quota and rate control (K-36), shared by every function through the database (migration
// 20261004200000_google_limits.sql). Before each Business Profile request the gate is asked: at most 4 requests a
// second across Kabsi, at most 5 writes a minute to one profile (Google allows 10), and none at all while the
// circuit breaker is open (20 failed requests inside a minute pause Google calls for 5 minutes, with an alert).
// A caller waits its turn up to MAX_WAIT_MS; longer than that, or while the breaker is open, the request is not
// sent and GoogleBusy is thrown. A job that meets GoogleBusy is postponed, not counted as a failed try.
export class GoogleBusy extends RetryLater {
  override name = "GoogleBusy";
}
export type Gate = { wait_ms?: number; open_until?: string };
// What gbp needs besides Google itself; the tests replace these. The limiter's state lives in the database, reached
// with the same lazily loaded service client as the mocks.
export const io = {
  token: () => accessToken(),
  gate: async (profile: string | null): Promise<Gate> => {
    const { data, error } = await (await mockDb()).rpc("google_gate", { p_profile: profile });
    if (error) throw error;
    return data as Gate;
  },
  failure: async (): Promise<void> => {
    const { error } = await (await mockDb()).rpc("google_failure");
    if (error) throw error;
  },
  sleep: (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
};
const MAX_WAIT_MS = 65_000;

// The profile a write changes ("locations/123" in v1 and v4 URLs), or null for a read or an account-level write.
export function profileOf(url: string, method: string): string | null {
  if (method === "GET") return null;
  return url.split("?")[0].match(/(?:^|\/)(locations\/[^/:]+)/)?.[1] ?? null;
}

export async function waitTurn(profile: string | null) {
  let waited = 0;
  for (;;) {
    const g = await io.gate(profile);
    if (g.open_until) throw new GoogleBusy(`google paused until ${g.open_until} (circuit breaker)`, new Date(g.open_until));
    const wait = g.wait_ms ?? 0;
    if (wait <= 0) return;
    if (waited + wait > MAX_WAIT_MS) throw new GoogleBusy(`google rate limit: next place in ${wait} ms`, new Date(Date.now() + wait));
    await io.sleep(wait);
    waited += wait;
  }
}

// Failures the breaker counts: Google over quota or down, or no answer at all. A 4xx about one request (bad input,
// access removed for one business) says nothing about Google being up and is not counted.
const outage = (status: number) => status === 429 || status >= 500;
async function recordFailure() {
  await io.failure().catch(() => {}); // the breaker must never hide the request's own error
}

// Business Profile request. Retries with truncated exponential backoff and full jitter (base 500 ms, cap 8 s,
// 4 tries): always on 429 (Google didn't process the call); on 5xx only for GET/PUT/PATCH/DELETE, because a POST
// (new post, new photo) may have gone through and must not be sent twice. Every try passes the gate first.
const RETRIES = 4;
// deno-lint-ignore no-explicit-any
export async function gbp(url: string, init: RequestInit = {}): Promise<any> {
  const method = (init.method ?? "GET").toUpperCase();
  const profile = profileOf(url, method);
  for (let attempt = 0; ; attempt++) {
    await waitTurn(profile);
    const token = await io.token();
    let res: Response;
    try {
      res = await fetch(url, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers ?? {}) } });
    } catch (e) {
      await recordFailure();
      throw e;
    }
    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;
    if (outage(res.status)) await recordFailure();
    const retryable = res.status === 429 || (res.status >= 500 && method !== "POST");
    if (!retryable || attempt >= RETRIES - 1) {
      throw new Error(`google ${res.status} ${url.split("?")[0]}: ${JSON.stringify(data).slice(0, 300)}`);
    }
    const wait = Math.random() * Math.min(8000, 500 * 2 ** attempt);
    await io.sleep(wait);
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
