// V4: onboarding in four stages, the first task, every task closes, the work receipt, the nearby places and the free check.
// Pure parts and the agent's onboarding turns on the fake world; no network, no cost.
import assert from "node:assert/strict";
import { accessOf, type Facts, monthlyFacts, pickFirstTask, SAY_ONBOARDING, setupReply, stageOf, STAGE_PATH } from "./stages.ts";
import { type DueRow, dueKinds, doneWords, onboardingTick, type OnboardingDb } from "./tick.ts";
import type { OnboardingHooks } from "./hooks.ts";
import { googleLink, outcomeLine, ownerState } from "../task-close.ts";
import { aiBlock, didChips, monthlyWeek, receipt, rivalLine } from "../results-report/receipt.ts";
import { countLine, nearbyPlaces, nearbyText, ordinal, pickAway } from "../visibility/nearby.ts";
import { nameFrom } from "../visibility/geoapify.ts";
import { aiLine, checkFact, collectCheck, fastLine, newCode, publicView, startCheck } from "../visibility/free-check.ts";
import { mockProvider } from "../visibility/mock.ts";
import { pickTerms } from "../visibility/terms.ts";
import { parseButton } from "../whatsapp/router.ts";
import { handle } from "../whatsapp/agent.ts";
import { BIZ, msg, PHONES, USERS, World } from "../whatsapp/world.test-helpers.ts";
import type { Counts } from "../care-report/compose.ts";

const base: Facts = {
  business: "Rose Lane Salon", check: null, confirmed: true, whatsapp: true, setup_ok: true, keyword: "hair salon", consent: true,
  accepted: true, checked: true, trial_ends_at: null, first_task_done: false,
};
const ROW = (f: Partial<DueRow> = {}): DueRow => ({
  ...base, location_id: BIZ.harbour, time_zone: "Asia/Dubai", is_demo: false, place_id: "ChIJabcdefghij1234", setup_at: null, accepted_at: null,
  created_at: new Date(Date.UTC(2026, 9, 20)).toISOString(), owner: { user_id: USERS.owner, phone: PHONES.owner, name: "Maya" }, sent: {}, done: [], waiting: 0,
  approved_since_first: false, ...f,
});

