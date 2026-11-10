// RB-F: update, confirm, convert, correct, Undo and what's open on WhatsApp. Every allowed and refused command, skipped
// steps asked first with their flag and no event invented, conversion with the enquiry's timeline untouched, confirmation
// cleared by a time change, Undo's limits, the role limits, and isolation between the three test businesses. All on the
// fake world: no database, no Kapso, no model call. Customers are fictional.
import assert from "node:assert/strict";
import { receive } from "./agent.ts";
import { correction, packOf, parseBookCommand, readWhen, saysArrived, sinceDay } from "./book.ts";
import { msg, PHONES, World } from "./world.test-helpers.ts";
import { parseWebhook } from "./channel.ts";

const salonV1 = packOf("salon"), gymV1 = packOf("gym"), garageV1 = packOf("garage");
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const SALON = id(11), GYM = id(12), GARAGE = id(13);
const TEST_USER = id(109);
const TEST = "+12125550160";
// Never in a reply: a dash, an exclamation mark, or a claim that Kabsi booked, checked or found someone available.
const HOUSE = /[‒-―!]|\bbooked\b|\bavailable\b|\bchecked\b|\bverified\b/i;

function world(o: { which?: string[]; role?: "owner" | "manager" | "staff" } = {}): World {
  const w = new World();
  const which = o.which ?? [SALON];
  const role = o.role ?? "owner";
  const m = (b: string) => (which.includes(b) ? { [TEST_USER]: role } : {});
  w.biz.push(
    { id: SALON, name: "Kabsi Test Salon", tz: "Asia/Dubai", country: "AE", pro: false, members: m(SALON) },
    { id: GYM, name: "Kabsi Test Gym", tz: "Asia/Dubai", country: "AE", pro: false, members: m(GYM) },
    { id: GARAGE, name: "Kabsi Test Garage", tz: "Asia/Dubai", country: "AE", pro: false, members: m(GARAGE) },
  );
  w.users.push({ id: TEST_USER, phone: TEST, optin: "active" });
  w.bookSetting = "on";
  w.packs.set(SALON, { pack: "salon", version: 1, state: "test" });
  w.packs.set(GYM, { pack: "gym", version: 1, state: "test" });
  w.packs.set(GARAGE, { pack: "garage", version: 1, state: "test" });
  return w;
}

let k = 0;
/** A request made the way Save makes it, by the test owner (or `by`), so it has its created activity. */
async function make(w: World, loc: string, input: Record<string, unknown>, by = TEST_USER) {
  const r = await w.bookDb().create(loc, by, `seed:${++k}`, { entry_method: "typed", ...input });
  assert.equal(r.ok, true, JSON.stringify(r));
  return w.requests.find((x) => x.id === r.request_id)!;
}
const sarah = (w: World) => make(w, SALON, { kind: "appointment", customer_name: "Sarah", summary: "Highlights", requested_window_text: "Thursday afternoon" });
const ali = (w: World, details: Record<string, unknown> = { car: "Toyota Corolla" }) =>
  make(w, GARAGE, { kind: "job", customer_name: "Ali", summary: "Brakes", details });
const maya = (w: World) => make(w, GYM, { kind: "enquiry", customer_name: "Maya", summary: "Trial" });

const send = (w: World, o: Parameters<typeof msg>[2], from = TEST) => receive(w.deps(), msg(w, from, o));
const last = (w: World, phone = TEST) => w.repliesTo(phone).at(-1)!;
/** The button ids of the last reply to this phone, from the outbox. */
const ids = (w: World, phone = TEST) => (w.outbox.filter((r) => r.phone === phone).at(-1)!.buttons as { id: string; title: string }[]).map((b) => b.id);
const acts = (w: World, request: string) => w.activities.filter((a) => a.request === request);
const clean = (w: World) => w.repliesTo(TEST).forEach((r) => assert.doesNotMatch(r.body, HOUSE, r.body));

// --- The command reader: code only, no model.

Deno.test("reader: status words from the pack and everyday words, by number or by name, several in one message", () => {
  assert.deepEqual(parseBookCommand("1 here", garageV1), { k: "status", items: [{ target: { number: 1 }, keys: ["active", "attended"] }] });
  assert.deepEqual(parseBookCommand("ready 3", garageV1), { k: "status", items: [{ target: { number: 3 }, keys: ["ready"] }] });
  assert.deepEqual(parseBookCommand("3 in the shop", garageV1)?.k, "status");
  assert.deepEqual(parseBookCommand("Ali's car is ready", garageV1), { k: "status", items: [{ target: { name: "ali" }, keys: ["ready"] }] });
  assert.deepEqual(parseBookCommand("Sarah came in.", salonV1), { k: "status", items: [{ target: { name: "sarah" }, keys: ["attended"] }] });
  assert.deepEqual(parseBookCommand("Maya not joining", gymV1), { k: "status", items: [{ target: { name: "maya" }, keys: ["lost"] }] });
  const many = parseBookCommand("here 3 4, ready 2", garageV1);
  assert.deepEqual(many, { k: "status", items: [
    { target: { number: 3 }, keys: ["active", "attended"] }, { target: { number: 4 }, keys: ["active", "attended"] }, { target: { number: 2 }, keys: ["ready"] },
  ] });
  assert.equal((parseBookCommand("here 3, 4", garageV1) as { items: unknown[] }).items.length, 2);
  assert.deepEqual(parseBookCommand("3 not ready", garageV1), { k: "status", items: [{ target: { number: 3 }, keys: ["active"] }] });
  assert.deepEqual(parseBookCommand("cancel 2", salonV1), { k: "status", items: [{ target: { number: 2 }, keys: ["cancelled"] }] });
  // Words that keep today's meaning, and messages that are new requests, are not commands.
  for (const t of ["cancel", "closed", "post", "ready", "Book Sarah for highlights Thursday afternoon", "Maya asked about a trial",
    "Ali Corolla brakes, car's here", "thanks", "stats", "review link", "it is ready", "what is it", "hours"]) {
    assert.equal(parseBookCommand(t, garageV1), null, t);
    assert.equal(parseBookCommand(t, salonV1), null, t);
  }
});

