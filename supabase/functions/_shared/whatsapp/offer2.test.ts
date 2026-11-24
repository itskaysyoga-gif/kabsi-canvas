// Run: deno test supabase/functions/_shared/whatsapp/offer2.test.ts
// OFFER-2 (blueprint 3.1 section 11, launch checklist line 16): the owner's Google-care tools on WhatsApp, on the fake world
// with a stubbed router (no database, no Kapso, no model call). Each of the seven sentences of checklist line 16 reaches the
// right tool; manager and staff phones get only their tools; a voice or forwarded yes approves nothing; off-topic gets the
// fixed line; a weekly hours change replaces only the named day and the text shown is what is sent; name, address, category,
// description and services are refused; and 50 stored warnings of one kind send one staff alert.
import assert from "node:assert/strict";
import { receive } from "./agent.ts";
import type { Media } from "./channel.ts";
import { routerSystem } from "./intent.ts";
import { TOOLS } from "./roles.ts";
import { daysIn, isGuideField, isWeekly, numberIn, parseContact, parseWeekDay } from "./google-care.ts";
import { DAY_KEYS, rawToWeek, regularHoursDisplay, weekSummary } from "../hours.ts";
import { matrixPng, qrPng } from "./qr-png.ts";
import { type OpsEvent, planAlerts } from "./staff-alerts.ts";
import { SAY } from "./say.ts";
import { BIZ, msg, PHONES, World } from "./world.test-helpers.ts";

const tool = (t: string, args: Record<string, string> = {}) => JSON.stringify({ tool: t, args, lang: "en" });
const img = (id: string): Media => ({ kind: "image", id, mime: "image/jpeg", filename: null, size: 2000, voice: false });
const jpeg = (n = 64) => { const b = new Uint8Array(n); b.set([0xff, 0xd8, 0xff, 0xe0]); return b; };
const ogg = (seconds: number) => {
  const page = new Uint8Array(40);
  page.set([0x4f, 0x67, 0x67, 0x53, 0, 4]);
  let g = BigInt(Math.round(seconds * 48_000));
  for (let j = 0; j < 8; j++) { page[6 + j] = Number(g & 0xffn); g >>= 8n; }
  return page;
};
const voice = (id: string): Media => ({ kind: "audio", id, mime: "audio/ogg; codecs=opus", filename: null, size: 20_000, voice: true });

/** One message; every reply checked for the house rules. Returns the result and the replies. */
async function send(w: World, from: string, o: { text?: string; button?: string; media?: Media; forwarded?: boolean }) {
  const before = w.sent.length;
  const result = await receive(w.deps(), msg(w, from, o));
  const replies = w.sent.slice(before);
  for (const r of replies) {
    assert.doesNotMatch(r.body, /[–—!]/, `no dash or exclamation mark in ${r.body}`);
    for (const name of w.foreignNames(r.to)) assert.ok(!r.body.includes(name), `${name} never shown to ${r.to}`);
  }
  return { result, replies, last: replies.at(-1) };
}
const approveId = (w: World, phone: string) => {
  for (let i = w.outbox.length - 1; i >= 0; i--) {
    const b = w.outbox[i].phone === phone ? w.outbox[i].buttons.find((x) => x.id.startsWith("wy:")) : undefined;
    if (b) return b.id;
  }
  throw new Error(`no Approve button for ${phone}`);
};

// ─── Checklist line 16: the seven sentences, each to its tool with a stubbed router.

Deno.test("checklist 16: \"What needs my attention?\" lists what is waiting, numbered", async () => {
  const w = new World();
  w.aiMap["What needs my attention?"] = tool("waiting");
  w.problems.set(BIZ.harbour, [{ id: "pc-1", label: "opening hours" }]);
  const r = await send(w, PHONES.owner, { text: "What needs my attention?" });
  assert.equal(r.result, "care_waiting");
  assert.match(r.last!.body, /Waiting for you\n1\. Reply ready: Maria, 5 stars\n2\. Reply ready: Sam, 1 star\n3\. Found on Google: your opening hours changed\n\nSend a number to open one\./);
  assert.equal(w.conversation(PHONES.owner).open_question?.type, "waiting");
});

