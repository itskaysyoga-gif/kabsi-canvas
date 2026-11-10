// RB-F2: what Rashid's first phone test of the request book found (10 Nov 2026). His phone has Kabsi staff tools and owns
// four businesses (the three test businesses and Yawmiyati). Each case failed on the code before RB-F2. All on the fake
// world: no database, no Kapso, no model call. Customers are fictional.
import assert from "node:assert/strict";
import { receive } from "./agent.ts";
import { parseWebhook } from "./channel.ts";
import { createInput, getPack, nameCase } from "./book.ts";
import { msg, PHONES, USERS, World } from "./world.test-helpers.ts";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const SALON = id(11), GYM = id(12), GARAGE = id(13);
const ME = PHONES.rashid;
const tool = (t: string) => JSON.stringify({ tool: t, args: {}, lang: "en" });
const quotes = (fields: Record<string, string | null>) => JSON.stringify({ fields, said: { agreed: null, already_arranged: null } });
const BOOK = "Book sarah for highlights thursday afternoon";
// RB-F3: "agternoon" is now read as afternoon (one letter off); a word too far from any time word is still not read.
const TYPO = "Book sarah for highlights thursday aftrnn";

/** Rashid's phone as it was on 10 Nov: staff tools, Yawmiyati, and the three test businesses with the request book on. */
function phoneWorld(): World {
  const w = new World();
  w.biz.push(
    { id: SALON, name: "Kabsi Test Salon", tz: "Asia/Dubai", country: "AE", pro: false, members: { [USERS.rashid]: "owner" } },
    { id: GYM, name: "Kabsi Test Gym", tz: "Asia/Dubai", country: "AE", pro: false, members: { [USERS.rashid]: "owner" } },
    { id: GARAGE, name: "Kabsi Test Garage", tz: "Asia/Dubai", country: "AE", pro: false, members: { [USERS.rashid]: "owner" } },
  );
  w.bookSetting = "on";
  w.packs.set(SALON, { pack: "salon", version: 1, state: "test" });
  w.packs.set(GYM, { pack: "gym", version: 1, state: "test" });
  w.packs.set(GARAGE, { pack: "garage", version: 1, state: "test" });
  w.aiMap[BOOK] = tool("request_new");
  w.extractMap[BOOK] = quotes({ customer_name: "sarah", phone: null, service: "highlights", when: "thursday afternoon", stylist: null });
  w.aiMap[TYPO] = tool("request_new");
  w.extractMap[TYPO] = quotes({ customer_name: "sarah", phone: null, service: "highlights", when: "thursday aftrnn", stylist: null });
  return w;
}

const send = (w: World, o: Parameters<typeof msg>[2]) => receive(w.deps(), msg(w, ME, o));
const last = (w: World) => w.repliesTo(ME).at(-1)!;
const q = (w: World) => w.conversation(ME).open_question as { type: string } | null;
const lastIntake = (w: World) => [...w.intakes.values()].at(-1)!;
const HOUSE = /[‒-―!]/;

/** switch, My business, then the Salon by its number: the start of RB-F's script. */
async function toSalon(w: World) {
  assert.equal(await send(w, { text: "switch" }), "which_role");
  assert.equal(await send(w, { button: "r:business" }), "which_business");
  assert.equal(await send(w, { text: "3" }), "business_set");
}

// ─── a. "switch", then "My business", with more than one business: the numbered list at once.

Deno.test("a: switch, then My business, shows the numbered list of the four businesses; the number picks one", async () => {
  const w = phoneWorld();
  assert.equal(await send(w, { text: "switch" }), "which_role");
  assert.equal(last(w).body, "*❓ Business or staff tools?*");
  assert.deepEqual(last(w).buttons, ["My business", "Staff tools"]);
  assert.equal(await send(w, { button: "r:business" }), "which_business");
  assert.equal(last(w).body, "*❓ Which business?*\n\nTap Choose and pick one, or reply with its number.");
  assert.equal(last(w).kind, "list");
  assert.deepEqual(last(w).rows, ["1. Kabsi Test Garage", "2. Kabsi Test Gym", "3. Kabsi Test Salon", "4. Yawmiyati"]);
  assert.deepEqual(last(w).rowIds!.slice(0, 3), [`b:${GARAGE}`, `b:${GYM}`, `b:${SALON}`]);
  assert.equal(await send(w, { text: "3" }), "business_set");
  assert.match(last(w).body, /^\*✅ Switched\*\n\nYou are now working on Kabsi Test Salon\./);
  assert.equal(w.conversation(ME).active_location_id, SALON);
  // The second switch, after a business is active, lists them again rather than saying "your business".
  assert.equal(await send(w, { text: "switch" }), "which_role");
  assert.equal(await send(w, { button: "r:business" }), "which_business");
  assert.equal(w.conversation(ME).active_location_id, null);
  // Staff tools still answer as before.
  assert.equal(await send(w, { text: "switch" }), "which_role");
  assert.equal(await send(w, { button: "r:staff" }), "role_set");
  assert.match(last(w).body, /Kabsi staff tools/);
});