Deno.test("reader: confirm, convert, correct, undo and the list questions", () => {
  assert.deepEqual(parseBookCommand("Sarah confirmed Thursday 3", salonV1), { k: "confirm", target: { name: "sarah" }, when: "thursday 3" });
  assert.deepEqual(parseBookCommand("4 confirmed", salonV1), { k: "confirm", target: { number: 4 }, when: null });
  assert.deepEqual(parseBookCommand("confirmed 4 for friday 2pm", salonV1), { k: "confirm", target: { number: 4 }, when: "friday 2pm" });
  assert.deepEqual(parseBookCommand("Maya booked a trial Monday 6", gymV1), { k: "convert", name: "maya", rest: "a trial monday 6" });
  assert.deepEqual(parseBookCommand("not highlights, a trim", salonV1), { k: "correct", number: null, from: "highlights", to: "trim" });
  assert.deepEqual(parseBookCommand("not Corolla, Civic", garageV1), { k: "correct", number: null, from: "corolla", to: "civic" });
  assert.deepEqual(parseBookCommand("2 not corolla but civic", garageV1), { k: "correct", number: 2, from: "corolla", to: "civic" });
  assert.deepEqual(parseBookCommand("Undo", salonV1), { k: "undo" });
  for (const t of ["what's open", "Whats open?", "anything open", "what is still open", "which appointments are open"]) assert.deepEqual(parseBookCommand(t, salonV1), { k: "open", keys: null }, t);
  for (const t of ["what's unconfirmed", "what appointments are still unconfirmed", "unconfirmed", "who is not confirmed"]) {
    assert.deepEqual(parseBookCommand(t, salonV1), { k: "unconfirmed" }, t);
  }
  assert.deepEqual(parseBookCommand("what's ready", garageV1), { k: "open", keys: ["ready"] });
  assert.deepEqual(parseBookCommand("who asked about a trial this week", gymV1), { k: "asked", about: "trial", since: "week" });
  assert.deepEqual(parseBookCommand("who asked about personal training", gymV1), { k: "asked", about: "personal training", since: null });
});

Deno.test("reader: times, the likely afternoon guess, corrections and an arrival, all by code", () => {
  const ctx = { now: new Date(Date.UTC(2026, 9, 26, 15)), timeZone: "Asia/Dubai" };
  const g = readWhen("thursday 3", salonV1, ctx);
  assert.deepEqual(g, { k: "guess", startsAt: "2026-10-29T11:00:00.000Z", label: "Thu 3 pm" });
  // Said on a Monday evening, "monday 6" is next Monday: the readings already past are set aside.
  const c = readWhen("monday 6", gymV1, ctx);
  assert.equal(c.k, "choose");
  assert.deepEqual((c as { readings: { label: string }[] }).readings.map((x) => x.label), ["Mon 6 am", "Mon 6 pm"]);
  // Said on a Monday morning: this evening, or next Monday at either hour; the date is on each button.
  const m = readWhen("monday 6", gymV1, { ...ctx, now: new Date(Date.UTC(2026, 9, 26, 5)) });
  assert.deepEqual((m as { readings: { label: string }[] }).readings.map((x) => x.label), ["Mon 26 Oct 6 pm", "Mon 2 Nov 6 am", "Mon 2 Nov 6 pm"]);
  assert.deepEqual(readWhen("thursday 3pm", salonV1, ctx), { k: "one", startsAt: "2026-10-29T11:00:00.000Z" });
  assert.equal(readWhen("tomorrow afternoon", salonV1, ctx).k, "window");
  assert.equal(readWhen("soon", salonV1, ctx).k, "none");
  assert.deepEqual(correction(salonV1, { customer_name: "Sarah", summary: "Highlights", details: {} }, "highlights", "trim")?.shown,
    { field: "summary", before: "Highlights", after: "Haircut" });
  assert.deepEqual(correction(garageV1, { customer_name: "Ali", summary: "Brakes", details: { car: "Toyota Corolla" } }, "corolla", "civic")?.shown,
    { field: "car", before: "Toyota Corolla", after: "Toyota Civic" });
  assert.equal(correction(garageV1, { customer_name: "Ali", summary: "Brakes", details: { car: "Toyota Corolla" } }, "golf", "polo"), null);
  assert.equal(correction(salonV1, { customer_name: "Sarah", summary: "Trimming", details: {} }, "trim", "cut"), null, "whole words only");
  for (const t of ["Ali Corolla brakes, car's here", "Ali brakes, it's here", "Golf arrived", "Sam dropped off the Polo"]) assert.ok(saysArrived(t), t);
  for (const t of ["Ali Corolla brakes tomorrow 10", "where is it", "Ali here tomorrow"]) assert.equal(saysArrived(t), false, t);
  assert.equal(sinceDay("week", ctx), "2026-10-26");
  assert.equal(sinceDay("month", ctx), "2026-10-01");
});

// --- Update by command.

