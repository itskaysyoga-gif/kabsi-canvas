// P0.5-02: every post check, the three types, and the care routine (the one question, the month's times, nothing
// that fails a check reaches the owner).
import { assert, assertEquals } from "jsr:@std/assert@1";
import { type CheckContext, checkPost, hostOf, NOTHING_NEW_QUESTION, type PostFields, similarity } from "./checks.ts";
import { type CareDeps, careMonth, monthSlots } from "./plan.ts";

const ctx = (o: Partial<CheckContext> = {}): CheckContext => ({
  allowedText: "About the business: a family bakery. Products and services: sourdough, croissants, birthday cakes.",
  website: "https://harbourlane.example", category: "bakery", categoryLabel: "Bakery", city: "Brooklyn", country: "US",
  recent: [], today: "2026-10-21", ...o,
});
const post = (o: Partial<PostFields> = {}): PostFields => ({
  type: "STANDARD", summary: "Fresh sourdough comes out of the oven every morning at 7. Come early for a warm loaf and a croissant.", ...o,
});
const codes = (f: PostFields, c = ctx()) => checkPost(f, c).map((i) => i.code);

Deno.test("a clean Update passes", () => assertEquals(codes(post()), []));

Deno.test("no phone numbers, emails, handles or links in the text", () => {
  assertEquals(codes(post({ summary: "Call us on +1 718 555 0101 for birthday cakes and more fresh bread." })), ["contact"]);
  assertEquals(codes(post({ summary: "Write to orders@harbourlane.example for birthday cakes this week." })), ["contact"]);
  assertEquals(codes(post({ summary: "Follow @harbourlane for our sourdough and croissants this week." })), ["contact"]);
  assertEquals(codes(post({ summary: "See harbourlane.com for our sourdough and croissants this week." })), ["contact"]);
});

Deno.test("the button opens only the owner's own website", () => {
  assertEquals(codes(post({ ctaType: "ORDER", ctaUrl: "https://harbourlane.example/order" })), []);
  assertEquals(codes(post({ ctaType: "ORDER", ctaUrl: "https://shop.harbourlane.example" })), []);
  assertEquals(codes(post({ ctaType: "ORDER", ctaUrl: "https://ubereats.example/harbourlane" })), ["button_link"]);
  assertEquals(codes(post({ ctaType: "ORDER", ctaUrl: "http://harbourlane.example" })), ["button_link"]);
  assertEquals(codes(post({ ctaType: "BOOK", ctaUrl: "https://harbourlane.example" }), ctx({ website: null })), ["button_link"]);
  assertEquals(codes(post({ ctaType: "CALL" }), ctx({ website: null })), []);
  assertEquals(hostOf("www.Example.com/x"), "example.com");
});

Deno.test("no prices or offers that are not in Business Knowledge", () => {
  assertEquals(codes(post({ summary: "Our sourdough is now $4 a loaf, baked fresh every single morning." })), ["contact"]);
  assertEquals(codes(post({ summary: "Our sourdough is now $4 a loaf." }), ctx({ allowedText: "Prices: sourdough $4" })).filter((c) => c === "contact"), []);
  assertEquals(codes(post({ summary: "This week only, 20% off all croissants and birthday cakes at the bakery." })), ["offer_not_given"]);
});

Deno.test("no superlatives, no health, safety or results claims", () => {
  assertEquals(codes(post({ summary: "The best sourdough you will find, baked fresh every morning for you." })), ["superlative"]);
  assertEquals(codes(post({ summary: "We are #1 for sourdough, baked fresh every morning at the bakery." })), ["superlative"]);
  assertEquals(codes(post({ summary: "Our gluten free bread is 100% safe for everyone, baked fresh daily." })), ["claim"]);
});

Deno.test("no keyword stuffing: the category or city more than twice", () => {
  assertEquals(codes(post({ summary: "Brooklyn bakery bread for Brooklyn, the Brooklyn bakery you know." })).includes("stuffing"), true);
  assertEquals(codes(post({ summary: "A bakery in Brooklyn with sourdough every morning at 7." })).includes("stuffing"), false);
});

Deno.test("not more than 70 percent like a post of the last 90 days", () => {
  const old = "Fresh sourdough comes out of the oven every morning at 7. Come early for a warm loaf.";
  assert(similarity(old, post().summary) > 0.7);
  assertEquals(codes(post(), ctx({ recent: [old] })), ["repeat"]);
  assertEquals(codes(post(), ctx({ recent: ["Birthday cakes need two days' notice; ask at the counter."] })), []);
});

Deno.test("category rules: clinics, hotels, alcohol where restricted", () => {
  assertEquals(codes(post({ summary: "Our new whitening treatment gets results in one visit to the clinic." }), ctx({ category: "dentist" })), ["medical"]);
  const offer = post({ type: "OFFER", startDate: "2026-11-01", endDate: "2026-11-30", terms: "Weekdays only", summary: "Stay two nights in November and get breakfast included with your room." });
  assertEquals(codes(offer, ctx({ category: "hotel", allowedText: "Stay two nights in November and get breakfast included" })), ["lodging_offer"]);
  assertEquals(codes(post({ summary: "Try our new wine list with dinner this week, chosen by our team." }), ctx({ country: "AE" })), ["alcohol"]);
  assertEquals(codes(post({ summary: "Try our new wine list with dinner this week, chosen by our team." }), ctx({ country: "GB" })), []);
});

