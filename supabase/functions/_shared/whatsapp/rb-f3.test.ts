// RB-F3 (R-148): what Rashid's retest of 10 Nov 2026 found, and lane R's six decisions. His phone has Kabsi staff tools
// and four businesses (the three test businesses, demo, and Yawmiyati). Every case failed on the code before RB-F3 (the
// unit cases of the typo reader did not exist). All on the fake world: no database, no Kapso, no model call beyond the
// fakes. Customers are fictional. World time: Monday 26 Oct 2026, 19:00 in Dubai.
import assert from "node:assert/strict";
import { receive } from "./agent.ts";
import { editDistance, getPack, markOf, MARK, near, normalizeVocabulary, normalizeWhen } from "./book.ts";
import { fromText, render } from "./look.ts";
const styleReply = (body: string, mark: string, business: string | null) => render(fromText(body, mark, business));
import { isOffTopic } from "./router.ts";
import { msg, PHONES, USERS, World } from "./world.test-helpers.ts";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const SALON = id(11), GYM = id(12), GARAGE = id(13);
const ME = PHONES.rashid;
const tool = (t: string) => JSON.stringify({ tool: t, args: {}, lang: "en" });
const quotes = (fields: Record<string, string | null>) => JSON.stringify({ fields, said: { agreed: null, already_arranged: null } });
const salon = (name: string | null, service: string | null, when: string | null) => quotes({ customer_name: name, phone: null, service, when, stylist: null });
const DUBAI = { now: new Date(Date.UTC(2026, 9, 26, 15, 0, 0)), timeZone: "Asia/Dubai" };
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
/** The button ids of the last reply to this phone, as the outbox holds them. */
const lastIds = (w: World) => ((w.outbox.filter((o) => o.phone === ME).at(-1)?.buttons ?? []) as { id: string }[]).map((b) => b.id);
/** Says a request message and what the extraction model quotes from it. */
function says(w: World, text: string, q: string, viaRouter = true) {
  if (viaRouter) w.aiMap[text] = tool("request_new");
  w.extractMap[text] = q;
}
async function toSalon(w: World) {
  assert.equal(await send(w, { text: "switch" }), "which_role");
  assert.equal(await send(w, { button: "r:business" }), "which_business");
  assert.equal(await send(w, { text: "3" }), "business_set");
}

// ─── 1. Typos (R-148 item 1).

Deno.test("typos: the retest message reads Highlights and Thursday afternoon, in their clean form", async () => {
  const w = phoneWorld();
  await toSalon(w);
  const text = "Book sarah for highlightss thrsday afternoon";
  says(w, text, salon("sarah", "highlightss", "thrsday afternoon"));
  assert.equal(await send(w, { text }), "request_proposed");
  const p = last(w).body;
  assert.match(p, /Name: Sarah\nService: Highlights\nWhen: Thursday afternoon, no time set\n/);
  assert.doesNotMatch(p, /not clear|highlightss/);
  assert.deepEqual(last(w).buttons, ["Save", "Change"]);
  assert.equal(await send(w, { button: `rs:${lastIntake(w).id}` }), "request_saved");
  assert.equal(w.requests[0].summary, "Highlights");
  assert.equal(w.requests[0].requested_window_text, "Thu 29 Oct afternoon");
});

Deno.test("typos: tmrw and manicur read as Tomorrow and Manicure; tomoro and agternoon too", async () => {
  const w = phoneWorld();
  await toSalon(w);
  says(w, "Lina manicur tmrw agternoon", salon("Lina", "manicur", "tmrw agternoon"));
  assert.equal(await send(w, { text: "Lina manicur tmrw agternoon" }), "request_proposed");
  assert.match(last(w).body, /Service: Manicure\nWhen: Tomorrow afternoon, no time set/);
  const r = normalizeWhen("Maya tomoro morning", { ...DUBAI, typosIn: { start: 5, end: 19 } });
  assert.equal(r.status === "ok" && r.date, "2026-10-27");
  assert.equal(r.status === "ok" && r.raw, "tomoro morning");
});