Deno.test("update: by number with the pack's words, one reply each with Undo; no model call", async () => {
  const w = world({ which: [GARAGE] });
  const q = await ali(w);
  assert.equal(await send(w, { text: "1 here" }), "request_status");
  assert.equal(q.status, "active");
  assert.match(last(w).body, /^\*✅ Job 1 is now In the shop\*\n/);
  assert.deepEqual(last(w).buttons, ["Undo"]);
  assert.equal(await send(w, { text: "ready 1" }), "request_status");
  assert.equal(q.status, "ready");
  assert.equal(await send(w, { text: "1 collected" }), "request_status");
  assert.equal(q.status, "closed");
  assert.equal(q.outcome, "completed");
  assert.equal(w.aiCalls, 0);
  assert.equal(w.extractCalls.length, 0);
  assert.equal(w.repliesTo(TEST).length, 3, "one reply per command");
  clean(w);
});

Deno.test("update: by name; Ali's car is ready after a skipped step asks first, records its flag and invents no event", async () => {
  const w = world({ which: [GARAGE] });
  const q = await ali(w);
  assert.equal(await send(w, { text: "Ali's car is ready" }), "request_status_ask");
  assert.equal(q.status, "waiting", "nothing changes before the yes");
  assert.match(last(w).body, /Job 1 is still Waiting, and the step before Ready was never recorded\*\nMark it Ready anyway\?/);
  assert.deepEqual(last(w).buttons, ["Yes", "No"]);
  assert.equal(await send(w, { text: "yes" }), "request_status_acknowledged");
  assert.equal(q.status, "ready");
  const a = acts(w, q.id);
  assert.deepEqual(a.map((x) => x.type), ["created", "status_changed"], "no In the shop step added");
  assert.deepEqual(a[1]!.flags, ["arrival_not_recorded"]);
  assert.equal(a[1]!.from, "waiting");
  assert.match(last(w).body, /The step before was never recorded, and Kabsi has not added one/);
  assert.deepEqual(last(w).buttons, ["Undo"]);
  // The question is closed: a second yes means what it meant before.
  assert.equal(w.conversation(TEST).open_question, null);
});

Deno.test("update: a skipped step answered No changes nothing; the Yes button answers only its own question", async () => {
  const w = world({ which: [GARAGE] });
  const q = await ali(w);
  await send(w, { text: "Ali's car is ready" });
  const [yesId] = ids(w);
  assert.equal(await send(w, { text: "no" }), "request_ask_no");
  assert.equal(q.status, "waiting");
  assert.match(last(w).body, /Nothing was changed/);
  // The old Yes after the No finds the question closed.
  assert.equal(await send(w, { button: yesId }), "request_question_closed");
  assert.equal(q.status, "waiting");
  // The button works while the question is open.
  await send(w, { text: "Ali's car is ready" });
  assert.equal(await send(w, { button: ids(w)[0] }), "request_status_acknowledged");
  assert.equal(q.status, "ready");
});

Deno.test("update: here 3 4, ready 2 gets one reply; the one skipped step is the one question", async () => {
  const w = world({ which: [GARAGE] });
  const j1 = await ali(w), j2 = await ali(w), j3 = await ali(w), j4 = await ali(w);
  await w.bookDb().setStatus(GARAGE, TEST_USER, "seed:a", j2.id, 1, "active", null, false);
  const before = w.repliesTo(TEST).length;
  assert.equal(await send(w, { text: "here 3 4, ready 2" }), "request_status_many");
  assert.equal(w.repliesTo(TEST).length, before + 1, "one reply");
  assert.deepEqual([j3.status, j4.status, j2.status], ["active", "active", "ready"]);
  assert.match(last(w).body, /Job 3 is now In the shop\*\nJob 4 is now In the shop\.\nJob 2 is now Ready\./);
  assert.deepEqual(last(w).buttons, ["Undo"]);
  // The Undo of a combined reply undoes all three, the latest first.
  assert.equal(await send(w, { button: ids(w)[0] }), "request_undone");
  assert.deepEqual([j3.status, j4.status, j2.status], ["waiting", "waiting", "active"]);
  // With a skipped step inside: the others apply, the skipped one is asked.
  assert.equal(await send(w, { text: "here 3, ready 1" }), "request_status_ask");
  assert.equal(j3.status, "active");
  assert.equal(j1.status, "waiting");
  assert.match(last(w).body, /Job 3 is now In the shop\*\nJob 1 is still Waiting[\s\S]*Mark it Ready anyway\?/);
  assert.deepEqual(last(w).buttons, ["Yes", "No", "Undo"]);
  assert.equal(await send(w, { text: "yes" }), "request_status_acknowledged");
  assert.equal(j1.status, "ready");
  clean(w);
});

