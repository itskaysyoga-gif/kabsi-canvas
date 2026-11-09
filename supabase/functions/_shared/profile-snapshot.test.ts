// Run: deno test --no-check supabase/functions/_shared/profile-snapshot.test.ts
// The free Google Profile Check (P0.4-01). Everything runs on stubs: Places is a fetch stub that answers from canned
// responses and counts requests, the limiter and the cache are in memory, and there is no network and no Anthropic
// call. The real Google layer code (field masks, kill switch) runs unchanged on top of the stubs. Nothing from Places is
// cached (master plan 30.10): every check, email and WhatsApp copy reads Google live.
import assert from "node:assert/strict";
import { autocomplete, getSnapshotPlace, guard, SNAPSHOT_FIELD_MASK, searchText } from "./google/places/live.ts";
import type { Place } from "./google/types.ts";
import { buildSnapshot, CHECK_PAGES, checkEmail, type Deps, flags, LIMITS, makeHandler, normalizePhone, TIPS_CONSENT_TEXT, WHATSAPP_CONSENT_TEXT, whatsappParams } from "./profile-snapshot.ts";
import { esc } from "./email-layout.ts";
import { FREE_TOOL_BUSY } from "./free-tool-busy.ts";
import { visibleText, type EmailContent, renderEmail } from "./email/template.ts";
import { type CheckRow, reportParts } from "./visibility/free-check.ts";

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

// Check 2: what Places Autocomplete (New) answers: five good predictions and the extras the function must drop
// (a query prediction, a prediction with a bad place ID, a sixth place).
const AUTOCOMPLETE_ANSWER = {
  suggestions: [
    ...["A", "B", "C", "D", "E", "F"].map((x, i) => ({
      placePrediction: {
        placeId: `ChIJsuggest${x}${x}${x}${x}${x}${x}`, text: { text: `Harbour Lane ${i}, 12 Harbour Lane, Example Town` },
        structuredFormat: { mainText: { text: `Harbour Lane ${i}` }, secondaryText: { text: "12 Harbour Lane, Example Town" } },
      },
    })),
    { queryPrediction: { text: { text: "harbour lane coffee" } } },
    { placePrediction: { placeId: "bad id", text: { text: "Nope" } } },
  ],
};
const SESSION = "6f1c2c2e-9a0b-4f0e-8d57-0a4e0d1f3b21";

type Seen = { url: string; method: string; mask: string | null; body: string }[];

