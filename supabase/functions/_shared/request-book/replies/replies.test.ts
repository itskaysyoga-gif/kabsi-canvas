// RB-C2: the reply rules. Code builds every reply from the record; it never says booked, available or confirmed unless
// the record holds that fact; a list says it covers only what was entered in Kabsi and shows 15 rows then how many
// more; unconfirmed names the missing confirmation; a message with buttons stays under 1,024 characters.
import { assert, assertEquals, assertMatch, assertNotMatch, assertStringIncludes } from "jsr:@std/assert@1";
import { PACKS, garageV1, gymV1, salonV1 } from "../packs/index.ts";
import type { Pack } from "../packs/schema.ts";
import { tutorV1 } from "../packs/test-fixtures/tutor.v1.ts";
import { normalizeMessage } from "../normalize/index.ts";
import { KINDS, OPEN_STATUSES, OUTCOMES, type Kind, type RequestRow } from "../types.ts";
import {
  BUTTON_BODY_MAX, COVERS_NOTE, KNOWN_REFUSALS, MAX_ROWS, askFirstReply, confirmationReply, convertedReply, correctedReply, finish, foundReply,
  openListReply, proposalReply, refusalReply, requestLine, savedReply, statusChangedReply, summaryReply, undoneReply, type ReplyContext,
} from "./index.ts";
import { confirmationText, formatWhen } from "./words.ts";

const NOW = new Date("2026-11-08T10:00:00Z");
const TZ = "Asia/Dubai";
const ctx = (pack: Pack): ReplyContext => ({ pack, timeZone: TZ, now: NOW });

