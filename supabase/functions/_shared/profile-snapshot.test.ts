// Run: deno test --no-check supabase/functions/_shared/profile-snapshot.test.ts
// The free Google Profile Check (P0.4-01). Everything runs on stubs: Places is a fetch stub that answers from canned
// responses and counts requests, the limiter and the cache are in memory, and there is no network and no Anthropic
// call. The real Google layer code (field masks, cache, kill switch) runs unchanged on top of the stubs.
import assert from "node:assert/strict";
import { getCachedSnapshot, getSnapshotPlace, guard, SNAPSHOT_FIELD_MASK, searchText } from "./google/places/live.ts";
import type { Place } from "./google/types.ts";
import { buildSnapshot, CHECK_PAGES, checkEmail, type Deps, findings, LIMITS, makeHandler, TIPS_CONSENT_TEXT } from "./profile-snapshot.ts";
import { emailLayout, esc } from "./email-layout.ts";

const real = { ...guard };
const realFetch = globalThis.fetch;
const PLACE_A = "ChIJaaaaaaaaaaaaaaaa";
const PLACE_B = "ChIJbbbbbbbbbbbbbbbb";

const FULL: Place = {
  id: PLACE_A, displayName: { text: "Harbour Lane Coffee", languageCode: "en" }, formattedAddress: "12 Harbour Lane, Example Town",
  primaryTypeDisplayName: { text: "Coffee shop" }, businessStatus: "OPERATIONAL", rating: 4.6, userRatingCount: 128,
  regularOpeningHours: { weekdayDescriptions: ["Monday: 8:00 AM to 6:00 PM", "Tuesday: 8:00 AM to 6:00 PM"] },
  currentOpeningHours: { openNow: true }, nationalPhoneNumber: "(555) 010-0000", websiteUri: "https://example.com",
  photos: [{ name: "places/x/photos/1" }, { name: "places/x/photos/2" }],
};

type Seen = { url: string; method: string; mask: string | null; body: string }[];

// A world with the Places day cap, an in-memory cache, an in-memory limiter and every outbound effect recorded.
function world(opts: { cap?: number; place?: Place; turnstile?: boolean } = {}) {
  const cap = opts.cap ?? 100;
  const requests: Seen = [];
  const cache = new Map<string, Place>();
  const cachePuts: string[] = [];
  let used = 0;
  guard.take = () => (used >= cap ? Promise.resolve(false) : (used++, Promise.resolve(true)));
  guard.cacheGet = (id, mask) => Promise.resolve(cache.get(`${id}|${mask}`) ?? null);
  guard.cachePut = (id, mask, place) => {
    cache.set(`${id}|${mask}`, place);
    cachePuts.push(`${id}|${mask}`);
    return Promise.resolve();
  };
  globalThis.fetch = (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    // Only the Places layer may be asked, and only through this stub: any other request is a test failure.
    const u = new URL(url);
    if (!u.hostname.startsWith("places.") || !u.pathname.startsWith("/v1/places")) throw new Error(`unexpected network call: ${url}`);
    requests.push({ url, method: init?.method ?? "GET", mask: new Headers(init?.headers).get("x-goog-fieldmask"), body: String(init?.body ?? "") });
    if (url.includes(":searchText")) {
      return Promise.resolve(new Response(JSON.stringify({ places: [{ id: PLACE_A, displayName: { text: "Harbour Lane Coffee" }, formattedAddress: "12 Harbour Lane, Example Town" }] }), { status: 200 }));
    }
    return Promise.resolve(new Response(JSON.stringify(opts.place ?? FULL), { status: 200 }));
  };

  const hits = new Map<string, number>();
  const saved: Record<string, unknown>[] = [];
  const sent: { kind: string; to: string; subject: string; html: string; text: string; dedupeKey: string }[] = [];
  const errors: unknown[] = [];
  const deps: Deps = {
    env: (n) => (n === "PLACES_API_KEY" ? "test-key" : n === "SUPABASE_URL" ? "https://example.supabase.co" : undefined),
    ip: (req) => req.headers.get("x-forwarded-for") ?? "unknown",
    today: () => "2026-10-12",
    sha256Hex: async (t) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, "0")).join(""),
    rateLimit: (key, max) => {
      const n = (hits.get(key) ?? 0) + 1;
      hits.set(key, n);
      return Promise.resolve(n <= max);
    },
    giveBack: (key) => {
      hits.set(key, Math.max((hits.get(key) ?? 0) - 1, 0));
      return Promise.resolve();
    },
    verifyTurnstile: (t) => Promise.resolve(opts.turnstile === false ? false : t === "ok"),
    searchText,
    getSnapshotPlace,
    getCachedSnapshot,
    saveEmail: (row) => (saved.push(row), Promise.resolve()),
    sendEmail: (o) => (sent.push(o), Promise.resolve({ sent: "x" })),
    captureError: (_fn, e) => (errors.push(e), Promise.resolve()),
    appUrl: "https://kabsi.co",
    cors: {},
    emailLayout,
    esc,
  };
  const handler = makeHandler(deps);
  const call = async (body: Record<string, unknown>, ip = "203.0.113.5") => {
    const res = await handler(new Request("https://x/functions/v1/profile-snapshot", {
      method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify({ turnstile: "ok", ...body }),
    }));
    return { status: res.status, body: await res.json() as Record<string, any> };
  };
  return { requests, cache, cachePuts, saved, sent, errors, hits, call };
}
function restore() {
  Object.assign(guard, real);
  globalThis.fetch = realFetch;
}

