// RB-F4 (R-149): request book messages always reach the request book. Rashid's retest of 10 Nov 2026 (08:35 to 08:53 UTC)
// at Kabsi Test Gym: "Maya asked about a trial" got a model answer about Kabsi's own trial, "Maya booked a trial Monday 6"
// got the off-topic line in the old head, "help" named no request book command, and "Rana trim thuesday 3pm" on a Tuesday
// offered three buttons. All on the fake world: no database, no Kapso, no model call beyond the fakes. Customers are
// fictional. World time: Monday 26 Oct 2026, 19:00 in Dubai, unless a case sets it.
import assert from "node:assert/strict";
import { receive } from "./agent.ts";
import { bookIntent, getPack, normalizeWhen } from "./book.ts";
import { msg, PHONES, USERS, World } from "./world.test-helpers.ts";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const SALON = id(11), GYM = id(12), GARAGE = id(13);
const ME = PHONES.rashid;
const tool = (t: string, args: Record<string, string> = {}) => JSON.stringify({ tool: t, args, lang: "en" });
const quotes = (fields: Record<string, string | null>) => JSON.stringify({ fields, said: { agreed: null, already_arranged: null } });
const gym = (name: string | null, interest: string | null, when: string | null) => quotes({ customer_name: name, phone: null, interest, when, goal: null });
const salon = (name: string | null, service: string | null, when: string | null) => quotes({ customer_name: name, phone: null, service, when, stylist: null });
const garage = (name: string | null, problem: string | null, when: string | null, car: string | null) =>
  quotes({ customer_name: name, phone: null, problem, when, car, registration: null });
const HOUSE = /[‒-―!]/;

/** Rashid's phone: staff tools, Yawmiyati, and the three test businesses (demo) with the request book on. */
function phoneWorld(): World {
  const w = new World();
  for (const [bid, name] of [[SALON, "Kabsi Test Salon"], [GYM, "Kabsi Test Gym"], [GARAGE, "Kabsi Test Garage"]] as const) {
    w.biz.push({ id: bid, name, tz: "Asia/Dubai", country: "AE", pro: false, members: { [USERS.rashid]: "owner" }, demo: true });
  }
  w.bookSetting = "on";
  w.packs.set(SALON, { pack: "salon", version: 1, state: "test" });
  w.packs.set(GYM, { pack: "gym", version: 1, state: "test" });
  w.packs.set(GARAGE, { pack: "garage", version: 1, state: "test" });
  return w;
}
const send = (w: World, o: Parameters<typeof msg>[2]) => receive(w.deps(), msg(w, ME, o));
const last = (w: World) => w.repliesTo(ME).at(-1)!;
const lastIntake = (w: World) => [...w.intakes.values()].at(-1)!;
const lastIds = (w: World) => ((w.outbox.filter((o) => o.phone === ME).at(-1)?.buttons ?? []) as { id: string }[]).map((b) => b.id);
async function to(w: World, n: 1 | 2 | 3 | 4) {
  assert.equal(await send(w, { text: "switch" }), "which_role");
  assert.equal(await send(w, { button: "r:business" }), "which_business");
  assert.equal(await send(w, { text: String(n) }), "business_set");
}
// The businesses in the list: 1 Garage, 2 Gym, 3 Salon, 4 Yawmiyati.
const toGym = (w: World) => to(w, 2);
const toSalon = (w: World) => to(w, 3);
const toGarage = (w: World) => to(w, 1);

// ─── 1. The order (R-149 item 1): the request book before the off-topic guard and the router.