// ─── stages ────────────────────────────────────────────────────────────────────────────────────────────────────────
Deno.test("the four stages, in order, and the step the resume link opens", () => {
  assert.equal(stageOf({ ...base, confirmed: false }), "confirm");
  assert.equal(stageOf({ ...base, setup_ok: false }), "whatsapp");
  assert.equal(stageOf({ ...base, whatsapp: false }), "whatsapp");
  assert.equal(stageOf({ ...base, checked: false }), "access");
  assert.equal(stageOf(base), "first_task");
  assert.equal(stageOf({ ...base, first_task_done: true }), "done");
  assert.equal(STAGE_PATH[stageOf({ ...base, checked: false })], "/start/manager");
});
Deno.test("Manager access has three states, and only a checked one is past stage 4", () => {
  assert.equal(accessOf({ consent: false, accepted: false, checked: false }), "not_started");
  assert.equal(accessOf({ consent: true, accepted: false, checked: false }), "invite_pending");
  assert.equal(accessOf({ consent: true, accepted: true, checked: false }), "accepted");
  assert.equal(accessOf({ consent: true, accepted: true, checked: true }), "checked");
});
Deno.test("the first task: an answerable review, else a post from confirmed facts, else an hours fix, never a sensitive review", () => {
  const review = { review_id: "r1", stars: 5, text: "Lovely cut, Maya was great and the price was fair.", draft: "Thank you.", draft_ok: true, risk: "low", sensitive: false };
  const post = { fact_id: "f1", service: "Keratin treatment" };
  const hours = { change_id: "c1", shown: "different opening hours" };
  assert.equal(pickFirstTask({ reviews: [review], posts: [post], hours: [hours] }).kind, "review");
  assert.equal(pickFirstTask({ reviews: [{ ...review, sensitive: true }], posts: [post], hours: [] }).kind, "post");
  assert.equal(pickFirstTask({ reviews: [{ ...review, risk: "high" }], posts: [], hours: [hours] }).kind, "hours");
  assert.equal(pickFirstTask({ reviews: [{ ...review, text: "ok" }], posts: [], hours: [] }).kind, "none", "a star with no words is not answered accurately");
  assert.equal(pickFirstTask({ reviews: [{ ...review, draft_ok: false }], posts: [], hours: [] }).kind, "none");
});
Deno.test("setup replies typed as words", () => {
  assert.equal(setupReply("Yes"), "yes");
  assert.equal(setupReply("help"), "help");
  assert.equal(setupReply("my manager does it"), "someone_else");
  assert.equal(setupReply("I can't find it"), "cannot_find");
  assert.equal(setupReply("done"), "done");
  assert.equal(setupReply("what is this"), null);
});
Deno.test("the monthly answer: new services and prices become proposals, never numbers or links", () => {
  const f = monthlyFacts("We now offer a new keratin treatment. It costs 350 AED. Call +971 50 123 4567 to book. See www.rose.com");
  assert.deepEqual(f, [{ key: "service", text: "We now offer a new keratin treatment." }, { key: "price_note", text: "It costs 350 AED." }]);
  assert.deepEqual(monthlyFacts("Nothing much, same as before."), []);
});
Deno.test("the onboarding words keep the house rules: no dashes, no exclamation marks, the ID on its own", () => {
  const all = [
    SAY_ONBOARDING.firstBack("Maya Khan", "Rose Lane Salon", true), SAY_ONBOARDING.check("hair salon", "26 Oct 2026", "In the first 3 at 18 of 49 places Kabsi checked."),
    SAY_ONBOARDING.invite, SAY_ONBOARDING.someoneElse, SAY_ONBOARDING.cannotFind("Rose Lane Salon"), SAY_ONBOARDING.accessWorks("Rose Lane Salon", "2026-11-09T12:00:00Z", "Asia/Dubai"),
    SAY_ONBOARDING.firstReview("Rose Lane Salon", "Great cut", "Thank you"), SAY_ONBOARDING.after48("Rose Lane Salon", ["a reply on Google"], null, null, "UTC"),
    SAY_ONBOARDING.stillBlocked("Rose Lane Salon", "Kabsi to be added as a Manager on Google"), SAY_ONBOARDING.factsAsk("Rose Lane Salon", ["We now offer nails."]),
  ];
  for (const s of all) assert.doesNotMatch(s, /[–—!]/);
  assert.equal(SAY_ONBOARDING.id, "5481006796");
  assert.match(SAY_ONBOARDING.firstBack("Maya Khan", "Rose Lane Salon", true), /^Hi Maya, I am Nora/);
  assert.match(SAY_ONBOARDING.accessWorks("Rose Lane Salon", "2026-11-09T12:00:00Z", "Asia/Dubai"), /ends on 9 November/);
  assert.match(SAY_ONBOARDING.invite, /choose Manager, then Add \(on some screens, Invite\)/);
});

