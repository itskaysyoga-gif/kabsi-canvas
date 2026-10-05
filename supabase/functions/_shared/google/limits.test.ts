// Run: deno test supabase/functions/_shared/google/limits.test.ts
// The rate limiter and circuit breaker as gbp() uses them (K-36, P0.1-12b). The database side (buckets, the breaker
// row, the alerts) is tested in supabase/tests/google_limits.sql; here the gate's answers are given and the request
// to Google is a stub, so these tests prove what gbp does with them.
import assert from "node:assert/strict";
import { gbp, type Gate, GoogleBusy, io, profileOf } from "./client.ts";
import { RetryLater } from "../jobs.ts";

const real = { ...io };
const realFetch = globalThis.fetch;
type Seen = { gates: (string | null)[]; sleeps: number[]; failures: number; requests: string[] };

// Answer the gate from a list (the last answer repeats) and Google from a list of statuses.
function world(gates: Gate[], statuses: number[] = [200]) {
  const seen: Seen = { gates: [], sleeps: [], failures: 0, requests: [] };
  let g = 0, r = 0;
  io.token = () => Promise.resolve("test-token");
  io.gate = (profile) => {
    seen.gates.push(profile);
    return Promise.resolve(gates[Math.min(g++, gates.length - 1)]);
  };
  io.failure = () => {
    seen.failures++;
    return Promise.resolve();
  };
  io.sleep = (ms) => {
    seen.sleeps.push(ms);
    return Promise.resolve();
  };
  globalThis.fetch = (input: string | URL | Request, init?: RequestInit) => {
    seen.requests.push(`${init?.method ?? "GET"} ${String(input)}`);
    const status = statuses[Math.min(r++, statuses.length - 1)];
    return Promise.resolve(new Response(JSON.stringify(status === 200 ? { ok: true } : { error: { code: status } }), { status }));
  };
  return seen;
}
function restore() {
  Object.assign(io, real);
  globalThis.fetch = realFetch;
}
const REPLY = "https://mybusiness.googleapis.com/v4/accounts/1/locations/42/reviews/r1/reply";
const PATCH = "https://mybusinessbusinessinformation.googleapis.com/v1/locations/42?updateMask=title";

Deno.test("a write names its profile; a read and an account-level write do not", () => {
  assert.equal(profileOf(REPLY, "PUT"), "locations/42");
  assert.equal(profileOf(PATCH, "PATCH"), "locations/42");
  assert.equal(profileOf(REPLY, "GET"), null);
  assert.equal(profileOf("https://mybusinessaccountmanagement.googleapis.com/v1/accounts/1/invitations/9:accept", "POST"), null);
});

Deno.test("a sixth edit in a minute for one profile waits for its place, then goes", async () => {
  // The gate answers as google_gate does after five edits to locations/42: wait until the oldest is a minute old.
  const seen = world([{ wait_ms: 12_000 }, { wait_ms: 0 }]);
  try {
    assert.deepEqual(await gbp(REPLY, { method: "PUT", body: "{}" }), { ok: true });
    assert.deepEqual(seen.gates, ["locations/42", "locations/42"]);
    assert.deepEqual(seen.sleeps, [12_000]);
    assert.deepEqual(seen.requests, [`PUT ${REPLY}`]);
  } finally {
    restore();
  }
});

Deno.test("a wait longer than a minute and a bit is not taken: GoogleBusy, nothing sent", async () => {
  const seen = world([{ wait_ms: 40_000 }, { wait_ms: 40_000 }]);
  try {
    await assert.rejects(gbp(REPLY, { method: "PUT", body: "{}" }), (e) => e instanceof GoogleBusy && e instanceof RetryLater);
    assert.deepEqual(seen.sleeps, [40_000]);
    assert.deepEqual(seen.requests, []);
  } finally {
    restore();
  }
});

Deno.test("while the breaker is open no request is sent and the job can wait until it closes", async () => {
  const until = new Date(Date.now() + 5 * 60_000).toISOString();
  const seen = world([{ open_until: until }]);
  try {
    await assert.rejects(gbp(PATCH, { method: "PATCH", body: "{}" }), (e) => {
      assert.ok(e instanceof GoogleBusy);
      assert.equal(e.until.toISOString(), until);
      assert.match(String(e), /^GoogleBusy: google paused until/);
      return true;
    });
    assert.deepEqual(seen.requests, []);
  } finally {
    restore();
  }
});

Deno.test("each failed try (429 or 5xx) is counted for the breaker, and each try passes the gate", async () => {
  const seen = world([{ wait_ms: 0 }], [503, 429, 500, 500]);
  try {
    await assert.rejects(gbp("https://mybusiness.googleapis.com/v4/accounts/1/locations/42/reviews"), /google 500/);
    assert.equal(seen.requests.length, 4);
    assert.equal(seen.gates.length, 4);
    assert.equal(seen.failures, 4);
  } finally {
    restore();
  }
});

Deno.test("a 403 for one business is not an outage", async () => {
  const seen = world([{ wait_ms: 0 }], [403]);
  try {
    await assert.rejects(gbp("https://mybusiness.googleapis.com/v4/accounts/1/locations/42/reviews"), /^Error: google 403 /);
    assert.equal(seen.failures, 0);
  } finally {
    restore();
  }
});

Deno.test("no answer from Google is counted and the error is kept", async () => {
  const seen = world([{ wait_ms: 0 }]);
  globalThis.fetch = () => Promise.reject(new TypeError("connection reset"));
  try {
    await assert.rejects(gbp("https://mybusiness.googleapis.com/v4/accounts/1/locations/42/reviews"), /connection reset/);
    assert.equal(seen.failures, 1);
  } finally {
    restore();
  }
});
