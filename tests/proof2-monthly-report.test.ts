import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  composeMonthly,
  daysIn,
  exampleMonthSeries,
  figuresRange,
  linkFindings,
  monthFigures,
  monthlySummary,
  monthlyText,
  monthSubject,
  parseMonthOf,
  reportedMonth,
  shiftMonth,
  zonedMonthStart,
} from "../supabase/functions/_shared/monthly-report/compose";
import {
  DEMO,
  FULL,
  FULL_NEARBY,
  QUIET,
  SAMPLE_MONTH,
} from "../supabase/functions/_shared/monthly-report/sample";
import {
  googleFiguresSummary,
  latestMonthlySummary,
} from "../supabase/functions/_shared/monthly-report/api";

// PROOF-2: the monthly report, built from fixtures, matches the expected text line by line. The expected texts are in
// tests/fixtures/proof2/ and were read by a person; a change to the report's words changes them on purpose.
const fixture = (n: string) => readFileSync(`tests/fixtures/proof2/${n}`, "utf8");
const textOf = (s: string) => s.replace(/\n$/, "");

describe("a monthly report built from fixtures", () => {
  it("a full month matches the expected report line by line", () => {
    const got = monthlyText(composeMonthly(FULL), FULL_NEARBY).split("\n");
    const want = textOf(fixture("monthly-full.txt")).split("\n");
    expect(got).toEqual(want);
  });
  it("a quiet month with no Google read says so and shows no numbers", () => {
    expect(monthlyText(composeMonthly(QUIET)).split("\n")).toEqual(
      textOf(fixture("monthly-quiet.txt")).split("\n"),
    );
  });
  it("the demo business keeps its example figures, labelled; a real owner never has them", () => {
    expect(monthlyText(composeMonthly(DEMO)).split("\n")).toEqual(
      textOf(fixture("monthly-demo.txt")).split("\n"),
    );
    expect(monthlyText(composeMonthly(QUIET))).not.toMatch(/example figures/);
  });
  it("the WhatsApp summary GATE-2 wires is short and has the next step", () => {
    expect(monthlySummary(composeMonthly(FULL))).toEqual(
      JSON.parse(fixture("monthly-summary.json")),
    );
    expect(latestMonthlySummary(null)).toEqual({
      found: false,
      line: "Your first monthly report is made on the 1st of next month.",
      path: "/app/report",
    });
    expect(latestMonthlySummary(composeMonthly(FULL))).toMatchObject({
      found: true,
      title: "Your monthly report",
    });
  });
});