Deno.test("typos: two equally near days ask with buttons; nothing near keeps the words as written", async () => {
  const w = phoneWorld();
  await toSalon(w);
  // "thuesday" is one letter from Thursday and one from Tuesday: both readings are buttons, nothing is chosen.
  says(w, "Rana trim thuesday 3pm", salon("Rana", "trim", "thuesday 3pm"));
  assert.equal(await send(w, { text: "Rana trim thuesday 3pm" }), "request_proposed");
  assert.match(last(w).body, /Which time did you mean\?/);
  assert.equal(last(w).buttons.length, 2);
  // Tuesday is tomorrow in the fake world (Monday 26 Oct).
  assert.ok(last(w).buttons.some((b) => /^Tomorrow 15:00/.test(b)) && last(w).buttons.some((b) => /^Thu 29 Oct 15:00/.test(b)));
  // A word no service is near stays the owner's words; nothing is invented.
  says(w, "Dina zzumba thursday", salon("Dina", "zzumba", "thursday"));
  await send(w, { button: `rc:${lastIntake(w).id}` });
  w.conversation(ME).open_question = null;
  assert.equal(await send(w, { text: "Dina zzumba thursday" }), "request_proposed");
  assert.match(last(w).body, /Service: zzumba\n/);
});

Deno.test("typos: the rules keep names and everyday words as they are", () => {
  assert.equal(editDistance("thrsday", "thursday"), 1);
  assert.equal(editDistance("thrusday", "thursday"), 1);
  assert.equal(near("highlightss", "highlights"), 1);
  // Under 5 letters known, a different first letter, or too many edits: no match.
  assert.equal(near("jane", "june"), null);
  assert.equal(near("moving", "morning"), null);
  assert.equal(near("bfriday", "friday"), null);
  assert.equal(near("aftrnn", "afternoon"), null);
  // "Jane" and "match" are not read as a month; a name beside a real day leaves that day as read.
  const r = normalizeWhen("Book Jane for a match friday", { ...DUBAI, typosIn: { start: 0, end: 28 } });
  assert.equal(r.status === "ok" && r.raw, "friday");
  // Review: a name outside the words quoted for when is never read as a day ("Sundar", "Frida"), so no time is invented.
  const s1 = normalizeWhen("Sundar on friday at 2pm", { ...DUBAI, typosIn: { start: 7, end: 23 } });
  assert.equal(s1.status === "ok" && s1.date, "2026-10-30");
  const s2 = normalizeWhen("frida at 3pm", { ...DUBAI, typosIn: { start: 6, end: 12 } });
  assert.equal(s2.status === "ok" && s2.date, null);
  // Without the quoted range nothing is corrected at all.
  assert.equal(normalizeWhen("thrsday afternoon", DUBAI).status === "ok" && (normalizeWhen("thrsday afternoon", DUBAI) as { date: string | null }).date, null);
  // Review: everyday words near a service are not read as one ("message" is not massage, "brown" is not brows).
  const m = normalizeVocabulary("she left a message for a cut", getPack("salon", 1)!);
  assert.deepEqual(m.status === "ok" && m.matches.map((x) => x.label), ["Haircut"]);
  const b = normalizeVocabulary("brown colour", getPack("salon", 1)!);
  assert.deepEqual(b.status === "ok" && b.matches.map((x) => x.label), ["Colour"]);
  // A service tie (a pack where one typo is as near two services) is returned as a tie, never chosen.
  const tie = normalizeVocabulary("shampox", { services: [
    { key: "a", label: "Shampoo", spellings: ["shampoo"] }, { key: "b", label: "Shampoa", spellings: ["shampoa"] },
  ] });
  assert.equal(tie.status, "ok");
  assert.equal(tie.status === "ok" && tie.ties?.[0]?.candidates.length, 2);
  assert.equal(tie.status === "ok" && tie.matches.length, 0);
  const hit = normalizeVocabulary("highlightss", getPack("salon", 1)!);
  assert.equal(hit.status === "ok" && hit.matches[0]?.label, "Highlights");
});

Deno.test("typos: the business's own past service is matched too, and shown in its clean form", async () => {
  const w = phoneWorld();
  await toSalon(w);
  says(w, "Nour keratin smoothing friday", salon("Nour", "keratin smoothing", "friday"));
  // The pack knows keratin as a hair treatment; a past request saved as the business's own words makes its own service.
  w.requests.push({ id: id(901), location: SALON, number: 9, kind: "appointment", status: "requested", summary: "Scalp detox", customer_name: "Hiba", phones: [],
    requested_window_text: null, starts_at: null, intake_id: null, by: USERS.rashid, created_at: new Date(w.now).toISOString() });
  says(w, "Nour scalp detx friday", salon("Nour", "scalp detx", "friday"));
  assert.equal(await send(w, { text: "Nour scalp detx friday" }), "request_proposed");
  assert.match(last(w).body, /Service: Scalp detox\n/);
  assert.equal(await send(w, { text: "Save" }), "request_saved");
  assert.equal(w.requests.at(-1)!.summary, "Scalp detox");
});