Deno.test("order: at the gym, Maya asked about a trial is the gym's enquiry, read with one model call and no router", async () => {
  const w = phoneWorld();
  await toGym(w);
  const ai = w.aiCalls;
  w.extractMap["Maya asked about a trial"] = gym("Maya", "a trial", null);
  assert.equal(await send(w, { text: "Maya asked about a trial" }), "request_proposed");
  assert.equal(w.aiCalls, ai, "no router call");
  assert.equal(w.noraCalls.length, 0, "never a model answer about Kabsi's trial");
  assert.equal(w.extractCalls.length, 1);
  assert.match(last(w).body, /^\*💬 New enquiry\* · Kabsi Test Gym\n\nName: Maya\nAsked about: Trial$/);
  assert.equal(last(w).footer, "Nothing is saved until you tap Save.");
  assert.equal(await send(w, { button: `rs:${lastIntake(w).id}` }), "request_saved");
  assert.equal(w.requests[0].kind, "enquiry");
  assert.equal(w.requests[0].summary, "Trial");
});

Deno.test("order: the word trial alone is the gym's trial at the gym, and Kabsi's trial where the book is off", async () => {
  const w = phoneWorld();
  await toGym(w);
  w.extractMap["trial"] = gym(null, "trial", null);
  assert.match(await send(w, { text: "trial" }), /^request_/);
  assert.match(last(w).body, /Still needed: Name/);
  await to(w, 4);
  assert.equal(await send(w, { text: "trial" }), "trial");
});

Deno.test("order: a question that names Kabsi, the plan, billing or my trial with Kabsi is Kabsi's", async () => {
  const w = phoneWorld();
  await toGym(w);
  for (const text of ["when does my trial with Kabsi end", "is my trial still on", "what does Kabsi cost on my plan"]) {
    w.aiMap[text] = tool("question", { text });
    const before = w.noraCalls.length;
    assert.equal(await send(w, { text }), "nora", text);
    assert.equal(w.noraCalls.length, before + 1, text);
  }
});

Deno.test("order: after the router, a question with the pack's words and no Kabsi in it goes to the request book", async () => {
  const w = phoneWorld();
  await toGym(w);
  // The code check does not catch this one (no name first); the router calls it a question; the pack's word wins.
  const text = "the lady from yesterday about a trial";
  w.aiMap[text] = tool("question", { text });
  w.extractMap[text] = gym(null, "a trial", null);
  assert.match(await send(w, { text }), /^request_/);
  assert.equal(w.noraCalls.length, 0);
  // A question that names neither Kabsi nor the pack gets the fixed line, never a model answer.
  w.conversation(ME).open_question = null;
  w.aiMap["is it any good"] = tool("question", { text: "is it any good" });
  assert.equal(await send(w, { text: "is it any good" }), "off_topic");
  assert.equal(w.noraCalls.length, 0);
});

Deno.test("order: STOP and the no-model commands still come first at a business with the book on", async () => {
  const w = phoneWorld();
  await toSalon(w);
  assert.equal(await send(w, { text: "what's open" }), "request_open");
  assert.equal(await send(w, { text: "STOP" }), "stopped");
  assert.equal(await send(w, { text: "Maya asked about a manicure" }), "stopped_ignored");
  assert.equal(w.extractCalls.length, 0);
});

// ─── 2. "X booked Y" with no open enquiry (R-149 item 2).

Deno.test("booked: with no enquiry for Maya, a new visit is proposed with the time buttons, then Save", async () => {
  const w = phoneWorld();
  w.now = Date.UTC(2026, 10, 10, 4, 52); // Tuesday 10 Nov 2026, as in Rashid's retest: Monday 6 is Mon 16 Nov, 6 am or 6 pm
  await toGym(w);
  const ai = w.aiCalls;
  w.extractMap["Maya booked a trial Monday 6"] = gym("Maya", "a trial", "Monday 6");
  assert.equal(await send(w, { text: "Maya booked a trial Monday 6" }), "request_proposed");
  assert.equal(w.aiCalls, ai, "no router call");
  const p = last(w).body;
  assert.match(p, /^\*📅 New visit\* · Kabsi Test Gym\n\nName: Maya\nAsked about: Trial\n/);
  assert.match(p, /Which time did you mean\?/);
  assert.equal(last(w).buttons.length, 2);
  assert.equal(await send(w, { button: lastIds(w)[1]! }), "request_saved");
  assert.equal(w.requests.length, 1);
  assert.equal(w.requests[0].kind, "appointment");
  assert.match(last(w).body, /Visit 1 saved/);
});

