// Run: deno test supabase/functions/_shared/whatsapp/gate2.test.ts
// GATE-2 (blueprint 11.2 rows 11 to 14 and 18): PROOF-2's report functions wired into WhatsApp, on the fake world (no database,
// no Google, no model call). "stats" adds Google's own calls, direction requests and website clicks from a fresh read; nearby
// totals are read at most once a week with no provider call beyond that; recurring feedback shows only topics with 3 or more
// mentions; profile health and the monthly report summary come with their links. Staff phones get none of these.
import assert from "node:assert/strict";
import { receive } from "./agent.ts";
import { parse } from "./router.ts";
import { competitorTotals, type CompetitorDeps, type MonthlyReport } from "../monthly-report/api.ts";
import { BIZ, msg, PHONES, World } from "./world.test-helpers.ts";

async function send(w: World, from: string, text: string) {
  const before = w.sent.length;
  const result = await receive(w.deps(), msg(w, from, { text }));
  const replies = w.sent.slice(before);
  for (const r of replies) assert.doesNotMatch(r.body, /[–—!]/, `no dash or exclamation mark in ${r.body}`);
  return { result, body: replies.at(-1)?.body ?? "" };
}

const day = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
/** World time is 26 Oct 2026, so the reported month is September and the month before is August. */
function series(sep: { calls: number; dir: number; web: number }, aug: { calls: number; dir: number; web: number }) {
  return {
    CALL_CLICKS: { [day(2026, 9, 3)]: sep.calls, [day(2026, 8, 3)]: aug.calls },
    BUSINESS_DIRECTION_REQUESTS: { [day(2026, 9, 4)]: sep.dir, [day(2026, 8, 4)]: aug.dir },
    WEBSITE_CLICKS: { [day(2026, 9, 5)]: sep.web, [day(2026, 8, 5)]: aug.web },
  };
}

Deno.test("router: the four new words reach their tools", () => {
  const t = (text: string) => parse({ phoneNumberId: "x", from: "1", messageId: "m", timestamp: 0, type: "text", text } as never);
  assert.deepEqual(t("How do I compare?"), { k: "tool", tool: "competitors", arg: undefined });
  assert.deepEqual(t("What do customers say"), { k: "tool", tool: "feedback", arg: undefined });
  assert.deepEqual(t("profile health"), { k: "tool", tool: "profile_health", arg: undefined });
  assert.deepEqual(t("Monthly report"), { k: "tool", tool: "monthly", arg: undefined });
  // "this month" stays the 30-day stats, "report" stays the weekly "done".
  assert.deepEqual(t("this month"), { k: "tool", tool: "stats", arg: "30" });
  assert.deepEqual(t("report"), { k: "tool", tool: "done", arg: undefined });
});

Deno.test("stats adds Google's own calls, direction requests and website clicks from a fresh read", async () => {
  const w = new World();
  let reads = 0;
  w.reportDb.googleFigures = async (loc) => {
    reads++;
    assert.equal(loc, BIZ.harbour);
    return { series: series({ calls: 12, dir: 5, web: 9 }, { calls: 10, dir: 5, web: 12 }), source: "live" };
  };
  const r = await send(w, PHONES.owner, "stats");
  assert.equal(r.result, "stats_google");
  assert.equal(reads, 1, "one fresh read per ask");
  assert.match(r.body, /From Google, September 2026\nCalls from your Google profile: 12 \(20% more than the month before\)\.\nDirection requests: 5 \(no change from the month before\)\.\nWebsite clicks: 9 \(25% fewer than the month before\)\./);
  assert.doesNotMatch(r.body, /example/);
});

Deno.test("stats without a Google read keeps the old answer, and a failed read never breaks it", async () => {
  const w = new World();
  assert.equal((await send(w, PHONES.owner, "stats")).result, "stats");
  w.reportDb.googleFigures = async () => { throw new Error("google 503"); };
  const r = await send(w, PHONES.owner, "stats");
  assert.equal(r.result, "stats");
  assert.doesNotMatch(r.body, /From Google/);
});

Deno.test("stats on the demo business labels its figures as examples", async () => {
  const w = new World();
  w.reportDb.googleFigures = async () => ({ series: series({ calls: 3, dir: 1, web: 2 }, { calls: 3, dir: 1, web: 2 }), source: "mock" });
  const r = await send(w, PHONES.owner, "stats");
  assert.match(r.body, /Calls from your Google profile: 3 \(no change from the month before\) \(example figures\)\./);
});

// ─── Competitor totals: the real competitorTotals with a counting provider, so "no provider call beyond once a week" is proven.

function competitorWorld() {
  const w = new World();
  const state = { reads: 0, logs: [] as Date[], now: new Date(w.now) };
  const deps: CompetitorDeps = {
    picks: async () => [{ place_id: "p1" }, { place_id: "p2" }],
    read: async (id) => (state.reads++, { name: id === "p1" ? "Corner Cafe" : "Bean There", rating: 4.4, count: 120 }),
    lastRead: async () => state.logs.at(-1) ?? null,
    log: async () => void state.logs.push(new Date(state.now)),
    now: () => state.now,
  };
  w.reportDb.competitors = () => competitorTotals("request", deps);
  return { w, state };
}