// A world with the Places day cap, an in-memory limiter and every outbound effect recorded. PLACE_B is not on Google.
function world(opts: { checks?: Record<string, CheckRow>; cap?: number; place?: Place; turnstile?: boolean; whatsapp?: boolean; waState?: "sent" | "mock_sent" | "held" | "failed"; autoStatus?: number; noSecret?: boolean } = {}) {
  const clock = { ms: Date.parse("2026-11-01T10:00:00Z") };
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
    if (url.includes(":autocomplete")) {
      return Promise.resolve(new Response(JSON.stringify(opts.autoStatus && opts.autoStatus !== 200 ? { error: { code: opts.autoStatus } } : AUTOCOMPLETE_ANSWER), { status: opts.autoStatus ?? 200 }));
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
    env: (n) => (n === "PLACES_API_KEY" ? "test-key" : n === "SUPABASE_URL" ? "https://example.supabase.co" : n === "TURNSTILE_SECRET_KEY" && !opts.noSecret ? "turnstile-secret" : undefined),
    nowMs: () => clock.ms,
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
    autocomplete,
    getSnapshotPlace,
    whatsappOn: opts.whatsapp === true,
    saveWhatsapp: (row) => (wa.saved.push(row), Promise.resolve(`row-${wa.saved.length}`)),
    sendWhatsapp: (o) => (wa.sent.push(o), Promise.resolve({ state: opts.waState ?? "sent", id: "wamid.1" })),
    markWhatsapp: (id, r) => (wa.marked.push({ id, state: r.state }), Promise.resolve()),
    saveEmail: (row) => (saved.push(row), Promise.resolve()),
    sendEmail: (o) => (sent.push({ ...o, subject: o.content.subject, ...renderEmail(o.content, CTX) }), Promise.resolve({ sent: "x" })),
    captureError: (_fn, e) => (errors.push(e), Promise.resolve()),
    loadCheck: (code, placeId) => {
      const c = opts.checks?.[code];
      return Promise.resolve(!c ? null : c.self.place_id === placeId ? { parts: reportParts(c, "https://kabsi.co") } : "other");
    },
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
  return { requests, saved, sent, errors, hits, call, wa, clock };
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
      ["id", "displayName", "formattedAddress", "addressComponents", "primaryTypeDisplayName", "businessStatus", "rating", "userRatingCount", "regularOpeningHours", "currentOpeningHours", "nationalPhoneNumber", "websiteUri", "photos"],
    );
    // Check 2: the category joins the name and address (the same Pro tier), so the visitor can tell two matches apart.
    assert.equal(w.requests.find((r) => r.url.includes(":searchText"))!.mask, "places.id,places.displayName,places.formattedAddress,places.primaryTypeDisplayName");
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
    const ticked = await w.call({ action: "email", place_id: PLACE_A, email: " Owner@Example-Cafe.com ", tips: true, consent_text: TIPS_CONSENT_TEXT, page: "/" });
    assert.equal(ticked.status, 200);
    const unticked = await w.call({ action: "email", place_id: PLACE_A, email: "other@example-cafe.com", tips: false, consent_text: TIPS_CONSENT_TEXT, page: "/google-profile-check" });
    assert.equal(unticked.status, 200);
    assert.deepEqual(w.saved, [
      { email: "owner@example-cafe.com", place_id: PLACE_A, tips_opt_in: true, consent_text: "Send me tips on managing my Google profile", page: "/" },
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
      // Launch 2 part C: /get-started is gone (a 301 to /scan).
      { consent_text: TIPS_CONSENT_TEXT, page: "/get-started", tips: true, email: "a@example-cafe.com" },
      { consent_text: TIPS_CONSENT_TEXT, page: "/google-profile-check", tips: "yes", email: "a@example-cafe.com" },
      { consent_text: TIPS_CONSENT_TEXT, page: "/google-profile-check", tips: true, email: "not-an-email" },
    ]) assert.equal((await w.call({ action: "email", place_id: PLACE_A, ...bad })).status, 400);
    assert.equal(w.saved.length, 2);
    assert.ok(CHECK_PAGES.includes("/") && !CHECK_PAGES.includes("/get-started") && CHECK_PAGES.includes("/google-profile-check"));
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
  assert.doesNotMatch(visibleText(renderEmail(mail, CTX).html) + mail.text + mail.subject, /[\u2013\u2014!]/);
  assert.match(mail.text, /Start your free trial: https:\/\/kabsi.co\/login\?next=\/start/);
  assert.equal(mail.button?.url, "https://kabsi.co/login?next=/start");
  assert.doesNotMatch(mail.text + mail.button?.url, /get-started/);
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

Deno.test("Sec 1: one address gets at most two check emails a day, from any visitor and for any place", async () => {
  const w = world();
  try {
    const send = (ip: string, place = PLACE_A) =>
      w.call({ action: "email", place_id: place, email: "someone@example-cafe.com", tips: false, consent_text: TIPS_CONSENT_TEXT, page: "/google-profile-check" }, ip);
    assert.equal((await send("203.0.113.1")).status, 200);
    assert.equal((await send("203.0.113.2")).status, 200);
    const third = await send("203.0.113.3");
    assert.equal(third.status, 429);
    assert.equal(third.body.error, "address_limit");
    assert.equal(w.sent.length, 2);
    // Another address from the same visitor still goes.
    const other = await w.call({ action: "email", place_id: PLACE_A, email: "owner@example-cafe.com", tips: false, consent_text: TIPS_CONSENT_TEXT, page: "/google-profile-check" }, "203.0.113.3");
    assert.equal(other.status, 200);
  } finally {
    restore();
  }
});

// ─── Check 2 (1 Nov 2026): suggestions while the visitor types

Deno.test("suggest: the bot check comes first, and without it nothing reaches Places", async () => {
  const w = world({ turnstile: false });
  try {
    const r = await w.call({ action: "suggest", query: "harbour", session_token: SESSION });
    assert.equal(r.status, 400);
    assert.equal(r.body.error, "challenge_failed");
    const forged = await w.call({ action: "suggest", query: "harbour", session_token: SESSION, pass: `${Math.floor(w.clock.ms / 1000) + 600}.${"0".repeat(64)}` });
    assert.equal(forged.status, 400, "a made-up pass is not a bot check");
    assert.equal(w.requests.length, 0);
  } finally {
    restore();
  }
});

Deno.test("suggest: up to 5 name and short address pairs, the session token goes to Places, no field mask is faked, nothing about reviews", async () => {
  const w = world();
  try {
    const r = await w.call({ action: "suggest", query: "  harbour lane  ", session_token: SESSION });
    assert.equal(r.status, 200);
    assert.equal(r.body.available, true);
    assert.equal(r.body.suggestions.length, 5, "five at most, query predictions and bad place IDs dropped");
    assert.deepEqual(r.body.suggestions[0], { place_id: "ChIJsuggestAAAAAA", name: "Harbour Lane 0", address: "12 Harbour Lane, Example Town" });
    assert.equal(w.requests.length, 1);
    const req = w.requests[0]!;
    assert.match(req.url, /places:autocomplete$/);
    assert.deepEqual(JSON.parse(req.body), { input: "harbour lane", sessionToken: SESSION });
    assert.doesNotMatch(req.body, /review/i);
    assert.equal(typeof r.body.pass, "string", "the first call earns a pass");
  } finally {
    restore();
  }
});

Deno.test("suggest: the pass replaces the Turnstile token for 15 minutes, for the same visitor only", async () => {
  const w = world();
  try {
    const first = await w.call({ action: "suggest", query: "harbour", session_token: SESSION });
    const pass = first.body.pass as string;
    // Later calls carry the pass and no Turnstile token (a token works once): they pass.
    const next = await w.call({ action: "suggest", query: "harbour lane", session_token: SESSION, pass, turnstile: "" });
    assert.equal(next.status, 200);
    assert.equal(next.body.pass, undefined, "a valid pass is not reissued");
    // Another visitor cannot use it.
    const other = await w.call({ action: "suggest", query: "harbour lane", session_token: SESSION, pass, turnstile: "" }, "198.51.100.9");
    assert.equal(other.status, 400);
    // A changed pass fails.
    const [exp, mac] = pass.split(".");
    const bad = await w.call({ action: "suggest", query: "harbour lane", session_token: SESSION, pass: `${exp}.${mac!.replace(/.$/, mac!.endsWith("0") ? "1" : "0")}`, turnstile: "" });
    assert.equal(bad.status, 400);
    // After 15 minutes it has run out, and the bot check is asked again.
    w.clock.ms += 16 * 60 * 1000;
    const late = await w.call({ action: "suggest", query: "harbour lane", session_token: SESSION, pass, turnstile: "" });
    assert.equal(late.status, 400);
    const again = await w.call({ action: "suggest", query: "harbour lane", session_token: SESSION, pass, turnstile: "ok" });
    assert.equal(again.status, 200);
    assert.equal(typeof again.body.pass, "string");
  } finally {
    restore();
  }
});

Deno.test("suggest: too short, too long or a bad session token is refused before Places; the visitor's 10 a minute is not used", async () => {
  const w = world();
  try {
    assert.equal((await w.call({ action: "suggest", query: "ha", session_token: SESSION })).status, 400);
    assert.equal((await w.call({ action: "suggest", query: "x".repeat(121), session_token: SESSION })).status, 400);
    assert.equal((await w.call({ action: "suggest", query: "harbour", session_token: "short" })).status, 400);
    assert.equal(w.requests.length, 0);
    const first = await w.call({ action: "suggest", query: "harbour", session_token: SESSION });
    const pass = first.body.pass as string;
    for (let i = 0; i < 12; i++) assert.equal((await w.call({ action: "suggest", query: `harbour ${i}`, session_token: SESSION, pass })).status, 200);
    // 13 suggestions did not touch the free check's own limit: a search still works.
    assert.equal((await w.call({ action: "search", query: "Harbour Lane Coffee" })).status, 200);
  } finally {
    restore();
  }
});

Deno.test("suggest: 20 a minute, 120 an hour and 60 a day per visitor, then 429 and no Places request", async () => {
  const w = world();
  try {
    const first = await w.call({ action: "suggest", query: "harbour", session_token: SESSION });
    const pass = first.body.pass as string;
    for (let i = 1; i < LIMITS.suggestPerMinute; i++) assert.equal((await w.call({ action: "suggest", query: `harbour ${i}`, session_token: SESSION, pass })).status, 200);
    const before = w.requests.length;
    const over = await w.call({ action: "suggest", query: "harbour more", session_token: SESSION, pass });
    assert.equal(over.status, 429);
    assert.equal(over.body.error, "rate_limited");
    assert.equal(w.requests.length, before);
  } finally {
    restore();
  }
  // The day limit: one visitor cannot use up the day's shared Autocomplete cap.
  const d = world();
  try {
    const first = await d.call({ action: "suggest", query: "harbour", session_token: SESSION });
    const dayKey = [...d.hits.keys()].find((k) => k.startsWith("snapshot:suggest-day:"))!;
    d.hits.set(dayKey, LIMITS.suggestPerDay);
    const over = await d.call({ action: "suggest", query: "harbour more", session_token: SESSION, pass: first.body.pass });
    assert.equal(over.status, 429);
    assert.equal(d.requests.length, 1, "the refused call made no Places request");
  } finally {
    restore();
  }
});

// Scan 3 (master plan 30.34 item 2): one Turnstile pass per search session, asked before the first suggestion.
Deno.test("pass: one Turnstile token buys the pass, never reaches Places, and the suggestions then need no token", async () => {
  const w = world();
  try {
    const p = await w.call({ action: "pass", turnstile: "ok" });
    assert.equal(p.status, 200);
    assert.equal(typeof p.body.pass, "string");
    assert.equal(w.requests.length, 0, "the pass asks nothing of Places");
    // The first suggestion carries the pass and no token, and is answered.
    const s = await w.call({ action: "suggest", query: "harbour", session_token: SESSION, pass: p.body.pass, turnstile: "" });
    assert.equal(s.status, 200);
    assert.equal(s.body.available, true);
    assert.equal(s.body.pass, undefined, "a valid pass is not reissued");
    // Without a passing bot check there is no pass.
    const bad = await w.call({ action: "pass", turnstile: "" });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.error, "challenge_failed");
    // The pass counts against the suggestions' per-minute limit: past it, 429 and no pass.
    const minKey = [...w.hits.keys()].find((k) => k.startsWith("snapshot:suggest-min:"))!;
    w.hits.set(minKey, LIMITS.suggestPerMinute);
    const over = await w.call({ action: "pass", turnstile: "ok" });
    assert.equal(over.status, 429);
    assert.equal(over.body.pass, undefined);
    // A suggestion refused by the minute limit does not count on the hour or the day, as when the limits ran in order.
    const hourKey = () => [...w.hits.keys()].find((k) => k.startsWith("snapshot:suggest-hour:"))!;
    const dayKey = () => [...w.hits.keys()].find((k) => k.startsWith("snapshot:suggest-day:"))!;
    const [h, dd] = [w.hits.get(hourKey()), w.hits.get(dayKey())];
    const refused = await w.call({ action: "suggest", query: "harbour more", session_token: SESSION, pass: p.body.pass, turnstile: "" });
    assert.equal(refused.status, 429);
    assert.deepEqual([w.hits.get(hourKey()), w.hits.get(dayKey())], [h, dd]);
    // It does not use the free check's own 10 a minute.
    assert.equal([...w.hits.keys()].some((k) => k.startsWith("snapshot:min:")), false);
  } finally {
    restore();
  }
});