Deno.test("a: a phone with staff tools and one business: My business after switch says which business, with no list", async () => {
  const w = new World();
  assert.equal(await send(w, { text: "switch" }), "which_role");
  assert.equal(await send(w, { button: "r:business" }), "role_set");
  assert.match(last(w).body, /^\*✅ Switched\*\n\nYou are now working on your business\./);
});

// ─── b. A business-or-staff question, or "Which business?", never captures a later message.

Deno.test("b: a new request while the role question is open closes it; an old My business tap then leaves the proposal open", async () => {
  const w = phoneWorld();
  await toSalon(w);
  assert.equal(await send(w, { text: "switch" }), "which_role");
  // Instead of answering, a new request: it is handled at once for the Salon, still active, and the role question is gone.
  assert.equal(await send(w, { text: BOOK }), "request_proposed");
  assert.equal(q(w)!.type, "rb_proposal");
  // The old "My business" button: it re-runs nothing and does not close the proposal.
  assert.notEqual(await send(w, { button: "r:business" }), "request_proposed");
  assert.equal(q(w)!.type, "rb_proposal");
  assert.equal(await send(w, { text: "Save" }), "request_saved");
  assert.equal(w.requests.length, 1);
});

Deno.test("b: once the business is chosen the question is closed: a later number is a request number, never a business", async () => {
  const w = phoneWorld();
  assert.equal(await send(w, { text: "switch" }), "which_role");
  assert.equal(await send(w, { button: "r:business" }), "which_business");
  assert.equal(await send(w, { text: "3" }), "business_set");
  assert.equal(q(w), null);
  assert.notEqual(await send(w, { text: "1" }), "business_set");
  assert.equal(w.conversation(ME).active_location_id, SALON);
});

Deno.test("b: a Which business question with a held request: another message closes it, and the old number no longer re-runs it", async () => {
  const w = phoneWorld();
  assert.equal(await send(w, { text: "switch" }), "which_role");
  assert.equal(await send(w, { button: "r:business" }), "which_business");
  // A request before the pick is held for after it.
  assert.equal(await send(w, { text: BOOK }), "which_business");
  assert.equal(q(w)!.type, "business");
  // "stats" is not an answer: the held request is dropped and stats is asked for its business.
  assert.equal(await send(w, { text: "stats" }), "which_business");
  assert.equal(await send(w, { text: "4" }), "stats");
  assert.equal(w.intakes.size, 0);
});

Deno.test("d: the role and business questions close after 10 minutes, so a late tap or number runs nothing held", async () => {
  const w = phoneWorld();
  await toSalon(w);
  // The role question after a message that needed it: older than 10 minutes, a tap runs nothing held.
  assert.equal(await send(w, { text: "switch" }), "which_role");
  w.now += 11 * 60_000;
  assert.equal(await send(w, { text: BOOK }), "request_proposed");
  assert.equal(q(w)!.type, "rb_proposal");

  const v = phoneWorld();
  assert.equal(await send(v, { text: "switch" }), "which_role");
  assert.equal(await send(v, { button: "r:business" }), "which_business");
  assert.equal(await send(v, { text: BOOK }), "which_business");
  v.now += 11 * 60_000;
  // Eleven minutes on, "3" is not taken as the business for the held request.
  assert.notEqual(await send(v, { text: "3" }), "request_proposed");
  assert.equal(v.intakes.size, 0);
  // The held request is gone: whatever is asked now is about "3" itself, never the old request.
  assert.notEqual((q(v) as { pending?: string } | null)?.pending, BOOK);
  // And the phone still gets an answer to the next message.
  assert.equal(await send(v, { text: "switch" }), "which_role");
});

