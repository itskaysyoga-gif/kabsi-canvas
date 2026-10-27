// Sec 1: tenant isolation at the Edge Function layer. Every persona (owner, manager and staff of business A, the owner of
// business B as the outsider, a signed-out visitor, Kabsi staff and the internal caller) against the checks the routes
// run before any service role read or write. Stub clients only: no database, no network.
// Run with: deno test --no-check _shared/ (scripts/deno-check.sh).
import assert from "node:assert/strict";
import { mayChangeVisibility, resolveOneLocation, secretMatches, type VisibilityCaller } from "./guards.ts";
import { makeHandler as insightsHandler } from "../insights/handler.ts";
import { makeHandler as graphicHandler } from "../review-graphic/handler.ts";
import { makeHandler as cardsHandler } from "../review-growth/cards-handler.ts";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const REVIEW_A = "11111111-1111-4111-8111-111111111111";

// location_members, as the routes read it with the service role.
const MEMBERS: Record<string, Record<string, string>> = {
  [A]: { "u-owner": "owner", "u-manager": "manager", "u-staff": "staff" },
  [B]: { "u-outsider": "owner" },
};
const roleOf = (loc: string, user: string) => Promise.resolve(MEMBERS[loc]?.[user] ?? null);
const PERSONAS = ["u-owner", "u-manager", "u-staff", "u-outsider", null] as const;

const post = (body: unknown, user: string | null) =>
  new Request("http://x/fn", { method: "POST", headers: { "content-type": "application/json", "x-user": user ?? "" }, body: JSON.stringify(body) });
const userOf = (req: Request) => {
  const id = req.headers.get("x-user");
  return Promise.resolve(id ? { id } : null);
};

// ─── the pure guards

Deno.test("secretMatches: equal strings only, never a missing or non-string side", () => {
  assert.equal(secretMatches("s3cret-value", "s3cret-value"), true);
  assert.equal(secretMatches("s3cret-valuX", "s3cret-value"), false);
  assert.equal(secretMatches("short", "s3cret-value"), false);
  assert.equal(secretMatches("", ""), false);
  assert.equal(secretMatches(null, "s3cret-value"), false);
  assert.equal(secretMatches("s3cret-value", null), false);
  assert.equal(secretMatches("s3cret-value", { v: "s3cret-value" }), false);
});

Deno.test("resolveOneLocation: one business, or a refusal when ids point at two", () => {
  assert.deepEqual(resolveOneLocation([A]), { ok: true, locationId: A });
  assert.deepEqual(resolveOneLocation([A, A, null, ""]), { ok: true, locationId: A });
  assert.deepEqual(resolveOneLocation([null, undefined, ""]), { ok: false, reason: "missing" });
  // The content IDOR: the outsider names business B's post (B's location) and one of its own rows (A's), or the reverse.
  assert.deepEqual(resolveOneLocation([null, B, A]), { ok: false, reason: "mismatch" });
  assert.deepEqual(resolveOneLocation([A, B]), { ok: false, reason: "mismatch" });
});

Deno.test("mayChangeVisibility: owner, manager, Kabsi staff and internal; never the staff role, an outsider or anon", () => {
  const cases: [VisibilityCaller, boolean][] = [
    [{ kind: "internal" }, true],
    [{ kind: "staff", id: "kabsi-staff" }, true],
    [{ kind: "member", id: "u-owner", role: "owner" }, true],
    [{ kind: "member", id: "u-manager", role: "manager" }, true],
    [{ kind: "member", id: "u-staff", role: "staff" }, false],
    [{ kind: "member", id: "u-x", role: "viewer" }, false],
    [null, false],
  ];
  for (const [who, want] of cases) assert.equal(mayChangeVisibility(who), want, JSON.stringify(who));
});

// ─── the handlers, persona by persona

Deno.test("insights: only A's owner and manager reach A's figures; nothing is loaded for anyone else", async () => {
  for (const user of PERSONAS) {
    const loaded: string[] = [];
    const h = insightsHandler({
      getUser: userOf,
      memberRole: roleOf,
      source: (loc) => (loaded.push(`source:${loc}`), Promise.resolve("none")),
      featureAccess: (loc) => (loaded.push(`access:${loc}`), Promise.resolve({ pro: true })),
      loadDaily: (loc) => (loaded.push(`daily:${loc}`), Promise.resolve({} as never)),
      loadTerms: (loc) => (loaded.push(`terms:${loc}`), Promise.resolve([])),
      rateLimit: () => Promise.resolve(true),
      now: () => new Date("2026-10-27T10:00:00Z"),
      log: () => {},
      captureError: () => Promise.resolve(),
      cors: {},
    });
    const res = await h(post({ location_id: A }, user));
    if (user === "u-owner" || user === "u-manager") {
      assert.notEqual(res.status, 404, user);
      assert.ok(loaded.length > 0, user);
    } else {
      assert.equal(res.status, user ? 404 : 401, String(user));
      assert.deepEqual(loaded, [], String(user));
    }
  }
});

Deno.test("review-graphic: a review of business A is a 404 for A's staff, the outsider and anon; Pro is never asked", async () => {
  for (const user of PERSONAS) {
    const asked: string[] = [];
    const h = graphicHandler({
      getUser: userOf,
      loadReview: (id) =>
        Promise.resolve(id === REVIEW_A ? { location_id: A, location_name: "A", star_rating: 5, comment: "Lovely bread", reviewer_name: "Sam" } : null),
      memberRole: roleOf,
      featureAccess: (loc) => (asked.push(loc), Promise.resolve({ pro: false })),
      rateLimit: () => Promise.resolve(true),
      render: () => Promise.resolve(new Uint8Array([1])),
      log: () => {},
      captureError: () => Promise.resolve(),
      cors: {},
    });
    const res = await h(post({ review_id: REVIEW_A, size: "square" }, user));
    if (user === "u-owner" || user === "u-manager") {
      assert.equal(res.status, 403, user); // reaches the Pro check, which the stub refuses
      assert.deepEqual(asked, [A]);
    } else {
      assert.equal(res.status, user ? 404 : 401, String(user));
      assert.deepEqual(asked, [], String(user));
    }
  }
});

Deno.test("review-cards: a card link of business A prints only for A's members", async () => {
  for (const user of PERSONAS) {
    const h = cardsHandler({
      getUser: userOf,
      loadLink: (code) => Promise.resolve(code === "ABC234" ? { location_id: A, business: "A" } : null),
      memberOf: async (loc, u) => !!(await roleOf(loc, u)),
      rateLimit: () => Promise.resolve(true),
      log: () => {},
      captureError: () => Promise.resolve(),
      cors: {},
    });
    const res = await h(post({ code: "ABC234", kind: "counter" }, user));
    if (user === "u-outsider") assert.equal(res.status, 404);
    if (user === null) assert.equal(res.status, 401);
    if (user && user !== "u-outsider") assert.notEqual(res.status, 404, user);
  }
});