Deno.test("suggest: the Autocomplete day cap, a Google error or a missing key give available false, so the page falls back to search", async () => {
  // The cap: the Google layer refuses (places_take says no) and nothing is sent.
  let w = world({ cap: 0 });
  try {
    const r = await w.call({ action: "suggest", query: "harbour", session_token: SESSION });
    assert.equal(r.status, 200);
    assert.deepEqual([r.body.available, r.body.suggestions], [false, []]);
    assert.equal(w.requests.length, 0, "past the cap Google is not asked");
  } finally {
    restore();
  }
  // A Google error: available false, one error report without the typed text.
  w = world({ autoStatus: 500 });
  try {
    const r = await w.call({ action: "suggest", query: "private business name", session_token: SESSION });
    assert.equal(r.status, 200);
    assert.equal(r.body.available, false);
    assert.equal(w.errors.length, 1);
    assert.doesNotMatch(String((w.errors[0] as Error).message), /private business name/);
  } finally {
    restore();
  }
  // Without the Turnstile secret no pass can be signed: each call needs its own Turnstile token, and still works.
  w = world({ noSecret: true });
  try {
    const r = await w.call({ action: "suggest", query: "harbour", session_token: SESSION });
    assert.equal(r.body.available, true);
    assert.equal(r.body.pass, undefined);
  } finally {
    restore();
  }
});