Deno.test("d: a role or business question saved before RB-F2 (no time on it) is closed, never left to capture messages", async () => {
  const w = phoneWorld();
  await toSalon(w);
  w.conversation(ME).open_question = { type: "role", pending: "", options: ["business", "staff"] };
  assert.equal(await send(w, { text: BOOK }), "request_proposed");
  w.conversation(ME).open_question = { type: "business", pending: "stats", options: [{ id: SALON, name: "Kabsi Test Salon" }] };
  assert.notEqual(await send(w, { text: "1" }), "stats");
});

// ─── c. While a proposal waits, a typed Save, Yes or ok saves it; a typed Change asks what to change.

for (const word of ["Save", "save.", "Yes", "ok", "OK"]) {
  Deno.test(`c: a typed "${word}" while the proposal waits saves it, the same as tapping Save`, async () => {
    const w = phoneWorld();
    await toSalon(w);
    assert.equal(await send(w, { text: BOOK }), "request_proposed");
    assert.equal(await send(w, { text: word }), "request_saved");
    assert.equal(w.requests.length, 1);
    assert.deepEqual(last(w).buttons, ["Undo"]);
    assert.equal(q(w), null);
    // The old Save button afterwards: already handled, no second request.
    assert.equal(await send(w, { button: `rs:${lastIntake(w).id}` }), "request_already_saved");
    assert.equal(w.requests.length, 1);
  });
}

Deno.test("c: Save typed as a reply that quotes the proposal (Kapso's payload with a reply context) saves it", async () => {
  const w = phoneWorld();
  await toSalon(w);
  assert.equal(await send(w, { text: BOOK }), "request_proposed");
  const parsed = parseWebhook("whatsapp.message.received", {
    message: { id: "wamid.quoted.save", timestamp: String(w.now / 1000), type: "text", text: { body: "Save" }, context: { id: "wamid.out.proposal", from: "12057456874" }, kapso: { direction: "inbound" } },
    conversation: { phone_number: ME, phone_number_id: "PNID" }, phone_number_id: "PNID",
  }).messages[0];
  assert.equal(parsed.forwarded, false);
  assert.equal(await send(w, { text: parsed.text!, id: parsed.messageId }), "request_saved");
  assert.equal(w.requests.length, 1);
});

Deno.test("c: a typed Change asks what to change and keeps the proposal open; a forwarded Save saves nothing", async () => {
  const w = phoneWorld();
  await toSalon(w);
  assert.equal(await send(w, { text: BOOK }), "request_proposed");
  assert.equal(await send(w, { text: "Change" }), "request_change");
  assert.equal(q(w)!.type, "rb_proposal");
  assert.equal(w.requests.length, 0);
  assert.notEqual(await send(w, { text: "Save", forwarded: true }), "request_saved");
  assert.equal(w.requests.length, 0);
  assert.equal(await send(w, { text: "save it" }), "request_saved");
});

Deno.test("c: Save typed with no proposal waiting keeps today's meaning and saves nothing", async () => {
  const w = phoneWorld();
  await toSalon(w);
  assert.notEqual(await send(w, { text: "Save" }), "request_saved");
  assert.equal(w.requests.length, 0);
});

// ─── e. Names start with a capital; a time the reader understood is shown clean; one it did not is asked about.

Deno.test("e: sarah is shown and saved as Sarah; thursday afternoon as Thursday afternoon, no time set", async () => {
  const w = phoneWorld();
  await toSalon(w);
  assert.equal(await send(w, { text: BOOK }), "request_proposed");
  const p = last(w).body;
  assert.match(p, /Name: Sarah\n/);
  assert.match(p, /When: Thursday afternoon, no time set$/);
  assert.equal(last(w).footer, "Nothing is saved until you tap Save.");
  assert.doesNotMatch(p, /sarah|thursday/);
  assert.equal(await send(w, { button: `rs:${lastIntake(w).id}` }), "request_saved");
  assert.equal(w.requests[0].customer_name, "Sarah");
  // Saved with its date, so a list next week still names the right day (review finding 1).
  assert.equal(w.requests[0].requested_window_text, "Thu 29 Oct afternoon");
  assert.equal(w.requests[0].starts_at, null);
  assert.match(last(w).body, /Appointment 1 saved\* · Kabsi Test Salon\n\nSarah\nHighlights\nThu 29 Oct afternoon, no time set\nStatus: Requested\n/);
  for (const s of w.repliesTo(ME)) assert.doesNotMatch(s.body, HOUSE);
});

