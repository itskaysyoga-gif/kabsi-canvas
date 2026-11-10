// RB-E: the request book on WhatsApp. The seam off and on, the word table, an idempotent Save, the actor test, a business
// switch that leaks nothing, the snapshot of the model's instructions, and "On it" at 10 seconds for request tools. All on
// the fake world: no database, no Kapso, no model call. Customers are fictional, with phones in 555-01xx.
import assert from "node:assert/strict";
import { receive } from "./agent.ts";
import { createInput, refOf } from "./book.ts";
import { routerSystem } from "./intent.ts";
import { TOOLS } from "./roles.ts";
import { salonV1 } from "../request-book/packs/index.ts";
import { BIZ, msg, PHONES, USERS, World } from "./world.test-helpers.ts";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const SALON = id(11), GYM = id(12), GARAGE = id(13);
const TEST_USER = id(109);
const TEST = "+12125550160";
const tool = (t: string, args: Record<string, string> = {}) => JSON.stringify({ tool: t, args, lang: "en" });
const quotes = (fields: Record<string, string | null>) => JSON.stringify({ fields, said: { agreed: null, already_arranged: null } });

/** The three test businesses of step 7, fictional; the test owner joins `which` of them. */
function bookWorld(o: { on?: boolean; which?: string[] } = {}): World {
  const w = new World();
  const which = o.which ?? [SALON];
  w.biz.push(
    { id: SALON, name: "Kabsi Test Salon", tz: "Asia/Dubai", country: "AE", pro: false, members: which.includes(SALON) ? { [TEST_USER]: "owner" } : {} },
    { id: GYM, name: "Kabsi Test Gym", tz: "Asia/Dubai", country: "AE", pro: false, members: which.includes(GYM) ? { [TEST_USER]: "owner" } : {} },
    { id: GARAGE, name: "Kabsi Test Garage", tz: "Asia/Dubai", country: "AE", pro: false, members: which.includes(GARAGE) ? { [TEST_USER]: "owner" } : {} },
  );
  w.users.push({ id: TEST_USER, phone: TEST, optin: "active" });
  w.bookSetting = o.on === false ? "off" : "on";
  w.packs.set(SALON, { pack: "salon", version: 1, state: "test" });
  w.packs.set(GYM, { pack: "gym", version: 1, state: "test" });
  w.packs.set(GARAGE, { pack: "garage", version: 1, state: "test" });
  w.aiMap["Book Sarah for highlights Thursday afternoon"] = tool("request_new");
  w.extractMap["Book Sarah for highlights Thursday afternoon"] = quotes({ customer_name: "Sarah", phone: null, service: "highlights", when: "Thursday afternoon", stylist: null });
  return w;
}

const send = (w: World, from: string, o: Parameters<typeof msg>[2]) => receive(w.deps(), msg(w, from, o));
const last = (w: World, phone = TEST) => w.repliesTo(phone).at(-1)!;
const lastIntake = (w: World) => [...w.intakes.values()].at(-1)!;
const HOUSE = /[‒-―!]|\bbooked\b|\bavailable\b/i;

// ─── The snapshot: with the request book off, the model's instructions are byte for byte what they were before RB-E.