Deno.test("check: the suggestions' session token goes to Place Details and ends the Autocomplete session; a bad token is ignored", async () => {
  const w = world();
  try {
    assert.equal((await w.call({ action: "check", place_id: PLACE_A, session_token: SESSION })).status, 200);
    assert.equal((await w.call({ action: "check", place_id: PLACE_C })).status, 200);
    assert.equal((await w.call({ action: "check", place_id: PLACE_A, session_token: "bad token with spaces" })).status, 200);
    const details = w.requests.filter((r) => r.url.includes("/places/"));
    assert.match(details[0]!.url, new RegExp(`\\?sessionToken=${SESSION}$`));
    assert.doesNotMatch(details[1]!.url, /sessionToken/);
    assert.doesNotMatch(details[2]!.url, /sessionToken/);
    for (const r of details) assert.equal(r.mask, SNAPSHOT_FIELD_MASK);
  } finally {
    restore();
  }
});

Deno.test("search: the match carries its category, so two businesses with one name can be told apart", async () => {
  const w = world();
  try {
    const r = await w.call({ action: "search", query: "Harbour Lane Coffee Example Town" });
    assert.equal(r.status, 200);
    assert.ok("category" in r.body.places[0]);
  } finally {
    restore();
  }
});

// ─── Scan 2 (master plan 30.29 item B): the report sent is the report shown ─────────────────────────────────────────
const CHECK_DONE: CheckRow = {
  id: "c1", code: "SEVEN234", business: "Harbour Lane Coffee", term: "coffee shop", country: "GB", city: "Example Town",
  self: { title: "Harbour Lane Coffee", cid: "self", place_id: PLACE_A }, center: { lat: 51.5, lng: -0.1 }, radius_km: 1.5,
  category: "Coffee shop", source: "live", state: "done", created_at: "2026-11-05T09:00:00.000Z",
  fast: { rank: 2, line: "At your address you rank 2 for 'coffee shop'.", competitors: [{ name: "Corner Crumb", rating: 4.8, reviews: 20 }] },
  points: [],
  nearby: {
    cards: [
      { kind: "home", row: 3, col: 3, place: "Near your coffee shop", name: null, rank: 2, position: "2nd", first: "Corner Crumb", firstIsYou: false },
      { kind: "away", row: 0, col: 0, place: "About 2 km north west of your coffee shop", name: null, rank: 7, position: "7th", first: "قطر الندى", firstIsYou: false },
      { kind: "away", row: 6, col: 3, place: "About 1 km south of your coffee shop", name: null, rank: 1, position: "1st", first: null, firstIsYou: true },
    ],
    top3: 18, points: 49, count_line: "In the first 3 at 18 of 49 places Kabsi checked.", keyword: "coffee shop", note: "Sample Google Maps results, not customer counts.",
  },
  ai: {
    provider: "chatgpt", named: false, sources: [], label: "One sample. AI answers change from run to run.", accuracy: null,
    question: "best coffee shop in Example Town, United Kingdom", assistant: "ChatGPT", model: "gpt-4.1-mini", asked_at: "2026-11-05T09:00:00.000Z",
    web_search_forced: true, city_dropped: false, local: [], named_local: [], named_other: 3,
  },
};
const MAPPING: CheckRow = { ...CHECK_DONE, code: "MAPPYNG2", state: "mapping", nearby: null };
const OTHER: CheckRow = { ...CHECK_DONE, code: "XTHERPZ2", self: { ...CHECK_DONE.self, place_id: PLACE_C } };
const CHECKS = { SEVEN234: CHECK_DONE, MAPPYNG2: MAPPING, XTHERPZ2: OTHER };
const MAIL = { action: "email", place_id: PLACE_A, email: "owner@example-cafe.com", tips: false, consent_text: TIPS_CONSENT_TEXT, page: "/google-profile-check" };

