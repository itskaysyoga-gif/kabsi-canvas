// V3 Review Growth: the ready review message, link opens, the print cards, photos from WhatsApp, the monthly question,
// sensitive reviews and voice notes. All on fakes: no database, no network, no Kapso, no model.
import { assert, assertEquals, assertMatch, assertNotMatch } from "jsr:@std/assert@1";
import { receive } from "../whatsapp/agent.ts";
import { flush } from "../whatsapp/outbox.ts";
import { BIZ, msg, PHONES, USERS, World } from "../whatsapp/world.test-helpers.ts";
import { ASK_INTRO, reviewRequestLink, reviewRequestMessage, reviewRequestProblems } from "./message.ts";
import { growthLine, opensBreakdown } from "./stats.ts";
import { namesStaffInComplaint, SENSITIVE_BUTTONS, sensitiveAlertBody, sensitivity } from "./sensitive.ts";
import { MONTHLY_QUESTION, readUpdate } from "./monthly.ts";
import { categoryLabel, CATEGORY_MENU, photoReadyBody, photoRefusedBody, pickCategory } from "./photo.ts";
import { reviewGrowthTick, type PhotoDue } from "./tick.ts";
import { buildCard, CARD_WORDS, printable, qrMatrix, textWidth, wrap } from "./pdf.ts";
import { FILENAME, makeHandler } from "./cards-handler.ts";
import { sendSensitiveAlert } from "./alerts.ts";
import { mockTranscriber, MOCK_MARKER, pickTranscriber, scribe, wer } from "../voice/transcribe.ts";
import { VOICE_MAX_BYTES } from "../whatsapp/media.ts";

const BANNED = /[–—!]/;

// ─── 1. the ready message
Deno.test("the review request: one message, the business's link, no reward, no rating question, no dash", () => {
  const m = reviewRequestMessage("Harbour Lane Coffee", "https://go.kabsi.co/ABC234?s=m");
  assertEquals(m, "Thank you for visiting Harbour Lane Coffee today. If you have a minute, tell others how your visit went: https://go.kabsi.co/ABC234?s=m");
  assertEquals(reviewRequestProblems(m), []);
  assertEquals(reviewRequestProblems(ASK_INTRO), []);
  assertNotMatch(m, BANNED);
});
Deno.test("the review request checker catches rewards, gating and star talk", () => {
  for (const bad of ["Leave a review and get 10% off", "If you enjoyed it, rate us 5 stars", "How was your visit? Happy? Tell us", "Free coffee for a review", "Rate us out of 5"]) {
    assert(reviewRequestProblems(bad).length > 0, bad);
  }
});
Deno.test("the review request link goes through the Worker and marks the open as a message", () => {
  assertEquals(reviewRequestLink("abc234"), "https://go.kabsi.co/ABC234?s=m");
  assertEquals(reviewRequestLink("ABC0O1"), null); // not a Kabsi code
  assertEquals(reviewRequestLink("https://evil.example/"), null);
});
Deno.test("link opens are counted apart from new reviews and never turned into a rate", () => {
  const s = { days: 30, newReviews: 4, opens: { message: 12, qr: 5, tag: 1 } };
  const line = growthLine(s);
  assertMatch(line, /4 new reviews on Google in the last 30 days\. Your review link was opened 18 times\. An open is not a review\./);
  assertNotMatch(line, /%|per cent|percent|conversion|of the people/);
  assertEquals(opensBreakdown(s), "12 from messages, 5 from QR codes, 1 from tags");
  assertMatch(growthLine({ days: 7, newReviews: 1, opens: { message: 0, qr: 0, tag: 0 } }), /1 new review on Google.*was not opened/);
  assertNotMatch(line, BANNED);
});

