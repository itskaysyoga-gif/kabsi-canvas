// Run: deno test supabase/functions/_shared/backlog.test.ts
import assert from "node:assert/strict";
import { FIRST_DAY_DAYS, firstDaySince, firstDayState, holdFirstDayList, reopensOnPlan } from "./backlog.ts";

// GATE-2 (launch checklist line 5): on the first read every unanswered review from the last 90 days is drafted, the rest wait.
const NOW = new Date("2026-11-24T12:00:00Z");
const ago = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

Deno.test("first day: every unanswered review of the last 90 days is drafted, older ones wait", () => {
  assert.equal(FIRST_DAY_DAYS, 90);
  assert.equal(firstDayState(ago(0), NOW), "new");
  assert.equal(firstDayState(ago(45), NOW), "new");
  assert.equal(firstDayState(ago(90), NOW), "new");
  assert.equal(firstDayState(ago(90.01), NOW), "archived");
  assert.equal(firstDayState(ago(400), NOW), "archived");
  assert.equal(firstDayState(null, NOW), "archived");
  assert.equal(firstDayState("not a date", NOW), "archived");
  // No count cap: 40 reviews in the window are all drafted.
  assert.equal(Array.from({ length: 40 }, (_, i) => firstDayState(ago(i * 2), NOW)).filter((s) => s === "new").length, 40);
});

Deno.test("first day: a reopened review is from the last 90 days only", () => {
  assert.equal(firstDaySince(NOW), ago(90));
});

Deno.test("first day: the list waits while drafts are still being written, for an hour at most", () => {
  const readAt = new Date(NOW.getTime() - 10 * 60_000).toISOString();
  assert.equal(holdFirstDayList(0, readAt, NOW), false);
  assert.equal(holdFirstDayList(3, readAt, NOW), true);
  assert.equal(holdFirstDayList(3, new Date(NOW.getTime() - 61 * 60_000).toISOString(), NOW), false);
  assert.equal(holdFirstDayList(3, null, NOW), false);
});

Deno.test("waiting reviews are drafted on a plan only with the full backlog on", () => {
  assert.equal(reopensOnPlan({ trial: false, fullBacklog: true }), true);
  assert.equal(reopensOnPlan({ trial: false, fullBacklog: false }), false);
  assert.equal(reopensOnPlan({ trial: true, fullBacklog: true }), false);
});