Deno.test("an Offer without dates or terms is refused; an Event needs its title and dates", () => {
  const typed = "Two croissants for the price of one on Fridays";
  const o = (x: Partial<PostFields>) => post({ type: "OFFER", summary: `${typed} in November.`, ...x });
  const c = ctx({ allowedText: typed });
  assertEquals(codes(o({ terms: "Fridays only" }), c), ["offer_dates"]);
  assertEquals(codes(o({ startDate: "2026-11-01", endDate: "2026-11-30" }), c), ["offer_terms"]);
  assertEquals(codes(o({ startDate: "2026-11-30", endDate: "2026-11-01", terms: "Fridays only" }), c), ["offer_dates"]);
  assertEquals(codes(o({ startDate: "2026-11-01", endDate: "2026-11-30", terms: "Fridays only" }), c), []);
  assertEquals(codes(o({ startDate: "2026-11-01", endDate: "2026-11-30", terms: "Fridays only", redeemUrl: "https://coupons.example" }), c), ["redeem_link"]);
  const e = (x: Partial<PostFields>) => post({ type: "EVENT", ...x });
  assertEquals(codes(e({ startDate: "2026-11-07", endDate: "2026-11-07" })), ["event_title"]);
  assertEquals(codes(e({ title: "Sourdough class" })), ["event_dates"]);
  assertEquals(codes(e({ title: "Sourdough class", startDate: "2026-11-07", endDate: "2026-11-07", startTime: "10:00", endTime: "12:00" })), []);
  assertEquals(codes(e({ title: "Sourdough class", startDate: "2026-10-01", endDate: "2026-10-02" })), ["event_dates"]);
});

Deno.test("Kabsi's own drafts are 150 to 300 characters; the owner may write up to 1,500", () => {
  assertEquals(codes(post({ summary: "Fresh bread every morning." }), ctx({ kabsiDraft: true })), ["draft_length"]);
  assertEquals(codes(post({ summary: "x".repeat(1501) })), ["length"]);
});

Deno.test("the month's times: 2 by default on the slot weekday, 1 or 4 by choice", () => {
  assertEquals(monthSlots("2026-11", 2, "retail"), ["2026-11-05T09:00", "2026-11-19T09:00"]);
  assertEquals(monthSlots("2026-11", 1, "pro"), ["2026-11-03T08:30"]);
  assertEquals(monthSlots("2026-11", 4, "retail").length, 4);
});

function deps(o: Partial<CareDeps> = {}) {
  const prepared: { publishLocal: string; summary: string; photoId: string | null }[] = [];
  const asked: string[] = [];
  const d: CareDeps = {
    planned: () => Promise.resolve([]),
    material: () => Promise.resolve({ recentFacts: true, photoId: "photo-1" }),
    context: () => Promise.resolve(ctx()),
    write: () => Promise.resolve("Our birthday cakes are made to order with two days' notice. Tell us the flavour you want and the name to write on top, then pick the cake up from the counter on the day."),
    prepare: (p) => { prepared.push(p); return Promise.resolve("post-" + prepared.length); },
    ask: (_m, q) => { asked.push(q); return Promise.resolve(); },
    ...o,
  };
  return { d, prepared, asked };
}

Deno.test("a business with no recent facts gets the one question, not a post", async () => {
  const t = deps({ material: () => Promise.resolve({ recentFacts: false, photoId: null }) });
  const r = await careMonth("2026-11", 2, "retail", "2026-10-21T10:00", t.d);
  assertEquals(r.asked, true);
  assertEquals(t.prepared, []);
  assertEquals(t.asked, [NOTHING_NEW_QUESTION]);
  assertEquals(NOTHING_NEW_QUESTION, "Anything new this month? A dish, a service, an event?");
});

Deno.test("with something true, the month is prepared at its times, the photo with the first; nothing twice", async () => {
  const t = deps();
  const r = await careMonth("2026-11", 2, "retail", "2026-10-21T10:00", t.d);
  assertEquals(r.prepared, 2);
  assertEquals(t.prepared.map((p) => p.publishLocal), ["2026-11-05T09:00", "2026-11-19T09:00"]);
  assertEquals(t.prepared.map((p) => p.photoId), ["photo-1", null]);
  const again = deps({ planned: () => Promise.resolve(t.prepared.map((p) => ({ publishLocal: p.publishLocal, state: "draft", summary: p.summary }))) });
  assertEquals((await careMonth("2026-11", 2, "retail", "2026-10-21T10:00", again.d)).full, true);
  assertEquals(again.prepared, []);
});

Deno.test("no model (the AI credit is off): Kabsi asks instead of writing; a draft failing a check is never prepared", async () => {
  const off = deps({ write: undefined });
  assertEquals((await careMonth("2026-11", 2, "retail", "2026-10-21T10:00", off.d)).asked, true);
  assertEquals(off.prepared, []);
  const bad = deps({ write: () => Promise.resolve("The best bakery in Brooklyn, call +1 718 555 0101 today for the finest sourdough you will ever taste in your life.") });
  assertEquals((await careMonth("2026-11", 2, "retail", "2026-10-21T10:00", bad.d)).asked, true);
  assertEquals(bad.prepared, []);
});

Deno.test("past times in the current month are not filled", async () => {
  const t = deps();
  await careMonth("2026-11", 2, "retail", "2026-11-10T10:00", t.d);
  assertEquals(t.prepared.map((p) => p.publishLocal), ["2026-11-19T09:00"]);
});