Deno.test("e: thursday aftrnn is not read: the proposal asks which day and time and never shows it as understood", async () => {
  const w = phoneWorld();
  await toSalon(w);
  assert.equal(await send(w, { text: TYPO }), "request_proposed");
  const p = last(w).body;
  assert.match(p, /When: not clear, you wrote "thursday aftrnn"\n/);
  assert.match(p, /Which day and time did you mean\? Send it again, for example Thursday afternoon\./);
  assert.doesNotMatch(p, /aftrnn, no time set/);
  // Saved anyway: the words are kept marked as written, never as a time that was read.
  assert.equal(await send(w, { text: "Save" }), "request_saved");
  assert.equal(w.requests[0].requested_window_text, "\"thursday aftrnn\" (as written)");
  assert.match(last(w).body, /"thursday aftrnn" \(as written\), no time set/);
});

Deno.test("e: nameCase capitalises lower-case words only", () => {
  assert.equal(nameCase("sarah"), "Sarah");
  assert.equal(nameCase("sarah al-hassan"), "Sarah Al-Hassan");
  assert.equal(nameCase("o'neil"), "O'Neil");
  assert.equal(nameCase("sarah's"), "Sarah's");
  assert.equal(nameCase("james\u2019s mum"), "James\u2019s Mum");
  assert.equal(nameCase("McKay"), "McKay");
  assert.equal(nameCase("DJ"), "DJ");
  assert.equal(nameCase("ليلى"), "ليلى");
  // A proposal saved before RB-F2, with the name in lower case, is still saved with a capital.
  const built = createInput(getPack("salon", 1)!, { customer_name: { kind: "stated", normalized: "sarah" }, service: { kind: "stated", normalized: { text: "highlights", services: ["highlights"] } } }, id(500));
  assert.ok(built.ok);
  assert.equal(built.ok && built.input.customer_name, "Sarah");
});

// ─── The independent review's confirmed findings.

Deno.test("review: an old Staff tools tap closes a waiting proposal, so a typed yes or Save never saves it from staff tools", async () => {
  const w = phoneWorld();
  await toSalon(w);
  assert.equal(await send(w, { text: BOOK }), "request_proposed");
  assert.equal(await send(w, { button: "r:staff" }), "role_set");
  assert.equal(q(w), null);
  assert.notEqual(await send(w, { text: "Save" }), "request_saved");
  assert.notEqual(await send(w, { text: "yes" }), "request_saved");
  assert.equal(w.requests.length, 0);
});

Deno.test("review: a typed Save while another business is active does not save the draft there; it asks for the tap", async () => {
  const w = phoneWorld();
  await toSalon(w);
  assert.equal(await send(w, { text: BOOK }), "request_proposed");
  // An old business button for the Gym: the Salon's draft stays open, the Gym is active.
  assert.equal(await send(w, { button: `b:${GYM}` }), "business_set");
  assert.equal(await send(w, { text: "Save" }), "request_yes_tap_save");
  assert.equal(w.requests.length, 0);
  // Its own Save button still works.
  assert.equal(await send(w, { button: `rs:${lastIntake(w).id}` }), "request_saved");
});

Deno.test("review: a pick more than 10 minutes late says the question closed, never drops the held message in silence", async () => {
  const w = phoneWorld();
  assert.equal(await send(w, { text: "switch" }), "which_role");
  assert.equal(await send(w, { button: "r:business" }), "which_business");
  assert.equal(await send(w, { text: BOOK }), "which_business");
  w.now += 11 * 60_000;
  assert.equal(await send(w, { text: "3" }), "pick_closed");
  assert.match(last(w).body, /^\*❓ Question closed\*\n\nIt was asked more than 10 minutes ago, so I did not use your answer\.\n\nPlease send your message again\./u);
  assert.equal(q(w), null);
  // A late tap on a role question asked by switch says the same.
  assert.equal(await send(w, { text: "switch" }), "which_role");
  w.now += 11 * 60_000;
  assert.equal(await send(w, { button: "r:business" }), "pick_closed");
});
