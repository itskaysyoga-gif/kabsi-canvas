// Run: deno test --no-check --allow-env --allow-read supabase/functions/_shared/sec1/webhooks.test.ts
// Sec 1, webhooks: Kapso (WhatsApp), Creem (billing), Resend (email, Svix) and Google Pub/Sub. For each one: a wrong or
// missing signature is refused and nothing is stored; an old but validly signed delivery is refused or changes nothing;
// the same delivery twice has one effect; an older event cannot overwrite newer state; a malformed or huge body is
// refused without a crash. The handlers run their real code; the database is the in-memory stand-in in
// webhooks-fakes.ts (Creem, Resend, Pub/Sub) or stubs that keep the same unique key as the SQL (Kapso).
import assert from "node:assert/strict";
import { FAKE_URL, installFakeDb, newDb, useDb, type FakeDb } from "./webhooks-fakes.ts";

await installFakeDb();
const { admin, json, fail } = await import("../kabsi.ts");
const { creemWebhook } = await import("../creem-webhook.ts");
const { hmacHex } = await import("../creem.ts");
const { storeEvent, applyEvent } = await import("../billing.ts");
const { resendWebhook } = await import("../email/webhook-route.ts");
const { googlePush } = await import("../google/events-route.ts");
const { kapsoWebhook } = await import("../whatsapp/webhook-route.ts");
const { receive } = await import("../whatsapp/agent.ts");
const { sign: kapsoSign } = await import("../whatsapp/replay.ts");
const { readCapped, MAX_WEBHOOK_BODY } = await import("../webhook-body.ts");

const enc = new TextEncoder();
const HUGE = "x".repeat(MAX_WEBHOOK_BODY + 1);
const post = (body: BodyInit, headers: Record<string, string> = {}) => new Request("https://example.test/hook", { method: "POST", body, headers });
const rows = (db: FakeDb, t: string) => db.tables[t] ?? [];
const quiet = () => {};

// ─── Creem ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const CREEM_SECRET = "creem-test-signing-key";
const ORG = "11111111-2222-4333-8444-555555555555";
function creemEvent(id: string, eventType: string, createdAt: number, status: string) {
  return {
    id, eventType, created_at: createdAt,
    object: {
      id: "sub_1", object: "subscription", status, mode: "test", customer: "cust_1", product: "prod_unknown",
      metadata: { referenceId: ORG }, current_period_end_date: "2026-12-01T00:00:00.000Z",
    },
  };
}
async function creemPost(body: string, signature?: string | null) {
  const headers: Record<string, string> = {};
  const sig = signature === undefined ? await hmacHex(CREEM_SECRET, body) : signature;
  if (sig !== null) headers["creem-signature"] = sig;
  return post(body, headers);
}
function creemDeps(over: { secret?: string } = {}) {
  const seen = { refused: [] as string[], stored: 0 };
  return {
    seen,
    deps: {
      secret: over.secret ?? CREEM_SECRET,
      store: async (e: Parameters<typeof storeEvent>[0]) => {
        seen.stored++;
        return await storeEvent(e);
      },
      refused: (p: string) => (seen.refused.push(p), Promise.resolve()),
      log: quiet,
      captureError: () => Promise.resolve(),
      json,
    },
  };
}
function creemDb() {
  const db = newDb();
  db.rpc.enqueue_job = () => crypto.randomUUID();
  db.rpc.billing_owner_contacts = () => [];
  useDb(db);
  return db;
}
const enqueued = (db: FakeDb, kind: string) => db.rpcCalls.filter((c) => c.fn === "enqueue_job" && c.args.p_kind === kind).length;