// ─── the first 48 hours ────────────────────────────────────────────────────────────────────────────────────────────
Deno.test("the first-48-hours messages go only when their event happened, once each", () => {
  const now = Date.UTC(2026, 9, 26, 12);
  const h = (n: number) => new Date(now - n * 3_600_000).toISOString();
  assert.deepEqual(dueKinds(ROW({ accepted: false, checked: false, created_at: h(2) }), now), ["invite"]);
  assert.deepEqual(dueKinds(ROW({ sent: { invite: { at: h(1), detail: null } }, accepted: false, checked: false, created_at: h(2) }), now), []);
  assert.deepEqual(dueKinds(ROW({ sent: { invite: { at: h(30), detail: null } }, accepted: false, checked: false, created_at: h(40), setup_at: h(30) }), now), ["still_blocked"]);
  assert.deepEqual(dueKinds(ROW({ sent: { invite: { at: h(3), detail: null } } }), now), ["access_works"], "the first task waits for the first drafts");
  assert.deepEqual(dueKinds(ROW({ sent: { access_works: { at: h(1), detail: null } } }), now), ["first_task"]);
  assert.deepEqual(dueKinds(ROW({ sent: { access_works: { at: h(49), detail: null } } }), now), ["after48"], "no first task after 48 hours");
  const after = { invite: { at: h(60), detail: null }, access_works: { at: h(50), detail: null }, first_task: { at: h(50), detail: null }, first_task_sent: { at: h(50), detail: { kind: "review" } } };
  assert.deepEqual(dueKinds(ROW({ sent: after }), now), ["reminder", "after48"]);
  assert.deepEqual(dueKinds(ROW({ sent: { ...after, first_task_skipped: { at: h(30), detail: null } } }), now), ["after48"], "no reminder after Skip");
  assert.deepEqual(dueKinds(ROW({ sent: after, approved_since_first: true }), now), ["after48"], "no reminder after a yes");
  assert.deepEqual(dueKinds(ROW({ sent: { ...after, reminder: { at: h(20), detail: null }, after48: { at: h(1), detail: null } }, first_task_done: true }), now), ["unlock"]);
});
Deno.test("after 48 hours the work is listed with its Google link", () => {
  const w = doneWords({ place_id: "ChIJabcdefghij1234", done: [{ target_type: "review_reply", response: null }, { target_type: "local_post", response: { searchUrl: "https://local.google.com/place?id=1&use=posts" } }] });
  assert.deepEqual(w, ["a reply on Google (https://search.google.com/local/reviews?placeid=ChIJabcdefghij1234)", "a post on Google (https://local.google.com/place?id=1&use=posts)"]);
});
Deno.test("the tick sends the outcome of an approval and the first task, each claimed once", async () => {
  const w = new World();
  const d = w.deps();
  const claimed = new Set<string>();
  const now = (d.now ?? Date.now)();
  const db: OnboardingDb = {
    on: async () => true,
    due: async () => [ROW({ sent: { access_works: { at: new Date(now - 3_600_000).toISOString(), detail: null } } })],
    claim: async (l, k) => (claimed.has(`${l}:${k}`) ? false : (claimed.add(`${l}:${k}`), true)),
    candidates: async () => ({ categories: ["Hair salon"], posts: [], hours: [],
      reviews: [{ review_id: "r-harbour-1", stars: 5, text: "Lovely cut and a warm welcome every time.", risk: "low", reasons: [], draft: "Thank you, we loved having you.", draft_ok: true }] }),
    outcomes: async () => [{ publication_id: "p1", location_id: BIZ.harbour, business: "Harbour Lane Coffee", place_id: "ChIJabcdefghij1234", target_type: "review_reply",
      state: "verified", response: null, user_id: USERS.owner, phone: PHONES.owner }],
    startMaps: async () => {},
    unlock: async () => {},
  };
  const r = await onboardingTick(d, db);
  assert.deepEqual(r, { outcomes: 1, messages: 1 });
  const bodies = w.outbox.map((o) => o.body);
  assert.ok(bodies.some((b) => /Your reply is on Google: https:\/\/search\.google\.com\/local\/reviews\?placeid=ChIJabcdefghij1234\. Done\./.test(b)));
  assert.ok(bodies.some((b) => /This review for Rose Lane Salon has no reply: 'Lovely cut/.test(b)));
  assert.ok(claimed.has(`${BIZ.harbour}:first_task_sent`));
  // Run again: nothing new is claimed, so nothing new is sent.
  const again = await onboardingTick(d, db);
  assert.equal(again.messages, 0);
});
Deno.test("a clinic's first task is never a customer's review on WhatsApp", async () => {
  const w = new World();
  const claimed = new Map<string, unknown>();
  await onboardingTick(w.deps(), {
    on: async () => true, due: async () => [ROW({ sent: { access_works: { at: new Date(w.now - 3_600_000).toISOString(), detail: null } } })],
    claim: async (l, k, detail) => (claimed.set(k, detail ?? null), true),
    candidates: async () => ({ categories: ["Dental clinic"], posts: [], hours: [],
      reviews: [{ review_id: "r-harbour-1", stars: 5, text: "Great dentist, painless filling and kind staff.", risk: "low", reasons: [], draft: "Thank you.", draft_ok: true }] }),
    outcomes: async () => [], startMaps: async () => {}, unlock: async () => {},
  });
  assert.equal(claimed.has("first_task"), false, "nothing offered, nothing claimed: tried again later");
});

// ─── the agent's onboarding turns ──────────────────────────────────────────────────────────────────────────────────
function withHooks(w: World, over: Partial<OnboardingHooks> = {}) {
  const calls: string[] = [];
  const claimed = new Set<string>();
  const hooks: OnboardingHooks = {
    afterBind: async (_u, locs) => locs.includes(BIZ.harbour)
      ? { location_id: BIZ.harbour, business: "Harbour Lane Coffee", name: "Sam", check: { term: "coffee shop", date: "26 Oct 2026", fact: "In the first 3 at 18 of 49 places Kabsi checked." } }
      : null,
    setupYes: async (l, u) => (calls.push(`yes:${l}:${u}`), { ok: true, suggested: "coffee shop", hasKeyword: false }),
    founderHelp: async (l) => void calls.push(`help:${l}`),
    claim: async (l, k) => (claimed.has(`${l}:${k}`) ? false : (claimed.add(`${l}:${k}`), true)),
    skipFirst: async (l) => void calls.push(`skip:${l}`),
    proposeFacts: async (_l, items) => items.length,
    confirmFacts: async () => 2,
    ...over,
  };
  const d = { ...w.deps(), onboarding: hooks };
  return { d, calls };
}
Deno.test("an owner who connects WhatsApp during setup gets Nora's first message and the free check, then the steps on Yes", async () => {
  const w = new World();
  const { d, calls } = withHooks(w);
  await handle(d, msg(w, PHONES.owner, { text: "123456" }));
  const first = w.repliesTo(PHONES.owner).map((s) => s.body);
  assert.match(first.join("\n"), /Hi Sam, I am Nora, Kabsi's AI assistant\. I have your free check for Harbour Lane Coffee/);
  assert.match(first.join("\n"), /Your nearby check for 'coffee shop', 26 Oct 2026: In the first 3 at 18 of 49 places/);
  await handle(d, msg(w, PHONES.owner, { button: `ob:y:${BIZ.harbour}` }));
  const after = w.repliesTo(PHONES.owner).map((s) => s.body).join("\n");
  assert.match(after, /Next, add Kabsi as a Manager/);
  assert.ok(w.repliesTo(PHONES.owner).some((s) => s.body === "5481006796"), "the ID on its own");
  assert.match(after, /coffee shop/, "the search from the free check is suggested");
  assert.deepEqual(calls, [`yes:${BIZ.harbour}:${USERS.owner}`]);
  // A typed yes later does not send the steps twice.
  await handle(d, msg(w, PHONES.owner, { button: `ob:y:${BIZ.harbour}` }));
  assert.equal(w.repliesTo(PHONES.owner).filter((s) => s.body === "5481006796").length, 1);
});
Deno.test("only an owner of that business may answer the setup buttons", async () => {
  const w = new World();
  const { d, calls } = withHooks(w);
  await handle(d, msg(w, PHONES.manager, { button: `ob:y:${BIZ.harbour}` }));
  await handle(d, msg(w, PHONES.plain, { button: `ob:h:${BIZ.harbour}` }));
  assert.deepEqual(calls, []);
});
Deno.test("Help reaches the founder through the staff side; Skip and the facts answers are owner words", async () => {
  const w = new World();
  const { d, calls } = withHooks(w);
  await handle(d, msg(w, PHONES.owner, { button: `ob:h:${BIZ.harbour}` }));
  await handle(d, msg(w, PHONES.owner, { button: `fs:${BIZ.harbour}` }));
  await handle(d, msg(w, PHONES.owner, { button: `kf:y:${BIZ.harbour}:2026-10` }));
  const all = w.repliesTo(PHONES.owner).map((s) => s.body).join("\n");
  assert.match(all, /Rashid, the founder, will message you here/);
  assert.match(all, /Okay, skipped\. Nothing was published\./);
  assert.match(all, /Saved 2 details to About your business/);
  assert.deepEqual(calls, [`help:${BIZ.harbour}`, `skip:${BIZ.harbour}`]);
});
Deno.test("the onboarding buttons are read by the router", () => {
  assert.deepEqual(parseButton(`ob:c:${BIZ.harbour}`), { k: "onboarding", action: "cannot_find", locationId: BIZ.harbour });
  assert.deepEqual(parseButton(`fs:${BIZ.harbour}`), { k: "onboarding", action: "skip_first", locationId: BIZ.harbour });
  assert.deepEqual(parseButton(`kf:n:${BIZ.harbour}:2026-10`), { k: "facts", action: "no", locationId: BIZ.harbour, month: "2026-10" });
  assert.deepEqual(parseButton("ob:x:nope"), { k: "empty" });
});

// ─── every task closes ─────────────────────────────────────────────────────────────────────────────────────────────
Deno.test("the four owner states, and 'on Google' only after Kabsi read it back", () => {
  assert.equal(ownerState("approved"), "approved");
  for (const s of ["publishing", "published", "checking", "verifying"] as const) assert.equal(ownerState(s), "sent");
  assert.equal(ownerState("verified"), "confirmed");
  assert.equal(ownerState("rejected"), "failed");
  assert.equal(ownerState("cancelled"), "undone");
  assert.match(outcomeLine({ business: "B", target_type: "review_reply", state: "published", link: null })!, /I have not seen the reply on Google yet/);
  assert.doesNotMatch(outcomeLine({ business: "B", target_type: "review_reply", state: "published", link: null })!, /published/i);
  assert.equal(outcomeLine({ business: "B", target_type: "local_post", state: "failed", link: null }),
    "B: the post did not go through. Google does not show this post, and Kabsi did not send it again. You can edit it in Kabsi and approve it again.");
  assert.equal(outcomeLine({ business: "B", target_type: "photo", state: "rejected", link: null }),
    "B: the photo did not go through. Google did not accept this photo. Nothing changed on Google.");
  assert.equal(outcomeLine({ business: "B", target_type: "photo", state: "approved", link: null }), null);
});
Deno.test("a link only to Google: a post's own address, else the reviews page or the place", () => {
  assert.equal(googleLink({ target_type: "local_post", place_id: "ChIJabcdefghij1234", response: { searchUrl: "https://evil.example/x" } }),
    "https://www.google.com/maps/place/?q=place_id:ChIJabcdefghij1234");
  assert.equal(googleLink({ target_type: "review_reply", place_id: null }), null);
  assert.equal(googleLink({ target_type: "photo", place_id: "bad id" }), null);
});

// ─── the work receipt ───────────────────────────────────────────────────────────────────────────────────────────────
const COUNTS: Counts = { replies_prepared: 4, replies_published: 3, posts_published: 1, photos_published: 0, photo_batches: 0, hours_updates: 0, profile_updates: 0, profile_checks: 2016, changes_found: 0, changes_kept: 0, changes_put_back: 0 };
const ACT = (source: "live" | "mock") => ({ source, example: source === "mock", from: "2026-10-19", to: "2026-10-25", fetched_at: "",
  views: { this: 200, last: 190, change: "up 5%" }, calls: { this: 9, last: 7, change: "up 2" }, website_clicks: { this: 10, last: 9, change: "up 1" }, directions: { this: 12, last: 11, change: "up 1" } });
const R = (o: Partial<Parameters<typeof receipt>[0]> = {}) => receipt({
  business: "Rose Lane Salon", counts: COUNTS, needs: [{ title: "Approve the reply to Lina", path: "/app/reviews" }], needsTotal: 2, plan: [], activity: ACT("live"),
  demo: false, growth: { days: 7, new_reviews: 3, opens_message: 4, opens_qr: 2, opens_tag: 1 }, ai: null, aiThisWeek: false, rivals: [], tz: "Asia/Dubai", ...o,
});
Deno.test("the receipt: what Kabsi did, what waits, one next step, then Google's numbers with calls and directions apart", () => {
  const r = R();
  assert.deepEqual(didChips(COUNTS).map((c) => c.label), ["Replies published", "Posts published", "Replies prepared"]);
  assert.equal(r.waiting.count, 2);
  assert.equal(r.next_step?.title, "Approve the reply to Lina");
  assert.deepEqual(r.google?.lines, ["Calls from your Google profile: 9 (up 2).", "Direction requests: 12 (up 1)."]);
  assert.match(r.growth!.line, /Your review link was opened 7 times\. An open is not a review\./);
  assert.match(r.whatsapp, /^Rose Lane Salon, this week Kabsi did: replies published 3, posts published 1, replies prepared 1\./);
  assert.doesNotMatch(r.whatsapp, /[–—!]/);
});
Deno.test("a real owner's receipt never shows example figures; the demo keeps them labelled", () => {
  assert.equal(R({ activity: ACT("mock") }).google, null);
  assert.equal(R({ activity: ACT("mock"), demo: true }).google?.example, true);
});
Deno.test("Competitor Watch speaks only when something changed that matters; the AI block is monthly", () => {
  assert.equal(rivalLine([{ name: "Juniper", theirs: 4, mine: 1 }]), null);
  assert.equal(rivalLine([{ name: "Juniper", theirs: 9, mine: 6 }]), null);
  assert.equal(rivalLine([{ name: "Juniper", theirs: 14, mine: 3 }]), "Juniper got 14 reviews this month. You got 3.");
  assert.equal(monthlyWeek("2026-11-02"), true);
  assert.equal(monthlyWeek("2026-11-09"), false);
  const ai = { question: "best hair salon in Dubai Marina", provider: "chatgpt", asked_at: "2026-10-30T10:00:00Z", named: false, sources: [{ domain: "timeout.com", title: "Best salons" }], noticed: null };
  assert.equal(R({ ai }).ai, null);
  const b = aiBlock(ai, "Asia/Dubai")!;
  assert.equal(b.heading, "An answer customers might see");
  assert.equal(b.line, 'ChatGPT was asked "best hair salon in Dubai Marina" on 30 October. It did not name you.');
  assert.equal(b.label, "Answers from ChatGPT and Perplexity through their API, which can differ from their apps.");
});

// ─── the nearby places ─────────────────────────────────────────────────────────────────────────────────────────────
Deno.test("place names only from a real nearby point: a landmark or street, never a district or another script", () => {
  assert.equal(nameFrom({ name: "Dubai Marina Mall", result_type: "amenity", distance: 80 }), "Dubai Marina Mall");
  assert.equal(nameFrom({ name: "Marina", street: "Al Marsa Street", result_type: "suburb", distance: 10 }), null);
  assert.equal(nameFrom({ street: "Al Marsa Street", result_type: "street", distance: 40 }), "Al Marsa Street");
  assert.equal(nameFrom({ name: "Far Tower", result_type: "building", distance: 900 }), null);
  assert.equal(nameFrom({ name: "مول", street: "شارع", result_type: "amenity", distance: 5 }), null);
  assert.equal(ordinal(2), "2nd");
  assert.equal(ordinal(11), "11th");
  assert.equal(countLine(18, 49), "In the first 3 at 18 of 49 places Kabsi checked.");
});
Deno.test("three cards: near the business and the two places that differ most, then one count", async () => {
  const p = mockProvider({ title: "Harbor Cafe", cid: "self" });
  const cells = [];
  for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) {
    const got = await p.get(`mock|x:${row}:${col}`);
    const items = got!.items;
    cells.push({ row, col, lat: 25 + row / 100, lng: 55 + col / 100, rank: items.find((i) => i.cid === "self")?.rank ?? null, items });
  }
  const names: string[] = [];
  const n = await nearbyPlaces({ cells, who: { cid: "self", title: "Harbor Cafe" }, keyword: "bakery", radiusKm: 1, businessType: "bakery",
    name: async (pt) => (names.push(`${pt.lat}`), pt.lat > 25.03 ? "Marina Walk" : null) });
  assert.equal(n.cards.length, 3);
  assert.equal(n.cards[0].place, "Near your bakery");
  assert.equal(n.cards[0].position, "1st");
  assert.equal(names.length, 2, "only the two away points are looked up");
  assert.ok(n.cards.slice(1).every((c) => c.place === "Near Marina Walk" || /^About .* of your bakery$/.test(c.place)));
  assert.equal(pickAway(cells).length, 2);
  const text = nearbyText(n, "26 Oct 2026");
  assert.match(text, /^Near your bakery you came up 1st for 'bakery'\./);
  assert.match(text, /Sample Google Maps results, not customer counts\.$/);
});

// ─── the free check ────────────────────────────────────────────────────────────────────────────────────────────────
Deno.test("the free check: a fast result at once, the full search queued, the nearby places when it is in", async () => {
  const p = mockProvider({ title: "Harbor Cafe" });
  const spent: number[] = [];
  const s = await startCheck({ provider: p, source: "mock", code: () => "ABCD2345", room: async () => true, spend: async (_c, m) => void spent.push(m),
    ai: async () => ({ provider: "chatgpt", named: false, competitors: ["Juniper", "Oven Street"], sources: [], label: "x" }) },
    { name: "Harbor Cafe", address: null, country: "AE", city: "Dubai", place_id: null, term: "bakery" });
  assert.ok(s.ok);
  if (!s.ok) return;
  assert.equal(s.row.fast.line, "At your address you rank 1 for 'bakery'.");
  assert.equal(s.row.fast.competitors.length, 3);
  assert.equal(s.row.points.length, 49);
  assert.equal(spent.length, 0, "mock mode spends nothing");
  const row = { ...s.row, id: "x", created_at: new Date().toISOString() };
  const v0 = publicView(row);
  assert.equal(v0.map.state, "mapping");
  assert.doesNotMatch(JSON.stringify(v0), /mock\|/, "no task ids reach the page");
  const done = await collectCheck({ provider: p, now: () => new Date() }, row);
  assert.equal(done?.state, "done");
  const v1 = publicView(done!);
  assert.equal(v1.map.state, "done");
  assert.equal(v1.ai?.line, "ChatGPT did not name you. It named Juniper and Oven Street.");
  assert.equal(v1.check_line, "Free check. No Google access needed.");
  assert.match(v1.trial_line, /starts only when Kabsi's access to your Google profile works/);
  assert.match(checkFact(done!), /^In the first 3 at \d+ of 49 places Kabsi checked\.$/);
});
Deno.test("the free check stops before spending past the cap, and its words", async () => {
  const s = await startCheck({ provider: mockProvider({ title: "X" }), source: "live", code: newCode, room: async () => false, spend: async () => {}, ai: async () => null },
    { name: "X", address: null, country: "AE", city: null, place_id: null, term: "gym" });
  assert.deepEqual(s, { ok: false, reason: "paused" });
  assert.equal(fastLine(null, "gym"), "At your address you are not in the top 20 for 'gym'.");
  assert.equal(aiLine({ provider: "chatgpt", named: true, competitors: [], sources: [], label: "" }), "ChatGPT named you.");
  assert.match(newCode(), /^[A-Z2-9]{8}$/);
});
Deno.test("industry search terms come from the volumes, near me folded into the plain search", () => {
  const t = pickTerms([{ keyword: "hair salon", volume: 1000 }, { keyword: "hair salon near me", volume: 2000 }, { keyword: "hairdresser", volume: 2500 },
    { keyword: "barber", volume: 5000 }, { keyword: "barber shop", volume: 700 }]);
  assert.equal(t["hair-salons"].term, "hair salon");
  assert.equal(t["hair-salons"].volume, 3000);
  assert.equal(t["barbershops"].term, "barber");
  assert.equal(t["cafes"], undefined, "no data, no term");
});