Deno.test("booked: with Maya's enquiry open, it converts as RB-F built", async () => {
  const w = phoneWorld();
  await toGym(w);
  w.extractMap["Maya asked about a trial"] = gym("Maya", "a trial", null);
  await send(w, { text: "Maya asked about a trial" });
  assert.equal(await send(w, { button: `rs:${lastIntake(w).id}` }), "request_saved");
  const before = w.extractCalls.length;
  assert.equal(await send(w, { text: "Maya booked a trial Monday 6" }), "request_convert_choose");
  assert.equal(w.extractCalls.length, before, "conversion reads no model");
});

Deno.test("booked: at the salon and the garage the new request is an appointment and a job", async () => {
  const w = phoneWorld();
  await toSalon(w);
  w.extractMap["Dina booked highlights friday 4pm"] = salon("Dina", "highlights", "friday 4pm");
  assert.equal(await send(w, { text: "Dina booked highlights friday 4pm" }), "request_proposed");
  assert.match(last(w).body, /^\*📅 New appointment\*/);
  assert.equal(await send(w, { button: `rs:${lastIntake(w).id}` }), "request_saved");
  assert.equal(w.requests.at(-1)!.kind, "appointment");
  await toGarage(w);
  w.extractMap["Omar booked brakes tomorrow 10am"] = garage("Omar", "brakes", "tomorrow 10am", null);
  assert.equal(await send(w, { text: "Omar booked brakes tomorrow 10am" }), "request_proposed");
  assert.match(last(w).body, /^\*🔧 New job\*/);
  assert.equal(await send(w, { button: `rs:${lastIntake(w).id}` }), "request_saved");
  assert.equal(w.requests.at(-1)!.kind, "job");
});

// ─── 3. Ambiguous weekdays (R-149 item 3).

Deno.test("weekdays: thuesday 3pm on a Tuesday morning gives Today 15:00 and Thu 12 Nov 15:00", async () => {
  const w = phoneWorld();
  w.now = Date.UTC(2026, 10, 10, 4, 48); // Tuesday 10 Nov 2026, 08:48 in Dubai
  await toSalon(w);
  w.extractMap["Rana trim thuesday 3pm"] = salon("Rana", "trim", "thuesday 3pm");
  assert.equal(await send(w, { text: "Rana trim thuesday 3pm" }), "request_proposed");
  assert.deepEqual(last(w).buttons, ["Today 15:00", "Thu 12 Nov 15:00"]);
});

Deno.test("weekdays: after 3pm on that Tuesday, the Tuesday reading is a week on", () => {
  const ctx = { now: new Date(Date.UTC(2026, 10, 10, 12, 0)), timeZone: "Asia/Dubai", typosIn: { start: 0, end: 12 } };
  const r = normalizeWhen("thuesday 3pm", ctx);
  assert.equal(r.status, "ambiguous");
  const dates = r.status === "ambiguous" ? r.candidates.map((c) => c.date).sort() : [];
  assert.deepEqual(dates, ["2026-11-12", "2026-11-17"]);
  // With no typo, "tuesday 3pm" on a Tuesday keeps RB-D's two readings (today or a week on): only typos changed.
  const plain = normalizeWhen("tuesday 3pm", { ...ctx, now: new Date(Date.UTC(2026, 10, 10, 4, 0)) });
  assert.equal(plain.status === "ambiguous" && plain.candidates.length, 2);
});

// ─── 4. The off-topic line (R-149 item 4).

Deno.test("off topic: the RB-F3 look, with the business only for a phone with several", async () => {
  const w = phoneWorld();
  await toGym(w);
  assert.equal(await send(w, { text: "write me a poem about the sea" }), "off_topic");
  const b = last(w).body;
  assert.match(b, /^\*❓ Kabsi cannot help with that\* · Kabsi Test Gym\n\nKabsi looks after your business on Google and keeps your request book/);
  assert.doesNotMatch(b, /\(owner\)/);
  assert.doesNotMatch(b, HOUSE);
  // One business, the book off: no business in the line, no role head.
  const w2 = new World();
  assert.equal(await receive(w2.deps(), msg(w2, PHONES.owner, { text: "write me a poem about the sea" })), "off_topic");
  assert.match(w2.repliesTo(PHONES.owner).at(-1)!.body, /^\*❓ Kabsi cannot help with that\*\n\nKabsi looks after your business on Google: review replies/);
});