Deno.test("every Places request sends the field mask, and none asks for reviews", async () => {
  const w = world();
  try {
    assert.equal((await w.call({ action: "search", query: "Harbour Lane Coffee Example Town" })).status, 200);
    assert.equal((await w.call({ action: "check", place_id: PLACE_A })).status, 200);
    assert.equal((await w.call({ action: "check", place_id: PLACE_B })).status, 200);
    assert.equal(w.requests.length, 3);
    for (const r of w.requests) {
      assert.ok(r.mask && r.mask.length > 0, `no field mask on ${r.url}`);
      assert.doesNotMatch(r.mask!, /review/i, `reviews field in ${r.url}`);
      assert.doesNotMatch(r.url, /review/i);
      assert.doesNotMatch(r.body, /review/i);
    }
    const details = w.requests.filter((r) => r.url.includes("/places/"));
    assert.equal(details.length, 2);
    for (const r of details) assert.equal(r.mask, SNAPSHOT_FIELD_MASK);
    assert.deepEqual(
      SNAPSHOT_FIELD_MASK.split(","),
      ["id", "displayName", "formattedAddress", "primaryTypeDisplayName", "businessStatus", "rating", "userRatingCount", "regularOpeningHours", "currentOpeningHours", "nationalPhoneNumber", "websiteUri", "photos"],
    );
    assert.equal(w.requests.find((r) => r.url.includes(":searchText"))!.mask, "places.id,places.displayName,places.formattedAddress");
  } finally {
    restore();
  }
});

Deno.test("the fourth check from one visitor in a day is refused, and it never reaches Places", async () => {
  const w = world();
  try {
    for (let i = 0; i < LIMITS.checksPerDay; i++) {
      const r = await w.call({ action: "check", place_id: `ChIJ${String(i).repeat(16)}` });
      assert.equal(r.status, 200, `check ${i + 1}`);
    }
    assert.equal(w.requests.length, 3);
    const fourth = await w.call({ action: "check", place_id: PLACE_A });
    assert.equal(fourth.status, 429);
    assert.equal(fourth.body.error, "daily_limit");
    assert.equal(w.requests.length, 3, "the refused check made no Places request");
    // Another visitor is not affected.
    assert.equal((await w.call({ action: "check", place_id: PLACE_A }, "198.51.100.9")).status, 200);
  } finally {
    restore();
  }
});

Deno.test("the 24 hour cache: a second check of the same business makes no second Places request", async () => {
  const w = world();
  try {
    const first = await w.call({ action: "check", place_id: PLACE_A });
    assert.equal(first.body.snapshot.cached, false);
    assert.equal(w.requests.length, 1);
    const second = await w.call({ action: "check", place_id: PLACE_A }, "198.51.100.9");
    assert.equal(second.body.snapshot.cached, true);
    assert.equal(w.requests.length, 1, "the second check came from the cache");
    assert.equal(second.body.snapshot.name, "Harbour Lane Coffee");
    // A cache hit still counts as one of the visitor's three checks.
    await w.call({ action: "check", place_id: PLACE_A }, "198.51.100.9");
    await w.call({ action: "check", place_id: PLACE_A }, "198.51.100.9");
    assert.equal((await w.call({ action: "check", place_id: PLACE_A }, "198.51.100.9")).status, 429);
    assert.equal(w.requests.length, 1);
  } finally {
    restore();
  }
});