Deno.test("checklist 16: \"Make this reply more professional\" rewrites the last review's draft", async () => {
  const w = new World();
  w.conversation(PHONES.owner).last_task = { type: "review", review_id: "r-harbour-1", location_id: BIZ.harbour };
  w.aiMap["Make this reply more professional"] = tool("edit_draft", { instruction: "more professional" });
  const r = await send(w, PHONES.owner, { text: "Make this reply more professional" });
  assert.equal(r.result, "shown_for_yes");
  assert.ok(w.calls.includes("edit:r-harbour-1:more professional"));
});

Deno.test("checklist 16: \"Change my opening hours on Saturday\" asks one question, then shows the week for Approve", async () => {
  const w = new World();
  w.aiMap["Change my opening hours on Saturday"] = tool("week_hours", { text: "Change my opening hours on Saturday" });
  const a = await send(w, PHONES.owner, { text: "Change my opening hours on Saturday" });
  assert.equal(a.result, "care_week_no_times");
  assert.match(a.last!.body, /What are your new hours on Saturdays\?/);
  const b = await send(w, PHONES.owner, { text: "10am to 4pm" });
  assert.equal(b.result, "care_week_shown");
  assert.deepEqual(b.last!.buttons, ["Approve"]);
  assert.match(b.last!.body, /Saturday: 10:00 to 16:00/);
  assert.equal(w.listingWrites.length, 0, "nothing is sent before the tap");
});

Deno.test("checklist 16: a photo with \"Post this\" becomes a post with that photo for the owner's yes", async () => {
  const w = new World();
  w.photoDraft = "Late appointments are here. Every Thursday this month we stay open later, so you can drop in after work for a fresh coffee and a quiet table. Come by Harbour Lane Coffee on Thursday evening.";
  w.mediaBytes.set("pp9", jpeg());
  const r = await send(w, PHONES.owner, { media: img("pp9"), text: "Post this" });
  assert.equal(r.result, "photo_post_shown");
  assert.deepEqual(r.last!.buttons, ["Approve", "Edit on kabsi.co", "Skip"]);
  // With AI drafting off, "Post this" alone is never posted as words: the photo goes the plain photo way.
  const w2 = new World();
  w2.mediaBytes.set("pp8", jpeg());
  const r2 = await send(w2, PHONES.owner, { media: img("pp8"), text: "Post this" });
  assert.equal(r2.result, "photo");
  assert.equal(w2.posts.size, 0);
});

Deno.test("checklist 16: \"How many reviews did I receive this month?\" gives the 30-day numbers", async () => {
  const w = new World();
  w.aiMap["How many reviews did I receive this month?"] = tool("stats", { days: "30" });
  const r = await send(w, PHONES.owner, { text: "How many reviews did I receive this month?" });
  assert.equal(r.result, "stats");
  assert.match(r.last!.body, /the last 30 days/);
});

Deno.test("checklist 16: \"Show me everything you did this week\" gives the latest weekly summary and the report link", async () => {
  const w = new World();
  w.reports.set(BIZ.harbour, { week_of: "2026-11-23", data: { period: { from: "2026-11-16", to: "2026-11-22" }, new_reviews: 4, replied: 3, waiting: 1, taps: { total: 12 } } });
  w.aiMap["Show me everything you did this week"] = tool("done");
  const r = await send(w, PHONES.owner, { text: "Show me everything you did this week" });
  assert.equal(r.result, "care_done");
  assert.match(r.last!.body, /Your week from 16 November\n4 new reviews, 3 answered through Kabsi\n1 waiting for your yes\n12 taps on your review link and cards\n\nThe full report: https:\/\/kabsi\.co\/app\/report/);
});

Deno.test("checklist 16: \"Send me my review QR code\" sends the QR code as an image", async () => {
  const w = new World();
  w.aiMap["Send me my review QR code"] = tool("qr");
  const r = await send(w, PHONES.owner, { text: "Send me my review QR code" });
  assert.equal(r.result, "qr_image");
  assert.equal(r.last!.kind, "image");
  assert.match(r.last!.body, /your review QR code/);
});

Deno.test("the router is told the Google-care tools, and never the request book's while it is off", () => {
  const owner = routerSystem("owner");
  for (const t of ["waiting", "done", "hours_now", "week_hours", "contact_change", "guide_field", "qr", "stats", "edit_draft", "post"]) {
    assert.match(owner, new RegExp(`^- ${t}: `, "m"), t);
  }
  assert.doesNotMatch(owner, /request_(new|find)/);
});

