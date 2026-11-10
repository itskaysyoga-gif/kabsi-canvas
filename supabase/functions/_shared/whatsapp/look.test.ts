// Look 2 (master plan 30.50 item 2, R-150): the one render step for WhatsApp replies. The rules on their own, every line
// of say.ts in scope checked against them, the list message and its row taps, and a conversation on the fake world. No
// database, no Kapso, no model call beyond the fakes.
import assert from "node:assert/strict";
import { fromText, IN_SCOPE, LIST_ROWS, lookProblems, MARK, markFor, MARKS, quote, render, toList, toMsg } from "./look.ts";
import { SAY } from "./say.ts";
import { parseWebhook } from "./channel.ts";
import { parse } from "./router.ts";
import { postAlertBody, reviewAlertBody } from "./alert-text.ts";
import { photoReadyBody, photoRefusedBody } from "../review-growth/photo.ts";
import { receiptText } from "../results-report/receipt.ts";
import { receive } from "./agent.ts";
import { msg, PHONES, USERS, World } from "./world.test-helpers.ts";

const HOUSE = /[‒-―!]/;

Deno.test("render: three blocks at most, a bold title with one marker, the business once", () => {
  const body = render({ mark: MARK.hours, title: "New hours for Google", business: "Harbour Lane Coffee", facts: ["Tuesday 27 October: closed all day."], end: "Kabsi sets them on Google after your yes." });
  assert.equal(body, "*\u{1F552} New hours for Google* · Harbour Lane Coffee\n\nTuesday 27 October: closed all day.\n\nKabsi sets them on Google after your yes.");
  assert.deepEqual(lookProblems({ body }), []);
  // No facts: two blocks. No end: two blocks. The business named in a fact is not repeated after the title.
  assert.equal(render({ mark: MARK.ask, title: "Which business?" }), "*❓ Which business?*");
  assert.equal(render({ mark: MARK.done, title: "Switched", business: "Kabsi Test Salon", facts: ["You are now working on Kabsi Test Salon."] }),
    "*✅ Switched*\n\nYou are now working on Kabsi Test Salon.");
  // A star or an underscore in a title or business never breaks the bold.
  assert.equal(render({ mark: MARK.done, title: "Sa*rah_ saved", business: "A*B" }), "*✅ Sarah saved* · AB");
});

Deno.test("fromText: the title, the facts and the last paragraph; a long first sentence becomes a fact", () => {
  assert.deepEqual(fromText("Reset test?\nThis removes 2.\n\nTap Confirm to go ahead.", MARK.ask),
    { mark: MARK.ask, title: "Reset test?", business: null, facts: ["This removes 2."], end: "Tap Confirm to go ahead." });
  // An older reply: "Done. Your plan carries on." becomes the title and the status.
  assert.deepEqual(fromText("Done. Your plan carries on.", MARK.done), { mark: MARK.done, title: "Done", business: null, facts: [], end: "Your plan carries on." });
  // More than five words in the first sentence: a short title by marker, and the sentence kept as the first fact.
  const l = fromText("That phone is not linked to this business. Nothing changed.", MARK.ask);
  assert.equal(l.title, "One question");
  assert.deepEqual(l.facts, ["That phone is not linked to this business."]);
  // A reply already in bold keeps its title; its marker and business are set again.
  assert.equal(fromText("*✅ Appointment 1 saved* · Old\n#1 Sarah", MARK.done).title, "Appointment 1 saved");
});

Deno.test("footer: a standing note moves to the footer only on a message with buttons or a list", () => {
  const l = fromText("New appointment\nName: Sarah\n\nNothing is saved until you tap Save.", MARK.appointment);
  const withButtons = toMsg(l, { buttons: 2 });
  assert.equal(withButtons.footer, "Nothing is saved until you tap Save.");
  assert.doesNotMatch(withButtons.body, /Nothing is saved/);
  const plain = toMsg(l);
  assert.equal(plain.footer, undefined);
  assert.match(plain.body, /\n\nNothing is saved until you tap Save\.$/);
  // A note at the end of a status line is split off; the rest stays the status.
  const m = toMsg(fromText("Appointment 1\nTime: Fri 3 pm?\n\nTap it to set that time. Nothing is changed until you tap.", MARK.confirm), { buttons: 1 });
  assert.equal(m.footer, "Nothing is changed until you tap.");
  assert.match(m.body, /\n\nTap it to set that time\.$/);
});