Deno.test("Places daily cap 0: Back soon, no request at all, and the visitor keeps their checks", async () => {
  const w = world({ cap: 0 });
  try {
    // Each call from its own visitor, so the per-minute limit stays out of the way.
    for (let i = 0; i < 6; i++) {
      const s = await w.call({ action: "search", query: "Harbour Lane" }, `203.0.113.${20 + i}`);
      assert.equal(s.status, 503);
      assert.equal(s.body.error, "back_soon");
      assert.match(s.body.message, /^Back soon/);
    }
    // One visitor asks 5 times: each is "Back soon" (not the daily limit) because every refused ask is handed back.
    for (let i = 0; i < 5; i++) {
      const c = await w.call({ action: "check", place_id: PLACE_A });
      assert.equal(c.status, 503);
      assert.equal(c.body.error, "back_soon");
    }
    assert.equal(w.requests.length, 0, "nothing reached Places");
    assert.equal(w.hits.get([...w.hits.keys()].find((k) => k.startsWith("snapshot:check:"))!), 0, "the daily checks were handed back");
  } finally {
    restore();
  }
});

Deno.test("cap 0 still serves a business that is in the 24 hour cache", async () => {
  const w = world({ cap: 0 });
  try {
    w.cache.set(`${PLACE_A}|${SNAPSHOT_FIELD_MASK}`, FULL);
    const r = await w.call({ action: "check", place_id: PLACE_A });
    assert.equal(r.status, 200);
    assert.equal(r.body.snapshot.cached, true);
    assert.equal(w.requests.length, 0);
  } finally {
    restore();
  }
});

Deno.test("nothing is stored past the cache window: the only writes are the 24 hour cache and the email proof", async () => {
  const w = world();
  try {
    await w.call({ action: "search", query: "Harbour Lane" });
    const c = await w.call({ action: "check", place_id: PLACE_A });
    assert.equal(w.saved.length, 0, "a check stores no row of its own");
    assert.deepEqual(w.cachePuts, [`${PLACE_A}|${SNAPSHOT_FIELD_MASK}`]);
    // The answer to the browser is a fixed set of fields: no raw Google photo names or other content.
    assert.doesNotMatch(JSON.stringify(c.body), /places\/x\/photos/);
    assert.equal(c.body.snapshot.photo_count, 2);
    await w.call({ action: "email", place_id: PLACE_A, email: "Owner@Example-Cafe.com", tips: false, consent_text: TIPS_CONSENT_TEXT, page: "/google-profile-check" });
    assert.equal(w.saved.length, 1);
    // The email proof holds the Place ID and the consent facts, and no name, address, rating or other Google content.
    assert.deepEqual(Object.keys(w.saved[0]).sort(), ["consent_text", "email", "page", "place_id", "tips_opt_in"]);
  } finally {
    restore();
  }
});