// ─── 2. the print cards
Deno.test("the counter card is a valid A6 PDF with the design studio's words, the business and the link", () => {
  const pdf = buildCard({ kind: "counter", businessName: "Juniper Hair Studio", code: "kqa234" });
  const text = new TextDecoder().decode(pdf);
  assert(text.startsWith("%PDF-1.4") && text.trimEnd().endsWith("%%EOF"));
  assertMatch(text, /\/MediaBox \[0 0 297\.64 419\.53\]/);
  for (const w of ["Tell others how", "your visit went", "Scan to leave a review on", "Juniper Hair Studio", "Or type go.kabsi.co/KQA234"]) assert(text.includes(w), w);
  assertNotMatch(text, /reward|discount|free|stars?\b/i);
  // The xref offsets point at the objects.
  const xref = Number(/startxref\n(\d+)/.exec(text)![1]);
  assertEquals(text.slice(xref, xref + 4), "xref");
  const offsets = [...text.slice(xref).matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
  offsets.forEach((o, i) => assertEquals(text.slice(o, o + `${i + 1} 0 obj`.length), `${i + 1} 0 obj`));
});
Deno.test("the table tent is A4 with both halves, a fold line and the code twice", () => {
  const text = new TextDecoder().decode(buildCard({ kind: "tent", businessName: "Juniper Hair Studio", code: "KQA234" }));
  assertMatch(text, /\/MediaBox \[0 0 595\.28 841\.89\]/);
  assertEquals(text.split("Tell others how").length - 1, 2);
  assert(text.includes(CARD_WORDS.fold));
  assertEquals(text.split("-1 0 0 -1").length - 1, 1); // the top half is turned
});
Deno.test("the QR on a card is the review link with the QR source, and the card refuses a bad code", () => {
  const m = qrMatrix("https://go.kabsi.co/KQA234?s=q");
  assert(m.length >= 29 && m.length === m[0].length);
  assertEquals(m.flat().filter(Boolean).length > 300, true);
  try { buildCard({ kind: "counter", businessName: "X", code: "nope" }); assert(false); } catch (e) { assertEquals((e as Error).message, "bad_code"); }
});
Deno.test("a name Helvetica cannot write is left off the card, the code and short link still print", () => {
  assertEquals(printable("Harbour Lane Café"), false);
  const text = new TextDecoder().decode(buildCard({ kind: "counter", businessName: "Café du Port", code: "KQA234" }));
  assert(!text.includes("Café"));
  assert(text.includes("go.kabsi.co/KQA234"));
});
Deno.test("text width and wrapping use the Helvetica metrics", () => {
  assertEquals(Math.round(textWidth("Hello", 10, "F1") * 100) / 100, 22.78);
  assert(wrap("one two three four five six", 12, "F1", 60).length > 1);
});
Deno.test("review-cards: the signed-in member gets the PDF; anyone else gets the same not found", async () => {
  const calls: string[] = [];
  const h = makeHandler({
    getUser: async (req) => (req.headers.get("authorization") === "Bearer ok" ? { id: "u1" } : null),
    loadLink: async (code) => (code === "KQA234" ? { location_id: "L1", business: "Juniper Hair Studio" } : null),
    memberOf: async (l, u) => (calls.push(`member:${l}:${u}`), l === "L1" && u === "u1"),
    rateLimit: async () => true, log: () => {}, captureError: async () => {}, cors: {},
  });
  const post = (body: unknown, auth = "Bearer ok") => h(new Request("https://x/", { method: "POST", headers: { authorization: auth, "content-type": "application/json" }, body: JSON.stringify(body) }));
  const ok = await post({ code: "KQA234", kind: "tent" });
  assertEquals(ok.status, 200);
  assertEquals(ok.headers.get("content-type"), "application/pdf");
  assertMatch(ok.headers.get("content-disposition")!, new RegExp(FILENAME.tent));
  assertEquals(new TextDecoder().decode((await ok.arrayBuffer()).slice(0, 5)), "%PDF-");
  assertEquals((await post({ code: "KQA234", kind: "counter" }, "Bearer nope")).status, 401);
  assertEquals((await post({ code: "NOPE", kind: "counter" })).status, 400);
  assertEquals((await post({ code: "KQA234", kind: "poster" })).status, 400);
  assertEquals((await post({ code: "KQA235", kind: "counter" })).status, 404);
  const other = makeHandler({ getUser: async () => ({ id: "u2" }), loadLink: async () => ({ location_id: "L1", business: "Juniper" }), memberOf: async () => false,
    rateLimit: async () => true, log: () => {}, captureError: async () => {}, cors: {} });
  assertEquals((await other(new Request("https://x/", { method: "POST", body: JSON.stringify({ code: "KQA234", kind: "counter" }) }))).status, 404);
  const limited = makeHandler({ getUser: async () => ({ id: "u1" }), loadLink: async () => null, memberOf: async () => true, rateLimit: async () => false,
    log: () => {}, captureError: async () => {}, cors: {} });
  assertEquals((await limited(new Request("https://x/", { method: "POST", body: JSON.stringify({ code: "KQA234", kind: "counter" }) }))).status, 429);
});

// ─── 3 and 5. sensitive reviews
Deno.test("sensitive: health, threats, legal action and a named member of staff", () => {
  const base = { risk: "high", rating: 1, comment: "x", categories: [] as string[] };
  assert(sensitivity({ ...base, reasons: ["health_safety"] }).sensitive);
  assert(sensitivity({ ...base, reasons: ["threat"] }).sensitive);
  assert(sensitivity({ ...base, reasons: ["legal_threat"] }).sensitive);
  assert(!sensitivity({ ...base, reasons: ["refund"] }).sensitive);
  assert(!sensitivity({ ...base, risk: "low", rating: 5, reasons: [], comment: "Lovely coffee" }).sensitive);
  assert(sensitivity({ ...base, risk: "medium", reasons: ["staff_complaint"], comment: "The barista Omar was rude to us" }).why.includes("staff_named"));
});
Deno.test("a named member of staff counts only in a complaint, never in a thank you", () => {
  assertEquals(namesStaffInComplaint({ rating: 5, comment: "Thanks to Maya for the great cut" }), false);
  assertEquals(namesStaffInComplaint({ rating: 5, comment: "Our stylist Maya was wonderful" }), false);
  assertEquals(namesStaffInComplaint({ rating: 2, comment: "The stylist Maya ignored us" }), true);
  assertEquals(namesStaffInComplaint({ rating: 3, comment: "A man called Karim was rude" }), true);
  assertEquals(namesStaffInComplaint({ rating: 1, comment: "It was terrible and slow" }), false);
});
Deno.test("staff names are found whatever the case or the comma, and a role word alone is not a name", () => {
  for (const c of ["Dr Khan was rude", "Dr. Khan was rude", "Nurse Lina was awful", "Manager John shouted at us", "Our waiter, Sam, was rude", "the manager John ignored us"]) {
    assertEquals(namesStaffInComplaint({ rating: 2, comment: c }), true, c);
  }
  for (const c of ["The manager was rude", "the doctor was late and the waiting room dirty", "Great waiter, thanks"]) {
    assertEquals(namesStaffInComplaint({ rating: 2, comment: c }), false, c);
  }
});
Deno.test("the sensitive alert carries no review words, no draft and no Approve, and offers a person; a clinic gets less still", () => {
  const body = sensitiveAlertBody({ business: "Smile Dental", stars: 1, reviewer: "Maya Khan", appUrl: "https://kabsi.co", regulated: "health" });
  assertMatch(body, /^Smile Dental: a new 1-star review needs your care\./);
  assertNotMatch(body, /Maya|Approve|Kabsi's reply/);
  assertMatch(body, /Details about a patient or client stay out of WhatsApp/);
  assertMatch(body, /talk to a person/);
  assertNotMatch(body, BANNED);
  const plain = sensitiveAlertBody({ business: "Harbour Lane Coffee", stars: 1, reviewer: "Maya Khan", appUrl: "https://kabsi.co", regulated: null });
  assertMatch(plain, /from Maya/);
  assertEquals(SENSITIVE_BUTTONS.map((b) => b.title), ["Talk to a person"]);
});
Deno.test("the sensitive alert goes through the one sender with no Approve button and the review remembered", async () => {
  const w = new World();
  const ctx = { db: {} as never, sender: {} as never, on: true, phoneNumberId: "1", appUrl: "https://kabsi.co", out: w.out(),
    remember: async (u: string, r: string) => { w.calls.push(`remember:${u}:${r}`); } };
  // The fake db the sender needs: may send, record.
  (ctx as { db: unknown }).db = { maySend: async () => ({ ok: true, phone: PHONES.owner, in_window: true, review_alerts: true, digest: false }), record: async () => null };
  w.conversation(PHONES.owner).window_expires_at = new Date(w.now + 3600_000).toISOString();
  const r = await sendSensitiveAlert(ctx as never, [USERS.owner], { reviewId: "r1", locationId: BIZ.harbour, business: "Harbour Lane Coffee", stars: 1, reviewer: "Sam", regulated: null });
  assertEquals(Object.keys(r), [USERS.owner]);
  const sent = w.sent.at(-1)!;
  assertEquals(sent.buttons, ["Talk to a person"]);
  assertNotMatch(sent.body, /Approve/);
  // Not remembered: "make it shorter" must never turn a sensitive review into a draft with an Approve button.
  assert(!w.calls.some((c) => c.startsWith("remember:")));
});

// ─── the monthly question
Deno.test("the monthly question asks the plain question and promises nothing goes live without a yes", () => {
  const q = MONTHLY_QUESTION("Harbour Lane Coffee");
  assertMatch(q, /Any new services, prices, products or opening times\?/);
  assertMatch(q, /nothing goes live without your yes/);
  assertNotMatch(q, BANNED);
});
Deno.test("the owner's answer: nothing, an hours change, or a post in their own words", () => {
  const now = new Date(Date.UTC(2026, 9, 26, 15));
  assertEquals(readUpdate("No", now, "America/New_York").kind, "nothing");
  assertEquals(readUpdate("nothing new.", now, "America/New_York").kind, "nothing");
  assertEquals(readUpdate("closed tomorrow", now, "America/New_York").kind, "hours");
  const post = readUpdate("We now offer teeth whitening from 120 dollars and we are closed on Fridays from December.", now, "America/New_York");
  assertEquals(post.kind, "post");
  assertEquals(readUpdate("Call us on 0501234567 for the new menu please", now, "UTC").kind, "refused");
  assertEquals(readUpdate("ok", now, "UTC").kind, "refused");
});

// ─── photos
Deno.test("the photo messages name what Kabsi did, the category, and ask one thing", () => {
  const ready = photoReadyBody({ business: "Harbour Lane Coffee", category: "INTERIOR", note: null, suitable: true, forOwner: false });
  assertMatch(ready, /your photo is ready.*no location details/s);
  assertMatch(ready, /as the inside\./);
  assertMatch(ready, /Put it on your Google profile\?$/);
  assertMatch(photoReadyBody({ business: "X", category: null, note: "This photo is dark.", suitable: false, forOwner: true }), /a photo from your team is ready.*something else.*Kabsi noticed: This photo is dark\./s);
  assertMatch(photoRefusedBody("X", "This is not a photo Kabsi can use."), /could not use that photo\. This is not a photo Kabsi can use\. Please send another one\./);
  for (const t of [ready, CATEGORY_MENU, photoRefusedBody("X", null)]) assertNotMatch(t, BANNED);
  assertEquals(categoryLabel("TEAMS"), "your team");
});
Deno.test("the category menu takes a number or the plain word", () => {
  assertEquals(pickCategory("2"), "INTERIOR");
  assertEquals(pickCategory("The inside"), "INTERIOR");
  assertEquals(pickCategory("team."), "TEAMS");
  assertEquals(pickCategory("what we sell"), "PRODUCT");
  assertEquals(pickCategory("9"), null);
  assertEquals(pickCategory("banana"), null);
});

const dueRow = (o: Partial<PhotoDue> = {}): PhotoDue => ({ photo_id: "11111111-1111-4111-8111-111111111111", location_id: BIZ.harbour, business: "Harbour Lane Coffee",
  state: "draft", category: "INTERIOR", suitable: true, note: null, sender_role: "owner", to: [{ user_id: USERS.owner, phone: PHONES.owner }], ...o });
const PHOTO = "11111111-1111-4111-8111-111111111111";
const growthDb = (photos: PhotoDue[] = [], monthly: { location_id: string; business: string; user_id: string; phone: string; month: string }[] = []) =>
  ({ photosDue: async () => photos.splice(0), monthlyDue: async () => monthly.splice(0) });
const tap = (w: World, from: string, button: string) => receive(w.deps(), msg(w, from, { button }));
const say = (w: World, from: string, text: string) => receive(w.deps(), msg(w, from, { text }));
const lastTo = (w: World, phone: string) => w.repliesTo(phone).at(-1)!;
const open = (w: World, phone: string) => { w.conversation(phone).window_expires_at = new Date(w.now + 3600_000).toISOString(); };

Deno.test("photo flow: ready, Edit picks the category, a new Yes, approved through the pipeline; the old Yes is refused", async () => {
  const w = new World();
  open(w, PHONES.owner);
  w.photoDrafts.set(PHOTO, { location: BIZ.harbour, state: "draft", category: "INTERIOR" });
  assertEquals(await reviewGrowthTick(w.deps(), growthDb([dueRow()])), { photos: 1, questions: 0 });
  const ready = lastTo(w, PHONES.owner);
  assertEquals(ready.buttons, ["Yes", "Edit", "Skip"]);
  assertMatch(ready.body, /as the inside/);
  const oldYes = [...w.actions.values()].find((a) => a.type === "photo")!;
  // Edit: the menu, then a number.
  assertEquals(await tap(w, PHONES.owner, `pe:${PHOTO}`), "photo_edit");
  assertMatch(lastTo(w, PHONES.owner).body, /What is it a photo of\?/);
  assertEquals(await say(w, PHONES.owner, "3"), "photo_category_set");
  const again = lastTo(w, PHONES.owner);
  assertMatch(again.body, /as your team/);
  assertEquals(again.buttons, ["Yes", "Edit", "Skip"]);
  assertEquals(w.photoDrafts.get(PHOTO)!.category, "TEAMS");
  // The yes the owner saw before the edit no longer matches what is on screen.
  assertEquals(await tap(w, PHONES.owner, `a:${oldYes.token}`), "refused:not_draft");
  const fresh = [...w.actions.values()].find((a) => a.type === "photo" && !a.stale)!;
  assertEquals(await tap(w, PHONES.owner, `a:${fresh.token}`), "approved");
  assertMatch(lastTo(w, PHONES.owner).body, /Approved for Harbour Lane Coffee/);
});
Deno.test("photo flow: Skip drops the photo and nothing is approved", async () => {
  const w = new World();
  open(w, PHONES.owner);
  w.photoDrafts.set(PHOTO, { location: BIZ.harbour, state: "draft", category: "EXTERIOR" });
  await reviewGrowthTick(w.deps(), growthDb([dueRow({ category: "EXTERIOR" })]));
  const a = [...w.actions.values()].find((x) => x.type === "photo")!;
  assertEquals(await tap(w, PHONES.owner, `ps:${a.token}`), "photo_skipped");
  assertEquals(w.photoDrafts.get(PHOTO)!.state, "skipped");
  assertMatch(lastTo(w, PHONES.owner).body, /Nothing was put on Google/);
  assert(!w.calls.some((c) => c.startsWith("approve:")));
  assertEquals(await tap(w, PHONES.owner, `ps:${a.token}`), "photo_skip:already");
});
Deno.test("photo flow: a photo from staff asks the owner, never the staff phone, and staff cannot skip or approve it", async () => {
  const w = new World();
  open(w, PHONES.owner); open(w, PHONES.staff);
  w.photoDrafts.set(PHOTO, { location: BIZ.harbour, state: "draft", category: "PRODUCT" });
  await reviewGrowthTick(w.deps(), growthDb([dueRow({ sender_role: "staff", category: "PRODUCT" })]));
  assertEquals(w.repliesTo(PHONES.staff).length, 0);
  assertMatch(lastTo(w, PHONES.owner).body, /a photo from your team is ready/);
  const a = [...w.actions.values()].find((x) => x.type === "photo")!;
  assertEquals(await tap(w, PHONES.staff, `ps:${a.token}`), "not_yours");
  assertEquals(await tap(w, PHONES.staff, `a:${a.token}`), "not_yours");
  assertEquals(w.photoDrafts.get(PHOTO)!.state, "draft");
});
Deno.test("photo flow: a photo Kabsi could not use goes back to the sender with the reason, once", async () => {
  const w = new World();
  open(w, PHONES.owner);
  await reviewGrowthTick(w.deps(), growthDb([dueRow({ state: "refused", note: "This is not a photo Kabsi can use." })]));
  assertMatch(lastTo(w, PHONES.owner).body, /could not use that photo\. This is not a photo Kabsi can use\. Please send another one\./);
  assertEquals(await reviewGrowthTick(w.deps(), growthDb([dueRow({ state: "refused" })])), { photos: 1, questions: 0 });
  assertEquals(w.repliesTo(PHONES.owner).length, 1); // the same dedupe key: nothing twice
});
Deno.test("photo flow: a refused photo outside the 24-hour window sends no kabsi_photo_ready and waits for the owner's next message", async () => {
  const w = new World(); // the owner's window is closed
  await reviewGrowthTick(w.deps(), growthDb([dueRow({ state: "refused", note: "This is not a photo Kabsi can use." })]));
  assertEquals(w.repliesTo(PHONES.owner).length, 0); // no template (kabsi_photo_ready says a photo is ready to approve), no text
  assertEquals(w.sent.filter((x) => x.template === "kabsi_photo_ready").length, 0);
  const row = w.outbox.find((r) => r.kind === "photo_refused")!;
  assertEquals([row.state, row.error, row.template], ["held", "outside_window", null]);
  // The owner writes: the window opens and the held note goes out.
  await say(w, PHONES.owner, "hello");
  await flush(w.out());
  assertMatch(w.repliesTo(PHONES.owner).map((x) => x.body).join("\n"), /could not use that photo\. This is not a photo Kabsi can use\./);
  assertEquals(w.sent.filter((x) => x.template === "kabsi_photo_ready").length, 0);
});
Deno.test("photo flow: a manager's Edit only works on their own business", async () => {
  const w = new World();
  open(w, PHONES.plain);
  w.photoDrafts.set(PHOTO, { location: BIZ.harbour, state: "draft", category: "INTERIOR" });
  await tap(w, PHONES.plain, `pe:${PHOTO}`);
  assertEquals(await say(w, PHONES.plain, "2"), "photo_category_refused:not_member");
  assertEquals(w.photoDrafts.get(PHOTO)!.category, "INTERIOR");
});

// ─── the monthly question through the agent
Deno.test("monthly question: asked once, the answer becomes a post draft to approve; a late answer is not read as one", async () => {
  const w = new World();
  open(w, PHONES.owner);
  const due = [{ location_id: BIZ.harbour, business: "Harbour Lane Coffee", user_id: USERS.owner, phone: PHONES.owner, month: "2026-10-01" }];
  assertEquals(await reviewGrowthTick(w.deps(), growthDb([], due)), { photos: 0, questions: 1 });
  assertMatch(lastTo(w, PHONES.owner).body, /anything new this month\?/);
  assertEquals(w.conversation(PHONES.owner).open_question?.type, "update");
  assertEquals(await say(w, PHONES.owner, "We now serve oat milk flat whites and open at 7am on Saturdays from November"), "update_post_shown");
  assert(w.calls.some((c) => c.startsWith(`post:${BIZ.harbour}:We now serve oat milk`)));
  assert(w.calls.includes(`monthly_answered:${BIZ.harbour}`));
  const shown = lastTo(w, PHONES.owner);
  assertEquals(shown.buttons, ["Approve", "Edit on kabsi.co"]);
  assertMatch(shown.body, /after your yes\. It is your own words/);
  assertEquals(w.conversation(PHONES.owner).open_question, null);
});
Deno.test("monthly question: No closes it kindly and an hours answer becomes an hours draft", async () => {
  const w = new World();
  open(w, PHONES.owner);
  const row = () => [{ location_id: BIZ.harbour, business: "Harbour Lane Coffee", user_id: USERS.owner, phone: PHONES.owner, month: "2026-10-01" }];
  await reviewGrowthTick(w.deps(), growthDb([], row()));
  assertEquals(await say(w, PHONES.owner, "nothing new"), "update_nothing");
  const w2 = new World();
  open(w2, PHONES.owner);
  await reviewGrowthTick(w2.deps(), growthDb([], row()));
  assertEquals(await say(w2, PHONES.owner, "closed tomorrow"), "hours_shown");
});
Deno.test("monthly question: a bare Yes never approves something else; it asks what is new and keeps the question", async () => {
  const w = new World();
  open(w, PHONES.owner);
  const token = w.alert(PHONES.owner, BIZ.harbour);
  await reviewGrowthTick(w.deps(), growthDb([], [{ location_id: BIZ.harbour, business: "Harbour Lane Coffee", user_id: USERS.owner, phone: PHONES.owner, month: "2026-10-01" }]));
  assertEquals(await say(w, PHONES.owner, "Yes"), "update_what");
  assertMatch(lastTo(w, PHONES.owner).body, /What is new\?/);
  assert(!w.calls.includes(`approve:${token}`));
  assertEquals(w.conversation(PHONES.owner).open_question?.type, "update");
});
Deno.test("photo flow: a waiting photo and a waiting reply are told apart in Which one", async () => {
  const w = new World();
  open(w, PHONES.owner);
  w.alert(PHONES.owner, BIZ.harbour);
  w.photoDrafts.set(PHOTO, { location: BIZ.harbour, state: "draft", category: "INTERIOR" });
  await reviewGrowthTick(w.deps(), growthDb([dueRow()]));
  assertEquals(await say(w, PHONES.owner, "yes"), "which_one");
  assertEquals(lastTo(w, PHONES.owner).buttons.sort(), ["Photo: Harbour Lane", "Reply: Harbour Lane"].sort());
});
Deno.test("photo flow: a message that is not a kind of photo closes the menu and is handled as usual", async () => {
  const w = new World();
  open(w, PHONES.owner);
  w.photoDrafts.set(PHOTO, { location: BIZ.harbour, state: "draft", category: "INTERIOR" });
  await tap(w, PHONES.owner, `pe:${PHOTO}`);
  assertEquals(await say(w, PHONES.owner, "stats"), "stats");
  assertEquals(w.conversation(PHONES.owner).open_question, null);
});
Deno.test("the tick sends the other items when one fails, then reports the failure", async () => {
  const w = new World();
  open(w, PHONES.owner);
  const d = w.deps();
  const real = d.db.actionCreate;
  let n = 0;
  d.db.actionCreate = async (...a) => { if (n++ === 0) throw new Error("db down"); return real(...a); };
  const P2 = "22222222-2222-4222-8222-222222222222";
  w.photoDrafts.set(PHOTO, { location: BIZ.harbour, state: "draft", category: "INTERIOR" });
  w.photoDrafts.set(P2, { location: BIZ.harbour, state: "draft", category: "INTERIOR" });
  let threw = "";
  try { await reviewGrowthTick(d, growthDb([dueRow(), dueRow({ photo_id: P2 })])); } catch (e) { threw = (e as Error).message; }
  assertMatch(threw, /1 item\(s\) failed/);
  assertEquals(w.repliesTo(PHONES.owner).length, 1);
});
Deno.test("monthly question: after three days a message is just a message", async () => {
  const w = new World();
  open(w, PHONES.owner);
  await reviewGrowthTick(w.deps(), growthDb([], [{ location_id: BIZ.harbour, business: "Harbour Lane Coffee", user_id: USERS.owner, phone: PHONES.owner, month: "2026-10-01" }]));
  w.now += 4 * 86_400_000;
  open(w, PHONES.owner);
  assertEquals(await say(w, PHONES.owner, "stats"), "stats");
  assertEquals(w.calls.filter((c) => c.startsWith("post:")).length, 0);
});

// ─── voice notes
Deno.test("the mock transcriber reads only fixture notes; real audio gets not_configured", async () => {
  const t = mockTranscriber();
  assertEquals(await t.transcribe(new TextEncoder().encode(`${MOCK_MARKER}We are closed on Friday`), "audio/ogg"), { ok: true, text: "We are closed on Friday", language: null });
  assertEquals(await t.transcribe(new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0, 2, 3, 4, 5, 6, 7, 8]), "audio/ogg"), { ok: false, reason: "not_configured" });
});
Deno.test("the provider is the mock until the key is set, and the mock whenever VOICE_PROVIDER says so", () => {
  assertEquals(pickTranscriber({ key: null }).name, "mock");
  assertEquals(pickTranscriber({ key: "k" }).name, "elevenlabs");
  assertEquals(pickTranscriber({ key: "k", provider: "mock" }).name, "mock");
});
Deno.test("Scribe: one request with the key in a header, the model, no speaker labels, and only the text comes back", async () => {
  let seen: { url: string; key: string | null; model: string | null; diarize: string | null; type: string | null } | null = null;
  const fetcher = (async (url: string, init: RequestInit) => {
    const form = init.body as FormData;
    seen = { url, key: (init.headers as Record<string, string>)["xi-api-key"], model: form.get("model_id") as string, diarize: form.get("diarize") as string, type: (form.get("file") as File).type };
    return new Response(JSON.stringify({ language_code: "ar", language_probability: 0.9, text: " We are closed  Friday ", words: [{ text: "x" }] }), { status: 200 });
  }) as unknown as typeof fetch;
  const r = await scribe("secret", { fetcher }).transcribe(new Uint8Array([1, 2, 3]), "audio/ogg; codecs=opus");
  assertEquals(r, { ok: true, text: "We are closed Friday", language: "ar" });
  assertEquals(seen, { url: "https://api.elevenlabs.io/v1/speech-to-text", key: "secret", model: "scribe_v2", diarize: "false", type: "audio/ogg; codecs=opus" });
});
Deno.test("Scribe: refuses over 10 MB before sending, and a provider error or empty text is a plain failure", async () => {
  let calls = 0;
  const f = (status: number, body: unknown) => (async () => (calls++, new Response(JSON.stringify(body), { status }))) as unknown as typeof fetch;
  assertEquals(await scribe("k", { fetcher: f(200, {}) }).transcribe(new Uint8Array(VOICE_MAX_BYTES + 1), null), { ok: false, reason: "too_big" });
  assertEquals(calls, 0);
  assertEquals(await scribe("k", { fetcher: f(500, {}) }).transcribe(new Uint8Array(10), null), { ok: false, reason: "failed" });
  assertEquals(await scribe("k", { fetcher: f(200, { text: "  " }) }).transcribe(new Uint8Array(10), null), { ok: false, reason: "empty" });
  assertEquals(await scribe("k", { fetcher: (async () => { throw new Error("net"); }) as unknown as typeof fetch }).transcribe(new Uint8Array(10), null), { ok: false, reason: "failed" });
});
Deno.test("the voice echo is short and has no dash or exclamation mark", async () => {
  const { SAY } = await import("../whatsapp/say.ts");
  const e = SAY.voiceHeard("We open at ten \u2014 come in! ".repeat(20));
  assertNotMatch(e, BANNED);
  assert(e.length < 180);
});
Deno.test("the word error rate ignores case, punctuation and Arabic marks", () => {
  assertEquals(wer("We are closed on Friday.", "we are closed on friday"), 0);
  assertEquals(wer("one two three four", "one two three five"), 0.25);
  assertEquals(wer("مرحبا بكم", "مَرحبا بكم"), 0);
  assertEquals(wer("", ""), 0);
});