Deno.test("quote: a review and a draft are one WhatsApp quote line each", () => {
  assert.deepEqual(quote("Lovely  flat white.\nWill be back."), ["> Lovely flat white. Will be back."]);
  assert.deepEqual(quote(""), []);
  const body = reviewAlertBody({ business: "Harbour Lane Coffee", stars: 5, reviewer: "Maya Haddad", text: "Lovely", draft: "Thank you, Maya." }, "Post this reply on Google?");
  assert.equal(body, "*⭐ New 5-star review* · Harbour Lane Coffee\n\nFrom Maya\n> Lovely\nKabsi's reply:\n> Thank you, Maya.\n\nPost this reply on Google?");
  assert.doesNotMatch(body, /Haddad/, "first name only (K-113)");
  // No draft (a high-risk review): no quote of a reply, and where to open it.
  const high = reviewAlertBody({ business: "B", stars: 1, reviewer: null, text: "Bad", draft: null }, "Open in Kabsi: https://kabsi.co/app/reviews?f=needs");
  assert.doesNotMatch(high, /Kabsi's reply/);
  assert.match(high, /This review needs a careful look\. Open Kabsi to reply\.\n\nOpen in Kabsi: https:\/\/kabsi\.co\/app\/reviews\?f=needs$/);
  assert.match(postAlertBody("B", "Our autumn menu starts on Monday."), /^\*\u{1F5BC}️ Post ready for Google\* · B\n\n> Our autumn menu starts on Monday\.$/u);
});

Deno.test("list: up to 10 request rows are a list message, more shows 10 and and N more; the note is the footer", () => {
  const rows = Array.from({ length: 13 }, (_, i) => `#${i + 1} Client ${i + 1} · Haircut · Fri 30 Oct 15:00 · Needs confirmation from the salon and from the client`);
  const l = fromText(`13 open\nRequested (13)\n${rows.join("\n")}\n\nThis covers only what was entered in Kabsi.`, MARK.list);
  const m = toMsg(l, { asList: true });
  assert.ok(m.list);
  const all = m.list!.sections.flatMap((s) => s.rows);
  assert.equal(all.length, LIST_ROWS);
  assert.equal(all[0]!.id, "#1");
  assert.equal(all[0]!.title, "#1 Client 1");
  assert.ok(all.every((r) => r.title.length <= 24 && (r.description ?? "").length <= 72));
  assert.equal(m.list!.sections[0]!.title, "Requested (13)");
  assert.equal(m.footer, "This covers only what was entered in Kabsi.");
  assert.equal(m.body, "*\u{1F4CB} 13 open*\n\nand 3 more\n\nTap one to open it.");
  assert.deepEqual(lookProblems(m), []);
  // "and N more" from the database is added to the rows that did not fit.
  assert.match(toMsg(fromText(`20 open\n${rows.slice(0, 10).join("\n")}\nand 10 more\n\nThis covers only what was entered in Kabsi.`, MARK.list), { asList: true }).body, /and 10 more/);
  // No request rows: no list.
  assert.equal(toList(fromText("Nothing is open\n\nThis covers only what was entered in Kabsi.", MARK.list)), null);
});

Deno.test("list: a tapped row reads as the owner typing #N, so it opens the request by the same path as before", () => {
  const { messages } = parseWebhook("whatsapp.message.received", {
    message: { id: "wamid.x", from: "12125550148", timestamp: "1", type: "interactive", interactive: { type: "list_reply", list_reply: { id: "#12", title: "#12 Sarah" } }, kapso: { direction: "inbound" } },
    conversation: { phone_number: "+12125550148", phone_number_id: "PNID" }, phone_number_id: "PNID",
  });
  assert.equal(messages[0]!.text, "#12");
  assert.equal(messages[0]!.buttonId, "#12");
  assert.deepEqual(parse(messages[0]!), { k: "free", text: "#12" });
  // Any other list row id is not read as words; a button reply is exactly as before.
  const other = parseWebhook("whatsapp.message.received", {
    message: { id: "wamid.y", from: "12125550148", timestamp: "1", type: "interactive", interactive: { type: "list_reply", list_reply: { id: "b:00000000-0000-4000-8000-000000000011", title: "Salon" } }, kapso: { direction: "inbound" } },
    conversation: { phone_number: "+12125550148", phone_number_id: "PNID" }, phone_number_id: "PNID",
  }).messages[0]!;
  assert.equal(other.text, null);
  assert.deepEqual(parse(other), { k: "business_pick", locationId: "00000000-0000-4000-8000-000000000011" });
});

Deno.test("markers: one per message, from the R-148 set and the four of item 2", () => {
  assert.equal(MARKS.length, 12);
  assert.equal(markFor("hours_shown", null), MARK.hours);
  assert.equal(markFor("post_shown", null), MARK.picture);
  assert.equal(markFor("photo_post_shown", null), MARK.picture);
  assert.equal(markFor("shown_for_yes", null), MARK.review);
  assert.equal(markFor("receipt", null), MARK.receipt);
  assert.equal(markFor("billing_cancel_ask", null), MARK.ask);
  assert.equal(markFor("billing_cancelled", null), MARK.done);
  assert.equal(markFor("billing_status", null), MARK.list);
  assert.equal(markFor("handoff", null), MARK.done);
  assert.equal(markFor("request_proposed", "job"), MARK.job);
  assert.equal(markFor("request_duplicate", "appointment"), MARK.ask);
  for (const r of ["request_saved", "help", "switched", "off_topic", "hours_no_day", "post_ask", "photo", "billing_status", "handoff", "approved", "undone"]) {
    assert.ok(IN_SCOPE.test(r), r);
  }
  for (const r of ["stats", "review_link", "prices", "nora", "keyword_set", "map_show"]) assert.ok(!IN_SCOPE.test(r), `${r} keeps its look`);
});

// Every in-scope line of say.ts, rendered as the agent renders it: the rules hold for each.
const LINES: [string, string, number][] = [
  ["which_role", SAY.whichRoleStaff, 2], ["which_role", SAY.whichRole, 2], ["which_business", SAY.whichBusinessTap, 0],
  ["which_business", SAY.whichBusinessList(["A", "B", "C", "D"]), 0], ["business_set", SAY.switched("Kabsi Test Salon"), 0],
  ["pick_closed", SAY.pickClosed, 0], ["help", SAY.ownerHelp, 0], ["help", SAY.staffHelp, 0], ["off_topic", SAY.offTopic, 0],
  ["off_topic", SAY.offTopicBook, 0], ["reset_ask", SAY.resetAsk(2, 1), 1], ["forwarded_yes", SAY.forwardedYes, 0],
  ["hours_no_day", SAY.hoursAsk, 0], ["hours_no_times", SAY.hoursNeedTimes, 0], ["hours_bad_time", SAY.hoursBadTime, 0],
  ["hours_past", SAY.hoursPast, 0], ["hours_too_far", SAY.hoursTooFar, 0], ["hours_weekly", SAY.hoursWeekly("https://kabsi.co/app/hours"), 0],
  ["hours_shown", SAY.hoursShown("Tuesday 27 October: closed all day."), 2], ["post_ask", SAY.postAsk(), 0],
  ["post_shown", SAY.postShown("Our autumn menu starts on Monday."), 2], ["post_problem", SAY.postProblem("B", ["says it is the best"]), 0],
  ["photo", SAY.photoTaken, 0], ["photo", SAY.photoTakenStaff, 0], ["photo_unreadable", SAY.photoUnreadable, 0],
  ["photo_edit", SAY.photoCategoryAsk(), 0], ["photo_category_set", SAY.photoCategorySet("the inside"), 3],
  ["photo_category_bad", SAY.photoCategoryBad, 0], ["photo_post_shown", SAY.photoPostShown("New menu."), 3],
  ["photo_post_used_up", SAY.photoPostUsedUp("B"), 2], ["photo_post_used_up", SAY.photoPostUsedUpStaff("B"), 2],
  ["refused:post_photo_missing", SAY.photoPostChecking, 0], ["shown_for_yes", SAY.exactShown("Thank you."), 2],
  ["new_draft", SAY.newDraft("B", "Thank you."), 2], ["no_review", SAY.noRecentReview, 0], ["approved", SAY.approved("B"), 1],
  ["too_late", SAY.tooLate, 0], ["not_yours", SAY.notYours, 0], ["yes_nothing", SAY.nothingWaiting, 0],
  ["billing_stub", SAY.billingSoon, 0], ["billing_no_plan", SAY.billingNoPlan("B", "https://kabsi.co/app/plan"), 0],
  ["billing_status", SAY.billingStatus("B", "Kabsi Essentials, monthly", "26 November 2026", false), 0],
  ["billing_portal", SAY.billingPortal("B", "https://creem.io/x"), 0], ["billing_cancel_ask", SAY.billingCancelAsk("26 November 2026"), 1],
  ["billing_cancelled", SAY.billingCancelled("26 November 2026"), 1], ["billing_already_ends", SAY.billingAlreadyEnds("26 November 2026"), 1],
  ["billing_upgrade_ask", SAY.billingUpgradeAsk("$59 a month"), 1], ["billing_downgrade_ask", SAY.billingDowngradeAsk("$29 a month", "26 November 2026"), 1],
  ["billing_add_ask", SAY.billingAddAsk("$15 a month"), 1], ["billing_location_link", SAY.billingAddLink("https://creem.io/x"), 0],
  ["billing_error", SAY.billingTryLater, 0], ["billing_owner_only", SAY.billingOwnerOnly, 0], ["handoff", SAY.handoff, 0],
];

Deno.test("every in-scope line of say.ts keeps the rules: blocks, a title of five words or fewer, one marker, no dashes", () => {
  for (const [result, text, buttons] of LINES) {
    const look = fromText(text, markFor(result, null), null);
    assert.notEqual(look.title, "One question", `${result}: a real title, not the fallback (${text.split("\n")[0]})`);
    const m = toMsg(look, { buttons });
    const list = result === "help" || result === "photo_edit" || result === "which_business" || result === "hours_no_day";
    assert.deepEqual(lookProblems(m, { list }), [], `${result}: ${m.body}`);
    assert.doesNotMatch(m.body, HOUSE);
  }
});

Deno.test("the Google care texts Kabsi starts keep the rules: photo ready, photo refused, the weekly report", () => {
  for (const body of [
    photoReadyBody({ business: "Harbour Lane Coffee", category: "INTERIOR", note: null, suitable: true, forOwner: false }),
    photoReadyBody({ business: "Harbour Lane Coffee", category: null, note: "This photo is dark.", suitable: false, forOwner: true }),
    photoRefusedBody("Harbour Lane Coffee", "This is not a photo Kabsi can use."),
  ]) assert.deepEqual(lookProblems({ body }), [], body);
  const r = receiptText({ business: "Harbour Lane Coffee", dates: "2 to 8 November", did: [{ key: "replies", label: "Replies sent to Google", count: 4 }],
    waiting: 2, next: "Approve the reply to Omar", google: null, growth: null, ai: null, rival: null });
  assert.equal(r, "*\u{1F9FE} Your weekly report* · Harbour Lane Coffee\n\n2 to 8 November\nReplies sent to Google: 4\n\nWaiting for your yes: 2. Next step: Approve the reply to Omar.");
});

// ─── On the fake world: Rashid's phone with the test salon, as in RB-F3.
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const SALON = id(11);
function salonWorld(): World {
  const w = new World();
  w.biz.push({ id: SALON, name: "Kabsi Test Salon", tz: "Asia/Dubai", country: "AE", pro: false, members: { [USERS.rashid]: "owner" }, demo: true });
  w.bookSetting = "on";
  w.packs.set(SALON, { pack: "salon", version: 1, state: "test" });
  return w;
}

Deno.test("conversation: a proposal, Save, what's open as a list, and the row tap opens the request; buttons unchanged", async () => {
  const w = salonWorld();
  const send = (o: Parameters<typeof msg>[2]) => receive(w.deps(), msg(w, PHONES.rashid, o));
  const last = () => w.repliesTo(PHONES.rashid).at(-1)!;
  assert.equal(await send({ text: "switch" }), "which_role");
  assert.equal(await send({ button: "r:business" }), "which_business");
  // Two businesses: buttons, as before (a list message is for 4 to 10).
  assert.ok(last().buttons.includes("Kabsi Test Salon"));
  assert.equal(await send({ button: `b:${SALON}` }), "business_set");
  const text = "Book Sarah for highlights Thursday 3pm";
  w.aiMap[text] = JSON.stringify({ tool: "request_new", args: {}, lang: "en" });
  w.extractMap[text] = JSON.stringify({ fields: { customer_name: "Sarah", phone: null, service: "highlights", when: "Thursday 3pm", stylist: null }, said: { agreed: null, already_arranged: null } });
  assert.equal(await send({ text }), "request_proposed");
  assert.deepEqual(last().buttons, ["Save", "Change"]);
  assert.equal(last().footer, "Nothing is saved until you tap Save.");
  assert.match(last().body, /^\*\u{1F4C5} New appointment\* · Kabsi Test Salon\n\nName: Sarah\nService: Highlights\nWhen: Thu 29 Oct 15:00$/u);
  const intake = [...w.intakes.values()].at(-1)!;
  assert.equal(await send({ button: `rs:${intake.id}` }), "request_saved");
  assert.deepEqual(last().buttons, ["Undo"]);
  assert.match(last().body, /^\*✅ Appointment 1 saved\* · Kabsi Test Salon\n\nSarah\nHighlights\nThu 29 Oct 15:00\nStatus: Requested\n\nNeeds confirmation from the salon and from the client\.$/);
  assert.equal(await send({ text: "what's open" }), "request_open");
  assert.equal(last().kind, "list");
  assert.deepEqual(last().rowIds, ["#1"]);
  assert.equal(last().footer, "This covers only what was entered in Kabsi.");
  assert.equal(await send({ button: "#1", text: "#1" }), "request_summary");
  assert.match(last().body, /^\*\u{1F4C5} Appointment 1\* · Kabsi Test Salon\n\nSarah\n/u);
  for (const s of w.repliesTo(PHONES.rashid)) {
    assert.doesNotMatch(s.body, /\(owner\)/);
    assert.doesNotMatch(s.body + (s.footer ?? ""), HOUSE);
    assert.ok(s.buttons.length <= 3);
  }
});