Deno.test("email capture stores the consent text, the choice and the page; the time is the row's created_at", async () => {
  const w = world();
  try {
    await w.call({ action: "check", place_id: PLACE_A });
    const ticked = await w.call({ action: "email", place_id: PLACE_A, email: " Owner@Example-Cafe.com ", tips: true, consent_text: TIPS_CONSENT_TEXT, page: "/get-started" });
    assert.equal(ticked.status, 200);
    const unticked = await w.call({ action: "email", place_id: PLACE_A, email: "other@example-cafe.com", tips: false, consent_text: TIPS_CONSENT_TEXT, page: "/google-profile-check" });
    assert.equal(unticked.status, 200);
    assert.deepEqual(w.saved, [
      { email: "owner@example-cafe.com", place_id: PLACE_A, tips_opt_in: true, consent_text: "Send me tips on managing my Google profile", page: "/get-started" },
      { email: "other@example-cafe.com", place_id: PLACE_A, tips_opt_in: false, consent_text: "Send me tips on managing my Google profile", page: "/google-profile-check" },
    ]);
    assert.equal(w.sent.length, 2);
    assert.equal(w.sent[0].subject, "Harbour Lane Coffee: your Google Profile Check");
    assert.match(w.sent[0].html, /You asked for tips/);
    assert.doesNotMatch(w.sent[1].html, /You asked for tips/);
    assert.equal(w.requests.length, 1, "the emails were built from the cache: one Places request in all");
    // Refused: wrong words, unknown page, missing choice, bad address.
    for (const bad of [
      { consent_text: "Send me things", page: "/google-profile-check", tips: true, email: "a@example-cafe.com" },
      { consent_text: TIPS_CONSENT_TEXT, page: "/somewhere-else", tips: true, email: "a@example-cafe.com" },
      { consent_text: TIPS_CONSENT_TEXT, page: "/google-profile-check", tips: "yes", email: "a@example-cafe.com" },
      { consent_text: TIPS_CONSENT_TEXT, page: "/google-profile-check", tips: true, email: "not-an-email" },
    ]) assert.equal((await w.call({ action: "email", place_id: PLACE_A, ...bad })).status, 400);
    assert.equal(w.saved.length, 2);
    assert.ok(CHECK_PAGES.includes("/get-started") && CHECK_PAGES.includes("/google-profile-check"));
  } finally {
    restore();
  }
});

Deno.test("email for a check that is no longer cached asks to run it again and makes no Places request", async () => {
  const w = world();
  try {
    const r = await w.call({ action: "email", place_id: PLACE_A, email: "a@example-cafe.com", tips: false, consent_text: TIPS_CONSENT_TEXT, page: "/google-profile-check" });
    assert.equal(r.status, 410);
    assert.equal(r.body.error, "expired");
    assert.equal(w.requests.length, 0);
    assert.equal(w.saved.length, 0);
  } finally {
    restore();
  }
});

Deno.test("Turnstile and the per-minute limit stop a call before it reaches Places", async () => {
  const w = world({ turnstile: false });
  try {
    const r = await w.call({ action: "check", place_id: PLACE_A });
    assert.equal(r.status, 400);
    assert.equal(r.body.error, "challenge_failed");
    assert.equal(w.requests.length, 0);
  } finally {
    restore();
  }
  const w2 = world();
  try {
    for (let i = 0; i < LIMITS.perMinute; i++) await w2.call({ action: "nothing" });
    const r = await w2.call({ action: "search", query: "Harbour Lane" });
    assert.equal(r.status, 429);
    assert.equal(w2.requests.length, 0);
  } finally {
    restore();
  }
});

Deno.test("findings: three to five, labelled, ordered, no score, no dashes or exclamation marks", () => {
  const strong = buildSnapshot(PLACE_A, FULL, false);
  assert.ok(strong.findings.length >= 3 && strong.findings.length <= 5);
  const bare = buildSnapshot(PLACE_B, { id: PLACE_B, displayName: { text: "Bare" }, businessStatus: "CLOSED_TEMPORARILY", userRatingCount: 0 }, false);
  assert.ok(bare.findings.length <= 5);
  assert.equal(bare.findings[0].level, "urgent");
  assert.match(bare.findings[0].title, /temporarily closed/);
  const levels = bare.findings.map((f) => f.level);
  assert.deepEqual(levels, [...levels].sort((a, b) => ["urgent", "recommended", "nice"].indexOf(a) - ["urgent", "recommended", "nice"].indexOf(b)));
  for (const s of [strong, bare]) {
    for (const f of s.findings) {
      const text = `${f.title} ${f.detail}`;
      assert.doesNotMatch(text, /[\u2013\u2014!]/, text);
      assert.doesNotMatch(text, /score|rank|best|guarantee|automatically|approved by google/i, text);
    }
  }
  assert.equal(findings({ ...strong, hours: [] }).some((f) => f.title === "Your opening hours are missing"), true);
  const mail = checkEmail({ emailLayout, esc, appUrl: "https://kabsi.co" }, strong, true);
  assert.doesNotMatch(mail.html.replace("<!doctype html>", "") + mail.text + mail.subject, /[\u2013\u2014!]/);
  assert.match(mail.text, /Join early access: https:\/\/kabsi.co\/start/);
});
