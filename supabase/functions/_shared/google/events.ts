// Google Business Profile notifications through Pub/Sub (P0.7-03, K-37). Google publishes to Kabsi's topic; the push
// subscription calls the google-events function with an OIDC token signed by Google for Kabsi's push service account.
// This file checks that token and turns a notification into jobs. A notification never writes business data itself:
// it only offers the same jobs the schedule offers (the daily reconciliation stays, D250), sooner.
// https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions
// https://developers.google.com/my-business/reference/notifications/rest/v1/NotificationSetting

// Kabsi's topic (lane R, 25 Oct 2026). Not a secret: Google only publishes to it, and only the push subscription with
// Kabsi's service account reads it.
export const KABSI_PUBSUB_TOPIC = "projects/smiling-chess-505915-b7/topics/gbp-notifications";

const ISSUERS = ["accounts.google.com", "https://accounts.google.com"];
export const GOOGLE_CERTS = "https://www.googleapis.com/oauth2/v3/certs";

export type Jwk = JsonWebKey & { kid?: string };
export type PushAuth = { audience: string; serviceAccount: string; keys: () => Promise<Jwk[]>; now?: () => number };

const b64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
const json = (s: string) => JSON.parse(new TextDecoder().decode(b64url(s)));

/** Checks the push request's bearer token: signed by Google (RS256, a current Google key), the right audience, the
 *  push service account with a verified email, not expired. Returns the reason it failed, or null when it passes. */
export async function pushTokenProblem(authorization: string | null, a: PushAuth): Promise<string | null> {
  const token = /^Bearer\s+(\S+)$/.exec(authorization ?? "")?.[1];
  if (!token) return "no_token";
  const parts = token.split(".");
  if (parts.length !== 3) return "malformed";
  let header: { alg?: string; kid?: string }, claims: Record<string, unknown>;
  try {
    header = json(parts[0]);
    claims = json(parts[1]);
  } catch {
    return "malformed";
  }
  if (header.alg !== "RS256") return "bad_alg";
  const jwk = (await a.keys()).find((k) => k.kid === header.kid);
  if (!jwk) return "unknown_key";
  const key = await crypto.subtle.importKey("jwk", { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true }, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64url(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!ok) return "bad_signature";
  const now = Math.floor((a.now?.() ?? Date.now()) / 1000);
  if (!ISSUERS.includes(String(claims.iss))) return "bad_issuer";
  if (claims.aud !== a.audience) return "bad_audience";
  if (claims.email !== a.serviceAccount || claims.email_verified !== true) return "bad_account";
  if (typeof claims.exp !== "number" || claims.exp < now - 60) return "expired";
  if (typeof claims.iat === "number" && claims.iat > now + 300) return "not_yet_valid";
  return null;
}

let certs: { keys: Jwk[]; at: number } | null = null;
/** Google's public keys, kept for an hour. */
export async function googleKeys(): Promise<Jwk[]> {
  if (certs && Date.now() - certs.at < 3600_000) return certs.keys;
  const res = await fetch(GOOGLE_CERTS);
  if (!res.ok) throw new Error(`google certs ${res.status}`);
  certs = { keys: ((await res.json()).keys ?? []) as Jwk[], at: Date.now() };
  return certs.keys;
}

export type Notification = { messageId: string; type: string; location: string | null; publishedAt: string | null };

/** The Pub/Sub push body: { message: { data: base64 JSON, messageId, publishTime }, subscription }. Google names the
 *  location or the review by resource name ("accounts/1/locations/2/reviews/3"); only "locations/<id>" is kept. */
export function parsePush(body: unknown): Notification | null {
  const m = (body as { message?: { data?: string; messageId?: string; message_id?: string; publishTime?: string } } | null)?.message;
  const id = m?.messageId ?? m?.message_id;
  if (!m || typeof id !== "string" || !id || typeof m.data !== "string") return null;
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(new TextDecoder().decode(b64url(m.data)));
  } catch {
    return null;
  }
  const type = String(data.type ?? data.notificationType ?? "").toUpperCase();
  if (!/^[A-Z_]{3,60}$/.test(type)) return null;
  const names = [data.location, data.locationName, data.location_name, data.review, data.reviewName, data.review_name, data.mediaItem, data.media_item_name]
    .filter((v): v is string => typeof v === "string");
  const loc = names.map((n) => /(?:^|\/)(locations\/[A-Za-z0-9_-]{1,64})(?:\/|$)/.exec(n)?.[1]).find(Boolean) ?? null;
  return { messageId: id.slice(0, 200), type, location: loc, publishedAt: typeof m.publishTime === "string" ? m.publishTime : null };
}

/** The jobs one notification offers for a business. Every notification also reads Google's state for it (18.2). */
export function jobsFor(type: string): string[] {
  const state = "google_state_check";
  switch (type) {
    case "NEW_REVIEW":
    case "UPDATED_REVIEW":
      return ["sync_reviews", state];
    case "GOOGLE_UPDATE":
      return ["protection_check", state];
    case "NEW_CUSTOMER_MEDIA":
      return ["detect_tasks", state];
    default:
      // VOICE_OF_MERCHANT_UPDATED, LOSS_OF_VOICE_OF_MERCHANT, DUPLICATE_LOCATION and anything new.
      return [state];
  }
}