Deno.test("update: cancel and lost ask first and are for an owner or a manager only, as the database rules", async () => {
  for (const role of ["owner", "manager"] as const) {
    const w = world({ which: [SALON, GYM], role });
    const s = await sarah(w), m = await maya(w);
    await send(w, { text: "switch" });
    await send(w, { button: `b:${SALON}` });
    assert.equal(await send(w, { text: "cancel 1" }), "request_status_ask", role);
    assert.match(last(w).body, /This closes Appointment 1 as Cancelled\*( · [^\n]+)?\nGo ahead\?/);
    assert.equal(s.status, "requested");
    assert.equal(await send(w, { text: "yes" }), "request_status_acknowledged");
    assert.equal(s.outcome, "cancelled");
    await send(w, { text: "switch" });
    await send(w, { button: `b:${GYM}` });
    assert.equal(await send(w, { text: "Maya not interested" }), "request_status_ask");
    assert.match(last(w).body, /This closes Enquiry 1 as Not joining\*/);
    assert.equal(await send(w, { button: ids(w)[0] }), "request_status_acknowledged");
    assert.equal(m.outcome, "lost");
  }
  // Staff: refused before any question, nothing changed.
  const w = world({ which: [SALON], role: "staff" });
  const s = await sarah(w);
  assert.equal(await send(w, { text: "cancel 1" }), "request_status_refused");
  assert.match(last(w).body, /Only an owner or a manager can do that\*\nNothing was changed\./);
  assert.equal(s.status, "requested");
  assert.equal(w.conversation(TEST).open_question, null);
  // Staff may still record what happened when it ends nothing early.
  const g = world({ which: [GARAGE], role: "staff" });
  const j = await ali(g);
  assert.equal(await send(g, { text: "1 here" }), "request_status");
  assert.equal(j.status, "active");
});