Deno.test("creem: a missing, wrong or foreign signature is refused with 401 and nothing is stored", async () => {
  const db = creemDb();
  const body = JSON.stringify(creemEvent("evt_sig", "subscription.active", Date.now(), "active"));
  const good = await hmacHex(CREEM_SECRET, body);
  const lastFlipped = good.slice(0, 63) + (good[63] === "0" ? "1" : "0");
  for (const sig of [null, "", "00", await hmacHex("another-key", body), lastFlipped, `${good}00`]) {
    const { deps, seen } = creemDeps();
    const res = await creemWebhook(await creemPost(body, sig), deps);
    assert.equal(res.status, 401, `signature ${String(sig).slice(0, 8)}`);
    assert.equal(seen.stored, 0);
    assert.equal(seen.refused.length, 1);
  }
  // A body changed after signing.
  const { deps } = creemDeps();
  assert.equal((await creemWebhook(post(body.replace("active", "paused"), { "creem-signature": await hmacHex(CREEM_SECRET, body) }), deps)).status, 401);
  // No secret set: everything is refused.
  const none = creemDeps({ secret: "" });
  assert.equal((await creemWebhook(await creemPost(body), none.deps)).status, 401);
  assert.equal(rows(db, "billing_events").length, 0);
  assert.equal(db.rpcCalls.length, 0);
});

Deno.test("creem: the same event delivered twice is stored once and queued once", async () => {
  const db = creemDb();
  const body = JSON.stringify(creemEvent("evt_dup", "subscription.active", Date.now() - 60_000, "active"));
  const first = await creemWebhook(await creemPost(body), creemDeps().deps);
  const second = await creemWebhook(await creemPost(body), creemDeps().deps);
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), { ok: true, stored: true });
  assert.equal(second.status, 200, "a repeat is acknowledged so Creem stops sending it");
  assert.deepEqual(await second.json(), { ok: true, duplicate: true });
  assert.equal(rows(db, "billing_events").length, 1);
  assert.equal(enqueued(db, "billing_event"), 1);
  // The queue running the same event twice (a retry) applies it once.
  assert.equal(await applyEvent("evt_dup"), "applied:active");
  assert.equal(await applyEvent("evt_dup"), "already");
  assert.equal(rows(db, "subscriptions").length, 1);
});

Deno.test("creem: a validly signed event older than 3 days (a replay) is kept in the ledger and never queued", async () => {
  const db = creemDb();
  const body = JSON.stringify(creemEvent("evt_old", "subscription.canceled", Date.now() - 4 * 86_400_000, "canceled"));
  const res = await creemWebhook(await creemPost(body), creemDeps().deps);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, stale: true });
  assert.equal(rows(db, "billing_events")[0]?.outcome, "refused_stale");
  assert.equal(enqueued(db, "billing_event"), 0, "a stale event never reaches applyEvent");
  // An event with no time at all is refused the same way.
  const noTime = JSON.stringify({ ...creemEvent("evt_notime", "subscription.active", 0, "active"), created_at: "" });
  assert.deepEqual(await (await creemWebhook(await creemPost(noTime), creemDeps().deps)).json(), { ok: true, stale: true });
  assert.equal(rows(db, "subscriptions").length, 0);
});

Deno.test("creem: an older subscription.canceled arriving after a newer subscription.active changes nothing", async () => {
  const db = creemDb();
  const now = Date.now();
  await creemWebhook(await creemPost(JSON.stringify(creemEvent("evt_new_active", "subscription.active", now - 3_600_000, "active"))), creemDeps().deps);
  await creemWebhook(await creemPost(JSON.stringify(creemEvent("evt_old_cancel", "subscription.canceled", now - 7_200_000, "canceled"))), creemDeps().deps);
  assert.equal(await applyEvent("evt_new_active"), "applied:active");
  assert.equal(await applyEvent("evt_old_cancel"), "older_ignored");
  const [sub] = rows(db, "subscriptions");
  assert.equal(sub.state, "active");
  assert.equal(sub.ended_at ?? null, null);
  assert.equal(sub.last_event_at, new Date(now - 3_600_000).toISOString());
  // A cancel that really is newer does end the plan.
  await creemWebhook(await creemPost(JSON.stringify(creemEvent("evt_real_cancel", "subscription.canceled", now - 60_000, "canceled"))), creemDeps().deps);
  assert.equal(await applyEvent("evt_real_cancel"), "applied:cancelled");
  assert.equal(rows(db, "subscriptions")[0].state, "cancelled");
});