// ─── Roles: a manager and a staff phone get only their own tools.

Deno.test("roles: a manager has the Google-care tools but not billing; staff have neither, and cannot approve a change", async () => {
  assert.ok((TOOLS.manager as readonly string[]).includes("week_hours"));
  assert.ok(!(TOOLS.manager as readonly string[]).includes("billing"));
  for (const t of ["waiting", "done", "hours_now", "week_hours", "contact_change", "billing", "edit_draft"]) {
    assert.ok(!(TOOLS.staff as readonly string[]).includes(t), `staff never get ${t}`);
    assert.doesNotMatch(routerSystem("staff"), new RegExp(`^- ${t}: `, "m"));
  }
  const w = new World();
  assert.equal((await send(w, PHONES.manager, { text: "what needs my attention" })).result, "care_waiting");
  assert.equal((await send(w, PHONES.manager, { text: "plan" })).result, "billing_owner_only");
  assert.equal((await send(w, PHONES.staff, { text: "what needs my attention" })).result, "not_for_staff");
  assert.equal((await send(w, PHONES.staff, { text: "Saturdays 10am to 4pm" })).result, "not_for_staff");
  assert.equal((await send(w, PHONES.staff, { text: "Our new phone number is +1 205 555 0100" })).result, "not_for_staff");
  // A manager's tap approves; the database checks the rights again.
  assert.equal((await send(w, PHONES.manager, { text: "Saturdays 10am to 4pm" })).result, "care_week_shown");
  assert.equal((await send(w, PHONES.manager, { button: approveId(w, PHONES.manager) })).result, "listing_approved");
  assert.equal(w.listingWrites.length, 1);
});

// ─── Spoken and forwarded words never approve.

Deno.test("a forwarded yes, a voice yes and a typed yes approve nothing; only the tap on Approve does", async () => {
  const w = new World();
  assert.equal((await send(w, PHONES.owner, { text: "Our new phone number is +1 205 555 0100" })).result, "care_contact_shown");
  assert.equal((await send(w, PHONES.owner, { text: "Yes", forwarded: true })).result, "forwarded_yes");
  w.mediaBytes.set("v9", ogg(4));
  w.transcript = { ok: true, text: "Yes", language: "en" };
  assert.equal((await send(w, PHONES.owner, { media: voice("v9") })).result, "forwarded_yes");
  assert.equal((await send(w, PHONES.owner, { text: "yes" })).result, "listing_tap_approve");
  assert.equal(w.listingWrites.length, 0, "nothing was written by a word");
  assert.equal(w.calls.filter((c) => c.startsWith("listing:")).length, 0);
  assert.equal((await send(w, PHONES.owner, { button: approveId(w, PHONES.owner) })).result, "listing_approved");
  assert.equal(w.listingWrites.length, 1);
  // The same tap again changes nothing.
  const id = w.outbox.flatMap((r) => r.buttons).find((b) => b.id.startsWith("wy:"))!.id;
  assert.equal((await send(w, PHONES.owner, { button: id })).result, "listing_closed");
  assert.equal(w.listingWrites.length, 1);
});

// ─── Off-topic.

Deno.test("off-topic: one fixed line that ends with the way to a person at hello@kabsi.co, and no model call", async () => {
  const w = new World();
  const before = w.aiCalls;
  const r = await send(w, PHONES.owner, { text: "write me a poem about the sea" });
  assert.equal(r.result, "off_topic");
  assert.equal(w.aiCalls, before);
  assert.match(r.last!.body, /email hello@kabsi\.co\.$/);
  // Spanish too: the same fixed line.
  const r2 = await send(w, PHONES.owner, { text: "escribe un poema sobre el mar" });
  assert.equal(r2.result, "off_topic");
  assert.match(r2.last!.body, /hello@kabsi\.co\.$/);
  assert.match(SAY.offTopic, /To talk to a person, send "talk to a person" or email hello@kabsi\.co\.$/);
});

// ─── The weekly hours: only the named day, and what is shown is what is sent.