// ─── The retest's revisions: a second message changes only what it gives.

Deno.test("revise: Change, then Highlights thursday afternoon, reads the new time (it was not clear on the joined text)", async () => {
  const w = phoneWorld();
  await toSalon(w);
  says(w, "Book sarah for highlightss thrsday afternoon", salon("sarah", "highlightss", "thrsday afternoon"));
  await send(w, { text: "Book sarah for highlightss thrsday afternoon" });
  assert.equal(await send(w, { button: `rc:${lastIntake(w).id}` }), "request_change");
  says(w, "Highlights thursday afternoon", salon(null, "Highlights", "thursday afternoon"));
  assert.equal(await send(w, { text: "Highlights thursday afternoon" }), "request_revised");
  assert.match(last(w).body, /Name: Sarah\nService: Highlights\nWhen: Thursday afternoon, no time set\n/);
  assert.equal(w.intakes.size, 1);
  assert.equal(lastIntake(w).raw, "Book sarah for highlightss thrsday afternoon\nHighlights thursday afternoon");
});

Deno.test("revise: Manicure friday agternoon, then friday 5pm, then Lina keeps the time (it was lost)", async () => {
  const w = phoneWorld();
  await toSalon(w);
  says(w, "Manicure friday agternoon", salon(null, "Manicure", "friday agternoon"));
  assert.equal(await send(w, { text: "Manicure friday agternoon" }), "request_proposed");
  assert.match(last(w).body, /Still needed: Name/);
  says(w, "friday 5pm", salon(null, null, "friday 5pm"));
  assert.equal(await send(w, { text: "friday 5pm" }), "request_revised");
  assert.match(last(w).body, /When: Fri 30 Oct 17:00/);
  says(w, "Lina", salon("Lina", null, null));
  assert.equal(await send(w, { text: "Lina" }), "request_revised");
  assert.match(last(w).body, /Name: Lina\nService: Manicure\nWhen: Fri 30 Oct 17:00\n/);
  assert.equal(await send(w, { text: "Save" }), "request_saved");
  assert.equal(w.requests[0].starts_at, "2026-10-30T13:00:00.000Z");
});

// ─── 2. Duplicates (R-148 item 2).

async function sarahSaved(w: World) {
  await toSalon(w);
  says(w, "Book Sarah for highlights thursday afternoon", salon("Sarah", "highlights", "thursday afternoon"));
  await send(w, { text: "Book Sarah for highlights thursday afternoon" });
  assert.equal(await send(w, { text: "Save" }), "request_saved");
}

Deno.test("duplicates: the same name, kind and service open within 7 days asks Update #1 or add a new one", async () => {
  const w = phoneWorld();
  await sarahSaved(w);
  says(w, "sarah highlights friday afternoon", salon("sarah", "highlights", "friday afternoon"));
  assert.equal(await send(w, { text: "sarah highlights friday afternoon" }), "request_duplicate");
  assert.equal(last(w).body, "*Sarah already has \u{1F4C5} #1, Highlights, Thu 29 Oct afternoon* · Kabsi Test Salon\nUpdate #1 or add a new one?");
  assert.deepEqual(last(w).buttons, ["Update #1", "Add new"]);
  assert.equal(w.requests.length, 1);
  // Update #1: the new time goes on #1, the draft is dropped, Undo is offered; no second Sarah.
  const intake = lastIntake(w);
  const update = lastIds(w)[0]!;
  assert.match(update, new RegExp(`^rdu:${intake.id}:[a-z0-9]{8}$`));
  assert.equal(await send(w, { button: update }), "request_updated");
  assert.equal(w.requests.length, 1);
  assert.equal(w.requests[0].requested_window_text, "Fri 30 Oct afternoon");
  assert.match(last(w).body, /^\*✅ Appointment 1 corrected\* · Kabsi Test Salon\nwhen changed from Thu 29 Oct afternoon to Fri 30 Oct afternoon\./u);
  assert.deepEqual(last(w).buttons, ["Undo"]);
  assert.equal(intake.state, "discarded");
  assert.equal(w.conversation(ME).open_question, null);
});