Deno.test("launch1: with the check's code the email holds the result page's nearby lines, the ChatGPT question with its answer, question, model and date, and the link", async () => {
  const w = world({ checks: CHECKS });
  try {
    const r = await w.call({ ...MAIL, code: "seven234" });
    assert.equal(r.status, 200);
    const t = w.sent[0].text;
    for (const line of [
      "When someone searches for 'coffee shop' near you, you appear 2nd in this Google Maps check.",
      "You appeared in the first three at 18 of 49 points around you.",
      "Did ChatGPT name your business?",
      "Not clear from this answer. ChatGPT named businesses Kabsi could not match to your area on Google Maps, so it does not show whether ChatGPT would name you here.",
      "Question: 'best coffee shop in Example Town, United Kingdom'",
      "Model: ChatGPT (gpt-4.1-mini)",
      "Asked ChatGPT on 5 November 2026",
      "https://kabsi.co/scan/SEVEN234",
    ]) assert.ok(t.includes(line), `missing: ${line}`);
    assert.ok(w.sent[0].html.includes("<strong>Did ChatGPT name your business?</strong>"));
    assert.ok(!t.includes("An answer customers might see"), "the page's own heading, not the old one");
    assert.ok(!/\p{Script=Arabic}/u.test(w.sent[0].html + t), "no Arabic in the email");
    assert.ok(w.sent[0].html.includes('href="https://kabsi.co/scan/SEVEN234"'));
    assert.equal(w.requests.length, 1, "the Google part is read live again");
  } finally {
    restore();
  }
});