Deno.test("update: a move the kind does not have is refused plainly; a name with no request is not a command", async () => {
  const w = world({ which: [SALON] });
  const s = await sarah(w);
  assert.equal(await send(w, { text: "1 collected" }), "request_status_refused");
  assert.match(last(w).body, /Kabsi cannot make that change\*\nNothing was changed\./);
  assert.equal(s.status, "requested");
  // "Nadia came in": nobody of that name in Kabsi. RB-F4 (R-149 item 1): a person and what they did is the request book's,
  // read as a new request with no router call; no existing request is changed and nothing is saved before a tap.
  w.extractMap["Nadia came in"] = JSON.stringify({ fields: { customer_name: "Nadia", phone: null, service: null, when: null, stylist: null }, said: { agreed: null, already_arranged: null } });
  assert.equal(await send(w, { text: "Nadia came in" }), "request_proposed");
  assert.equal(w.aiCalls, 0);
  assert.equal(s.status, "requested");
  // A number that is not there.
  assert.equal(await send(w, { text: "9 ready" }), "request_status_refused");
  assert.match(last(w).body, /#9: I cannot find that request/);
});

Deno.test("update: two open requests with the name ask which one, and change nothing", async () => {
  const w = world({ which: [GARAGE] });
  const a = await ali(w), b = await ali(w);
  assert.equal(await send(w, { text: "Ali is ready" }), "request_status_which");
  assert.match(last(w).body, /^\*❓ 2 open with that name\*\nWhich one\? Send its number with it, for example 2 ready\./);
  assert.deepEqual([a.status, b.status], ["waiting", "waiting"]);
});

// --- Confirmation.

Deno.test("confirm: Sarah confirmed Thursday 3 shows Thu 3 pm? with one tap, then sets the time and records what the client said", async () => {
  const w = world({ which: [SALON] });
  const s = await sarah(w);
  assert.equal(await send(w, { text: "Sarah confirmed Thursday 3" }), "request_confirm_guess");
  assert.match(last(w).body, /Appointment 1 for Sarah\*( · [^\n]+)?\nThu 3 pm\?\nTap it to set that time and record that the client confirmed\. Nothing is changed until you tap\./);
  assert.deepEqual(last(w).buttons, ["Thu 3 pm"]);
  assert.equal(s.starts_at, null);
  assert.equal(s.customer_confirmed_at, null);
  assert.equal(await send(w, { button: ids(w)[0] }), "request_confirmed");
  assert.equal(s.starts_at, "2026-10-29T11:00:00.000Z");
  assert.ok(s.customer_confirmed_at);
  assert.equal(s.staff_confirmed_at, null, "staff confirmation is a separate fact, never inferred");
  const body = last(w).body;
  assert.match(body, /Appointment 1 updated\*/);
  assert.match(body, /Confirmed by the client, as told to staff/);
  assert.match(body, /Still needs confirmation from the salon/);
  assert.deepEqual(last(w).buttons, ["Undo"]);
  const a = acts(w, s.id);
  assert.deepEqual(a.map((x) => x.type), ["created", "corrected", "confirmation_changed"]);
  assert.deepEqual(a[2]!.flags, ["customer_confirmed", "recorded_by_staff"]);
  // Undo: both the time and the confirmation, the latest first.
  assert.equal(await send(w, { button: ids(w)[0] }), "request_undone");
  assert.equal(s.starts_at, null);
  assert.equal(s.customer_confirmed_at, null);
  // Then again: a new message, new keys, the same result.
  await send(w, { text: "Sarah confirmed Thursday 3" });
  assert.equal(await send(w, { text: "yes" }), "request_confirmed");
  assert.equal(s.starts_at, "2026-10-29T11:00:00.000Z");
  assert.ok(s.customer_confirmed_at);
  clean(w);
});

Deno.test("confirm: both readings are buttons where the pack has no likely hour; an exact time applies at once", async () => {
  const w = world({ which: [GYM] });
  await make(w, GYM, { kind: "appointment", customer_name: "Omar", summary: "Tour" });
  assert.equal(await send(w, { text: "Omar confirmed Monday 6" }), "request_confirm_choose");
  assert.deepEqual(last(w).buttons, ["Mon 6 am", "Mon 6 pm"]);
  const times = ids(w);
  assert.equal(await send(w, { text: "yes" }), "request_time_tap");
  assert.equal(await send(w, { button: times[1] }), "request_confirmed");
  assert.equal(w.requests[0].starts_at, "2026-11-02T14:00:00.000Z");
  const s = world({ which: [SALON] });
  const q = await sarah(s);
  assert.equal(await send(s, { text: "Sarah confirmed Thursday 3pm" }), "request_confirmed");
  assert.equal(q.starts_at, "2026-10-29T11:00:00.000Z");
  // No time on record and none given: the database refuses, and Kabsi says what to do.
  const t = world({ which: [SALON] });
  await sarah(t);
  assert.equal(await send(t, { text: "Sarah confirmed" }), "request_confirm_refused:time_required");
  assert.match(last(t).body, /Enter a time first/);
  // Words with no hour are not a time.
  assert.equal(await send(t, { text: "Sarah confirmed tomorrow afternoon" }), "request_confirm_no_time");
});

Deno.test("confirm: a time change clears the confirmations the old time had, and the reply says so", async () => {
  const w = world({ which: [SALON] });
  const s = await sarah(w);
  const db = w.bookDb();
  await db.correct(SALON, TEST_USER, "seed:t", s.id, 1, { starts_at: "2026-10-29T11:00:00.000Z" });
  await db.setConfirmation(SALON, TEST_USER, "seed:s", s.id, 2, "staff", true);
  await db.setConfirmation(SALON, TEST_USER, "seed:c", s.id, 3, "customer", true);
  w.now += 11 * 60_000;
  assert.equal(await send(w, { text: "Sarah confirmed Friday 4pm" }), "request_confirmed");
  assert.equal(s.starts_at, "2026-10-30T12:00:00.000Z");
  assert.equal(s.staff_confirmed_at, null, "the salon's confirmation was for the old time");
  assert.ok(s.customer_confirmed_at);
  assert.match(last(w).body, /The time changed, so the confirmations recorded for the old time were cleared\./);
  assert.match(last(w).body, /Still needs confirmation from the salon/);
});

// --- Conversion.

Deno.test("convert: Maya booked a trial Monday 6 closes the enquiry as converted and links a new visit; the timeline is unchanged", async () => {
  const w = world({ which: [GYM] });
  const e = await maya(w);
  assert.equal(await send(w, { text: "Maya booked a trial Monday 6" }), "request_convert_choose");
  assert.deepEqual(last(w).buttons, ["Mon 6 am", "Mon 6 pm"]);
  assert.equal(e.status, "new");
  assert.equal(await send(w, { button: ids(w)[1] }), "request_converted");
  assert.equal(e.status, "closed");
  assert.equal(e.outcome, "converted");
  const v = w.requests.find((x) => x.converted_from === e.id)!;
  assert.equal(v.kind, "appointment");
  assert.equal(v.status, "requested");
  assert.equal(v.summary, "Trial");
  assert.equal(v.starts_at, "2026-11-02T14:00:00.000Z");
  assert.equal(v.customer_confirmed_at, null);
  // Nothing in between: no contacted step nobody stated, no confirmation.
  assert.deepEqual(acts(w, e.id).map((x) => x.type), ["created", "converted_out"]);
  assert.deepEqual(acts(w, v.id).map((x) => x.type), ["converted_in"]);
  assert.match(last(w).body, /Enquiry 1 became Visit 2 for Maya\*( · [^\n]+)?\nThe enquiry stays on record\./);
  assert.match(last(w).body, /No confirmation has been recorded yet\./);
  // Undo puts the enquiry back and removes the visit, keeping the link.
  assert.equal(await send(w, { button: ids(w)[0] }), "request_undone");
  assert.equal(e.status, "new");
  assert.equal(v.outcome, "voided");
  // With an exact time it converts at once; with no enquiry for the name it is a new request for capture, not a conversion.
  assert.equal(await send(w, { text: "Maya booked a trial Monday 6pm" }), "request_converted");
  w.aiMap["Sam booked a tour tomorrow 5pm"] = '{"tool":"request_new","args":{},"lang":"en"}';
  assert.notEqual(await send(w, { text: "Sam booked a tour tomorrow 5pm" }), "request_converted");
  clean(w);
});

// --- Correct.

Deno.test("correct: not highlights, a trim applies to the request touched in the last 30 minutes, before and after, with Undo", async () => {
  const w = world({ which: [SALON] });
  const s = await sarah(w);
  w.now += 20 * 60_000;
  assert.equal(await send(w, { text: "not highlights, a trim" }), "request_corrected");
  assert.equal(s.summary, "Haircut");
  assert.match(last(w).body, /Appointment 1 corrected\*( · [^\n]+)?\nservice changed from Highlights to Haircut\./);
  assert.deepEqual(last(w).buttons, ["Undo"]);
  assert.equal(await send(w, { text: "undo" }), "request_undone");
  assert.equal(s.summary, "Highlights");
  // More than 30 minutes since anyone touched it: not a correction of anything, so it goes on as before; nothing changes.
  w.now += 31 * 60_000;
  assert.equal(await send(w, { text: "not highlights, a trim" }), "off_topic");
  assert.equal(s.summary, "Highlights");
  // With the number it applies.
  assert.equal(await send(w, { text: "1 not highlights, a trim" }), "request_corrected");
  assert.equal(s.summary, "Haircut");
});

Deno.test("correct: not Corolla, Civic changes the car; unclear between two asks; words not on the request are said plainly", async () => {
  const w = world({ which: [GARAGE] });
  const a = await ali(w);
  assert.equal(await send(w, { text: "not Corolla, Civic" }), "request_corrected");
  assert.equal(a.details!.car, "Toyota Civic");
  assert.match(last(w).body, /Job 1 corrected\*( · [^\n]+)?\ncar changed from Toyota Corolla to Toyota Civic\./);
  // Words on no recent request, with no number: not a correction ("not sure, maybe later" goes the same way).
  assert.equal(await send(w, { text: "not Golf, Polo" }), "off_topic");
  assert.equal(await send(w, { text: "not sure, maybe later" }), "off_topic");
  assert.equal(await send(w, { text: "1 not Golf, Polo" }), "request_correct_not_found");
  assert.match(last(w).body, /Job 1 does not say golf\*\nNothing was changed\./);
  const b = await ali(w, { car: "Honda Civic" });
  assert.equal(await send(w, { text: "not Civic, Jazz" }), "request_correct_which");
  assert.equal(a.details!.car, "Toyota Civic");
  assert.equal(b.details!.car, "Honda Civic");
  // Staff may not correct (the database's role rule).
  const st = world({ which: [GARAGE], role: "staff" });
  await ali(st);
  assert.equal(await send(st, { text: "1 not Corolla, Civic" }), "request_correct_refused:forbidden");
});

// --- Undo.

Deno.test("undo: 10 minutes, the latest effective change only, never twice, and an old button is refused plainly", async () => {
  const w = world({ which: [GARAGE] });
  const q = await ali(w);
  await send(w, { text: "1 here" });
  const firstUndo = ids(w)[0]!;
  await send(w, { text: "1 ready" });
  // Not the latest: the earlier change cannot be undone first.
  assert.equal(await send(w, { button: firstUndo }), "request_undo_refused:not_latest");
  assert.match(last(w).body, /Undo the latest change first/);
  assert.equal(await send(w, { text: "undo" }), "request_undone");
  assert.equal(q.status, "active");
  assert.equal(await send(w, { text: "undo" }), "request_undone");
  assert.equal(q.status, "waiting");
  // The creation itself, then nothing of the book's is left to undo: "undo" keeps today's meaning.
  assert.equal(await send(w, { text: "undo" }), "request_undone");
  assert.equal(q.outcome, "voided");
  assert.match(last(w).body, /Undone\*( · [^\n]+)?\nJob 1 was removed\./);
  assert.notEqual(await send(w, { text: "undo" }), "request_undone");
  // After 10 minutes the button says so.
  const r = await ali(w);
  await send(w, { text: "2 here" });
  const u = ids(w)[0]!;
  w.now += 11 * 60_000;
  assert.equal(await send(w, { button: u }), "request_undo_refused:window_passed");
  assert.match(last(w).body, /Undo is open for 10 minutes and that time has passed\*\nNothing was changed\./);
  assert.equal(r.status, "active");
  assert.equal(await send(w, { button: u }), "request_undo_refused:window_passed");
});

Deno.test("undo: staff can undo only their own changes; an owner can undo staff's", async () => {
  const w = world({ which: [GARAGE], role: "staff" });
  const owner = id(110);
  w.biz.find((b) => b.id === GARAGE)!.members[owner] = "owner";
  const q = await ali(w, {});
  await w.bookDb().setStatus(GARAGE, owner, "seed:o", q.id, 1, "active", null, false);
  const ownerAct = w.activities.at(-1)!.id;
  assert.equal(await send(w, { button: `ru:${ownerAct}` }), "request_undo_refused:forbidden");
  assert.equal(q.status, "active");
  const r = await w.bookDb().undo(GARAGE, owner, "seed:u", ownerAct);
  assert.equal(r.ok, true);
});

// --- Save now offers Undo, and a job that is already here.

Deno.test("save: Undo after Save; Ali Corolla brakes, car's here is saved as In the shop and says so before Save", async () => {
  const w = world({ which: [GARAGE] });
  const text = "Ali Corolla brakes, car's here";
  w.aiMap[text] = '{"tool":"request_new","args":{},"lang":"en"}';
  w.extractMap[text] = JSON.stringify({ fields: { customer_name: "Ali", phone: null, problem: "brakes", when: null, car: "Corolla", registration: null }, said: { agreed: null, already_arranged: null } });
  assert.equal(await send(w, { text }), "request_proposed");
  assert.match(last(w).body, /Status: In the shop\nNothing is saved until you tap Save\./);
  const intake = [...w.intakes.values()].at(-1)!;
  assert.equal(await send(w, { button: `rs:${intake.id}` }), "request_saved");
  assert.equal(w.requests[0].status, "active");
  assert.match(last(w).body, /Job 1 saved\*( · [^\n]+)?\n#1 Ali · Brakes · In the shop/);
  assert.deepEqual(last(w).buttons, ["Undo"]);
  // Ali's car is ready: one step, no question.
  assert.equal(await send(w, { text: "Ali's car is ready" }), "request_status");
  assert.equal(w.requests[0].status, "ready");
});

// --- What's open, unconfirmed, who asked.

Deno.test("lists: what's open is grouped, 15 rows then a count, for this business only, covers only Kabsi, no model", async () => {
  const w = world({ which: [SALON, GARAGE] });
  for (let i = 0; i < 17; i++) await make(w, SALON, { kind: "appointment", customer_name: `Client ${i + 1}`, summary: "Haircut" });
  await make(w, SALON, { kind: "enquiry", customer_name: "Dina", summary: "Hair treatment" });
  await ali(w);
  await send(w, { text: "switch" });
  await send(w, { button: `b:${SALON}` });
  assert.equal(await send(w, { text: "what's open" }), "request_open");
  const body = last(w).body;
  assert.match(body, /^\*📋 18 open\* · Kabsi Test Salon\n/);
  assert.match(body, /Appointments, Requested \(\d+\)/);
  assert.match(body, /and 3 more/);
  assert.match(body, /This covers only what was entered in Kabsi\.$/);
  assert.doesNotMatch(body, /Ali|Brakes/, "the garage's job is not in the salon's list");
  assert.equal((body.match(/^#\d+ /gm) ?? []).length, 15);
  assert.equal(w.aiCalls, 0);
  assert.equal(await send(w, { text: "what's unconfirmed" }), "request_unconfirmed");
  assert.match(last(w).body, /17 appointments still need a confirmation\*/);
  assert.match(last(w).body, /Needs confirmation from the salon and from the client/);
  assert.equal(w.aiCalls, 0);
  clean(w);
});

Deno.test("lists: who asked about a trial this week; what's ready", async () => {
  const w = world({ which: [GYM, GARAGE] });
  await maya(w);
  w.now += 7 * 86400_000;
  await make(w, GYM, { kind: "enquiry", customer_name: "Hana", summary: "Trial" });
  await make(w, GYM, { kind: "enquiry", customer_name: "Omar", summary: "Personal training" });
  await send(w, { text: "switch" });
  await send(w, { button: `b:${GYM}` });
  assert.equal(await send(w, { text: "who asked about a trial this week" }), "request_asked");
  assert.match(last(w).body, /1 asked about trial this week\*( · [^\n]+)?\n#2 Hana · Trial/);
  assert.doesNotMatch(last(w).body, /Maya|Omar/);
  assert.equal(await send(w, { text: "who asked about a trial" }), "request_asked");
  assert.match(last(w).body, /2 asked about trial\*/);
  await send(w, { text: "switch" });
  await send(w, { button: `b:${GARAGE}` });
  const j = await ali(w);
  await w.bookDb().setStatus(GARAGE, TEST_USER, "seed:r", j.id, 1, "active", null, false);
  await w.bookDb().setStatus(GARAGE, TEST_USER, "seed:r2", j.id, 2, "ready", null, false);
  await ali(w);
  assert.equal(await send(w, { text: "what's ready" }), "request_open");
  assert.match(last(w).body, /1 open\* · Kabsi Test Garage\nReady \(1\)\n#1 Ali/);
});

// --- Isolation between the three businesses, and other phones.

Deno.test("isolation: a command acts only for the chosen business; another phone's buttons change nothing", async () => {
  const w = world({ which: [SALON, GYM, GARAGE] });
  const s = await sarah(w);
  const j = await ali(w);
  await send(w, { text: "switch" });
  await send(w, { button: `b:${GYM}` });
  // Sarah is a salon client: at the gym the name is unknown, so it is not a command, and the salon is untouched.
  assert.notEqual(await send(w, { text: "Sarah confirmed Thursday 3pm" }), "request_confirmed");
  assert.equal(s.customer_confirmed_at, null);
  // Number 1 at the gym is not the salon's or the garage's number 1.
  assert.equal(await send(w, { text: "1 here" }), "request_status_refused");
  assert.equal(j.status, "waiting");
  assert.equal(s.status, "requested");
  assert.ok(w.bookCalls.filter((c) => c.startsWith("get:")).every((c) => c.startsWith(`get:${GYM}:`)));
  // The garage, chosen: its own job.
  await send(w, { text: "switch" });
  await send(w, { button: `b:${GARAGE}` });
  assert.equal(await send(w, { text: "1 here" }), "request_status");
  assert.equal(j.status, "active");
  const undoId = ids(w)[0]!;
  // Another phone (Harbour Lane's owner, no request book) taps this phone's Undo, or a Yes: nothing happens.
  assert.equal(await send(w, { button: undoId }, PHONES.owner), "request_undo_unknown");
  assert.equal(await send(w, { button: `ra:${j.id}:abcdefgh` }, PHONES.owner), "request_question_closed");
  assert.equal(j.status, "active");
  // Yawmiyati's phone: stats and review link as before.
  assert.equal(await send(w, { text: "stats" }, PHONES.rashid), "stats");
  assert.match(await send(w, { text: "review link" }, PHONES.rashid), /review_link$/);
});

Deno.test("F-1: a forwarded Yes never answers a question about a change, and the question still waits", async () => {
  const w = world({ which: [GARAGE] });
  const q = await ali(w);
  await send(w, { text: "Ali's car is ready" });
  assert.equal(await send(w, { text: "Yes", forwarded: true }), "forwarded_yes");
  assert.match(last(w).body, /That looks forwarded, so I did not count it as your yes/);
  assert.equal(q.status, "waiting");
  assert.equal((w.conversation(TEST).open_question as { type: string }).type, "rb_ask");
  assert.equal(await send(w, { text: "Yes" }), "request_status_acknowledged");
  assert.equal(q.status, "ready");
  // A forwarded status command is not the owner's own either.
  await ali(w);
  assert.notEqual(await send(w, { text: "2 here", forwarded: true }), "request_status");
  assert.equal(w.requests[1].status, "waiting");
});

Deno.test("pricing: a receipt's Meta pricing is read as billable, category and model only; anything else is dropped", () => {
  const body = { event: "whatsapp.message.delivered", message: { id: "wamid.out.1", kapso: { direction: "outbound", status: "delivered",
    statuses: [{ status: "sent" }, { status: "delivered", recipient_id: "12125550160", pricing: { billable: false, category: "service", pricing_model: "PMP", type: "free_customer_service" } }] } } };
  const { statuses } = parseWebhook(null, body);
  assert.deepEqual(statuses, [{ messageId: "wamid.out.1", status: "delivered", error: null, pricing: { billable: false, category: "service", model: "PMP" } }]);
  const none = parseWebhook(null, { event: "whatsapp.message.sent", message: { id: "wamid.out.2", kapso: { direction: "outbound", status: "sent" } } });
  assert.equal(none.statuses[0]!.pricing, undefined);
  const odd = parseWebhook(null, { message: { id: "wamid.out.3", kapso: { status: "delivered", statuses: [{ pricing: { billable: "yes", category: "<b>x</b>" } }] } } });
  assert.deepEqual(odd.statuses[0]!.pricing, { billable: null, category: null, model: null });
});

// --- The review's findings (fixed here), each as a case.

Deno.test("review: a name matches whole words only, and another person's arrival is not the client's", async () => {
  const w = world({ which: [SALON] });
  const q = await make(w, SALON, { kind: "appointment", customer_name: "Samira", summary: "Haircut" });
  const i = await make(w, SALON, { kind: "appointment", customer_name: "Ibrahim", summary: "Beard trim" });
  for (const t of ["Sam came in", "im done", "ok here", "my car is ready"]) assert.notEqual(await send(w, { text: t }), "request_status", t);
  assert.equal(q.status, "requested");
  assert.equal(i.status, "requested");
  const s = await sarah(w);
  assert.equal(parseBookCommand("Sarah's mum is here", salonV1), null);
  assert.notEqual(await send(w, { text: "Sarah's mum is here" }), "request_status_ask");
  assert.equal(s.status, "requested");
  // The whole name, and its first word, still work.
  assert.equal(await send(w, { text: "Samira came in" }), "request_status_ask");
});

Deno.test("review: an older Yes or time button never answers a newer question about the same request", async () => {
  const w = world({ which: [GARAGE] });
  const q = await ali(w);
  await send(w, { text: "cancel 1" });
  const oldYes = ids(w)[0]!;
  await send(w, { text: "1 no show" });
  assert.equal((w.conversation(TEST).open_question as { to: string; outcome: string }).outcome, "no_show");
  const newYes = ids(w)[0]!;
  assert.equal(await send(w, { button: oldYes }), "request_question_closed");
  assert.equal(q.status, "waiting");
  assert.equal(await send(w, { button: newYes }), "request_status_acknowledged");
  assert.equal(q.outcome, "no_show");
  // A tapped time after the question's 30 minutes changes nothing.
  const g = world({ which: [GYM] });
  const o = await make(g, GYM, { kind: "appointment", customer_name: "Omar", summary: "Tour" });
  await send(g, { text: "Omar confirmed Monday 6" });
  const t = ids(g)[1]!;
  g.now += 31 * 60_000;
  assert.equal(await send(g, { button: t }), "request_question_closed");
  assert.equal(o.starts_at, null);
});

Deno.test("review: a typed undo twice walks back two changes, not one request twice; never another person's change", async () => {
  const w = world({ which: [GARAGE] });
  const a = await ali(w), b = await ali(w);
  w.now += 1000;
  await send(w, { text: "here 1 2" });
  assert.equal(await send(w, { text: "undo" }), "request_undone");
  assert.equal(await send(w, { text: "undo" }), "request_undone");
  assert.deepEqual([a.status, b.status], ["waiting", "waiting"]);
  assert.equal(b.outcome, null, "the second request was not voided");
  // Another member's later change on the request: a typed undo does not reverse it.
  const other = id(111);
  w.biz.find((x) => x.id === GARAGE)!.members[other] = "manager";
  await send(w, { text: "1 here" });
  await w.bookDb().setStatus(GARAGE, other, "seed:m", a.id, a.version!, "ready", null, false);
  assert.notEqual(await send(w, { text: "undo" }), "request_undone");
  assert.equal(a.status, "ready");
});

Deno.test("review: a confirmation by number on a job writes nothing; what's new is not a list; Undo stays beside a question", async () => {
  const w = world({ which: [GARAGE] });
  const j = await ali(w);
  assert.equal(await send(w, { text: "1 confirmed Thursday 3pm" }), "request_confirm_refused:not_appointment");
  assert.equal(j.starts_at, null);
  assert.equal(acts(w, j.id).length, 1);
  assert.equal(parseBookCommand("what's new", salonV1), null);
  assert.equal(parseBookCommand("open today", salonV1), null);
  assert.equal(parseBookCommand("open", salonV1), null);
  // A combined message: the applied part keeps its Undo next to Yes and No.
  const k = await ali(w);
  await send(w, { text: "here 1, ready 2" });
  assert.deepEqual(last(w).buttons, ["Yes", "No", "Undo"]);
  assert.equal(await send(w, { button: ids(w)[2] }), "request_undone");
  assert.equal(j.status, "waiting");
  assert.equal(k.status, "waiting");
  // "Sarah confirmed she will pay" has no day or hour: not a confirmation.
  const s = world({ which: [SALON] });
  const q = await sarah(s);
  assert.notEqual(await send(s, { text: "Sarah confirmed she will pay" }), "request_confirm_no_time");
  assert.equal(q.customer_confirmed_at, null);
});

Deno.test("review: one reading left after the past is set aside is still a tap, never applied at once", () => {
  const ctx = { now: new Date(Date.UTC(2026, 9, 26, 6)), timeZone: "Asia/Dubai" };
  const r = readWhen("today 3", gymV1, ctx);
  assert.equal(r.k, "guess");
  assert.equal((r as { label: string }).label, "Mon 3 pm");
});
