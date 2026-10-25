// Run: deno test --no-check supabase/functions/_shared/profile-snapshot.test.ts
// The free Google Profile Check (P0.4-01). Everything runs on stubs: Places is a fetch stub that answers from canned
// responses and counts requests, the limiter and the cache are in memory, and there is no network and no Anthropic
// call. The real Google layer code (field masks, kill switch) runs unchanged on top of the stubs. Nothing from Places is
// cached (master plan 30.10): every check, email and WhatsApp copy reads Google live.
import assert from "node:assert/strict";
import { getSnapshotPlace, guard, SNAPSHOT_FIELD_MASK, searchText } from "./google/places/live.ts";
import type { Place } from "./google/types.ts";
import { buildSnapshot, CHECK_PAGES, checkEmail, type Deps, flags, LIMITS, makeHandler, normalizePhone, TIPS_CONSENT_TEXT, WHATSAPP_CONSENT_TEXT, whatsappParams } from "./profile-snapshot.ts";
import { esc } from "./email-layout.ts";
import { FREE_TOOL_BUSY } from "./free-tool-busy.ts";
import { type EmailContent, renderEmail } from "./email/template.ts";

const CTX = { appUrl: "https://kabsi.test", defaultWhy: "You asked for this email." };
const real = { ...guard };
const realFetch = globalThis.fetch;
const PLACE_A = "ChIJaaaaaaaaaaaaaaaa";
const PLACE_B = "ChIJbbbbbbbbbbbbbbbb";
const PLACE_C = "ChIJcccccccccccccccc";

const FULL: Place = {
  id: PLACE_A, displayName: { text: "Harbour Lane Coffee", languageCode: "en" }, formattedAddress: "12 Harbour Lane, Example Town",
  primaryTypeDisplayName: { text: "Coffee shop" }, businessStatus: "OPERATIONAL", rating: 4.6, userRatingCount: 128,
  regularOpeningHours: { weekdayDescriptions: ["Monday: 8:00 AM to 6:00 PM", "Tuesday: 8:00 AM to 6:00 PM"] },
  currentOpeningHours: { openNow: true }, nationalPhoneNumber: "(555) 010-0000", websiteUri: "https://example.com",
  photos: [{ name: "places/x/photos/1" }, { name: "places/x/photos/2" }],
};

type Seen = { url: string; method: string; mask: string | null; body: string }[];

// A world with the Places day cap, an in-memory limiter and every outbound effect recorded. PLACE_B is not on Google.
function world(opts: { cap?: number; place?: Place; turnstile?: boolean; whatsapp?: boolean; waState?: "sent" | "mock_sent" | "held" | "failed" } = {}) {
  const cap = opts.cap ?? 100;
  const requests: Seen = [];
  let used = 0;
  guard.take = () => (used >= cap ? Promise.resolve(false) : (used++, Promise.resolve(true)));
  globalThis.fetch = (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    // Only the Places layer may be asked, and only through this stub: any other request is a test failure.
    const u = new URL(url);
    if (!u.hostname.startsWith("places.") || !u.pathname.startsWith("/v1/places")) throw new Error(`unexpected network call: ${url}`);
    requests.push({ url, method: init?.method ?? "GET", mask: new Headers(init?.headers).get("x-goog-fieldmask"), body: String(init?.body ?? "") });
    if (url.includes(":searchText")) {
      return Promise.resolve(new Response(JSON.stringify({ places: [{ id: PLACE_A, displayName: { text: "Harbour Lane Coffee" }, formattedAddress: "12 Harbour Lane, Example Town" }] }), { status: 200 }));
    }
    if (url.includes(PLACE_B)) return Promise.resolve(new Response(JSON.stringify({ error: { code: 404 } }), { status: 404 }));
    return Promise.resolve(new Response(JSON.stringify(opts.place ?? FULL), { status: 200 }));
  };

  const hits = new Map<string, number>();
  const saved: Record<string, unknown>[] = [];
  const sent: { kind: string; to: string; subject: string; html: string; text: string; dedupeKey: string; content: EmailContent }[] = [];
  const errors: unknown[] = [];
  const wa = { saved: [] as Record<string, unknown>[], sent: [] as { to: string; params: string[] }[], marked: [] as { id: string; state: string }[] };
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
    whatsappOn: opts.whatsapp === true,
    saveWhatsapp: (row) => (wa.saved.push(row), Promise.resolve(`row-${wa.saved.length}`)),
    sendWhatsapp: (o) => (wa.sent.push(o), Promise.resolve({ state: opts.waState ?? "sent", id: "wamid.1" })),
    markWhatsapp: (id, r) => (wa.marked.push({ id, state: r.state }), Promise.resolve()),
    saveEmail: (row) => (saved.push(row), Promise.resolve()),
    sendEmail: (o) => (sent.push({ ...o, subject: o.content.subject, ...renderEmail(o.content, CTX) }), Promise.resolve({ sent: "x" })),
    captureError: (_fn, e) => (errors.push(e), Promise.resolve()),
    appUrl: "https://kabsi.co",
    cors: {},
    esc,
  };
  const handler = makeHandler(deps);
  const call = async (body: Record<string, unknown>, ip = "203.0.113.5") => {
    const res = await handler(new Request("https://x/functions/v1/profile-snapshot", {
      method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify({ turnstile: "ok", ...body }),
    }));
    return { status: res.status, body: await res.json() as Record<string, any> };
  };
  return { requests, saved, sent, errors, hits, call, wa };
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
    assert.equal((await w.call({ action: "check", place_id: PLACE_C })).status, 200);
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