// SHA-256 of routerSystem(role) on main before RB-E (commit a77f142), for every role.
const BEFORE: Record<string, string> = {
  unknown: "dd12d0319ffdf9538368de0e498d41293b6853b15fd0ec0df421944e5e95f351",
  prospect: "c3d01ab7509bdb3819119d02fc9e4a7d0748eba9d6adabb90a0da0e59a4767c6",
  owner: "f467b801d088f2ae4d1d75d1a46605639b930689cec52903452826b66616d045",
  manager: "adbc54b4ac6aaf7a3d2a57a714cd45c6993af4222ec28595299976d5b727707d",
  staff: "a89de4e4b78dc3145967418bb035598ed21460d4f4fe11f92bdfde1f50347a26",
  partner: "ba54f9085f3a9f9a73147c757ee8b7d852cfe4738f7df6743a2628568af613ef",
  staff_admin: "b1b31a51e75e0d6222c979ece34d8acc07f5f24aab88ef39ffdba868cb6f9f24",
};
const sha = async (s: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");

Deno.test("snapshot: with the request book off the router's instructions are byte-identical for every role", async () => {
  assert.deepEqual(Object.keys(BEFORE).sort(), Object.keys(TOOLS).sort());
  for (const role of Object.keys(TOOLS) as (keyof typeof TOOLS)[]) {
    assert.equal(await sha(routerSystem(role)), BEFORE[role], role);
    assert.equal(await sha(routerSystem(role, {})), BEFORE[role], role);
    assert.equal(await sha(routerSystem(role, { requestBook: false })), BEFORE[role], role);
    // On: the same text with the two request tools added, nothing else changed.
    const on = routerSystem(role, { requestBook: true }).split("\n");
    const off = routerSystem(role).split("\n");
    assert.deepEqual(on.filter((l) => !/^- request_(new|find):/.test(l)), off, role);
    assert.equal(on.length, off.length + 2, role);
  }
});

Deno.test("snapshot: an owner's message at a business with the book off goes to the model with the old instructions", async () => {
  const w = bookWorld({ on: false });
  const systems: string[] = [];
  const d = w.deps();
  const ai = d.ai!;
  d.ai = (system, user) => (systems.push(system), ai(system, user));
  const r = await receive(d, msg(w, TEST, { text: "Book Sarah for highlights Thursday afternoon" }));
  assert.equal(r, "unclear");
  assert.equal(systems.length, 1);
  assert.equal(await sha(systems[0]), BEFORE.owner);
  assert.equal(w.extractCalls.length, 0);
  assert.equal(w.intakes.size, 0);
  assert.deepEqual(w.bookCalls, [`on:${SALON}`]);
});

// ─── The seam off.

Deno.test("seam off: no setting, or a pack that is off, or no pack: today's behaviour, nothing read or written", async () => {
  for (const setup of [(w: World) => (w.bookSetting = "off"), (w: World) => w.packs.set(SALON, { pack: "salon", version: 1, state: "off" }), (w: World) => w.packs.delete(SALON),
    (w: World) => w.packs.set(SALON, { pack: "plumber", version: 1, state: "test" })]) {
    const w = bookWorld();
    setup(w);
    assert.equal(await send(w, TEST, { text: "Book Sarah for highlights Thursday afternoon" }), "unclear");
    assert.equal(await send(w, TEST, { text: "1" }), "unclear");
    assert.equal(await send(w, TEST, { text: "closed" }), "hours_no_day");
    assert.equal(w.extractCalls.length, 0);
    assert.equal(w.intakes.size + w.requests.length, 0);
    assert.ok(w.bookCalls.every((c) => c.startsWith("on:")));
  }
});

Deno.test("seam off: Yawmiyati's stats and review link, and a typed yes, answer as before and never touch the book", async () => {
  const w = bookWorld();
  assert.equal(await send(w, PHONES.rashid, { text: "stats" }), "stats");
  assert.match(await send(w, PHONES.rashid, { text: "review link" }), /review_link$/);
  const token = w.alert(PHONES.owner, BIZ.harbour);
  assert.equal(await send(w, PHONES.owner, { text: "yes" }), "approved");
  assert.ok(w.actions.get(token)!.used);
  // Words and buttons never read the switch; free text reads it once, for that phone's own business only.
  assert.deepEqual(w.bookCalls, []);
  assert.equal(await send(w, PHONES.owner, { text: "something new" }), "unclear");
  assert.deepEqual(w.bookCalls, [`on:${BIZ.harbour}`]);
});

// ─── Capture, Save and an old Save.

Deno.test("capture: one proposal with Save and Change, nothing saved; Save makes request 1; the old Save makes no second", async () => {
  const w = bookWorld();
  assert.equal(await send(w, TEST, { text: "Book Sarah for highlights Thursday afternoon" }), "request_proposed");
  const p = last(w);
  assert.deepEqual(p.buttons, ["Save", "Change"]);
  assert.match(p.body, /^Kabsi Test Salon \(owner\)/);
  assert.match(p.body, /Name: Sarah/);
  assert.match(p.body, /Service: Highlights/);
  // RB-F2: the time in its clean form.
  assert.match(p.body, /When: Thursday afternoon, no time set/);
  assert.match(p.body, /Nothing is saved until you tap Save/);
  assert.equal(w.requests.length, 0);
  assert.equal(w.extractCalls.length, 1);
  const intake = lastIntake(w);
  assert.equal(intake.state, "pending");
  assert.equal((w.conversation(TEST).open_question as { type: string }).type, "rb_proposal");

  assert.equal(await send(w, TEST, { button: `rs:${intake.id}`, id: "wamid.save.1" }), "request_saved");
  assert.equal(w.requests.length, 1);
  const q = w.requests[0];
  assert.equal(q.number, 1);
  assert.equal(q.customer_name, "Sarah");
  assert.equal(q.summary, "Highlights");
  // No time is invented: the words are kept, with no time set.
  assert.equal(q.starts_at, null);
  // RB-F2: saved with its date, so a later list still names the right day.
  assert.equal(q.requested_window_text, "Thu 29 Oct afternoon");
  assert.equal(q.location, SALON);
  assert.equal(q.by, TEST_USER);
  assert.match(last(w).body, /Appointment 1 saved\.\n#1 Sarah · Highlights · Thu 29 Oct afternoon, no time set · Requested/);
  // RB-F: Undo is offered for 10 minutes, by the creation's activity id.
  assert.deepEqual(last(w).buttons, ["Undo"]);
  // The key of the Save is the WhatsApp id of the tap.
  assert.ok(w.toolKeys.has(`${SALON}:wamid.save.1`));
  assert.equal(w.conversation(TEST).open_question, null);

  assert.equal(await send(w, TEST, { button: `rs:${intake.id}`, id: "wamid.save.2" }), "request_already_saved");
  assert.match(last(w).body, /already handled/);
  assert.equal(w.requests.length, 1);
  for (const s of w.repliesTo(TEST)) assert.doesNotMatch(s.body, HOUSE);
});

Deno.test("capture: a retried Save with the same message id returns the first result and makes no second request", async () => {
  const w = bookWorld();
  await send(w, TEST, { text: "Book Sarah for highlights Thursday afternoon" });
  const intake = lastIntake(w);
  const d = w.deps();
  const tap = msg(w, TEST, { button: `rs:${intake.id}`, id: "wamid.save.retry" });
  // The proposal is read as still open (the first try crashed after the write), so the same key goes to request_create again.
  const create = d.book!.db.create;
  let calls = 0;
  d.book!.db.create = async (...a) => (calls++, await create(...a));
  const { handle } = await import("./agent.ts");
  assert.equal(await handle(d, tap), "request_saved");
  intake.state = "pending";
  assert.equal(await handle(d, tap), "request_saved_replay");
  assert.equal(calls, 2);
  assert.equal(w.requests.length, 1);
});

Deno.test("capture: a second message before a tap revises the same proposal; Save keeps both", async () => {
  const w = bookWorld({ which: [GYM] });
  w.aiMap["Maya asked about a trial"] = tool("request_new");
  w.extractMap["Maya asked about a trial"] = quotes({ customer_name: "Maya", phone: null, interest: "a trial", when: null });
  w.aiMap["Saturday morning"] = '{"tool":"unclear","args":{},"lang":"en"}';
  w.extractMap["Maya asked about a trial\nSaturday morning"] = quotes({ customer_name: "Maya", phone: null, interest: "a trial", when: "Saturday morning" });
  assert.equal(await send(w, TEST, { text: "Maya asked about a trial" }), "request_proposed");
  const first = lastIntake(w);
  assert.equal(await send(w, TEST, { text: "Saturday morning" }), "request_revised");
  assert.equal(w.intakes.size, 1, "the same proposal");
  assert.equal(first.raw, "Maya asked about a trial\nSaturday morning");
  assert.equal(await send(w, TEST, { button: `rs:${first.id}` }), "request_saved");
  assert.equal(w.requests[0].kind, "enquiry");
  assert.match(last(w).body, /Enquiry 1 saved/);
});

Deno.test("capture: an expired proposal is refused at Save, and nothing is written", async () => {
  const w = bookWorld();
  await send(w, TEST, { text: "Book Sarah for highlights Thursday afternoon" });
  const intake = lastIntake(w);
  w.now += 31 * 86400_000;
  assert.equal(await send(w, TEST, { button: `rs:${intake.id}` }), "request_expired");
  assert.match(last(w).body, /more than 30 days old, so it was not saved/);
  assert.equal(w.requests.length, 0);
  assert.ok(!w.bookCalls.some((c) => c.startsWith("create:")));
});

Deno.test("capture: two readings of a time are buttons and the tap saves that reading; a typed yes cannot choose", async () => {
  const w = bookWorld({ which: [GYM] });
  w.aiMap["Maya trial class Thursday 3"] = tool("request_new");
  w.extractMap["Maya trial class Thursday 3"] = quotes({ customer_name: "Maya", phone: null, interest: "trial class", when: "Thursday 3" });
  assert.equal(await send(w, TEST, { text: "Maya trial class Thursday 3" }), "request_proposed");
  const p = last(w);
  assert.equal(p.buttons.length, 2);
  assert.match(p.body, /Which time did you mean\? Nothing is saved until you tap\./);
  const intake = lastIntake(w);
  assert.equal(await send(w, TEST, { text: "yes" }), "request_save_needs_tap");
  assert.equal(w.requests.length, 0);
  const want = ((intake.evidence.when as { candidates: { value: { starts_at: string } }[] }).candidates[1]).value.starts_at;
  assert.equal(await send(w, TEST, { button: `rp:${intake.id}:1` }), "request_saved");
  assert.equal(w.requests[0].starts_at, want);
  assert.equal(w.requests[0].requested_window_text, "Thursday 3");
});

Deno.test("capture: a bare hour the garage usually means as the afternoon is a guess, saved only with the tap", async () => {
  const w = bookWorld({ which: [GARAGE] });
  w.aiMap["Ali Corolla brakes tomorrow 3"] = tool("request_new");
  w.extractMap["Ali Corolla brakes tomorrow 3"] = quotes({ customer_name: "Ali", phone: null, vehicle: "Corolla", problem: "brakes", when: "tomorrow 3" });
  assert.equal(await send(w, TEST, { text: "Ali Corolla brakes tomorrow 3" }), "request_proposed");
  assert.match(last(w).body, /Tomorrow 3 pm\?[\s\S]*A question mark is a guess/);
  assert.deepEqual(last(w).buttons, ["Save", "Change"]);
  assert.equal(w.requests.length, 0);
  assert.equal(await send(w, TEST, { button: `rs:${lastIntake(w).id}` }), "request_saved");
  assert.equal(w.requests[0].kind, "job");
  assert.equal(w.requests[0].starts_at, "2026-10-27T11:00:00.000Z");
  assert.match(last(w).body, /Job 1 saved/);
});

Deno.test("capture: a message with nothing to read writes no proposal", async () => {
  const w = bookWorld();
  w.aiMap["ok thanks"] = tool("request_new");
  assert.equal(await send(w, TEST, { text: "ok thanks" }), "request_unread");
  assert.equal(w.intakes.size, 0);
  assert.match(last(w).body, /could not read a request in that\. Nothing was saved/);
});

Deno.test("capture: Change keeps the proposal open for the next message; No drops it", async () => {
  const w = bookWorld();
  await send(w, TEST, { text: "Book Sarah for highlights Thursday afternoon" });
  const intake = lastIntake(w);
  assert.equal(await send(w, TEST, { button: `rc:${intake.id}` }), "request_change");
  assert.match(last(w).body, /Nothing is saved yet/);
  assert.equal(await send(w, TEST, { text: "no" }), "request_dropped");
  assert.equal(intake.state, "discarded");
  assert.equal(await send(w, TEST, { button: `rs:${intake.id}` }), "request_unavailable:discarded");
  assert.equal(w.requests.length, 0);
});

// ─── Find and summarize.

Deno.test("find: a name lists the matches with one question; a number shows the whole request; nothing found says so", async () => {
  const w = bookWorld();
  await send(w, TEST, { text: "Book Sarah for highlights Thursday afternoon" });
  await send(w, TEST, { button: `rs:${lastIntake(w).id}` });
  w.aiMap["Sarah again, highlights Friday afternoon"] = tool("request_new");
  w.extractMap["Sarah again, highlights Friday afternoon"] = quotes({ customer_name: "Sarah", phone: null, service: "highlights", when: "Friday afternoon", stylist: null });
  await send(w, TEST, { text: "Sarah again, highlights Friday afternoon" });
  await send(w, TEST, { button: `rs:${lastIntake(w).id}` });
  w.aiMap["Sarah"] = tool("request_find", { name: "Sarah" });
  assert.equal(await send(w, TEST, { text: "Sarah" }), "request_find");
  const found = last(w).body;
  assert.match(found, /2 found\. Which one\? Send its number\./);
  assert.equal((found.match(/\?/g) ?? []).length, 1, "at most one question");
  assert.match(found, /This covers only what was entered in Kabsi/);
  assert.equal(await send(w, TEST, { text: "1" }), "request_summary");
  assert.match(last(w).body, /Appointment 1 for Sarah\nHighlights\nWhen: Thu 29 Oct afternoon, no time set\nStatus: Requested/);
  assert.equal(await send(w, TEST, { text: "request 2" }), "request_summary");
  assert.match(last(w).body, /Appointment 2 for Sarah/);
  assert.equal(await send(w, TEST, { text: "request 9" }), "request_summary");
  assert.match(last(w).body, /cannot find that request/);
  w.aiMap["Nadia"] = tool("request_find", { name: "Nadia" });
  assert.equal(await send(w, TEST, { text: "Nadia" }), "request_find");
  assert.match(last(w).body, /Nothing found in Kabsi for that/);
  // A name the model gives that the message does not hold is never searched for.
  w.aiMap["who was that"] = tool("request_find", { name: "Sarah" });
  assert.equal(await send(w, TEST, { text: "who was that" }), "request_find");
  assert.match(last(w).body, /Send the name or the number of the request/);
  assert.equal(w.bookCalls.filter((c) => c.startsWith("find:")).length, 2);
});

// ─── The word table.

Deno.test("words: closed, cancel and post keep today's meaning alone and mean a request with a reference", async () => {
  const w = bookWorld();
  await send(w, TEST, { text: "Book Sarah for highlights Thursday afternoon" });
  await send(w, TEST, { button: `rs:${lastIntake(w).id}` });
  // RB-F: "closed 1" shows the request and asks how it ended; "post 1" shows it; "cancel 1" asks first (it ends the request).
  assert.equal(await send(w, TEST, { text: "closed 1" }), "request_ref_closed");
  assert.match(last(w).body, /Appointment 1 for Sarah[\s\S]*Say how it ended/);
  assert.equal(await send(w, TEST, { text: "post 1" }), "request_ref_post");
  assert.match(last(w).body, /Appointment 1 for Sarah/);
  for (const t of ["cancel 1", "Cancel #1"]) {
    assert.equal(await send(w, TEST, { text: t }), "request_status_ask", t);
    assert.match(last(w).body, /This closes Appointment 1 as Cancelled\.\nGo ahead\?/);
  }
  assert.equal(await send(w, TEST, { text: "cancel" }), "billing_stub");
  assert.equal(await send(w, TEST, { text: "post" }), "post_ask");
  // "closed" alone starts an hours change, and its one question back is answered first, as today.
  assert.equal(await send(w, TEST, { text: "closed" }), "hours_no_day");
  assert.match(await send(w, TEST, { text: "closed 1" }), /^hours_/);
  assert.equal(w.requests[0].status, "requested");
  // Staff words are unchanged.
  assert.equal(await send(w, TEST, { text: "status" }), "unclear");
});

Deno.test("words: a number alone means that request only where the book is on", async () => {
  const w = bookWorld();
  await send(w, TEST, { text: "Book Sarah for highlights Thursday afternoon" });
  await send(w, TEST, { button: `rs:${lastIntake(w).id}` });
  assert.equal(await send(w, TEST, { text: "1" }), "request_summary");
  w.aiMap["1"] = '{"tool":"unclear","args":{},"lang":"en"}';
  assert.equal(await send(w, PHONES.owner, { text: "1" }), "unclear");
  // The answer to Kabsi's own questions still comes first (Which one?).
  const a = w.alert(TEST, SALON), b = w.alert(TEST, SALON, "post_ready");
  assert.equal(await send(w, TEST, { text: "yes" }), "which_one");
  assert.equal(await send(w, TEST, { text: "2" }), "approved");
  assert.ok(w.actions.get(b)!.used && !w.actions.get(a)!.used);
});

Deno.test("words: yes saves only when a proposal is waiting; otherwise it approves as today", async () => {
  const w = bookWorld();
  const token = w.alert(TEST, SALON);
  await send(w, TEST, { text: "Book Sarah for highlights Thursday afternoon" });
  assert.equal(await send(w, TEST, { text: "yes" }), "request_saved");
  assert.equal(w.requests.length, 1);
  assert.equal(w.actions.get(token)!.used, false, "the review reply waits");
  assert.equal(await send(w, TEST, { text: "yes" }), "approved");
  assert.ok(w.actions.get(token)!.used);
  // Review finding 1: a draft older than 30 minutes is still what a yes answers, never a Google reply waiting elsewhere.
  const token2 = w.alert(TEST, SALON);
  await send(w, TEST, { text: "Book Sarah for highlights Thursday afternoon", id: "wamid.p2" });
  w.now += 31 * 60_000;
  assert.equal(await send(w, TEST, { text: "yes" }), "request_saved");
  assert.equal(w.requests.length, 2);
  assert.equal(w.actions.get(token2)!.used, false);
  // Once the draft is saved the question is closed, and yes approves as today.
  assert.equal(await send(w, TEST, { text: "yes" }), "approved");
  assert.ok(w.actions.get(token2)!.used);
});

Deno.test("words: with a draft open at another of the phone's businesses, a yes approves nothing", async () => {
  const w = bookWorld({ which: [SALON, GYM] });
  await send(w, TEST, { button: `b:${SALON}` });
  await send(w, TEST, { text: "Book Sarah for highlights Thursday afternoon" });
  const token = w.alert(TEST, GYM);
  w.conversation(TEST).active_location_id = GYM;
  assert.equal(await send(w, TEST, { text: "yes" }), "request_yes_tap_save");
  assert.match(last(w).body, /^Kabsi Test Salon \(owner\)\n\nA request draft is waiting/);
  assert.equal(w.actions.get(token)!.used, false);
  await send(w, TEST, { button: `rs:${lastIntake(w).id}` });
  assert.equal(await send(w, TEST, { text: "yes" }), "approved");
  assert.ok(w.actions.get(token)!.used);
});

Deno.test("capture: a message that adds nothing to the open draft does not change it", async () => {
  const w = bookWorld();
  await send(w, TEST, { text: "Book Sarah for highlights Thursday afternoon" });
  const intake = lastIntake(w);
  const raw = intake.raw;
  w.aiMap["thanks"] = '{"tool":"unclear","args":{},"lang":"en"}';
  w.extractMap["Book Sarah for highlights Thursday afternoon\nthanks"] = w.extractMap["Book Sarah for highlights Thursday afternoon"];
  assert.equal(await send(w, TEST, { text: "thanks" }), "request_still_waiting");
  assert.equal(intake.raw, raw);
  assert.match(last(w).body, /still waiting\. Tap Save or Change/);
  // A Google question with a draft open keeps its meaning.
  w.aiMap["how many reviews this week"] = tool("stats", { days: "7" });
  assert.equal(await send(w, TEST, { text: "how many reviews this week" }), "stats");
  assert.equal(intake.raw, raw);
});

Deno.test("failure: a database error gives a plain line, never silence, and no stray On it", async () => {
  const w = bookWorld();
  w.onItFast = false;
  const d = w.deps();
  d.book!.db.propose = () => Promise.reject(new Error("db down"));
  assert.equal(await receive(d, msg(w, TEST, { text: "Book Sarah for highlights Thursday afternoon" })), "request_db_error");
  assert.match(last(w).body, /could not reach your request book just now\. Nothing new was saved/);
  const e = w.deps();
  e.book!.db.get = () => Promise.reject(new Error("db down"));
  assert.equal(await receive(e, msg(w, TEST, { text: "request 1" })), "request_db_error");
  await send(w, TEST, { text: "Book Sarah for highlights Thursday afternoon", id: "wamid.ok" });
  const f = w.deps();
  f.book!.db.create = () => Promise.reject(new Error("db down"));
  assert.equal(await receive(f, msg(w, TEST, { button: `rs:${lastIntake(w).id}` })), "request_db_error");
  assert.equal(w.requests.length, 0);
});

Deno.test("find: a number is read only where it stands on its own in the message", async () => {
  const w = bookWorld();
  await send(w, TEST, { text: "Book Sarah for highlights Thursday afternoon" });
  await send(w, TEST, { button: `rs:${lastIntake(w).id}` });
  w.aiMap["what about 142"] = tool("request_find", { number: "1" });
  assert.equal(await send(w, TEST, { text: "what about 142" }), "request_find");
  assert.match(last(w).body, /Send the name or the number/);
  w.aiMap["what about 1 please"] = tool("request_find", { number: "1" });
  assert.equal(await send(w, TEST, { text: "what about 1 please" }), "request_find");
  assert.match(last(w).body, /Appointment 1 for Sarah/);
});

Deno.test("words: forwarded text never saves and never reaches the request book (F-1)", async () => {
  const w = bookWorld();
  await send(w, TEST, { text: "Book Sarah for highlights Thursday afternoon" });
  const before = w.bookCalls.length;
  // F-1 with a request draft waiting (RB-F): the looks forwarded line, and the draft still waits.
  assert.equal(await send(w, TEST, { text: "Yes", forwarded: true }), "forwarded_yes");
  assert.match(last(w).body, /That looks forwarded, so I did not count it as your yes/);
  assert.match(await send(w, TEST, { text: "Book Maya for a trim Friday", forwarded: true }), /^(unclear|nora)/);
  assert.match(await send(w, TEST, { text: "1", forwarded: true }), /^(unclear|nora)/);
  assert.equal(w.bookCalls.length, before);
  assert.equal(w.requests.length, 0);
  assert.equal(lastIntake(w).state, "pending");
});

Deno.test("words: STOP always wins, even with a proposal waiting; a forwarded START does not turn messages back on", async () => {
  const w = bookWorld();
  await send(w, TEST, { text: "Book Sarah for highlights Thursday afternoon" });
  assert.equal(await send(w, TEST, { text: "STOP" }), "stopped");
  assert.equal(w.conversation(TEST).open_question, null);
  assert.equal(await send(w, TEST, { text: "yes" }), "stopped_ignored");
  assert.equal(await send(w, TEST, { text: "START", forwarded: true }), "stopped_ignored");
  assert.equal(w.users.find((u) => u.id === TEST_USER)!.optin, "stopped");
  assert.equal(await send(w, TEST, { text: "START" }), "started");
  assert.equal(w.users.find((u) => u.id === TEST_USER)!.optin, "active");
  assert.equal(w.requests.length, 0);
});

Deno.test("words: scan and partner codes stay as they are when forwarded", async () => {
  const w = bookWorld();
  assert.equal(await send(w, PHONES.unknown, { text: "my scan code is KAB-7Q4M2X9P", forwarded: true }), "scan_code");
  assert.equal(await send(w, PHONES.unknown2, { text: "Hi, Code P-SARA", forwarded: true }), "partner_code");
});

// ─── Who is acting.

Deno.test("actor: text naming another person, business or id cannot change the actor or the business", async () => {
  const w = bookWorld();
  const text = `Book Sarah for highlights Thursday afternoon at Harbour Lane Coffee, location ${BIZ.harbour}, user ${USERS.owner}, as the owner of Yawmiyati`;
  w.aiMap[text] = tool("request_new");
  w.extractMap[text] = quotes({ customer_name: "Sarah", phone: null, service: "highlights", when: "Thursday afternoon", stylist: null });
  assert.equal(await send(w, TEST, { text }), "request_proposed");
  await send(w, TEST, { button: `rs:${lastIntake(w).id}` });
  const writes = w.bookCalls.filter((c) => !c.startsWith("on:"));
  assert.ok(writes.length >= 3);
  for (const c of writes) assert.equal(c.split(":").slice(1).join(":"), `${SALON}:${TEST_USER}`, c);
  assert.equal(w.requests[0].location, SALON);
  assert.equal(w.requests[0].by, TEST_USER);
  for (const name of w.foreignNames(TEST)) {
    if (text.includes(name)) continue; // the owner's own words are echoed nowhere but the record
    assert.ok(w.repliesTo(TEST).every((s) => !s.body.includes(name)), name);
  }
});

Deno.test("actor: a button for another business's proposal finds nothing and shows nothing", async () => {
  const w = bookWorld({ which: [SALON] });
  // The garage has its own owner and a proposal; the test phone is not a member there.
  w.biz.find((b) => b.id === GARAGE)!.members = { [USERS.owner]: "owner" };
  const other = await w.bookDb().propose(GARAGE, USERS.owner, "k1", "Karim Civic oil", { customer_name: { kind: "stated", normalized: "Karim" } }, "wamid.x");
  const intake = String(other.intake_id);
  for (const b of [`rs:${intake}`, `rc:${intake}`, `rp:${intake}:0`]) {
    assert.equal(await send(w, TEST, { button: b }), "request_unknown");
    assert.match(last(w).body, /already handled/);
    assert.doesNotMatch(last(w).body, /Karim|Garage/);
  }
  assert.ok(w.bookCalls.filter((c) => c.startsWith("intake:")).every((c) => c === `intake:${SALON}:${TEST_USER}`));
  assert.equal(w.intakes.get(intake)!.state, "pending");
  // A phone with no business at all is refused before anything is read.
  assert.equal(await send(w, PHONES.unknown, { button: `rs:${intake}` }), "request_off");
});

// ─── Several businesses.

Deno.test("switch: a phone with three businesses picks one through the existing question; another business's data is never shown", async () => {
  const w = bookWorld({ which: [SALON, GYM, GARAGE] });
  // No business chosen: the existing question, with the message kept for after the pick.
  assert.equal(await send(w, TEST, { text: "Book Sarah for highlights Thursday afternoon" }), "which_business");
  assert.deepEqual(last(w).buttons, ["Kabsi Test Garage", "Kabsi Test Gym", "Kabsi Test Salon"]);
  assert.equal(w.intakes.size, 0);
  assert.equal(await send(w, TEST, { button: `b:${SALON}` }), "request_proposed");
  await send(w, TEST, { button: `rs:${lastIntake(w).id}` });
  assert.equal(w.requests[0].location, SALON);

  // Switch to the gym: Sarah and request 1 are the salon's, so the gym shows nothing of them.
  assert.equal(await send(w, TEST, { text: "switch" }), "which_business");
  assert.equal(await send(w, TEST, { button: `b:${GYM}` }), "business_set");
  w.aiMap["Sarah"] = tool("request_find", { name: "Sarah" });
  assert.equal(await send(w, TEST, { text: "Sarah" }), "request_find");
  assert.match(last(w).body, /^Kabsi Test Gym \(owner\)\n\nNothing found in Kabsi for that/);
  assert.equal(await send(w, TEST, { text: "request 1" }), "request_summary");
  assert.match(last(w).body, /^Kabsi Test Gym \(owner\)\n\nI cannot find that request/);
  assert.doesNotMatch(last(w).body, /Sarah|Highlights|Salon/);
  const reads = w.bookCalls.filter((c) => /^(find|get):/.test(c)).slice(-2);
  assert.deepEqual(reads, [`find:${GYM}:${TEST_USER}`, `get:${GYM}:${TEST_USER}`]);
  // Back to the salon: it is there.
  await send(w, TEST, { text: "switch" });
  await send(w, TEST, { button: `b:${SALON}` });
  assert.equal(await send(w, TEST, { text: "request 1" }), "request_summary");
  assert.match(last(w).body, /^Kabsi Test Salon \(owner\)\n\nAppointment 1 for Sarah/);
});

// ─── "On it".

Deno.test("On it waits 10 seconds for request tools; everything else keeps 2.5", async () => {
  const w = bookWorld();
  await send(w, TEST, { text: "Book Sarah for highlights Thursday afternoon" });
  await send(w, PHONES.owner, { text: "something" });
  assert.deepEqual(w.sleeps, [10_000, 2_500]);
  // When it fires, "On it" goes before the proposal, never after.
  const v = bookWorld();
  v.onItFast = true;
  await send(v, TEST, { text: "Book Sarah for highlights Thursday afternoon" });
  const bodies = v.repliesTo(TEST).map((s) => s.body);
  assert.equal(bodies.length, 2);
  assert.match(bodies[0], /On it\./);
  assert.match(bodies[1], /Name: Sarah/);
});

// ─── book.ts on its own.

Deno.test("refOf: references and the words that already mean something", () => {
  assert.deepEqual(refOf("42"), { number: 42, word: null });
  assert.deepEqual(refOf("#42"), { number: 42, word: null });
  assert.deepEqual(refOf("Request 42."), { number: 42, word: null });
  assert.deepEqual(refOf("closed 42"), { number: 42, word: "closed" });
  assert.deepEqual(refOf("cancel #42"), { number: 42, word: "cancel" });
  assert.deepEqual(refOf("post request 7"), { number: 7, word: "post" });
  for (const t of ["closed", "cancel", "post", "closed tomorrow", "0", "Sarah 42", "post: new hours 42 days", "cancel my plan"]) assert.equal(refOf(t), null, t);
});

Deno.test("createInput: never invents a time, never saves a field that needs a tap, says what is missing", () => {
  const ev = (o: Record<string, unknown>) => o;
  const base = { customer_name: ev({ kind: "stated", raw: "Sarah", normalized: "Sarah" }), service: ev({ kind: "stated", raw: "highlights", normalized: { text: "highlights", services: ["highlights"] } }) };
  const words = createInput(salonV1, { ...base, when: ev({ kind: "stated", raw: "next week", normalized: { text: "next week", starts_at: null } }) }, "i1");
  assert.ok(words.ok);
  assert.equal(words.ok && words.input.starts_at, undefined);
  assert.equal(words.ok && words.input.requested_window_text, "next week");
  const both = { kind: "ambiguous", raw: "Thursday 3", normalized: null, candidates: [{ label: "Thu 3:00", value: { starts_at: "2026-10-29T11:00:00.000Z" } }, { label: "Thu 15:00", value: { starts_at: "2026-10-29T23:00:00.000Z" } }] };
  assert.deepEqual(createInput(salonV1, { ...base, when: both }, "i1"), { ok: false, why: "needs_tap", missing: [] });
  const picked = createInput(salonV1, { ...base, when: both }, "i1", 1);
  assert.equal(picked.ok && picked.input.starts_at, "2026-10-29T23:00:00.000Z");
  assert.deepEqual(createInput(salonV1, { customer_name: base.customer_name }, "i1"), { ok: false, why: "missing", missing: ["Service"] });
  // A pick for a proposal that no longer needs one is refused.
  assert.deepEqual(createInput(salonV1, base, "i1", 0), { ok: false, why: "needs_tap", missing: [] });
  const full = createInput(salonV1, { ...base, phone: ev({ kind: "stated", normalized: "+971555010123" }), stylist: ev({ kind: "stated", normalized: "Rana" }) }, "i1");
  assert.deepEqual(full.ok && full.input, {
    kind: "appointment", entry_method: "typed", intake_id: "i1", customer_name: "Sarah", summary: "Highlights",
    identifiers: [{ kind: "phone", value: "+971555010123" }], details: { stylist: "Rana" },
  });
});