Deno.test("creem: bad JSON, a missing id, type or object, and a huge body are refused or dropped without a crash", async () => {
  const db = creemDb();
  for (const body of ["{not json", "null", "[]", JSON.stringify({ eventType: "subscription.active", object: {} }), JSON.stringify({ id: "evt_x", object: {} }), JSON.stringify({ id: "evt_x", eventType: "subscription.active" })]) {
    const res = await creemWebhook(await creemPost(body), creemDeps().deps);
    assert.equal(res.status, 200, body);
    assert.deepEqual(await res.json(), { ok: true, ignored: "unreadable" });
  }
  const big = creemDeps();
  const res = await creemWebhook(post(HUGE, { "creem-signature": await hmacHex(CREEM_SECRET, HUGE) }), big.deps);
  assert.equal(res.status, 413);
  assert.equal(big.seen.refused.length + big.seen.stored, 0, "refused before the signature is even computed");
  assert.equal(rows(db, "billing_events").length, 0);
});

// ─── Resend (Svix) ──────────────────────────────────────────────────────────────────────────────────────────────────
const RESEND_SECRET = `whsec_${btoa("resend-test-signing-key")}`;
const NOW_S = 1_793_000_000;
async function svix(body: string, o: { id?: string; ts?: number; secret?: string } = {}) {
  const id = o.id ?? "msg_1";
  const ts = String(o.ts ?? NOW_S);
  const keyBytes = Uint8Array.from(atob((o.secret ?? RESEND_SECRET).replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${id}.${ts}.${body}`)))));
  return { "svix-id": id, "svix-timestamp": ts, "svix-signature": `v1,${sig}` };
}
function resendDb() {
  const db = newDb();
  db.tables.emails = [{ id: "e1", resend_id: "re_1", status: "sent" }, { id: "e2", resend_id: "re_2", status: "sent" }];
  useDb(db);
  return db;
}
const resend = (req: Request) => resendWebhook(req, { secret: RESEND_SECRET, db: admin(), nowSeconds: NOW_S, log: quiet, json });
const bounce = (id = "re_1") => JSON.stringify({ type: "email.bounced", data: { email_id: id, to: ["Owner <Owner@Example.test>"], bounce: { type: "Permanent" } } });

Deno.test("resend: a missing, wrong or foreign Svix signature is refused with 401 and nothing changes", async () => {
  const db = resendDb();
  const body = bounce();
  const good = await svix(body);
  const cases: Record<string, string>[] = [
    {},
    { ...good, "svix-signature": "v1,AAAA" },
    await svix(body, { secret: `whsec_${btoa("another-key")}` }),
    { ...good, "svix-id": "msg_2" },
  ];
  for (const h of cases) assert.equal((await resend(post(body, h))).status, 401);
  assert.equal((await resend(post(body.replace("re_1", "re_2"), good))).status, 401, "a body changed after signing");
  assert.equal((await resendWebhook(post(body, good), { secret: "", db: admin(), nowSeconds: NOW_S, log: quiet, json })).status, 401, "no secret set");
  assert.equal(rows(db, "email_suppressions").length, 0);
  assert.deepEqual(rows(db, "emails").map((e) => e.status), ["sent", "sent"]);
});

Deno.test("resend: a validly signed delivery older or newer than 5 minutes (a replay) is refused", async () => {
  const db = resendDb();
  const body = bounce();
  assert.equal((await resend(post(body, await svix(body, { ts: NOW_S - 301 })))).status, 401);
  assert.equal((await resend(post(body, await svix(body, { ts: NOW_S + 301 })))).status, 401);
  assert.equal(rows(db, "email_suppressions").length, 0);
  assert.equal((await resend(post(body, await svix(body, { ts: NOW_S - 299 })))).status, 200, "inside the window it counts");
});

Deno.test("resend: the same bounce delivered twice leaves one suppression row", async () => {
  const db = resendDb();
  const body = bounce();
  const h = await svix(body);
  assert.deepEqual(await (await resend(post(body, h))).json(), { ok: true, suppressed: 1 });
  assert.equal((await resend(post(body, h))).status, 200);
  assert.deepEqual(rows(db, "email_suppressions").map((r) => [r.address, r.scope, r.reason]), [["owner@example.test", "*", "bounce"]]);
});

Deno.test("resend: a delivered event that arrives after the bounce does not undo it", async () => {
  const db = resendDb();
  const b = bounce();
  await resend(post(b, await svix(b, { id: "msg_b" })));
  const d = JSON.stringify({ type: "email.delivered", data: { email_id: "re_1", to: ["owner@example.test"] } });
  assert.equal((await resend(post(d, await svix(d, { id: "msg_d" })))).status, 200);
  assert.equal(rows(db, "emails").find((e) => e.resend_id === "re_1")?.status, "bounced");
  assert.equal(rows(db, "email_suppressions").length, 1);
  // In the right order it is recorded.
  const d2 = d.replace("re_1", "re_2");
  await resend(post(d2, await svix(d2, { id: "msg_d2" })));
  assert.equal(rows(db, "emails").find((e) => e.resend_id === "re_2")?.status, "delivered");
});

Deno.test("resend: signed bad JSON is a 400 (not a 500), missing fields are ignored, a huge body is a 413", async () => {
  const db = resendDb();
  const bad = "{not json";
  assert.equal((await resend(post(bad, await svix(bad)))).status, 400);
  for (const body of ["{}", "null", JSON.stringify({ type: "email.bounced" }), JSON.stringify({ type: "email.bounced", data: {} })]) {
    const res = await resend(post(body, await svix(body)));
    assert.equal(res.status, 200, body);
    assert.deepEqual(await res.json(), { ok: true, ignored: true });
  }
  assert.equal((await resend(post(HUGE, await svix(HUGE)))).status, 413);
  assert.equal(rows(db, "email_suppressions").length, 0);
  assert.deepEqual(rows(db, "emails").map((e) => e.status), ["sent", "sent"]);
});

// ─── Google Pub/Sub ─────────────────────────────────────────────────────────────────────────────────────────────────
const AUD = "https://example.supabase.co/functions/v1/google-events";
const SA = "kabsi-pubsub@project.iam.gserviceaccount.com";
const NOW = Date.parse("2026-10-27T12:00:00Z");
const b64u = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const rsa = () => crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
const pair = await rsa();
const other = await rsa();
const jwk = { ...(await crypto.subtle.exportKey("jwk", pair.publicKey)), kid: "k1" };
async function token(claims: Record<string, unknown> = {}, key: CryptoKey = pair.privateKey) {
  const head = b64u(JSON.stringify({ alg: "RS256", kid: "k1", typ: "JWT" }));
  const body = b64u(JSON.stringify({ iss: "https://accounts.google.com", aud: AUD, email: SA, email_verified: true, iat: NOW / 1000 - 10, exp: NOW / 1000 + 3600, ...claims }));
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(`${head}.${body}`)));
  return `Bearer ${head}.${body}.${b64u(String.fromCharCode(...sig))}`;
}
const pushBody = (data: unknown, id: string, publishTime = "2026-10-27T11:59:00Z") =>
  JSON.stringify({ message: { data: btoa(JSON.stringify(data)), messageId: id, publishTime }, subscription: "projects/p/subscriptions/s" });
function googleDb() {
  const db = newDb();
  db.tables.locations = [{ id: "loc-1", google_location_id: "locations/77", status: "active" }];
  const open = new Set<string>();
  // enqueue_job: null while the same dedupe key is pending (jobs_dedupe_open).
  db.rpc.enqueue_job = (a) => (open.has(String(a.p_dedupe_key)) ? null : (open.add(String(a.p_dedupe_key)), crypto.randomUUID()));
  useDb(db);
  return db;
}
const google = (req: Request) =>
  googlePush(req, { auth: { audience: AUD, serviceAccount: SA, keys: () => Promise.resolve([jwk]), now: () => NOW }, db: admin(), log: quiet, captureError: () => Promise.resolve(), json });

Deno.test("pubsub: no token, a forged token, another audience or account is refused with 401 and nothing is stored", async () => {
  const db = googleDb();
  const body = pushBody({ type: "NEW_REVIEW", location: "accounts/1/locations/77" }, "m-sig");
  for (const auth of [null, "Bearer x.y.z", await token({}, other.privateKey), await token({ aud: "https://evil.example" }), await token({ email: "someone@else.test" })]) {
    const res = await google(post(body, auth ? { authorization: auth } : {}));
    assert.equal(res.status, 401);
  }
  assert.equal(rows(db, "google_events").length, 0);
  assert.equal(db.rpcCalls.length, 0);
});

Deno.test("pubsub: a replay of an old push with an expired token is refused", async () => {
  const db = googleDb();
  const res = await google(post(pushBody({ type: "NEW_REVIEW", location: "locations/77" }, "m-old"), { authorization: await token({ iat: NOW / 1000 - 7300, exp: NOW / 1000 - 3700 }) }));
  assert.equal(res.status, 401);
  assert.equal(rows(db, "google_events").length, 0);
});

Deno.test("pubsub: the same message pushed twice is stored once and offers its jobs once", async () => {
  const db = googleDb();
  const body = pushBody({ type: "GOOGLE_UPDATE", location: "accounts/1/locations/77" }, "m-dup");
  const first = await google(post(body, { authorization: await token() }));
  assert.deepEqual(await first.json(), { ok: true, offered: 2 });
  const second = await google(post(body, { authorization: await token() }));
  assert.equal(second.status, 200);
  assert.deepEqual(await second.json(), { ok: true, duplicate: true });
  assert.equal(rows(db, "google_events").length, 1);
  assert.equal(rows(db, "google_events")[0].jobs, 2);
  assert.equal(db.rpcCalls.filter((c) => c.fn === "enqueue_job").length, 2);
});

Deno.test("pubsub: an older message arriving after a newer one only offers jobs (deduped) and writes no business data", async () => {
  const db = googleDb();
  const before = structuredClone(db.tables.locations);
  await google(post(pushBody({ type: "NEW_REVIEW", location: "locations/77" }, "m-new", "2026-10-27T11:59:00Z"), { authorization: await token() }));
  const late = await google(post(pushBody({ type: "NEW_REVIEW", location: "locations/77" }, "m-older", "2026-10-27T11:00:00Z"), { authorization: await token() }));
  assert.deepEqual(await late.json(), { ok: true, offered: 0 }, "the same jobs are already waiting");
  assert.deepEqual(Object.keys(db.tables).sort(), ["google_events", "locations"]);
  assert.deepEqual(db.tables.locations, before);
  assert.ok(db.rpcCalls.every((c) => c.fn === "enqueue_job"));
});

Deno.test("pubsub: bad JSON, a missing message or data, and a huge body are dropped or refused without a crash", async () => {
  const db = googleDb();
  for (const body of ["{not json", "{}", JSON.stringify({ message: { messageId: "m-1" } }), JSON.stringify({ message: { data: "!!", messageId: "m-2" } }), pushBody({ type: "<b>" }, "m-3")]) {
    const res = await google(post(body, { authorization: await token() }));
    assert.equal(res.status, 200, body);
    assert.deepEqual(await res.json(), { ok: true, ignored: "unreadable" });
  }
  assert.equal((await google(post(HUGE, { authorization: await token() }))).status, 413);
  assert.equal(rows(db, "google_events").length, 0);
});

// ─── Kapso (WhatsApp) ───────────────────────────────────────────────────────────────────────────────────────────────
const KAPSO_SECRET = "kapso-test-signing-key";
const PN = "pn-test-1";
const NOW_MS = Date.parse("2026-10-27T12:00:00Z");
const inbound = (id: string, tsSeconds = NOW_MS / 1000 - 5, pn = PN) => JSON.stringify({
  message: { id, from: "12025550123", timestamp: String(tsSeconds), type: "text", text: { body: "hello" }, kapso: { direction: "inbound" } },
  conversation: { phone_number: "+12025550123", phone_number_id: pn }, phone_number_id: pn,
});
function kapso(o: { secret?: string; reread?: string } = {}) {
  // whatsapp_inbound_store: insert ... on conflict (provider_id) do nothing.
  const ids = new Set<string>();
  const seen = { ctx: 0, stored: [] as string[], duplicates: 0, statuses: [] as string[], work: [] as Promise<unknown>[] };
  const agent = {
    phoneNumberId: PN, now: () => NOW_MS,
    db: {
      store: (_phone: string, id: string) => {
        if (ids.has(id)) return Promise.resolve((seen.duplicates++, { duplicate: true }));
        ids.add(id);
        seen.stored.push(id);
        return Promise.resolve({ duplicate: false, id: `row-${id}`, first: ids.size === 1 });
      },
      done: () => Promise.resolve(),
    },
  } as unknown as Parameters<typeof receive>[0];
  const deps = {
    secret: () => Promise.resolve(o.secret ?? KAPSO_SECRET),
    rereadSecret: () => Promise.resolve(o.reread ?? o.secret ?? KAPSO_SECRET),
    ctx: () => (seen.ctx++, Promise.resolve({ on: true, statusUpdate: (s: { messageId: string; status: string }) => (seen.statuses.push(`${s.messageId}:${s.status}`), Promise.resolve()) })),
    agentDeps: () => Promise.resolve(agent),
    receive,
    background: (p: Promise<unknown>) => void seen.work.push(p),
    captureError: () => Promise.resolve(),
    json,
    fail,
  };
  return { deps, seen };
}
const kapsoPost = async (body: string, secret: string | null = KAPSO_SECRET, event = "whatsapp.message.received") =>
  post(body, { "x-webhook-event": event, ...(secret === null ? {} : { "x-webhook-signature": await kapsoSign(secret, enc.encode(body)) }) });

Deno.test("kapso: a missing, malformed or wrong signature is refused with 401 and nothing is read or stored", async () => {
  const body = inbound("wamid.sig");
  const reqs = [
    await kapsoPost(body, null),
    post(body, { "x-webhook-signature": "zz" }),
    await kapsoPost(body, "another-key"),
    post(body.replace("hello", "hullo"), { "x-webhook-signature": await kapsoSign(KAPSO_SECRET, enc.encode(body)) }),
  ];
  for (const req of reqs) {
    const k = kapso();
    assert.equal((await kapsoWebhook(req, k.deps)).status, 401);
    assert.equal(k.seen.ctx, 0, "nothing past the signature check ran");
    assert.equal(k.seen.stored.length, 0);
  }
  // A secret that setup rotated is read again once: the new one passes, the old one stays refused.
  const rotated = kapso({ secret: "old-key", reread: KAPSO_SECRET });
  assert.equal((await kapsoWebhook(await kapsoPost(body), rotated.deps)).status, 200);
  const noSecret = kapso({ secret: "" });
  assert.equal((await kapsoWebhook(await kapsoPost(body), noSecret.deps)).status, 503);
  await Promise.allSettled(rotated.seen.work);
});

Deno.test("kapso: a validly signed message older than 10 minutes (a replay) or for another number is not stored", async () => {
  const k = kapso();
  for (const body of [inbound("wamid.old", NOW_MS / 1000 - 601), inbound("wamid.future", NOW_MS / 1000 + 120), inbound("wamid.other", undefined, "pn-someone-else")]) {
    assert.equal((await kapsoWebhook(await kapsoPost(body), k.deps)).status, 200);
  }
  assert.equal(k.seen.stored.length, 0);
  assert.equal(k.seen.work.length, 0);
});

Deno.test("kapso: the same message delivered twice is stored once and answered once", async () => {
  const k = kapso();
  const body = inbound("wamid.dup");
  const a = await kapsoWebhook(await kapsoPost(body), k.deps);
  const b = await kapsoWebhook(await kapsoPost(body), k.deps);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200, "a repeat is acknowledged so Kapso stops sending it");
  assert.deepEqual(k.seen.stored, ["wamid.dup"]);
  assert.equal(k.seen.duplicates, 1);
  assert.equal(k.seen.work.length, 1, "one reply's worth of work");
  await Promise.allSettled(k.seen.work);
});

Deno.test("kapso: bad JSON is a 400, a body with no message is a 200 that stores nothing, a huge body is a 413", async () => {
  const k = kapso();
  assert.equal((await kapsoWebhook(await kapsoPost("{not json"), k.deps)).status, 400);
  assert.equal(k.seen.ctx, 0);
  for (const body of ["{}", "null", "[]", JSON.stringify({ message: { from: "12025550123" } }), JSON.stringify({ data: [1, "x", null] })]) {
    const res = await kapsoWebhook(await kapsoPost(body), k.deps);
    assert.equal(res.status, 200, body);
    assert.equal((await res.json()).handled, 0);
  }
  assert.equal((await kapsoWebhook(await kapsoPost(HUGE), k.deps)).status, 413);
  assert.equal(k.seen.stored.length, 0);
});

// ─── shared ─────────────────────────────────────────────────────────────────────────────────────────────────────────
Deno.test("webhook bodies: a declared or streamed body over the cap is cut off, a small one is read whole", async () => {
  assert.equal(await readCapped(post("x".repeat(10), { "content-length": String(MAX_WEBHOOK_BODY + 1) })), null);
  const chunk = enc.encode("y".repeat(64 * 1024));
  let sent = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(c) {
      if (sent++ < 10) c.enqueue(chunk);
      else c.close();
    },
  });
  assert.equal(await readCapped(new Request("https://example.test/hook", { method: "POST", body: stream })), null);
  assert.ok(sent <= 6, "reading stopped soon after the cap");
  assert.deepEqual(await readCapped(post("hello")), enc.encode("hello"));
});

Deno.test("signature checks compare in constant time (no early exit on the first different character)", async () => {
  const read = (p: string) => Deno.readTextFile(new URL(p, import.meta.url));
  const creem = await read("../creem.ts");
  const kapsoSrc = await read("../whatsapp/channel.ts");
  const svixSrc = await read("../email/webhook.ts");
  for (const [name, src, fn] of [["creem", creem, "sameText"], ["kapso", kapsoSrc, "verifySignature"], ["svix", svixSrc, "verifySvix"]] as const) {
    const body = src.slice(src.indexOf(`function ${fn}`), src.indexOf("\n}\n", src.indexOf(`function ${fn}`)));
    assert.match(body, /diff \|= /, `${name}: XOR accumulator`);
    assert.doesNotMatch(body, /(want|expected|given|got|sig)\s*[!=]==\s*(want|expected|given|got|sig)\b/, `${name}: no direct string comparison`);
  }
  // The fake database never reached the network.
  assert.ok(FAKE_URL.endsWith(".invalid"));
});