Deno.test("weekly hours: only the named day changes, and the week shown equals the week sent to Google", async () => {
  const w = new World();
  const before = rawToWeek(w.weekHours.get(BIZ.harbour)!);
  const r = await send(w, PHONES.owner, { text: "From now on we open Saturdays 10am to 4pm" });
  assert.equal(r.result, "care_week_shown");
  assert.equal((await send(w, PHONES.owner, { button: approveId(w, PHONES.owner) })).result, "listing_approved");
  const sent = w.listingWrites[0]!.change as { field: string; raw: { periods: [] }; display: string; shown: string[] };
  assert.equal(sent.field, "regular_hours");
  const after = rawToWeek(sent.raw);
  for (const d of DAY_KEYS) {
    if (d === "SATURDAY") assert.deepEqual(after[d], [{ open: "10:00", close: "16:00" }]);
    else assert.deepEqual(after[d], before[d], `${d} unchanged`);
  }
  // The display sent is Google's own line for the week sent, and the lines the owner read are that same week.
  assert.equal(sent.display, regularHoursDisplay(sent.raw));
  for (const line of weekSummary(after)) assert.ok(r.last!.body.includes(line), `shown: ${line}`);
  assert.deepEqual(sent.shown, weekSummary(after));
});

Deno.test("weekly hours: closed on a day, two days at once, impossible times, the same hours, and a date stays special hours", async () => {
  const w = new World();
  assert.equal((await send(w, PHONES.owner, { text: "We are closed on Mondays from now on" })).result, "care_week_shown");
  assert.equal((await send(w, PHONES.owner, { text: "every Friday and Saturday 9 to 5" })).result, "care_week_two_days");
  assert.equal((await send(w, PHONES.owner, { text: "Saturdays 5pm to 1pm" })).result, "care_week_bad_time");
  assert.equal((await send(w, PHONES.owner, { text: "Mondays 9am to 5pm" })).result, "care_week_same");
  assert.deepEqual(parseWeekDay("closed on sundays"), { ok: true, day: "SUNDAY", periods: [] });
  assert.equal(isWeekly("closed tomorrow"), false);
  assert.equal(isWeekly("open 10 to 2 on Friday"), false, "a one-off day stays special hours");
  assert.equal(isWeekly("Change my opening hours on Saturday"), true);
  assert.deepEqual(daysIn("saturdays and sundays"), ["SATURDAY", "SUNDAY"]);
  assert.equal(w.listingWrites.length, 0);
});

// ─── Phone and website, shown exactly.

Deno.test("phone and website: the value shown is the value sent", async () => {
  const w = new World();
  const r = await send(w, PHONES.owner, { text: "Please update our website to www.harbourlane-coffee.example" });
  assert.equal(r.result, "care_contact_shown");
  assert.match(r.last!.body, /New website for Google\nhttps:\/\/www\.harbourlane-coffee\.example\n/);
  await send(w, PHONES.owner, { button: approveId(w, PHONES.owner) });
  assert.deepEqual(w.listingWrites[0]!.change, { field: "website", value: "https://www.harbourlane-coffee.example" });
  assert.deepEqual(parseContact("our new phone number is +1 (205) 555-0100"), { ok: true, field: "phone", value: "+1 (205) 555-0100" });
  assert.deepEqual(parseContact("change the number"), { ok: false, why: "no_value" });
  assert.equal((await send(w, PHONES.owner, { text: "change the phone number" })).result, "care_contact_ask");
});

// ─── Refused fields.