Deno.test("off topic: an unclear message the router cannot place gets the same look", async () => {
  const w = phoneWorld();
  await toGym(w);
  assert.equal(await send(w, { text: "the thing from before" }), "off_topic");
  assert.match(last(w).body, /^\*❓ Kabsi cannot help with that\* · Kabsi Test Gym\n/);
});

// ─── 5. help (R-149 item 5).

Deno.test("help: at a business with the book on, the request book block; reset test for staff only", async () => {
  const w = phoneWorld();
  await toSalon(w);
  assert.equal(await send(w, { text: "help" }), "help");
  const b = last(w).body;
  assert.match(b, /\nFor your request book:\na request in your words, for example "Book Sarah for highlights Thursday afternoon"\n/);
  assert.match(b, /"what's open" or "what's unconfirmed"/);
  assert.match(b, /"who asked about highlights this week"/);
  assert.match(b, /"Sarah confirmed Thursday 3"/);
  assert.match(b, /"3 came in", a number and what happened/);
  assert.match(b, /"undo" for your last change/);
  assert.match(b, /"reset test" clears your test requests \(Kabsi staff\)/);
  assert.doesNotMatch(b, HOUSE);
  await toGarage(w);
  await send(w, { text: "help" });
  assert.match(last(w).body, /"3 ready", a number and what happened/);
  assert.doesNotMatch(last(w).body, /0501234567/);
  // Yawmiyati: the book is off, so no block.
  await to(w, 4);
  await send(w, { text: "help" });
  assert.doesNotMatch(last(w).body, /request book/);
  // An owner who is not Kabsi staff, at a business with the book on: the block, without reset test.
  const w2 = new World();
  w2.bookSetting = "on";
  const coffee = w2.biz[0]!.id;
  w2.packs.set(coffee, { pack: "salon", version: 1, state: "test" });
  await receive(w2.deps(), msg(w2, PHONES.owner, { text: "help" }));
  const o = w2.repliesTo(PHONES.owner).at(-1)!.body;
  assert.match(o, /For your request book:/);
  assert.doesNotMatch(o, /reset test/);
});

// ─── The table (R-149 item 1): at least 30 phrases, every phrase of RB-F's script, on the gym, salon and garage packs.