let n = 0;
function row(over: Partial<RequestRow> = {}): RequestRow {
  n++;
  return {
    request_id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`, number: 40 + n, kind: "appointment", status: "requested", outcome: null,
    summary: "Highlights", customer_id: "c1", customer_name: "Sarah", requested_window_text: null, starts_at: "2026-11-12T11:00:00.000Z",
    staff_confirmed: false, customer_confirmed: false, next_action: null, next_action_due_at: null, follow_up_user_id: null,
    created_at: "2026-11-08T09:00:00.000Z", ...over,
  };
}

const CLAIM = /\b(booked|available|availability)\b/i;
const NO_DASH = /[\u2013\u2014!]/;
const ARABIC = /[\u0600-\u06FF]/;

/** The rule for every reply: no claim word, no dash, no exclamation mark, no Arabic script, a body inside WhatsApp's limit. */
function assertRules(text: string, buttons: string[] | undefined, why: string) {
  assertNotMatch(text, CLAIM, `${why}: claims a fact it cannot know`);
  assertNotMatch(text, NO_DASH, `${why}: dash or exclamation mark`);
  assertNotMatch(text, ARABIC, `${why}: Arabic script`);
  if (buttons) {
    assert(buttons.length >= 1 && buttons.length <= 3, `${why}: buttons`);
    assert(text.length <= BUTTON_BODY_MAX, `${why}: ${text.length} characters with buttons`);
    for (const b of buttons) assert(b.length <= 20, `${why}: button ${b}`);
  } else assert(text.length <= 4096, `${why}: ${text.length} characters`);
}

/** Every "confirmed" in a reply must be "Confirmed by <side>" and the record must hold that side. */
function assertConfirmedOnlyFromRecord(text: string, r: Pick<RequestRow, "staff_confirmed" | "customer_confirmed">, pack: Pack, why: string) {
  const staff = `Confirmed by ${pack.words.staffSide}`;
  const customer = `Confirmed by the ${pack.words.customer.singular}`;
  const seen = text.match(/confirmed/gi) ?? [];
  const allowed = (text.match(new RegExp(`${staff}|${customer}`, "g")) ?? []).length;
  assertEquals(seen.length, allowed, `${why}: a "confirmed" outside a recorded confirmation: ${text}`);
  assertEquals(text.includes(staff), r.staff_confirmed, `${why}: staff confirmation`);
  assertEquals(text.includes(customer), r.customer_confirmed, `${why}: customer confirmation`);
}

Deno.test("replies: never booked, never available, and confirmed only from the record, for every pack, kind, status and confirmation", () => {
  let checked = 0;
  for (const pack of [...PACKS, tutorV1]) {
    const c = ctx(pack);
    for (const kind of pack.kinds) {
      const statuses = [...OPEN_STATUSES[kind].map((s) => [s, null] as const), ...OUTCOMES[kind].map((o) => ["closed", o] as const)];
      for (const [status, outcome] of statuses) {
        for (const staff of [false, true]) {
          for (const customer of [false, true]) {
            for (const starts_at of [null, "2026-11-12T11:00:00.000Z"]) {
              const r = row({ kind, status, outcome, staff_confirmed: staff && kind === "appointment", customer_confirmed: customer && kind === "appointment", starts_at });
              const why = `${pack.id} ${kind} ${status}/${outcome} s=${staff} c=${customer} t=${starts_at}`;
              const replies = [
                summaryReply(r, c), savedReply(r, c), statusChangedReply(r, c), confirmationReply(r, c), requestLine(r, c) as unknown as string,
                openListReply([r], 0, c).body, openListReply([r], 0, c, { unconfirmed: true }).body, foundReply([r], 0, c).body,
                foundReply([r, row({ kind, status, outcome })], 0, c).body,
                undoneReply(r, c), correctedReply(r, [{ field: "summary", before: "A", after: "B" }], c, ["confirmations_cleared"]),
                askFirstReply(r, c, { to: "closed", outcome: "cancelled", flags: [] }),
                convertedReply(row({ kind: "enquiry" }), r, c),
              ];
              for (const x of replies) {
                const text = typeof x === "string" ? x : x.body;
                const buttons = typeof x === "string" ? undefined : x.buttons;
                assertRules(text, buttons, why);
                if (typeof x !== "string" && x !== replies[7]) {
                  // Replies that describe this one request must agree with its two confirmations.
                  if (text.toLowerCase().includes("confirmed")) assertConfirmedOnlyFromRecord(text, r, pack, why);
                }
                checked++;
              }
            }
          }
        }
      }
    }
  }
  assert(checked > 1000, `${checked}`);
});

Deno.test("replies: unconfirmed means missing either confirmation, and the line says which one", () => {
  const c = ctx(salonV1);
  const none = confirmationText(row(), salonV1);
  assertEquals(none, "Needs confirmation from the salon and from the client");
  const staffOnly = confirmationText(row({ staff_confirmed: true }), salonV1);
  assertEquals(staffOnly, "Confirmed by the salon. Still needs confirmation from the client");
  const customerOnly = confirmationText(row({ customer_confirmed: true }), salonV1);
  assertEquals(customerOnly, "Confirmed by the client, as told to staff. Still needs confirmation from the salon");
  const both = confirmationText(row({ staff_confirmed: true, customer_confirmed: true }), salonV1);
  assertEquals(both, "Confirmed by the salon. Confirmed by the client, as told to staff");
  // Only appointments carry confirmations, and a closed one is not waiting for any.
  assertEquals(confirmationText(row({ kind: "job", status: "waiting" }), garageV1), null);
  assertEquals(confirmationText(row({ kind: "enquiry", status: "new" }), gymV1), null);
  assertEquals(confirmationText(row({ status: "closed", outcome: "attended" }), salonV1), null);

  const list = openListReply([row({ staff_confirmed: true }), row({ customer_confirmed: true }), row()], 0, c, { unconfirmed: true }).body;
  assertStringIncludes(list, "Needs confirmation from the client");
  assertStringIncludes(list, "Needs confirmation from the salon");
  assertStringIncludes(list, "Needs confirmation from the salon and from the client");
  assertStringIncludes(list, "Confirmed by the client, as told to staff");
  assertStringIncludes(list, "3 appointments still need a confirmation.");
  // The headline is only as strong as the rows: a row that holds both confirmations is not claimed to be missing one.
  const mixed = openListReply([row({ staff_confirmed: true, customer_confirmed: true }), row()], 0, c, { unconfirmed: true }).body;
  assertStringIncludes(mixed, "2 open.");
  assertNotMatch(mixed, /still need/);
  assertStringIncludes(mixed, "Confirmed by the salon " + String.fromCharCode(0xb7) + " Confirmed by the client, as told to staff");
});

Deno.test("replies: the words come from the pack", () => {
  const a = row({ kind: "job", status: "active", summary: "Brakes", number: 42 });
  assertStringIncludes(requestLine(a, ctx(garageV1)), "In the shop");
  assertStringIncludes(statusChangedReply(a, ctx(garageV1)).body, "Job 42");
  assertStringIncludes(statusChangedReply(a, ctx(garageV1)).body, "is now In the shop.");
  assertStringIncludes(statusChangedReply(a, ctx(tutorV1)).body, "Project");
  assertStringIncludes(statusChangedReply(a, ctx(tutorV1)).body, "Under way");
  const closed = row({ kind: "job", status: "closed", outcome: "completed" });
  assertStringIncludes(requestLine(closed, ctx(garageV1)), "Collected");
  assertStringIncludes(requestLine(closed, ctx(tutorV1)), "Handed in");
  // The side and the customer come from the pack.
  assertStringIncludes(summaryReply(row(), ctx(salonV1)).body, "the salon and from the client");
  assertStringIncludes(summaryReply(row(), ctx(tutorV1)).body, "the studio and from the student");
  assertStringIncludes(summaryReply(row({ kind: "enquiry", status: "new", number: 5 }), ctx(gymV1)).body, "Enquiry 5");
  assertStringIncludes(summaryReply(row({ number: 6 }), ctx(gymV1)).body, "Visit 6");
});

Deno.test("replies: a status the pack has no word for is shown plainly, never invented", () => {
  const thin = { ...salonV1, words: { ...salonV1.words, status: { appointment: { requested: "Requested" } } } } as unknown as Pack;
  assertStringIncludes(requestLine(row({ status: "closed", outcome: "no_show" }), ctx(thin)), "No show");
});

Deno.test("replies: a list says it covers only what was entered in Kabsi, shows 15 rows, then how many more", () => {
  const c = ctx(salonV1);
  const rows = Array.from({ length: 15 }, (_, i) => row({ number: i + 1, customer_name: `Client ${i + 1}` }));
  const l = openListReply(rows, 7, c);
  assertEquals(MAX_ROWS, 15);
  assertStringIncludes(l.body, "22 open.");
  assertStringIncludes(l.body, "and 7 more");
  assertStringIncludes(l.body, COVERS_NOTE);
  assertEquals(l.body.split("\n").filter((x) => x.startsWith("#")).length, 15);
  assertEquals(l.buttons, undefined);

  // More than 15 handed in: only 15 are shown and the rest are counted.
  const twenty = Array.from({ length: 20 }, (_, i) => row({ number: i + 1 }));
  const t = openListReply(twenty, 0, c);
  assertEquals(t.body.split("\n").filter((x) => x.startsWith("#")).length, 15);
  assertStringIncludes(t.body, "and 5 more");
  assertStringIncludes(t.body, "20 open.");

  // Exactly 15 and none more: no "more" line.
  assertNotMatch(openListReply(rows, 0, c).body, /more/);
  // Nothing open still says what it covers.
  assertEquals(openListReply([], 0, c).body, `Nothing is open.\n${COVERS_NOTE}`);
  assertEquals(openListReply([], 0, c, { unconfirmed: true }).body, `No appointments are waiting for a confirmation.\n${COVERS_NOTE}`);
  assertEquals(openListReply([], 0, ctx(garageV1), { unconfirmed: true, kind: "job" }).body.startsWith("No jobs"), true);
  // A search that finds several says it too.
  const f = foundReply(rows.slice(0, 3), 0, c);
  assertStringIncludes(f.body, "3 found. Which one? Send its number.");
  assertStringIncludes(f.body, COVERS_NOTE);
  assertStringIncludes(foundReply([], 0, c).body, COVERS_NOTE);
  assertStringIncludes(foundReply(rows.slice(0, 15), 4, c).body, "and 4 more");
});

Deno.test("replies: a list of more than one kind is grouped by the pack's own words, in the pack's order", () => {
  const c = ctx(gymV1);
  const body = openListReply([row({ kind: "appointment", status: "requested" }), row({ kind: "enquiry", status: "new", summary: "Trial" }), row({ kind: "enquiry", status: "contacted", summary: "Price" })], 0, c).body;
  const lines = body.split("\n");
  assert(lines.indexOf("Enquiries") < lines.indexOf("Visits"), body);
  assertStringIncludes(body, "Not contacted");
  assertStringIncludes(body, "Contacted");
});

Deno.test("replies: a request with no time says so, and the customer's own words are shown with that note", () => {
  const c = ctx(salonV1);
  assertStringIncludes(requestLine(row({ starts_at: null, requested_window_text: "Thursday afternoon" }), c), "Thursday afternoon, no time set");
  assertStringIncludes(summaryReply(row({ starts_at: null }), c).body, "When: no time entered");
  assertStringIncludes(summaryReply(row(), c).body, "When: Thu 12 Nov 15:00");
  assertEquals(formatWhen("2026-11-08T11:00:00.000Z", TZ, NOW), "Today 15:00");
  assertEquals(formatWhen("2026-11-09T06:00:00.000Z", TZ, NOW), "Tomorrow 10:00");
});

Deno.test("replies: the summary of an appointment says it is a note in Kabsi and nothing else", () => {
  const s = summaryReply(row(), ctx(salonV1)).body;
  assertStringIncludes(s, "This is a note in Kabsi. It is not entered in any other diary.");
  assertStringIncludes(summaryReply(row({ kind: "job", status: "waiting" }), ctx(garageV1)).body, "This is what was entered in Kabsi.");
});

Deno.test("replies: a message with buttons stays under 1,024 characters, however long the record is", () => {
  const long = "x".repeat(1000);
  const c = ctx(garageV1);
  const r = row({ kind: "job", status: "ready", summary: long, customer_name: "N".repeat(200), requested_window_text: long, next_action: long });
  for (const rep of [
    savedReply(r, c), statusChangedReply(r, c, ["arrival_not_recorded"]), confirmationReply(r, c),
    askFirstReply(r, c, { to: "ready", outcome: null, flags: ["arrival_not_recorded"] }),
    correctedReply(r, Array.from({ length: 30 }, (_, i) => ({ field: "summary", before: long, after: `${long}${i}` })), c, ["confirmations_cleared"]),
    convertedReply(r, r, c),
    proposalReply({ kind: "job", name: "N".repeat(900), summary: long, norm: normalizeMessage("tomorrow 10", { country: "AE", timeZone: TZ, now: NOW, pack: garageV1 }) }, c),
  ]) {
    assert(rep.body.length <= BUTTON_BODY_MAX, `${rep.body.length}`);
    assert(rep.buttons && rep.buttons.length >= 1);
  }
  // A summary and a list are plain text and stay inside the plain text limit.
  assert(summaryReply(r, c).body.length <= 4096);
  assert(openListReply(Array.from({ length: 15 }, () => r), 50, c).body.length <= 4096);
  // The gate itself.
  assertEquals(finish("x".repeat(2000), ["Save"]).body.length <= BUTTON_BODY_MAX, true);
  assertEquals(finish("x".repeat(5000)).body.length <= 4096, true);
  assertEquals(finish("hi", ["a", "b", "c", "d"]).buttons?.length, 3);
  assertEquals(finish("hi", ["A button title that is far too long"]).buttons?.[0]!.length, 20);
  assertEquals(finish("hi", []).buttons, undefined);
});

Deno.test("replies: the buttons are Save and Change for a proposal, Undo after a change, Yes and No for a question", () => {
  const c = ctx(salonV1);
  const norm = normalizeMessage("Sarah highlights tomorrow 10, 0501234567", { country: "AE", timeZone: TZ, now: NOW, pack: salonV1 });
  const p = proposalReply({ kind: "appointment", name: "Sarah", summary: "Highlights", norm }, c);
  assertEquals(p.buttons, ["Save", "Change"]);
  assertStringIncludes(p.body, "Appointment: Sarah \u00b7 +971501234567 \u00b7 Highlights \u00b7 Tomorrow 10:00");
  assertStringIncludes(p.body, "Nothing is saved until you tap Save.");
  for (const rep of [savedReply(row(), c), statusChangedReply(row(), c), confirmationReply(row(), c), correctedReply(row(), [{ field: "summary", before: "A", after: "B" }], c)]) {
    assertEquals(rep.buttons, ["Undo"]);
  }
  assertEquals(askFirstReply(row(), c, { to: "closed", outcome: "cancelled", flags: [] }).buttons, ["Yes", "No"]);
  assertEquals(summaryReply(row(), c).buttons, undefined);
  assertEquals(undoneReply(row(), c).buttons, undefined);
});

Deno.test("replies: a proposal shows what was read, leaves out what was not, and a time with two readings is a button each", () => {
  const c = ctx(salonV1);
  const read = (t: string) => normalizeMessage(t, { country: "AE", timeZone: TZ, now: NOW, pack: salonV1 });
  // Nothing readable: no time, no phone, no invented value.
  const empty = proposalReply({ kind: "appointment", name: null, summary: null, norm: read("ok thanks") }, c);
  assertStringIncludes(empty.body, "nothing readable yet");
  assertNotMatch(empty.body, /\+9|Today|Tomorrow|Thu|Fri/);
  // A day part has no exact time and the reply says so.
  const part = proposalReply({ kind: "appointment", name: "Sarah", summary: "Highlights", norm: read("Sarah highlights Thursday afternoon") }, c);
  assertStringIncludes(part.body, "Thu 12 Nov, afternoon, no exact time");
  assertNotMatch(part.body, /\d\d:\d\d/);
  // Thursday 3 is the morning or the afternoon: two buttons, no Save.
  const amb = proposalReply({ kind: "appointment", name: "Maya", summary: "Trim", norm: read("Maya trim Thursday 3") }, c);
  assertEquals(amb.buttons?.length, 2);
  assertEquals(amb.buttons, ["Thu 12 Nov 03:00", "Thu 12 Nov 15:00"]);
  assertStringIncludes(amb.body, "Which time did you mean? Nothing is saved until you tap.");
  // Two phone numbers are both shown.
  const two = proposalReply({ kind: "appointment", name: "Maya", summary: null, norm: read("Maya 0501234567 or 0551234567") }, c);
  assertStringIncludes(two.body, "+971501234567 or +971551234567");
});

Deno.test("replies: a skipped step asks first, in the pack's words, and says what was never recorded", () => {
  const c = ctx(garageV1);
  const waiting = row({ kind: "job", status: "waiting", number: 42 });
  const a = askFirstReply(waiting, c, { to: "ready", outcome: null, flags: ["arrival_not_recorded"] });
  assertEquals(a.body, "Job 42 is still Waiting, and the step before Ready was never recorded.\nMark it Ready anyway?");
  const done = askFirstReply(waiting, c, { to: "closed", outcome: "completed", flags: ["arrival_not_recorded"] });
  assertStringIncludes(done.body, "Close it as Collected anyway?");
  const cancel = askFirstReply(row({ kind: "job", status: "active", number: 42 }), c, { to: "closed", outcome: "cancelled", flags: [] });
  assertEquals(cancel.body, "This closes Job 42 as Cancelled.\nGo ahead?");
  const reopen = askFirstReply(row({ kind: "job", status: "closed", outcome: "completed", number: 42 }), c, { to: "ready", outcome: null, flags: ["reopened"], reopen: true });
  assertEquals(reopen.body, "Job 42 is closed as Collected.\nReopen it?");
  const att = askFirstReply(row({ number: 7, starts_at: null }), ctx(salonV1), { to: "closed", outcome: "attended", flags: ["attended_without_time"] });
  assertEquals(att.body, "Appointment 7 has no time entered.\nClose it as Came in anyway?");
  const early = askFirstReply(row({ number: 7 }), ctx(salonV1), { to: "closed", outcome: "no_show", flags: ["no_show_before_time"] });
  assertEquals(early.body, "Appointment 7 has a time that has not come yet.\nClose it as No show anyway?");
  // A move that skipped a step and was applied after the owner's yes says so, and invents no step.
  const done2 = statusChangedReply(row({ kind: "job", status: "ready", number: 42 }), c, ["arrival_not_recorded"]);
  assertStringIncludes(done2.body, "The step before was never recorded, and Kabsi has not added one.");
});

Deno.test("replies: a correction shows before and after in the pack's words, and says when the time change cleared both confirmations", () => {
  const c = ctx(salonV1);
  const r = correctedReply(row({ number: 12 }), [
    { field: "summary", before: "Highlights", after: "Trim" },
    { field: "starts_at", before: "2026-11-12T11:00:00.000Z", after: "2026-11-13T07:00:00.000Z" },
    { field: "next_action", before: null, after: "Call back" },
    { field: "stylist", before: "Rana", after: "Dina" },
  ], c, ["confirmations_cleared"]);
  assertEquals(r.body, [
    "Appointment 12",
    "service changed from Highlights to Trim.",
    "when changed from Thu 12 Nov 15:00 to Fri 13 Nov 11:00.",
    "next step changed from nothing to Call back.",
    "with changed from Rana to Dina.",
    "The time changed, so both confirmations were cleared.",
  ].join("\n"));
  assertEquals(r.buttons, ["Undo"]);
});

Deno.test("replies: a conversion keeps the enquiry on record and records no confirmation", () => {
  const c = ctx(gymV1);
  const created = row({ kind: "appointment", number: 15, customer_name: "Maya", summary: "Trial" });
  const r = convertedReply({ kind: "enquiry", number: 12 }, created, c);
  assertStringIncludes(r.body, "Enquiry 12 became Visit 15 for Maya.");
  assertStringIncludes(r.body, "The enquiry stays on record.");
  assertStringIncludes(r.body, "No confirmation has been recorded yet.");
  assertNotMatch(r.body, /Confirmed by/);
  assertNotMatch(convertedReply({ kind: "enquiry", number: 12 }, row({ kind: "job", status: "waiting" }), ctx(garageV1)).body, /No confirmation/);
});

Deno.test("replies: confirmation, saved and undone replies are built from the record the database holds", () => {
  const c = ctx(salonV1);
  const after = row({ number: 9, staff_confirmed: true });
  const conf = confirmationReply(after, c).body;
  assertStringIncludes(conf, "Appointment 9 updated.");
  assertStringIncludes(conf, "Confirmed by the salon. Still needs confirmation from the client");
  assertNotMatch(conf, /Confirmed by the client/);
  assertEquals(savedReply(row({ number: 3 }), c).body.split("\n")[0], "Appointment 3 saved.");
  assertEquals(undoneReply(row({ number: 3, status: "closed", outcome: "attended" }), c).body, "Undone. Appointment 3 is back to Came in.");
});

Deno.test("replies: every refusal is in words with what to do next, and shows no code, name or value", () => {
  for (const code of KNOWN_REFUSALS) {
    const r = refusalReply({ reason: code });
    assertRules(r.body, r.buttons, code);
    assertNotMatch(r.body, /[a-z]+_[a-z_]+/, `${code} shows a code`);
    assertNotMatch(r.body, /[0-9a-f]{8}-[0-9a-f]{4}/);
    assert(r.body.endsWith(".") || r.body.endsWith("?"), code);
    assertEquals(r.buttons, undefined);
  }
  assertEquals(refusalReply({ reason: "something_new" }).body, "That did not go through. Nothing was changed.");
  assertStringIncludes(refusalReply({ reason: "forbidden" }).body, "Only an owner or a manager");
  assertStringIncludes(refusalReply({ reason: "window_passed" }).body, "10 minutes");
});

Deno.test("replies: no reply text uses a retired name, an exclamation mark or a dash", () => {
  const all: string[] = [];
  for (const pack of [...PACKS, tutorV1]) {
    const c = ctx(pack);
    for (const kind of pack.kinds as Kind[]) all.push(summaryReply(row({ kind, status: OPEN_STATUSES[kind][0]! }), c).body);
  }
  all.push(...KNOWN_REFUSALS.map((k) => refusalReply({ reason: k }).body));
  for (const t of all) {
    assertNotMatch(t, NO_DASH);
    assertNotMatch(t, /Profile Score|Do now|Listing Shield|Put mine back|Weekly Care Report/);
    assertMatch(t, /\S/);
  }
  assert(KINDS.length === 3);
});

// ---- found by the independent review ---------------------------------------------------------------------------

Deno.test("replies: a time with no day, or with too many readings, never gives an empty button or a Save", () => {
  const c = ctx(salonV1);
  const read = (t: string) => normalizeMessage(t, { country: "AE", timeZone: TZ, now: NOW, pack: salonV1 });
  const noDay = proposalReply({ kind: "appointment", name: "Sarah", summary: "Haircut", norm: read("Sarah haircut at 3") }, c);
  assertEquals(noDay.buttons, ["03:00", "15:00"]);
  assertNotMatch(noDay.body, / or \n| or $/);
  for (const text of ["Sarah next sunday 3", "Sarah sunday 3"]) {
    const many = proposalReply({ kind: "appointment", name: "Sarah", summary: null, norm: read(text) }, c);
    assertEquals(many.buttons, ["Change"], text);
    assertNotMatch(many.body, /Save/);
    assertStringIncludes(many.body, "Say the day and the hour");
  }
  // Two phone numbers are two buttons, and nothing can be saved until one is chosen.
  const phones = proposalReply({ kind: "appointment", name: "Maya", summary: null, norm: read("Maya 0501234567 or 0551234567") }, c);
  assertEquals(phones.buttons, ["+971501234567", "+971551234567"]);
  assertNotMatch(phones.body, /tap Save/);
  for (const text of ["Sarah at 3", "Sarah next sunday 3", "Maya 0501234567 or 0551234567", "Sarah tomorrow 10"]) {
    const r = proposalReply({ kind: "appointment", name: "Sarah", summary: null, norm: read(text) }, c);
    for (const b of r.buttons ?? []) assert(b.trim().length > 0, `${text}: empty button`);
  }
});

Deno.test("replies: a long list never loses its footer or its count; the rows are what shrink", () => {
  const c = ctx(salonV1);
  const long = (i: number) => row({ number: i, customer_name: "N".repeat(200), summary: "S".repeat(300), starts_at: null, requested_window_text: "W".repeat(200) });
  const rows = Array.from({ length: 15 }, (_, i) => long(i + 1));
  const l = openListReply(rows, 40, c, { unconfirmed: true }).body;
  assert(l.length <= 4096, `${l.length}`);
  assertStringIncludes(l, COVERS_NOTE);
  assertMatch(l, /and \d+ more/);
  const total = Number(l.match(/^(\d+) /)![1]);
  const shownRows = l.split("\n").filter((x) => x.startsWith("#")).length;
  assertEquals(total, 55);
  assertEquals(Number(l.match(/and (\d+) more/)![1]) + shownRows, 55);
  // The same for a search with several hits.
  const f = foundReply(rows, 40, c).body;
  assertStringIncludes(f, COVERS_NOTE);
  assertMatch(f, /and \d+ more/);
});

Deno.test("replies: a correction with many changes keeps its note about the confirmations and counts what it left out", () => {
  const c = ctx(salonV1);
  const changes = Array.from({ length: 12 }, (_, i) => ({ field: "summary", before: "B".repeat(80), after: `${"A".repeat(78)}${i}` }));
  const r = correctedReply(row({ number: 12 }), changes, c, ["confirmations_cleared"]);
  assert(r.body.length <= 1024);
  assertStringIncludes(r.body, "The time changed, so both confirmations were cleared.");
  assertMatch(r.body, /and \d+ more changes/);
});

Deno.test("replies: tomorrow is the next date on the business's calendar, not 24 hours on", () => {
  const ny = "America/New_York";
  const night = new Date("2027-03-14T04:30:00Z"); // 23:30 on 13 Mar in New York
  assertEquals(formatWhen("2027-03-14T14:00:00.000Z", ny, night), "Tomorrow 10:00");
  assertEquals(formatWhen("2027-03-15T14:00:00.000Z", ny, night), "Mon 15 Mar 10:00");
  assertEquals(formatWhen("2027-03-14T03:00:00.000Z", ny, night), "Today 22:00");
  // A zone that is not a zone gives no text rather than an error.
  assertEquals(formatWhen("2027-03-14T14:00:00.000Z", "Not/AZone", night), "");
});