Deno.test("scan2: no code keeps the email as it was; an unknown or unfinished check sends the Google part and says so; another place's code is refused", async () => {
  const w = world({ checks: CHECKS });
  try {
    await w.call(MAIL);
    assert.ok(!w.sent[0].text.includes("were not part of this check"), "no code: the email is unchanged");
    await w.call({ ...MAIL, email: "b@example-cafe.com", code: "ZZZZZZZZ" });
    assert.ok(w.sent[1].text.includes("The nearby search and the AI answer were not part of this check."));
    assert.ok(!w.sent[1].text.includes("/scan/"));
    await w.call({ ...MAIL, email: "c@example-cafe.com", code: "MAPPYNG2" });
    assert.ok(w.sent[2].text.includes("The nearby search and the AI answer were not part of this check."), "a check that never finished");
    const other = await w.call({ ...MAIL, email: "d@example-cafe.com", code: "XTHERPZ2" });
    assert.equal(other.status, 400);
    assert.equal(other.body.error, "bad_check");
    assert.equal(w.sent.length, 3, "nothing sent for another place's check");
    // Review of Scan 2: asked again once the check has finished, the report goes out (a new dedupe key), not dropped.
    const keys = new Set(w.sent.map((m) => m.dedupeKey));
    assert.equal(keys.size, 3);
    assert.equal(w.saved.length, 3);
  } finally {
    restore();
  }
});

Deno.test("launch1: WhatsApp carries the profile line, the result page's nearby lines, the ChatGPT question and answer and the link in the one template, within 900 characters", async () => {
  const w = world({ checks: CHECKS, whatsapp: true });
  try {
    assert.equal((await w.call({ ...WA, code: "SEVEN234" })).status, 200);
    const [, line] = w.wa.sent[0].params;
    assert.ok(line.includes("When someone searches for 'coffee shop' near you, you appear 2nd in this Google Maps check. You appeared in the first three at 18 of 49 points around you. Did ChatGPT name your business? Not clear from this answer."));
    assert.ok(line.includes("Question: 'best coffee shop in Example Town, United Kingdom'. Model: ChatGPT (gpt-4.1-mini). Asked ChatGPT on 5 November 2026. kabsi.co/scan/SEVEN234"));
    assert.ok(line.length <= 900);
    assert.ok(line.endsWith("kabsi.co/scan/SEVEN234"));
    assert.ok(!/\n/.test(line));
    const other = await w.call({ ...WA, phone: "+1 201 555 0101", code: "XTHERPZ2" }, "203.0.113.9");
    assert.equal(other.status, 400);
    assert.equal(w.wa.sent.length, 1);
    // A check that never finished says so on WhatsApp too.
    assert.equal((await w.call({ ...WA, phone: "+1 201 555 0102", code: "MAPPYNG2" }, "203.0.113.10")).status, 200);
    assert.ok(w.wa.sent[1].params[1].endsWith("The nearby search and the AI answer were not part of this check."));
  } finally {
    restore();
  }
  // The 900 characters: a long profile line is cut, the link always fits.
  const bare = buildSnapshot(PLACE_A, { id: PLACE_A, displayName: { text: "X" }, formattedAddress: "Y" }, true);
  const long = { ...bare, flags: Array.from({ length: 40 }, (_, i) => ({ tone: "warning" as const, fact: `A long fact number ${i} that keeps going for a while.`, action: "x" })) };
  const [, p] = whatsappParams(long, { nearby: ["You appeared in the first three at 18 of 49 points around you."], ai: ["Did ChatGPT name your business?", "Yes. ChatGPT named your business.", "Question: 'q'"], link: "https://kabsi.co/scan/SEVEN234" });
  assert.ok(p.length <= 900, `length ${p.length}`);
  assert.ok(p.endsWith("You appeared in the first three at 18 of 49 points around you. Did ChatGPT name your business? Yes. ChatGPT named your business. Question: 'q'. kabsi.co/scan/SEVEN234"));
});