const G = getPack("gym", 1)!, S = getPack("salon", 1)!, R = getPack("garage", 1)!;
const BOOK = true, NOT = false;
const TABLE: [string, typeof G, boolean][] = [
  // RB-F's script and RB-F2, RB-F3 retests: the request book's (a request) or a command read before this check (not a request).
  ["Book Sarah for highlights Thursday afternoon", S, BOOK],
  ["Book sarah for highlightss thrsday afternoon", S, BOOK],
  ["Yes", S, NOT],
  ["what's unconfirmed", S, NOT],
  ["Sarah confirmed Thursday 3", S, NOT],
  ["switch", S, NOT],
  ["Maya asked about a trial", G, BOOK],
  ["who asked about a trial this week", G, NOT],
  ["Maya booked a trial Monday 6", G, BOOK],
  ["Ali Corolla brakes, car's here", R, BOOK],
  ["Ali's car is ready", R, NOT],
  ["not Corolla, Civic", R, NOT],
  ["what's open", R, NOT],
  ["Sam Golf oil change", R, BOOK],
  ["2 ready", R, NOT],
  ["cancel 2", R, NOT],
  ["STOP", S, NOT],
  ["START", S, NOT],
  ["stats", S, NOT],
  ["review link", S, NOT],
  ["Lina manicur tmrw", S, BOOK],
  ["Rana trim thuesday 3pm", S, BOOK],
  ["manicure friday agternoon", S, BOOK],
  ["friday 5pm", S, NOT],
  ["Maya", S, NOT],
  ["write me a poem", S, NOT],
  ["help", S, NOT],
  ["reset test", S, NOT],
  // More people and what they want or did, typos included.
  ["Omar wants personal training prices, 0521234567", G, BOOK],
  ["Hana joining next month, pilates", G, BOOK],
  ["Sam tour tomorrow 5pm", G, BOOK],
  ["someone asked about membership", G, BOOK],
  ["Nadia came in", S, BOOK],
  ["Sarah called", S, BOOK],
  ["a client wants a trim friday", S, BOOK],
  ["Karim asked about a clutch price", R, BOOK],
  ["Layla trim tomorrow 11, 0501234567", S, BOOK],
  ["Dina wnts a pedicure satrday", S, BOOK],
  ["trial", G, BOOK],
  // Kabsi itself, Kabsi's own jobs, and everyday words: never the request book's.
  ["when does my trial with Kabsi end", G, NOT],
  ["is my trial still on", G, NOT],
  ["upgrade my plan", G, NOT],
  ["send me the invoice", S, NOT],
  ["Reply to Maya's review", S, NOT],
  ["Post about our new pilates class", G, NOT],
  ["We are closed on Friday", S, NOT],
  ["Sarah's mum is here", S, NOT],
  ["thanks", S, NOT],
  ["the thing from before", S, NOT],
  ["what is the weather today", S, NOT],
  ["how do reviews work", S, NOT],
  ["I want to cancel", G, NOT],
  // The independent review's cases: posts, offers, hours and people who are not customers stay out of the book.
  ["Discount for students this week", G, NOT],
  ["Offer for new members", G, NOT],
  ["Promo for Eid", S, NOT],
  ["Approved for friday", S, NOT],
  ["Done for today", R, NOT],
  ["Ready for friday", R, NOT],
  ["Add our new menu", S, NOT],
  ["Add new offer", G, NOT],
  ["add Christmas offer", S, NOT],
  ["Add Ramadan timings", R, NOT],
  ["Put down closed friday", S, NOT],
  ["Note down that we close early", S, NOT],
  ["Staff called in sick", S, NOT],
  ["Bank called", S, NOT],
  ["DHL came", R, NOT],
  ["Supplier called about the delivery", R, NOT],
  ["Maya wants a 3 month subscription", G, BOOK],
  ["Ali wants an invoice", R, BOOK],
  ["Maya saw our Instagram post and wants a trial", G, BOOK],
  ["Sami found us on Google and wants a trial", G, BOOK],
  ["add Sarah for a trim friday", S, BOOK],
  ["Sarah for highlights friday", S, BOOK],
];

Deno.test(`table: ${TABLE.length} phrases read as the request book's or not, by code`, () => {
  assert.ok(TABLE.length >= 30);
  const wrong = TABLE.filter(([text, pack, want]) => !!bookIntent(text, pack) !== want).map(([text, , want]) => `${text}: wanted ${want ? "the book" : "not the book"}`);
  assert.deepEqual(wrong, []);
});

Deno.test("table: the RB-F script's request phrases reach the request book end to end, with no router call", async () => {
  const w = phoneWorld();
  await toGym(w);
  for (const [text, q] of [["Hana joining next month, pilates", gym("Hana", "pilates", "next month")], ["Sam tour tomorrow 5pm", gym("Sam", "tour", "tomorrow 5pm")]] as const) {
    w.conversation(ME).open_question = null;
    w.extractMap[text] = q;
    const ai = w.aiCalls;
    assert.match(await send(w, { text }), /^request_proposed/, text);
    assert.equal(w.aiCalls, ai, text);
  }
  await toGarage(w);
  w.conversation(ME).open_question = null;
  w.extractMap["Ali Corolla brakes, car's here"] = garage("Ali", "brakes", null, "Corolla");
  assert.equal(await send(w, { text: "Ali Corolla brakes, car's here" }), "request_proposed");
  assert.match(last(w).body, /Status: In the shop/);
});
