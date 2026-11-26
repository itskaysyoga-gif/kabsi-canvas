// Run: deno test --no-check supabase/functions/_shared/auth-code.test.ts
// The sign-in code request (P0.4-02). In-memory limiter, a recorded sendCode, no Turnstile (FIX-6, R-168): no network.
import assert from "node:assert/strict";
import { LIMITS, limiterAddress, makeHandler, TOO_MANY } from "./auth-code.ts";
import { isDisposable } from "./disposable-domains.ts";

function world(opts: { sendError?: string } = {}) {
  const hits = new Map<string, { n: number; at: number }>();
  let now = 0;
  const sent: string[] = [];
  let ip = "203.0.113.7";
  const handler = makeHandler({
    env: () => "https://example.supabase.co",
    ip: () => ip,
    sha256Hex: async (t) =>
      [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))]
        .map((x) => x.toString(16).padStart(2, "0")).join(""),
    // A fixed-window limiter on a fake clock: a key's count resets once its window has passed.
    rateLimit: (key, max, windowSeconds) => {
      const h = hits.get(key);
      const fresh = !h || now - h.at >= windowSeconds * 1000;
      const n = fresh ? 1 : h.n + 1;
      hits.set(key, { n, at: fresh ? now : h.at });
      return Promise.resolve(n <= max);
    },
    sendCode: (email) => {
      sent.push(email);
      return Promise.resolve(opts.sendError ?? null);
    },
    captureError: () => Promise.resolve(),
    cors: {},
  });
  const ask = async (email: string, extra: Record<string, unknown> = {}) => {
    const res = await handler(new Request("https://x/auth-code", { method: "POST", body: JSON.stringify({ email, ...extra }) }));
    return { status: res.status, body: (await res.json()) as { ok?: boolean; error?: string; message?: string } };
  };
  return { ask, sent, setIp: (v: string) => (ip = v), wait: (seconds: number) => (now += seconds * 1000) };
}

Deno.test("a good request sends one code to the lowercased address", async () => {
  const w = world();
  const r = await w.ask("  Owner@Example.COM ");
  assert.equal(r.status, 200);
  assert.deepEqual(w.sent, ["owner@example.com"]);
});

Deno.test("a second code for one address inside a minute is refused, and goes through after the minute", async () => {
  const w = world();
  assert.equal((await w.ask("owner@example.com")).status, 200);
  w.wait(30);
  const r = await w.ask("owner@example.com");
  assert.equal(r.status, 429);
  assert.equal(r.body.error, "rate_limited");
  assert.equal(r.body.message, TOO_MANY);
  assert.equal(w.sent.length, 1);
  w.wait(31);
  assert.equal((await w.ask("owner@example.com")).status, 200);
  assert.equal(w.sent.length, 2);
});

Deno.test("the sixth code for one address in an hour is refused, from any visitor, a minute apart", async () => {
  const w = world();
  for (let i = 0; i < LIMITS.perAddressHour; i++) {
    w.setIp(`198.51.100.${i}`);
    assert.equal((await w.ask("owner@example.com")).status, 200);
    w.wait(61);
  }
  w.setIp("198.51.100.99");
  const r = await w.ask("owner@example.com");
  assert.equal(r.status, 429);
  assert.equal(r.body.message, TOO_MANY);
  assert.equal(w.sent.length, 5);
  // The hour passes (the 5 sends took 5 minutes and a bit): the address works again.
  w.wait(3600);
  assert.equal((await w.ask("owner@example.com")).status, 200);
});

Deno.test("a refused second tap does not use up one of the 5 an hour", async () => {
  const w = world();
  for (let i = 0; i < 4; i++) {
    assert.equal((await w.ask("owner@example.com")).status, 200);
    assert.equal((await w.ask("owner@example.com")).status, 429);
    w.wait(61);
  }
  assert.equal((await w.ask("owner@example.com")).status, 200, "the 5th real code still goes");
});

Deno.test("the eleventh code request from one visitor in an hour is refused", async () => {
  const w = world();
  for (let i = 0; i < LIMITS.perVisitor; i++) assert.equal((await w.ask(`owner${i}@example.com`)).status, 200);
  const r = await w.ask("owner99@example.com");
  assert.equal(r.status, 429);
  assert.equal(r.body.message, TOO_MANY);
  assert.equal(w.sent.length, 10);
  // Another visitor is not affected; the same visitor is free again after the hour.
  w.setIp("198.51.100.5");
  assert.equal((await w.ask("owner99@example.com")).status, 200);
  w.setIp("203.0.113.7");
  w.wait(3601);
  assert.equal((await w.ask("owner98@example.com")).status, 200);
});

Deno.test("no Turnstile token is asked for: a request without one sends the code", async () => {
  const w = world();
  assert.equal((await w.ask("owner@example.com")).status, 200);
  assert.equal((await w.ask("owner2@example.com", { turnstile: "" })).status, 200);
  assert.equal(w.sent.length, 2);
});

Deno.test("throwaway domains and bad addresses are refused before any code", async () => {
  const w = world();
  assert.equal((await w.ask("a@mailinator.com")).body.error, "disposable_email");
  assert.equal((await w.ask("a@x.yopmail.com")).body.error, "disposable_email");
  assert.equal((await w.ask("not-an-email")).body.error, "bad_email");
  assert.equal(w.sent.length, 0);
  assert.equal(isDisposable("owner@gmail.com"), false);
  assert.equal(isDisposable("owner@kabsi.co"), false);
});

Deno.test("an Auth error is reported, never a silent success", async () => {
  assert.equal((await world({ sendError: "smtp down" }).ask("owner@example.com")).status, 502);
  const own = await world({ sendError: "For security purposes, you can only request this after 42 seconds." }).ask("owner@example.com");
  assert.equal(own.status, 429);
  assert.equal(own.body.message, TOO_MANY);
});

Deno.test("plus tags and Gmail dots share one address's limits, and the code still goes to the typed address", async () => {
  assert.equal(limiterAddress("v.ic.tim+news@gmail.com"), "victim@gmail.com");
  assert.equal(limiterAddress("victim@googlemail.com"), "victim@gmail.com");
  assert.equal(limiterAddress("a.b+x@shop.com"), "a.b@shop.com");
  const w = world();
  assert.equal((await w.ask("victim+1@gmail.com")).status, 200);
  assert.equal((await w.ask("v.ictim+2@gmail.com")).status, 429);
  assert.deepEqual(w.sent, ["victim+1@gmail.com"]);
});
