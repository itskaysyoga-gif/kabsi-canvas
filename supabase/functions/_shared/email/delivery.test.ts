import assert from "node:assert/strict";
import { signUnsubscribe, unsubscribeHeaders, verifyUnsubscribe } from "./unsubscribe.ts";
import { readEvent, verifySvix } from "./webhook.ts";

const SECRET = "test-signing-secret";

Deno.test("an unsubscribe link names one address and one kind of notice, and nothing else can be changed in it", async () => {
  const token = await signUnsubscribe({ a: "Owner@Example.test", u: "u1", l: "l1", c: "review_new" }, SECRET);
  assert.deepEqual(await verifyUnsubscribe(token, SECRET), { a: "owner@example.test", u: "u1", l: "l1", c: "review_new" });
  // a different key, a changed payload, a changed signature, junk
  assert.equal(await verifyUnsubscribe(token, "other-secret"), null);
  const [payload, sig] = token.split(".");
  const forged = btoa(JSON.stringify({ a: "victim@example.test", u: null, l: null, c: "review_new" })).replace(/=+$/, "");
  assert.equal(await verifyUnsubscribe(`${forged}.${sig}`, SECRET), null);
  assert.equal(await verifyUnsubscribe(`${payload}.${sig!.slice(0, -2)}AA`, SECRET), null);
  assert.equal(await verifyUnsubscribe("not-a-token", SECRET), null);
  assert.equal(await verifyUnsubscribe(`${payload}.${sig}.extra`, SECRET), null);
  assert.equal(await verifyUnsubscribe("", SECRET), null);
});

Deno.test("a link for a made-up category is refused", async () => {
  const token = await signUnsubscribe({ a: "a@example.test", u: null, l: null, c: "Bad Category" }, SECRET);
  assert.equal(await verifyUnsubscribe(token, SECRET), null);
});

Deno.test("the headers are the RFC 8058 one-click pair", () => {
  assert.deepEqual(unsubscribeHeaders("https://fn.test/email/unsubscribe?t=x"), {
    "List-Unsubscribe": "<https://fn.test/email/unsubscribe?t=x>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  });
});

async function svix(secretB64: string, id: string, ts: number, body: string) {
  const key = await crypto.subtle.importKey("raw", Uint8Array.from(atob(secretB64), (c) => c.charCodeAt(0)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${body}`));
  return `v1,${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;
}

Deno.test("Resend's webhook: a good Svix signature passes, anything else is refused", async () => {
  const secretB64 = btoa("a-resend-signing-key-0123456789");
  const secret = `whsec_${secretB64}`;
  const body = JSON.stringify({ type: "email.bounced", data: { email_id: "r1", to: ["a@example.test"], bounce: { type: "Permanent" } } });
  const now = 1_790_000_000;
  const good = await svix(secretB64, "msg_1", now, body);
  assert.equal(await verifySvix(secret, { id: "msg_1", timestamp: String(now), signature: good }, body, now), true);
  // the header may hold an old and a new signature while a secret rotates
  assert.equal(await verifySvix(secret, { id: "msg_1", timestamp: String(now), signature: `v1,AAAA ${good}` }, body, now), true);
  assert.equal(await verifySvix(secret, { id: "msg_1", timestamp: String(now), signature: good }, body + " ", now), false, "a changed body");
  assert.equal(await verifySvix(secret, { id: "msg_2", timestamp: String(now), signature: good }, body, now), false, "a changed id");
  assert.equal(await verifySvix(secret, { id: "msg_1", timestamp: String(now), signature: good }, body, now + 301), false, "too old");
  assert.equal(await verifySvix(secret, { id: "msg_1", timestamp: String(now), signature: good }, body, now - 301), false, "too new");
  assert.equal(await verifySvix(`whsec_${btoa("another-key")}`, { id: "msg_1", timestamp: String(now), signature: good }, body, now), false, "another secret");
  assert.equal(await verifySvix("", { id: "msg_1", timestamp: String(now), signature: good }, body, now), false, "no secret set: refuse everything");
  assert.equal(await verifySvix(secret, { id: null, timestamp: String(now), signature: good }, body, now), false);
  assert.equal(await verifySvix(secret, { id: "msg_1", timestamp: "x", signature: good }, body, now), false);
});

Deno.test("only a permanent bounce and a complaint suppress an address", () => {
  assert.deepEqual(readEvent({ type: "email.bounced", data: { email_id: "r1", to: ["A@Example.test"], bounce: { type: "Permanent" } } }), { kind: "bounced", resendId: "r1", addresses: ["a@example.test"], permanent: true });
  assert.deepEqual(readEvent({ type: "email.bounced", data: { email_id: "r1", to: ["a@example.test"], bounce: { type: "Transient" } } }), { kind: "bounced", resendId: "r1", addresses: ["a@example.test"], permanent: false });
  assert.deepEqual(readEvent({ type: "email.complained", data: { email_id: "r2", to: ["Name <b@example.test>"] } }), { kind: "complained", resendId: "r2", addresses: ["b@example.test"] });
  assert.deepEqual(readEvent({ type: "email.delivered", data: { email_id: "r3", to: ["c@example.test"] } }), { kind: "delivered", resendId: "r3" });
  assert.deepEqual(readEvent({ type: "email.opened", data: { email_id: "r4" } }), { kind: "ignored" });
  assert.deepEqual(readEvent({ type: "email.bounced" }), { kind: "ignored" });
  assert.deepEqual(readEvent(null), { kind: "ignored" });
});
