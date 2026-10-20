// Run: deno test supabase/functions/_shared/backlog.test.ts
import assert from "node:assert/strict";
import { backlogLimit, backlogState, EARLIER_BACKLOG, reopensOnPlan, TRIAL_BACKLOG } from "./backlog.ts";

// P0.3-10 (K-66, K-101, R-18): on the first read of a business with 23 unanswered reviews, a trial gets 10 drafts and the
// other 13 wait; a paid plan gets all of them once the full backlog is on; until then 20.
const draftedOf = (n: number, limit: number) =>
  Array.from({ length: n }, (_, i) => backlogState(i + 1, limit)).filter((s) => s === "new").length;

Deno.test("a trial drafts the 10 most recent of 23 and 13 wait", () => {
  const limit = backlogLimit({ trial: true, fullBacklog: false });
  assert.equal(limit, TRIAL_BACKLOG);
  assert.equal(draftedOf(23, limit), 10);
  assert.equal(23 - draftedOf(23, limit), 13);
  assert.equal(backlogState(1, limit), "new");
  assert.equal(backlogState(11, limit), "archived");
});

Deno.test("the trial limit holds even when the full backlog is on", () => {
  assert.equal(backlogLimit({ trial: true, fullBacklog: true }), 10);
});

Deno.test("a paid plan keeps the earlier 20 until the full backlog is switched on, then drafts all", () => {
  assert.equal(backlogLimit({ trial: false, fullBacklog: false }), EARLIER_BACKLOG);
  assert.equal(draftedOf(23, backlogLimit({ trial: false, fullBacklog: false })), 20);
  assert.equal(draftedOf(23, backlogLimit({ trial: false, fullBacklog: true })), 23);
});

Deno.test("waiting reviews are drafted on a plan only with the full backlog on", () => {
  assert.equal(reopensOnPlan({ trial: false, fullBacklog: true }), true);
  assert.equal(reopensOnPlan({ trial: false, fullBacklog: false }), false);
  assert.equal(reopensOnPlan({ trial: true, fullBacklog: true }), false);
});
