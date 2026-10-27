// P0.5-04 (K-28, K-72): the Weekly Care Report's words. Kabsi's counts are passed through untouched; the one estimate is the
// time saved, with its formula; the plan and what needs the owner are three lines at most; nothing here can carry review text.
import { assertEquals } from "jsr:@std/assert@1";
import { type Counts, composeCare, exampleWeekSeries, FORMULA, headline, MINUTES, minutesWords, profileLine, thingsCount, timeSaved, weekActivity, weekPeriods } from "./compose.ts";

const none: Counts = {
  replies_prepared: 0, replies_published: 0, posts_published: 0, photos_published: 0, photo_batches: 0, hours_updates: 0, profile_updates: 0,
  profile_checks: 0, changes_found: 0, changes_kept: 0, changes_put_back: 0,
};

Deno.test("each real action counts once: a reply that was prepared and published is one thing", () => {
  const c = { ...none, replies_prepared: 4, replies_published: 4, posts_published: 1, hours_updates: 2, profile_updates: 1, photos_published: 3, changes_found: 1 };
  assertEquals(thingsCount(c), 4 + 1 + 2 + 1 + 3 + 1);
  assertEquals(headline(c), "Kabsi took care of 12 things this week.");
  assertEquals(headline({ ...none, replies_prepared: 1 }), "Kabsi took care of 1 thing this week.");
  assertEquals(headline(none), "A quiet week. Kabsi kept watching your profile.");
});

Deno.test("the time saved is the counts times 5, 15, 10 and 10 minutes, and says it is an estimate", () => {
  assertEquals(MINUTES, { reply: 5, update: 15, photo_batch: 10, profile_check: 10 });
  const c = { ...none, replies_published: 4, posts_published: 1, hours_updates: 1, profile_updates: 0, photo_batches: 2, changes_found: 1 };
  const t = timeSaved(c);
  assertEquals(t.parts.map((p) => [p.label, p.count, p.minutes]), [
    ["Replies sent to Google", 4, 20], ["Updates sent to Google", 2, 30], ["Batches of photos", 2, 20], ["Profile checks that found something", 1, 10],
  ]);
  assertEquals(t.minutes, 80);
  assertEquals(t.formula, FORMULA);
  assertEquals(/estimate/.test(t.formula), true);
  assertEquals(/[$€£]|\bmoney\b|\bsaved \d+ dollars\b/i.test(t.formula), false, "never turned into money");
  assertEquals(minutesWords(80), "About 1 hour 20 minutes");
  assertEquals(minutesWords(120), "About 2 hours");
  assertEquals(minutesWords(45), "About 45 minutes");
  assertEquals(minutesWords(1), "About 1 minute");
  assertEquals(minutesWords(0), "");
});

Deno.test("the Google Profile line says how many times and how each change was resolved, or that nothing important changed", () => {
  assertEquals(profileLine({ ...none, profile_checks: 2016 }), "Checked 2,016 times. No important changes.");
  assertEquals(profileLine({ ...none, profile_checks: 1 }), "Checked 1 time. No important changes.");
  assertEquals(profileLine({ ...none, profile_checks: 40, changes_found: 3, changes_put_back: 1, changes_kept: 1 }), "Checked 40 times. 3 changes found: 1 put back, 1 kept as Google changed it, 1 waiting for you.");
  assertEquals(profileLine({ ...none, profile_checks: 40, changes_found: 1, changes_put_back: 1 }), "Checked 40 times. 1 change found: 1 put back.");
});

Deno.test("the week is seven days ending yesterday, against the seven before", () => {
  const p = weekPeriods(new Date("2026-10-26T08:00:00Z"));
  assertEquals(p.current.days, ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"]);
  assertEquals(p.previous.days[0], "2026-10-12");
  assertEquals(p.previous.days[6], "2026-10-18");
  assertEquals(p.current.end, { year: 2026, month: 10, day: 25 });
  // Across a month end and a year end.
  assertEquals(weekPeriods(new Date("2027-01-04T08:00:00Z")).current.days[0], "2026-12-28");
});

Deno.test("the figures are Google's, summed over the week; the mock's are labelled examples", () => {
  const now = new Date("2026-10-26T08:00:00Z");
  const a = weekActivity(exampleWeekSeries(now), now, "mock");
  assertEquals(a.example, true);
  assertEquals([a.views.this, a.views.last, a.views.change], [214, 198, "8% more"]);
  assertEquals([a.calls.this, a.calls.last], [9, 7]);
  assertEquals([a.from, a.to], ["2026-10-19", "2026-10-25"]);
  const live = weekActivity({ CALL_CLICKS: { "2026-10-25": 3, "2026-10-18": 3 }, WEBSITE_CLICKS: { "2026-10-20": 5 } }, now, "live");
  assertEquals(live.example, false);
  assertEquals([live.calls.this, live.calls.last, live.calls.change], [3, 3, "no change"]);
  assertEquals([live.website_clicks.this, live.website_clicks.last, live.website_clicks.change], [5, 0, ""]);
});

Deno.test("the composed blocks keep the counts exactly, and are three lines at most", () => {
  const counts = { ...none, replies_prepared: 7, profile_checks: 2016 };
  const line = (n: number) => ({ title: `Task ${n}`, path: "/app" });
  const out = composeCare({ counts, needs: [1, 2, 3, 4].map(line), needs_total: 9, plan: [1, 2, 3, 4, 5].map(line) }, {});
  assertEquals(out.v, 2);
  assertEquals(out.care.counts, counts);
  assertEquals(out.needs.length, 3);
  assertEquals(out.needs_total, 9);
  assertEquals(out.plan.length, 3);
  assertEquals("activity" in out, false);
  assertEquals("terms" in out, false);
  // Nothing in the blocks can hold a review's words: the only text fields are Kabsi's own sentences and task titles.
  assertEquals(Object.keys(out).sort(), ["care", "needs", "needs_total", "plan", "time_saved", "v"]);
});