Deno.test("competitors: totals on request, then no provider call for a week", async () => {
  const { w, state } = competitorWorld();
  const a = await send(w, PHONES.owner, "how do I compare");
  assert.equal(a.result, "care_competitors_ok");
  assert.match(a.body, /Nearby businesses\nCorner Cafe: 4\.4 stars from 120 reviews\.\nBean There: 4\.4 stars from 120 reviews\./);
  assert.match(a.body, /Kabsi does not keep these figures/);
  assert.equal(state.reads, 2);

  state.now = new Date(state.now.getTime() + 3 * 86400_000);
  const b = await send(w, PHONES.owner, "competitors");
  assert.equal(b.result, "care_competitors_too_soon");
  assert.match(b.body, /at most once a week\. Ask again on 2 November/);
  assert.equal(state.reads, 2, "no provider call when too soon");

  state.now = new Date(state.now.getTime() + 4 * 86400_000 + 60_000);
  assert.equal((await send(w, PHONES.owner, "competitors")).result, "care_competitors_ok");
  assert.equal(state.reads, 4, "one more read after a week");
});

Deno.test("competitors: none picked points to the page, and a missing seam says unavailable", async () => {
  const w = new World();
  w.reportDb.competitors = async () => ({ state: "none" });
  const a = await send(w, PHONES.owner, "competitors");
  assert.equal(a.result, "care_competitors_none");
  assert.match(a.body, /https:\/\/kabsi\.co\/app\/insights#competitors/);
  const w2 = new World();
  assert.equal((await send(w2, PHONES.owner, "competitors")).result, "care_competitors_unavailable");
});

Deno.test("feedback: only topics with 3 or more mentions, said plainly; none and unread have their own lines", async () => {
  const w = new World();
  w.reportDb.feedback = async () => [{ id: "waiting", label: "waiting time", count: 4, lean: "low" }, { id: "staff", label: "the staff", count: 3, lean: "high" }];
  const a = await send(w, PHONES.owner, "what do customers say");
  assert.equal(a.result, "care_feedback");
  assert.match(a.body, /4 reviews in the last 90 days mention waiting time, mostly in 1 to 3 star reviews\.\n3 reviews in the last 90 days mention the staff, mostly in 4 and 5 star reviews\./);
  w.reportDb.feedback = async () => [];
  const b = await send(w, PHONES.owner, "feedback");
  assert.equal(b.result, "care_feedback_none");
  assert.match(b.body, /No topic comes up in 3 or more reviews/);
  w.reportDb.feedback = async () => null;
  assert.equal((await send(w, PHONES.owner, "feedback")).result, "care_feedback_unread");
});

Deno.test("feedback: the real recurringFeedback leaves out a topic with only 2 mentions", async () => {
  const { recurringFeedback } = await import("../monthly-report/api.ts");
  const now = new Date(Date.UTC(2026, 9, 26));
  const r = (c: string, rating = 5) => ({ rating, comment: c, createTime: "2026-10-01T10:00:00Z" });
  const themes = recurringFeedback([r("Lovely staff"), r("The staff were kind"), r("staff great"), r("parking was hard", 2), r("no parking", 3)], now);
  assert.deepEqual(themes.map((t) => t.id), ["staff"]);
});

Deno.test("profile health: the Profile Coach summary and its page", async () => {
  const w = new World();
  w.reportDb.profileHealth = async () => ({ locked: false, items: [{ id: "description", status: "done" }, { id: "categories", status: "todo" }, { id: "photos", status: "later" }] });
  const r = await send(w, PHONES.owner, "profile health");
  assert.equal(r.result, "care_profile_health");
  assert.match(r.body, /Your profile\n1 of 2 profile items are in place\. Still to do: .+\.\n\nDetails: https:\/\/kabsi\.co\/app\/coach/);
  assert.doesNotMatch(r.body, /score|points/i);
});

const REPORT = {
  label: "October 2026", month_of: "2026-10-01", business: "Harbour Lane Coffee", demo: false,
} as unknown as MonthlyReport;

Deno.test("monthly report: the summary with its link, or when the first one comes", async () => {
  const w = new World();
  const a = await send(w, PHONES.owner, "monthly report");
  assert.equal(a.result, "care_monthly_none");
  assert.match(a.body, /Your first monthly report is made on the 1st of next month\.\n\nYour reports: https:\/\/kabsi\.co\/app\/report/);
  let asked = 0;
  w.reportDb.monthlyReport = async () => (asked++, null);
  await send(w, PHONES.owner, "last month");
  assert.equal(asked, 1);
});

Deno.test("monthly report: a stored report is summarised in at most 6 facts plus the link", async () => {
  const { composeMonthly } = await import("../monthly-report/compose.ts");
  const report = composeMonthly({
    business: "Harbour Lane Coffee", month: { year: 2026, month: 9 }, now: new Date(Date.UTC(2026, 9, 1, 9)), tz: "UTC",
    counts: { replies: 6, posts: 1, photos: 2, hours: 0, fixes: 1 } as never, needs: [], plan: [], taps: [], linkEvents: [], google: null, demo: false,
  });
  const w = new World();
  w.reportDb.monthlyReport = async () => report;
  const r = await send(w, PHONES.owner, "monthly report");
  assert.equal(r.result, "care_monthly");
  const lines = r.body.split("\n").slice(2);
  assert.equal(lines[0], "Your monthly report");
  assert.ok(lines.indexOf("") <= 7, "at most 6 facts before the end line");
  assert.match(r.body, /The full report: https:\/\/kabsi\.co\/app\/report$/);
  void REPORT;
});

Deno.test("roles: a staff phone gets none of the report tools; a manager gets them", async () => {
  const w = new World();
  let reads = 0;
  w.reportDb.competitors = async () => (reads++, { state: "none" });
  w.reportDb.feedback = async () => (reads++, []);
  for (const text of ["competitors", "feedback", "profile health", "monthly report"]) {
    const r = await send(w, PHONES.staff, text);
    assert.doesNotMatch(r.result, /^care_/, `${text} is not a staff tool`);
  }
  assert.equal(reads, 0);
  assert.equal((await send(w, PHONES.manager, "competitors")).result, "care_competitors_none");
});