Deno.test("name, address, category, description and services are refused with the guide line and the kabsi.co link", async () => {
  for (const text of ["Change our business name to Harbour Lane Roasters", "Update our address, we moved to 12 Main Street",
    "Change our category to bakery", "Update the description on Google", "Add a new service: oat milk lattes"]) {
    const w = new World();
    assert.ok(isGuideField(text), text);
    const r = await send(w, PHONES.owner, { text });
    assert.equal(r.result, "care_guide", text);
    assert.match(r.last!.body, /https:\/\/kabsi\.co\/guides\//);
    assert.equal(w.listingWrites.length, 0);
    assert.equal(w.aiCalls, 0, "read by code, no model call");
  }
  // The router's own word for it gets the same line.
  const w = new World();
  w.aiMap["can you fix how our place is described"] = tool("guide_field");
  assert.equal((await send(w, PHONES.owner, { text: "can you fix how our place is described" })).result, "care_guide");
});

// ─── The waiting list by number.

Deno.test("waiting: a number opens an item, and an edit can name a review by its number", async () => {
  const w = new World();
  await send(w, PHONES.owner, { text: "what needs my attention" });
  const open = await send(w, PHONES.owner, { text: "1" });
  assert.equal(open.result, "shown_for_yes");
  assert.equal(w.conversation(PHONES.owner).last_task?.review_id, "r-harbour-1");
  await send(w, PHONES.owner, { text: "what needs my attention" });
  w.aiMap["make 2 shorter"] = tool("edit_draft", { instruction: "shorter" });
  await send(w, PHONES.owner, { text: "make 2 shorter" });
  assert.ok(w.calls.includes("edit:r-harbour-high:shorter"), "review 2 of the list");
  assert.equal(numberIn("number 3 please"), 3);
  assert.equal(numberIn("make it shorter"), null);
  // Nothing waiting at a business with nothing open.
  const w2 = new World();
  w2.reviews.clear();
  assert.equal((await send(w2, PHONES.owner, { text: "what needs my attention" })).result, "care_waiting_none");
});

Deno.test("hours now: the stored weekly hours, or the link when Kabsi has none", async () => {
  const w = new World();
  const r = await send(w, PHONES.owner, { text: "my hours" });
  assert.equal(r.result, "care_hours_now");
  assert.match(r.last!.body, /Mon to Fri: 09:00 to 17:00\nSat to Sun: Closed/);
  w.weekHours.clear();
  assert.equal((await send(w, PHONES.owner, { text: "my hours" })).result, "care_hours_none");
});

Deno.test("the QR image is a PNG of the code", async () => {
  const png = await qrPng("https://kabsi.co/review/abc123");
  assert.deepEqual([...png.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const tiny = await matrixPng([[true, false], [false, true]], 1);
  assert.ok(tiny.length > 40);
});

// ─── Item 6: staff alerts, at most one of a kind an hour, and one "back to normal" line.

Deno.test("staff alerts: 50 stored warnings of one kind send one alert; more within the hour send none; quiet for an hour sends one back-to-normal line", () => {
  const t0 = new Date("2026-11-24T08:00:00Z");
  const ev = (i: number, kind = "job_failed"): OpsEvent => ({ id: i, kind, channel: "alerts", title: "Jobs failing", body: `job ${i}`,
    created_at: new Date(t0.getTime() - 10 * 86_400_000 + i * 60_000).toISOString() });
  const fifty = Array.from({ length: 50 }, (_, i) => ev(i + 1));
  const a = planAlerts(fifty, {}, t0);
  assert.equal(a.send.length, 1, "one alert for 50 warnings");
  assert.equal(a.send[0]!.count, 50);
  assert.match(a.send[0]!.body, /50 alerts of this kind came in together/);
  // The next ticks within the hour: 30 more stored warnings, nothing sent.
  const b = planAlerts(Array.from({ length: 30 }, (_, i) => ev(100 + i)), a.state, new Date(t0.getTime() + 20 * 60_000));
  assert.equal(b.send.length, 0);
  assert.equal(b.clear.length, 0);
  // Over an hour after the last one seen, with none new: one back-to-normal line, then nothing more.
  const c = planAlerts([], b.state, new Date(t0.getTime() + 85 * 60_000));
  assert.equal(c.send.length, 0);
  assert.equal(c.clear.length, 1);
  assert.match(c.clear[0]!.body, /back to normal/);
  assert.match(c.clear[0]!.body, /30 more came in after the last alert/);
  assert.equal(planAlerts([], c.state, new Date(t0.getTime() + 150 * 60_000)).clear.length, 0);
  // Two kinds: one alert each. A digest kind sends nothing.
  const d = planAlerts([ev(1), ev(2, "circuit_open"), ev(3, "something_routine")], {}, t0);
  assert.deepEqual(d.send.map((s) => s.kind).sort(), ["circuit_open", "job_failed"]);
  // A new warning of the kind after the hour: one alert again.
  const e = planAlerts([ev(200)], a.state, new Date(t0.getTime() + 61 * 60_000));
  assert.equal(e.send.length, 1);
});