Deno.test("duplicates (review): an old Update tap after the draft changed to another name updates nothing", async () => {
  const w = phoneWorld();
  await sarahSaved(w);
  says(w, "sarah highlights friday afternoon", salon("sarah", "highlights", "friday afternoon"));
  assert.equal(await send(w, { text: "sarah highlights friday afternoon" }), "request_duplicate");
  const update = lastIds(w)[0]!;
  says(w, "actually Lina", salon("Lina", null, null));
  assert.equal(await send(w, { text: "actually Lina" }), "request_revised");
  assert.equal(await send(w, { button: update }), "request_update_closed");
  assert.equal(w.requests[0].requested_window_text, "Thu 29 Oct afternoon");
  // A made-up nonce for the same draft does nothing either.
  assert.equal(await send(w, { button: `rdu:${lastIntake(w).id}:abcdefgh` }), "request_update_closed");
});

Deno.test("duplicates: Add new saves a second one; another service, a closed one or one older than 7 days asks nothing", async () => {
  const w = phoneWorld();
  await sarahSaved(w);
  says(w, "Sarah highlights saturday", salon("Sarah", "highlights", "saturday"));
  assert.equal(await send(w, { text: "Sarah highlights saturday" }), "request_duplicate");
  assert.equal(await send(w, { button: `rs:${lastIntake(w).id}` }), "request_saved");
  assert.equal(w.requests.length, 2);
  // Another service: a normal proposal.
  says(w, "Sarah manicure saturday", salon("Sarah", "manicure", "saturday"));
  assert.equal(await send(w, { text: "Sarah manicure saturday" }), "request_proposed");
  await send(w, { button: `rc:${lastIntake(w).id}` });
  w.conversation(ME).open_question = null;
  // Both Sarah highlights closed or older than 7 days: a normal proposal.
  w.requests[0].status = "closed";
  w.requests[0].outcome = "cancelled";
  w.requests[1].created_at = new Date(w.now - 8 * 86_400_000).toISOString();
  says(w, "Sarah highlights sunday", salon("Sarah", "highlights", "sunday"));
  assert.equal(await send(w, { text: "Sarah highlights sunday" }), "request_proposed");
});

// ─── 3. How replies look (R-148 item 3).