describe("the three bands and what they hold", () => {
  const r = composeMonthly(FULL);
  const text = monthlyText(r, FULL_NEARBY);
  it("bands appear in order: Work done, Results, then feedback, nearby, What is next", () => {
    const at = [
      "Work done",
      "Results",
      "What customers mention",
      "Nearby businesses",
      "What is next",
    ].map((h) => text.indexOf(h));
    expect(at.every((n) => n >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });
  it("no line counts a check as work: the 8,640 checks never appear", () => {
    expect(FULL.counts.profile_checks).toBe(8640);
    expect(text).not.toMatch(/8,?640|checked \d|checks/i);
    expect(r.work.did.map((c) => c.label)).not.toContain("Profile checks");
    expect(r.work.total).toBe(12 + 2 + 3 + 1 + 1 + 2);
  });
  it("What is next has one or two steps", () => {
    expect(r.next).toHaveLength(2);
    expect(composeMonthly({ ...FULL, needs: [], plan: [] }).next).toHaveLength(0);
    expect(
      composeMonthly({
        ...FULL,
        needs: [
          { title: "a", path: "/a" },
          { title: "b", path: "/b" },
          { title: "c", path: "/c" },
        ],
      }).next,
    ).toHaveLength(2);
  });
  it("taps are by placement, a tap is not a review, and a placement with no taps is left out", () => {
    expect(r.results.taps.total).toBe(9);
    expect(r.results.taps.places).toEqual([
      { place: "Front desk", taps: 5 },
      { place: "Booking confirmation", taps: 3 },
      { place: "Receipt", taps: 1 },
    ]);
    expect(text).toMatch(/A tap is not a review\./);
  });
  it("link watch findings are one line each and say when it loaded again", () => {
    expect(r.work.found).toEqual([
      "Your booking link stopped loading on 3 October and loaded again on 4 October.",
    ]);
    expect(
      linkFindings([{ kind: "menu", event: "down", at: "2026-10-30T10:00:00Z" }], "UTC"),
    ).toEqual([
      "Your menu link stopped loading on 30 October and was not loading at the end of the month.",
    ]);
  });
  it("recurring feedback is a band only when there is a topic; nothing from a review is in it", () => {
    expect(text).toMatch(
      /4 reviews in the last 90 days mention waiting time, mostly in 1 to 3 star reviews\./,
    );
    expect(
      monthlyText(composeMonthly({ ...FULL, google: { ...FULL.google!, feedback: [] } })),
    ).not.toMatch(/What customers mention/);
  });
  it("house style: no dashes, no exclamation marks, no claim of cause", () => {
    for (const t of [
      text,
      monthSubject(r),
      monthlyText(composeMonthly(QUIET)),
      monthlyText(composeMonthly(DEMO)),
    ]) {
      expect(t).not.toMatch(/[–—!]/);
      expect(t).not.toMatch(/because of Kabsi|thanks to Kabsi|more customers|ranking|revenue/i);
    }
  });
});

describe("what is stored and what is not (30 days, register section 2)", () => {
  const r = composeMonthly(FULL);
  it("everything derived from Google's API sits under one key, so one function can drop it", () => {
    expect(Object.keys(r).sort()).toEqual([
      "business",
      "google",
      "label",
      "month_of",
      "next",
      "results",
      "v",
      "work",
    ]);
    expect(Object.keys(r.google!).sort()).toEqual([
      "example",
      "feedback",
      "fetched_at",
      "figures",
      "rating",
      "results",
      "reviews",
    ]);
    expect(r.google!.fetched_at).toBe("2026-11-01T05:00:00.000Z");
    // Without a Google read there is no key at all.
    expect("google" in composeMonthly(QUIET)).toBe(false);
  });
  it("the stored report holds no competitor figure, no review text and no reviewer name", () => {
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/Juniper|Cutting Room|4\.5|301/);
    expect(json).not.toMatch(/Maya K\.?'s? review text|comment/);
  });
  it("the cleaner removes only the google key after 30 days, and the cron runs it daily", () => {
    const sql = readFileSync("supabase/migrations/20261124171826_proof2_links_monthly.sql", "utf8");
    expect(sql).toMatch(
      /update public\.monthly_reports set data = data - 'google'\s+where created_at < now\(\) - interval '30 days'/,
    );
    expect(sql).toMatch(/cron\.schedule\('kabsi_monthly_clear', '11 3 \* \* \*'/);
  });
});

describe("months, time zones and Google's figures", () => {
  it("the report made on the 1st is about the month that ended", () => {
    expect(reportedMonth(new Date("2026-11-01T05:00:00Z"))).toEqual({ year: 2026, month: 10 });
    expect(reportedMonth(new Date("2027-01-01T05:00:00Z"))).toEqual({ year: 2026, month: 12 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(parseMonthOf("2026-10-01")).toEqual({ year: 2026, month: 10 });
    expect(daysIn({ year: 2028, month: 2 })).toBe(29);
  });
  it("a month starts at the business's own midnight, with and without daylight saving", () => {
    expect(zonedMonthStart("Asia/Dubai", { year: 2026, month: 10 }).toISOString()).toBe(
      "2026-09-30T20:00:00.000Z",
    );
    expect(zonedMonthStart("America/New_York", { year: 2026, month: 10 }).toISOString()).toBe(
      "2026-10-01T04:00:00.000Z",
    ); // EDT
    expect(zonedMonthStart("America/New_York", { year: 2026, month: 11 }).toISOString()).toBe(
      "2026-11-01T04:00:00.000Z",
    ); // still EDT at midnight
    expect(zonedMonthStart("America/New_York", { year: 2026, month: 12 }).toISOString()).toBe(
      "2026-12-01T05:00:00.000Z",
    ); // EST
    expect(zonedMonthStart("UTC", { year: 2026, month: 2 }).toISOString()).toBe(
      "2026-02-01T00:00:00.000Z",
    );
  });
  it("Google is asked for the month and the one before it, no more", () => {
    expect(figuresRange(SAMPLE_MONTH)).toEqual({
      start: { year: 2026, month: 9, day: 1 },
      end: { year: 2026, month: 10, day: 31 },
    });
  });
  it("a month total sums the right days and compares with the month before", () => {
    const f = monthFigures(
      { CALL_CLICKS: { "2026-10-01": 3, "2026-10-31": 2, "2026-09-30": 4, "2026-11-01": 99 } },
      SAMPLE_MONTH,
    );
    expect(f.calls).toEqual({ total: 5, previous: 4, change: "25% more" });
    expect(monthFigures(exampleMonthSeries(SAMPLE_MONTH), SAMPLE_MONTH).calls.total).toBe(38);
  });
  it("the stats answer GATE-2 adds: Google's own calls, directions and website clicks, from a fresh read", () => {
    const g = googleFiguresSummary(
      exampleMonthSeries(SAMPLE_MONTH),
      new Date("2026-11-01T05:00:00Z"),
      "live",
    );
    expect(g.month).toBe("October 2026");
    expect(g.lines).toEqual([
      "Calls from your Google profile: 38 (23% more than the month before).",
      "Direction requests: 47 (no change from the month before).",
      "Website clicks: 66 (6% fewer than the month before).",
    ]);
    expect(
      googleFiguresSummary(
        exampleMonthSeries(SAMPLE_MONTH),
        new Date("2026-11-01T05:00:00Z"),
        "mock",
      ).lines[0],
    ).toMatch(/\(example figures\)\.$/);
  });
});
