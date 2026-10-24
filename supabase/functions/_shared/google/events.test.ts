// Run: deno test supabase/functions/_shared/google/events.test.ts
// P0.7-03 and 18.2: a forged push is refused; a real one is read and offers jobs, never writes data; Google's state for
// the profile maps to one action, on the mock and on the live fixture.
import assert from "node:assert/strict";
import { jobsFor, type Jwk, parsePush, pushTokenProblem } from "./events.ts";
import { googleAction, stateDue, stateSummary } from "./state/merchant.ts";
import fxMock from "../../../../tests/fixtures/google/verifications.voiceOfMerchant.json" with { type: "json" };
import fxLive from "../../../../tests/fixtures/google/live/verifications.voiceOfMerchant.yawmiyati.json" with { type: "json" };
import { getVoiceOfMerchantState } from "./verifications/mock.ts";

const AUD = "https://example.supabase.co/functions/v1/google-events";
const SA = "kabsi-pubsub@project.iam.gserviceaccount.com";
const NOW = Date.parse("2026-10-24T12:00:00Z");
const enc = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
const other = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
const jwk = { ...(await crypto.subtle.exportKey("jwk", pair.publicKey)), kid: "k1" } as Jwk;
const keys = () => Promise.resolve([jwk]);

async function token(claims: Record<string, unknown> = {}, o: { key?: CryptoKey; kid?: string; alg?: string } = {}) {
  const head = enc({ alg: o.alg ?? "RS256", kid: o.kid ?? "k1", typ: "JWT" });
  const body = enc({ iss: "https://accounts.google.com", aud: AUD, email: SA, email_verified: true, iat: NOW / 1000 - 10, exp: NOW / 1000 + 3600, ...claims });
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", o.key ?? pair.privateKey, new TextEncoder().encode(`${head}.${body}`)));
  return `Bearer ${head}.${body}.${btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}
const check = (auth: string | null) => pushTokenProblem(auth, { audience: AUD, serviceAccount: SA, keys, now: () => NOW });

Deno.test("push: Google's token for Kabsi's push account and audience passes", async () => {
  assert.equal(await check(await token()), null);
});

Deno.test("push: a forged push is refused (no token, wrong key, unknown key, wrong audience, account, issuer, expired)", async () => {
  assert.equal(await check(null), "no_token");
  assert.equal(await check("Bearer abc"), "malformed");
  assert.equal(await check(await token({}, { key: other.privateKey })), "bad_signature");
  assert.equal(await check(await token({}, { kid: "nope" })), "unknown_key");
  assert.equal(await check(await token({}, { alg: "HS256" })), "bad_alg");
  assert.equal(await check(await token({ aud: "https://evil.example" })), "bad_audience");
  assert.equal(await check(await token({ email: "someone@else.com" })), "bad_account");
  assert.equal(await check(await token({ email_verified: false })), "bad_account");
  assert.equal(await check(await token({ iss: "https://evil.example" })), "bad_issuer");
  assert.equal(await check(await token({ exp: NOW / 1000 - 3600 })), "expired");
  // A signed token with its claims changed afterwards.
  const [h, , s] = (await token()).slice(7).split(".");
  assert.equal(await check(`Bearer ${h}.${enc({ iss: "https://accounts.google.com", aud: AUD, email: SA, email_verified: true, exp: NOW / 1000 + 9999 })}.${s}`), "bad_signature");
});

const push = (data: unknown, id = "m-1") => ({ message: { data: btoa(JSON.stringify(data)), messageId: id, publishTime: "2026-10-24T11:59:00Z" }, subscription: "projects/p/subscriptions/s" });

Deno.test("push: a new review names the location; only locations/<id> is kept, never text", () => {
  const n = parsePush(push({ type: "NEW_REVIEW", review: "accounts/113/locations/4825254240697973899/reviews/AbC-1", location: "accounts/113/locations/4825254240697973899" }));
  assert.deepEqual(n, { messageId: "m-1", type: "NEW_REVIEW", location: "locations/4825254240697973899", publishedAt: "2026-10-24T11:59:00Z" });
  assert.equal(parsePush(push({ type: "GOOGLE_UPDATE", location_name: "locations/77" }))?.location, "locations/77");
  assert.equal(parsePush({ message: { data: "not base64 json", messageId: "x" } }), null);
  assert.equal(parsePush({}), null);
  assert.equal(parsePush(push({ type: "<script>" })), null);
});

Deno.test("push: each kind offers its jobs, and every one reads Google's state (18.2)", () => {
  assert.deepEqual(jobsFor("NEW_REVIEW"), ["sync_reviews", "google_state_check"]);
  assert.deepEqual(jobsFor("UPDATED_REVIEW"), ["sync_reviews", "google_state_check"]);
  assert.deepEqual(jobsFor("GOOGLE_UPDATE"), ["protection_check", "google_state_check"]);
  assert.deepEqual(jobsFor("NEW_CUSTOMER_MEDIA"), ["detect_tasks", "google_state_check"]);
  assert.deepEqual(jobsFor("VOICE_OF_MERCHANT_UPDATED"), ["google_state_check"]);
  assert.deepEqual(jobsFor("DUPLICATE_LOCATION"), ["google_state_check"]);
  for (const t of ["NEW_REVIEW", "GOOGLE_UPDATE", "VOICE_OF_MERCHANT_UPDATED"]) {
    assert.ok(jobsFor(t).every((k) => !/publish|write|patch/.test(k)), "a notification never writes");
  }
});

Deno.test("state: suspended, verification required, ownership, no voice, and cleared", () => {
  assert.equal(googleAction({ hasVoiceOfMerchant: false, complyWithGuidelines: { recommendationReason: "BUSINESS_LOCATION_SUSPENDED" } }), "suspended");
  assert.equal(googleAction({ hasVoiceOfMerchant: false, verify: { hasPendingVerification: false } }), "verify");
  assert.equal(googleAction({ hasVoiceOfMerchant: false, resolveOwnershipConflict: {} }), "ownership");
  assert.equal(googleAction({ hasVoiceOfMerchant: false, waitForVoiceOfMerchant: {} }), "no_voice");
  assert.equal(googleAction({ hasVoiceOfMerchant: true, hasBusinessAuthority: true }), null, "cleared again");
});

Deno.test("state: the live Yawmiyati read is clear; the documented fixture with complyWithGuidelines is suspended; the mock is clear", async () => {
  assert.equal(googleAction(fxLive.body), null);
  assert.equal(googleAction(fxMock), "suspended");
  assert.equal(googleAction(await getVoiceOfMerchantState("locations/mock-1")), null);
  assert.deepEqual(stateSummary(fxMock).actions, ["complyWithGuidelines", "verify"]);
  assert.equal(stateSummary(fxMock).reason, "BUSINESS_LOCATION_SUSPENDED");
});

Deno.test("state: read once a day in the hourly job", () => {
  assert.equal(stateDue(null), true);
  assert.equal(stateDue(new Date(NOW - 3600_000).toISOString(), NOW), false);
  assert.equal(stateDue(new Date(NOW - 24 * 3600_000).toISOString(), NOW), true);
});