Deno.test("style: a bold first line with one marker; the business only when the phone has several; never (owner)", async () => {
  const w = phoneWorld();
  await toSalon(w);
  says(w, "Book Sarah for highlights thursday afternoon", salon("Sarah", "highlights", "thursday afternoon"));
  await send(w, { text: "Book Sarah for highlights thursday afternoon" });
  assert.equal(last(w).body, "*\u{1F4C5} New appointment* · Kabsi Test Salon\nName: Sarah\nService: Highlights\nWhen: Thursday afternoon, no time set\nNothing is saved until you tap Save.");
  await send(w, { text: "Save" });
  assert.match(last(w).body, /^\*✅ Appointment 1 saved\* · Kabsi Test Salon\n#1 Sarah · Highlights · Thu 29 Oct afternoon, no time set · Requested/u);
  await send(w, { button: lastIds(w)[0]! });
  assert.match(last(w).body, /^\*↩️ Undone\* · Kabsi Test Salon\n/u);
  for (const s of w.repliesTo(ME)) {
    assert.doesNotMatch(s.body, /\(owner\)/);
    assert.doesNotMatch(s.body, HOUSE);
  }
  // A phone with one business: no business name in the first line.
  assert.equal(styleReply("Appointment 2 saved.\n#2 Sarah", markOf("request_saved", "appointment"), null), "*✅ Appointment 2 saved*\n#2 Sarah");
  assert.equal(markOf("request_proposed", "job"), MARK.job);
  assert.equal(markOf("request_proposed", "enquiry"), MARK.enquiry);
  assert.equal(markOf("request_confirm_guess", "appointment"), MARK.confirm);
  assert.equal(markOf("request_open", "appointment"), MARK.list);
  assert.equal(markOf("request_status_ask", "job"), MARK.ask);
});

Deno.test("style: switch and help in the new look", async () => {
  const w = phoneWorld();
  assert.equal(await send(w, { text: "switch" }), "which_role");
  assert.equal(last(w).body, "*❓ Your business or Kabsi staff tools?*");
  await send(w, { button: "r:business" });
  assert.match(last(w).body, /^\*❓ Which business\?\*\nReply with the number\.\n1\. Kabsi Test Garage/u);
  await send(w, { text: "3" });
  assert.equal(last(w).body, "*✅ Done*\nYou are now working on Kabsi Test Salon. Send \"switch\" to change it.");
  assert.equal(await send(w, { text: "help" }), "help");
  assert.match(last(w).body, /^\*\u{1F4CB} You can send\* · Kabsi Test Salon\n"stats"/u);
});

// ─── 4. reset test (R-148 item 4).

Deno.test("reset test: staff only, asks with Confirm, then voids only this phone's open requests at the demo businesses", async () => {
  const w = phoneWorld();
  await sarahSaved(w);
  const iso = new Date(w.now).toISOString();
  // Someone else's request at the demo salon, and Rashid's own at Yawmiyati (not a demo): both stay.
  w.requests.push({ id: id(902), location: SALON, number: 2, kind: "appointment", status: "requested", summary: "Haircut", customer_name: "Maya", phones: [],
    requested_window_text: null, starts_at: null, intake_id: null, by: USERS.owner, created_at: iso });
  w.requests.push({ id: id(903), location: id(5), number: 1, kind: "appointment", status: "requested", summary: "Facial", customer_name: "Dina", phones: [],
    requested_window_text: null, starts_at: null, intake_id: null, by: USERS.rashid, created_at: iso });
  assert.equal(await send(w, { text: "reset test" }), "reset_ask");
  assert.match(last(w).body, /^\*❓ Reset test\?\*\nThis removes the 1 open request you made at 1 test business\. Nothing else changes\. Tap Confirm to go ahead\./u);
  assert.equal(last(w).buttons[0], "Confirm");
  assert.equal(w.requests[0].status, "requested", "nothing changes before the tap");
  const button = lastIds(w)[0]!;
  assert.equal(await send(w, { button }), "reset_done");
  assert.match(last(w).body, /^\*✅ Test reset\*\n1 request was removed at the test businesses\./u);
  assert.equal(w.requests[0].outcome, "voided");
  assert.equal(w.requests[1].status, "requested");
  assert.equal(w.requests[2].status, "requested");
  // The same Confirm again changes nothing.
  assert.equal(await send(w, { button }), "reset_closed");
});

Deno.test("reset test: refused to a phone that is not Kabsi staff; an old Confirm after 10 minutes does nothing", async () => {
  const w = phoneWorld();
  assert.equal(await receive(w.deps(), msg(w, PHONES.owner, { text: "reset test" })), "reset_refused");
  assert.match(w.repliesTo(PHONES.owner).at(-1)!.body, /Reset test is for Kabsi staff only\*\nNothing was changed\./);
  assert.ok(!w.calls.some((c) => c.startsWith("reset_test")));
  await sarahSaved(w);
  assert.equal(await send(w, { text: "reset test" }), "reset_ask");
  const button = lastIds(w)[0]!;
  w.now += 11 * 60_000;
  assert.equal(await send(w, { button }), "reset_closed");
  assert.equal(w.requests[0].status, "requested");
});

// ─── 5. Off-topic (R-148 item 5).

Deno.test("off topic: a general assistant ask gets the fixed line and no model call; an unclear message never gets a model's words", async () => {
  const w = new World();
  const before = w.aiCalls;
  assert.equal(await receive(w.deps(), msg(w, PHONES.owner, { text: "write me a poem about the sea" })), "off_topic");
  assert.equal(w.aiCalls, before, "no model call");
  const body = w.repliesTo(PHONES.owner).at(-1)!.body;
  assert.match(body, /Kabsi looks after your business on Google: review replies, your listing, photos and posts\. Send "help" to see what you can send\./);
  assert.equal(await receive(w.deps(), msg(w, PHONES.owner, { text: "the thing from before" })), "off_topic");
  assert.doesNotMatch(w.repliesTo(PHONES.owner).at(-1)!.body, /Do you mean/);
  assert.equal(isOffTopic("what's the weather tomorrow"), true);
  assert.equal(isOffTopic("translate this to French"), true);
  // Kabsi's own jobs are never caught.
  assert.equal(isOffTopic("write a post about our new menu"), false);
  assert.equal(isOffTopic("write a reply to the last review"), false);
  assert.equal(isOffTopic("Book Sarah for highlights"), false);
});
