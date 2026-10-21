// P0.5-05 (K-26): the two periods of the Insights comparison.
import { assertEquals } from "jsr:@std/assert@1";
import { daysBetween, insightPeriods, isoDay, termsMonth } from "./periods.ts";

Deno.test("mid month: the month so far against the same days of last month", () => {
  const p = insightPeriods(new Date("2026-10-21T12:00:00Z"));
  assertEquals(p.kind, "month_so_far");
  assertEquals(isoDay(p.current.start), "2026-10-01");
  assertEquals(isoDay(p.current.end), "2026-10-20");
  assertEquals(isoDay(p.previous.start), "2026-09-01");
  assertEquals(isoDay(p.previous.end), "2026-09-20");
  assertEquals(daysBetween(p.current.start, p.current.end).length, daysBetween(p.previous.start, p.previous.end).length);
});

Deno.test("the previous period is cut at the end of a shorter month", () => {
  const p = insightPeriods(new Date("2026-03-31T09:00:00Z"));
  assertEquals(isoDay(p.current.end), "2026-03-30");
  assertEquals(isoDay(p.previous.end), "2026-02-28");
});

Deno.test("on the 1st the last full month is compared with the month before it", () => {
  const p = insightPeriods(new Date("2026-11-01T06:00:00Z"));
  assertEquals(p.kind, "last_month");
  assertEquals([isoDay(p.current.start), isoDay(p.current.end)], ["2026-10-01", "2026-10-31"]);
  assertEquals([isoDay(p.previous.start), isoDay(p.previous.end)], ["2026-09-01", "2026-09-30"]);
});

Deno.test("across a year end", () => {
  const p = insightPeriods(new Date("2027-01-01T06:00:00Z"));
  assertEquals([isoDay(p.current.start), isoDay(p.current.end)], ["2026-12-01", "2026-12-31"]);
  assertEquals([isoDay(p.previous.start), isoDay(p.previous.end)], ["2026-11-01", "2026-11-30"]);
});

Deno.test("the search terms month is the last complete month", () => {
  assertEquals(termsMonth(new Date("2026-10-21T00:00:00Z")), { year: 2026, month: 9, label: "September" });
  assertEquals(termsMonth(new Date("2027-01-05T00:00:00Z")), { year: 2026, month: 12, label: "December" });
});