// Copy 3 (master plan 30.30 item 3): the visitor's own business name follows the Latin rule in the emailed report and the
// WhatsApp message; a name in Latin letters is shown as it is.
Deno.test(
  "copy3: a business name not in Latin letters reads 'Your business' in the email and the WhatsApp message",
  () => {
    const arabic = buildSnapshot(
      PLACE_B,
      {
        id: PLACE_B,
        displayName: { text: "مطعم سفن" },
        formattedAddress: "Boqaata, Lebanon",
        userRatingCount: 0,
      },
      true,
    );
    const mail = checkEmail({ esc, appUrl: "https://kabsi.co" }, arabic, false);
    assert.equal(mail.subject, "Your business: your Google Profile Check");
    assert.match(mail.bodyHtml, /<strong>Your business<\/strong>/);
    assert.doesNotMatch(mail.bodyHtml + mail.text + mail.subject, /\p{Script=Arabic}/u);
    assert.equal(whatsappParams(arabic)[0], "Your business");
    const latin = buildSnapshot(
      PLACE_B,
      {
        id: PLACE_B,
        displayName: { text: "SEVEN Burgers & Beyond" },
        formattedAddress: "Boqaata, Lebanon",
        userRatingCount: 0,
      },
      true,
    );
    assert.equal(
      checkEmail({ esc, appUrl: "https://kabsi.co" }, latin, false).subject,
      "SEVEN Burgers & Beyond: your Google Profile Check",
    );
    assert.equal(whatsappParams(latin)[0], "SEVEN Burgers & Beyond");
  },
);

Deno.test(
  "copy3: the snapshot's area is the town from addressComponents (Lebanon, the UAE, the UK)",
  () => {
    const part = (longText: string, ...types: string[]) => ({
      longText,
      shortText: longText,
      types,
    });
    const at = (formattedAddress: string, addressComponents: ReturnType<typeof part>[]) =>
      buildSnapshot(
        PLACE_B,
        { id: PLACE_B, displayName: { text: "X" }, formattedAddress, addressComponents },
        false,
      ).area;
    assert.equal(
      at("Main Road, Boqaata, Lebanon", [
        part("Boqaata", "locality"),
        part("Mount Lebanon Governorate", "administrative_area_level_1"),
      ]),
      "Boqaata",
    );
    assert.equal(
      at("Downtown Dubai - Dubai - United Arab Emirates", [
        part("Dubai", "administrative_area_level_1"),
      ]),
      "Dubai",
    );
    assert.equal(
      at("10 Downing St, London SW1A 2AA, UK", [
        part("London", "postal_town"),
        part("England", "administrative_area_level_1"),
      ]),
      "London",
    );
  },
);

Deno.test("launch4: the warm-up answers at once, with no limit, no bot check, no database and no Google call", async () => {
  const w = world({ turnstile: false });
  try {
    const r = await w.call({ action: "warm", turnstile: "" });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { ok: true });
    assert.equal(w.requests.length, 0);
    assert.equal(w.hits.size, 0);
    assert.equal(w.saved.length, 0);
    assert.equal(w.errors.length, 0);
  } finally {
    restore();
  }
});
