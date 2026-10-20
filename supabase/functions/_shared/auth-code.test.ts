// Run: deno test --no-check supabase/functions/_shared/auth-code.test.ts
// The sign-in code request (P0.4-02). In-memory limiter, stubbed Turnstile and a recorded sendCode: no network.
import assert from "node:assert/strict";
import { LIMITS, makeHandler } from "./auth-code.ts";
import { isDisposable } from "./disposable-domains.ts";

function world(opts: { turnstile?: boolean; sendError?: string } = {}) {
  const hits = new Map<string, number>();
  const sent: string[] = [];
  let ip = "203.0.113.7";
  const handler = makeHandler({
    env: () => "https://example.supabase.co",
    ip: () => ip,
    sha256Hex: async (t) =>
      [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))]
        .map((x) => x.toString(16).padStart(2, "0")).join(""),
    rateLimit: (key, max) => {
      const n = (hits.get(key) ?? 0) + 1;
      hits.set(key, n);
      return Promise.resolve(n <= max);
    },
    verifyTurnstile: (token) => Promise.resolve(opts.turnstile === false ? false : token === "ok"),
    sendCode: (email) => {
      sent.push(email);
      return Promise.resolve(opts.sendError ?? null);
    },
    captureError: () => Promise.resolve(),
    cors: {},
  });
  const ask = async (email: string, turnstile = "ok") => {
    const res = await handler(new Request("https://x/auth-code", { method: "POST", body: JSON.stringify({ email, turnstile }) }));
    return { status: res.status, body: (await res.json()) as { ok?: boolean; error?: string } };
  };
  return { ask, sent, setIp: (v: string) => (ip = v) };
}

Deno.test("a good request sends one code to the lowercased address", async () => {
  const w = world();
  const r = await w.ask("  Owner@Example.COM ");
  assert.equal(r.status, 200);
  assert.deepEqual(w.sent, ["owner@example.com"]);
});

Deno.test("the fourth code for one address in 15 minutes is refused, from any visitor", async () => {
  const w = world();
  for (let i = 0; i < LIMITS.perAddress; i++) {
    w.setIp(`198.51.100.${i}`);
    assert.equal((await w.ask("owner@example.com")).status, 200);
  }
  w.setIp("198.51.100.99");
  const r = await w.ask("owner@example.com");
  assert.equal(r.status, 429);
  assert.equal(r.body.error, "rate_limited");
  assert.equal(w.sent.length, 3);
});

Deno.test("the eleventh code request from one visitor in an hour is refused", async () => {
  const w = world();
  for (let i = 0; i < LIMITS.perVisitor; i++) assert.equal((await w.ask(`owner${i}@example.com`)).status, 200);
  assert.equal((await w.ask("owner99@example.com")).status, 429);
  assert.equal(w.sent.length, 10);
});

Deno.test("no Turnstile pass, no code", async () => {
  const w = world();
  assert.equal((await w.ask("owner@example.com", "")).body.error, "challenge_failed");
  assert.equal((await w.ask("owner@example.com", "forged")).body.error, "challenge_failed");
  assert.equal(w.sent.length, 0);
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
  assert.equal((await world({ sendError: "For security purposes, you can only request this after 42 seconds." }).ask("owner@example.com")).status, 429);
});