Deno.test("no cache: a second check of the same business reads Google again (master plan 30.10)", async () => {
  const w = world();
  try {
    const first = await w.call({ action: "check", place_id: PLACE_A });
    assert.equal(first.body.snapshot.cached, false);
    assert.equal(w.requests.length, 1);
    const second = await w.call({ action: "check", place_id: PLACE_A }, "198.51.100.9");
    assert.equal(second.body.snapshot.cached, false);
    assert.equal(w.requests.length, 2, "nothing was kept from the first check");
    assert.equal(second.body.snapshot.name, "Harbour Lane Coffee");
    // Every check counts as one of the visitor's three.
    await w.call({ action: "check", place_id: PLACE_A }, "198.51.100.9");
    await w.call({ action: "check", place_id: PLACE_A }, "198.51.100.9");
    assert.equal((await w.call({ action: "check", place_id: PLACE_A }, "198.51.100.9")).status, 429);
    assert.equal(w.requests.length, 4);
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
      assert.equal(s.body.message, FREE_TOOL_BUSY);
      assert.doesNotMatch(s.body.message, /early access|Back soon/i);
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

Deno.test("cap 0: the email and the WhatsApp copy are busy too; nothing is saved or sent", async () => {
  const w = world({ cap: 0, whatsapp: true });
  try {
    const e = await w.call({ action: "email", place_id: PLACE_A, email: "a@example-cafe.com", tips: false, consent_text: TIPS_CONSENT_TEXT, page: "/google-profile-check" });
    assert.equal(e.status, 503);
    assert.equal(e.body.message, FREE_TOOL_BUSY);
    assert.equal(w.saved.length, 0);
    assert.equal(w.sent.length, 0);
    assert.equal(w.requests.length, 0);
  } finally {
    restore();
  }
});

Deno.test("nothing from Places is stored: the only write is the email proof, with the place ID", async () => {
  const w = world();
  try {
    await w.call({ action: "search", query: "Harbour Lane" });
    const c = await w.call({ action: "check", place_id: PLACE_A });
    assert.equal(w.saved.length, 0, "a check stores no row of its own");
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
    assert.equal(w.requests.length, 3, "each email read Google again: one request for the check and one for each email");
    // Refused: wrong words, unknown page, missing choice, bad address.
    for (const bad of [
      { consent_text: "Send me things", page: "/google-profile-check", tips: true, email: "a@example-cafe.com" },
      { consent_text: TIPS_CONSENT_TEXT, page: "/somewhere-else", tips: true, email: "a@example-cafe.com" },
      { consent_text: TIPS_CONSENT_TEXT, page: "/google-profile-check", tips: "yes", email: "a@example-cafe.com" },
      { consent_text: TIPS_CONSENT_TEXT, page: "/google-profile-check", tips: true, email: "not-an-email" },
    ]) assert.equal((await w.call({ action: "email", place_id: PLACE_A, ...bad })).status, 400);
    assert.equal(w.saved.length, 2);
    assert.ok(CHECK_PAGES.includes("/") && CHECK_PAGES.includes("/get-started") && CHECK_PAGES.includes("/google-profile-check"));
  } finally {
    restore();
  }
});

Deno.test("email for a business Google no longer has says so, and saves and sends nothing", async () => {
  const w = world();
  try {
    const r = await w.call({ action: "email", place_id: PLACE_B, email: "a@example-cafe.com", tips: false, consent_text: TIPS_CONSENT_TEXT, page: "/google-profile-check" });
    assert.equal(r.status, 404);
    assert.equal(r.body.error, "not_found");
    assert.equal(w.saved.length, 0);
    assert.equal(w.sent.length, 0);
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

Deno.test("flags: a plain fact and what Kabsi would do, danger before warning before neutral, no score, no dashes or exclamation marks", () => {
  const strong = buildSnapshot(PLACE_A, FULL, false);
  // A complete profile has no danger or warning flag, only the three things public data cannot show.
  assert.deepEqual(strong.flags.map((f) => f.tone), ["neutral", "neutral", "neutral"]);
  const bare = buildSnapshot(PLACE_B, { id: PLACE_B, displayName: { text: "Bare" }, businessStatus: "CLOSED_TEMPORARILY", userRatingCount: 0 }, false);
  assert.equal(bare.flags[0].tone, "danger");
  assert.match(bare.flags[0].fact, /temporarily closed/);
  const tones = bare.flags.map((f) => f.tone);
  assert.deepEqual(tones, [...tones].sort((a, b) => ["danger", "warning", "neutral"].indexOf(a) - ["danger", "warning", "neutral"].indexOf(b)));
  const facts = bare.flags.map((f) => f.fact);
  for (const want of [/No opening hours are shown/, /No phone number/, /No website/, /No category/, /no photos/, /no reviews yet/]) {
    assert.ok(facts.some((t) => want.test(t)), String(want));
  }
  for (const s of [strong, bare]) {
    for (const f of s.flags) {
      const text = `${f.fact} ${f.action}`;
      assert.doesNotMatch(text, /[\u2013\u2014!]/, text);
      assert.doesNotMatch(text, /score|rank|best|guarantee|automatically|approved by google|costing|losing|customers will not/i, text);
      assert.doesNotMatch(text, /\d+\s?%/, text);
    }
  }
  // Review replies, holiday hours, post and photo dates are not in Google's public data: never a count, never a problem.
  const neutral = strong.flags.filter((f) => f.tone === "neutral").map((f) => f.fact).join(" ");
  assert.match(neutral, /which reviews have a reply/);
  assert.match(neutral, /holiday hours/);
  assert.match(neutral, /photos and posts/);
  assert.doesNotMatch(strong.flags.map((f) => f.fact).join(" "), /\d+ reviews? (have|has) no reply/);
  assert.equal(flags({ ...strong, hours: [] }).some((f) => f.tone === "danger" && f.fact === "No opening hours are shown on Google."), true);
  assert.equal(flags({ ...strong, review_count: 4 }).some((f) => f.tone === "warning" && f.fact === "There are 4 reviews so far."), true);
  assert.equal(flags({ ...strong, review_count: 1 }).some((f) => f.fact === "There is 1 review so far."), true);
  const mail = checkEmail({ esc, appUrl: "https://kabsi.co" }, strong, true);
  assert.doesNotMatch(renderEmail(mail, CTX).html.replace("<!doctype html>", "") + mail.text + mail.subject, /[\u2013\u2014!]/);
  assert.match(mail.text, /Start your free trial: https:\/\/kabsi.co\/get-started/);
  assert.doesNotMatch(mail.text + mail.bodyHtml, /Join early access/);
  // The public-information sentence is the note, said once in the rendered email and not also in the body (P0.8-02b).
  const rendered = renderEmail(mail, CTX);
  assert.equal(rendered.text.split("This check uses public information").length - 1, 1);
  assert.equal(rendered.html.split("This check uses public information").length - 1, 1);
});

// "Send my check to WhatsApp" (lane R sync, item D). Shown only while Kabsi has a number; one message after a ticked
// opt-in whose words are recorded; the number is never stored; no follow-up; nothing leaves from a test.
const WA = { action: "whatsapp", place_id: PLACE_A, phone: "+1 (201) 555-0100", consent: true, consent_text: WHATSAPP_CONSENT_TEXT, page: "/" };

Deno.test("whatsapp: refused while Kabsi has no number, and nothing is sent or recorded", async () => {
  const w = world({ whatsapp: false });
  try {
    await w.call({ action: "check", place_id: PLACE_A });
    const r = await w.call(WA);
    assert.equal(r.status, 503);
    assert.equal(r.body.error, "whatsapp_off");
    assert.equal(w.wa.sent.length, 0);
    assert.equal(w.wa.saved.length, 0);
  } finally {
    restore();
  }
});

Deno.test("whatsapp: one message after the ticked opt-in, the words recorded, the number never stored", async () => {
  const w = world({ whatsapp: true });
  try {
    await w.call({ action: "check", place_id: PLACE_A });
    const before = w.requests.length;
    const r = await w.call(WA);
    assert.equal(r.status, 200);
    assert.equal(r.body.ok, true);
    assert.equal(w.requests.length, before + 1, "read Google again for the copy: nothing was kept from the check");
    assert.equal(w.wa.sent.length, 1);
    assert.equal(w.wa.sent[0].to, "+12015550100");
    assert.equal(w.wa.saved.length, 1);
    const row = w.wa.saved[0];
    assert.equal(row.consent_text, WHATSAPP_CONSENT_TEXT);
    assert.equal(row.page, "/");
    assert.equal(row.place_id, PLACE_A);
    assert.doesNotMatch(JSON.stringify(row), /2015550100/, "the number itself is not in the record");
    assert.match(String(row.phone_hash), /^[0-9a-f]{40}$/);
    assert.deepEqual(w.wa.marked, [{ id: "row-1", state: "sent" }]);
    for (const p of w.wa.sent[0].params) assert.doesNotMatch(p, /[\n\t]|[\u2013\u2014!]/, "one line, no dashes or exclamation marks");
  } finally {
    restore();
  }
});

Deno.test("whatsapp: no tick, other words, a bad number or a business Google no longer has is refused before anything is sent", async () => {
  const w = world({ whatsapp: true });
  try {
    await w.call({ action: "check", place_id: PLACE_A });
    assert.equal((await w.call({ ...WA, consent: false })).body.error, "no_consent");
    assert.equal((await w.call({ ...WA, consent: "true" })).body.error, "no_consent");
    assert.equal((await w.call({ ...WA, consent_text: "Yes please" })).body.error, "bad_input");
    assert.equal((await w.call({ ...WA, page: "/elsewhere" })).body.error, "bad_input");
    assert.equal((await w.call({ ...WA, phone: "0201 555 0100" })).body.error, "bad_phone");
    assert.equal((await w.call({ ...WA, place_id: "x" })).body.error, "bad_place");
    assert.equal((await w.call({ ...WA, place_id: PLACE_B })).body.error, "not_found");
    assert.equal(w.wa.sent.length, 0);
    assert.equal(w.wa.saved.length, 0);
  } finally {
    restore();
  }
});

Deno.test("whatsapp: a number gets one check a day, a visitor three an hour, and Turnstile is required", async () => {
  const w = world({ whatsapp: true });
  try {
    await w.call({ action: "check", place_id: PLACE_A });
    assert.equal((await w.call(WA)).status, 200);
    const again = await w.call(WA);
    assert.equal(again.status, 429);
    assert.equal(again.body.error, "number_limit");
    // The refused repeat still counted against the visitor's three an hour.
    assert.equal((await w.call({ ...WA, phone: "+12015550101" })).status, 200);
    assert.equal((await w.call({ ...WA, phone: "+12015550102" })).body.error, "rate_limited");
    assert.equal(w.wa.sent.length, 2);
  } finally {
    restore();
  }
  const noChallenge = world({ whatsapp: true, turnstile: false });
  try {
    assert.equal((await noChallenge.call(WA)).body.error, "challenge_failed");
  } finally {
    restore();
  }
});

Deno.test("whatsapp: the mock sender, a missing template or a failure never says sent", async () => {
  for (const state of ["mock_sent", "held", "failed"] as const) {
    const w = world({ whatsapp: true, waState: state });
    try {
      await w.call({ action: "check", place_id: PLACE_A });
      const r = await w.call(WA);
      assert.equal(r.status, 503, state);
      assert.equal(r.body.error, "whatsapp_off", state);
      assert.deepEqual(w.wa.marked, [{ id: "row-1", state }]);
    } finally {
      restore();
    }
  }
});

Deno.test("whatsapp: phone numbers, the words and the one-line message", () => {
  assert.equal(normalizePhone(" +44 7700 900123 "), "+447700900123");
  assert.equal(normalizePhone("+1 (201) 555-0100"), "+12015550100");
  assert.equal(normalizePhone("2015550100"), null);
  assert.equal(normalizePhone("+0123456789"), null);
  assert.equal(normalizePhone("+123"), null);
  assert.equal(normalizePhone("+1 201 555 0100 ext 5"), null);
  assert.doesNotMatch(WHATSAPP_CONSENT_TEXT, /[\u2013\u2014!]/);
  const bare = buildSnapshot(PLACE_B, { id: PLACE_B, displayName: { text: "Bare\nShop" }, userRatingCount: 0 }, true);
  const [name, line] = whatsappParams(bare);
  assert.equal(name, "Bare Shop");
  assert.match(line, /^\d+ things to look at: /);
  assert.match(line, /No opening hours are shown on Google\./);
  assert.doesNotMatch(line, /which reviews have a reply|After you connect/, "public-data blind spots are not listed as problems");
  const strong = whatsappParams(buildSnapshot(PLACE_A, FULL, true));
  assert.equal(strong[1], "Nothing needs fixing in what Google shows the public.");
});
