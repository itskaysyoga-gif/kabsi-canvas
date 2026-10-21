// Example figures (P0.5-05, K-26). While Google is in mock mode there are no real figures, and the mock Performance
// module returns zeros so that nothing invented can reach a report (guardrail 23). The Insights screen still has to be
// shown working, so in mock mode this module makes a fixed, recognisable set of numbers and the screen labels every
// one of them "Example". The numbers depend only on the date, so a reload shows the same screen. They are never
// stored, never emailed and never used in the Weekly Care Report as Kabsi's own work.
import { daysBetween, type Periods } from "./periods.ts";
import type { DailySeries } from "./summary.ts";
import type { RawTerm } from "./terms.ts";

const PER_DAY: Record<string, [base: number, swing: number]> = {
  CALL_CLICKS: [2, 2],
  WEBSITE_CLICKS: [3, 2],
  BUSINESS_DIRECTION_REQUESTS: [4, 3],
  BUSINESS_IMPRESSIONS_DESKTOP_MAPS: [9, 4],
  BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: [14, 5],
  BUSINESS_IMPRESSIONS_MOBILE_MAPS: [24, 8],
  BUSINESS_IMPRESSIONS_MOBILE_SEARCH: [38, 10],
};

/** A small repeatable wobble from the date and metric, so the chart is not a flat line. */
function wobble(day: string, metric: string): number {
  let h = 0;
  for (const c of `${day}|${metric}`) h = (h * 31 + c.charCodeAt(0)) % 9973;
  return h / 9973;
}

export function exampleSeries(p: Periods): DailySeries {
  const out: DailySeries = {};
  const days = [...daysBetween(p.previous.start, p.previous.end), ...daysBetween(p.current.start, p.current.end)];
  const currentStart = days.length - daysBetween(p.current.start, p.current.end).length;
  for (const [metric, [base, swing]] of Object.entries(PER_DAY)) {
    out[metric] = {};
    days.forEach((d, i) => {
      // The current period runs a little above the previous one, so the comparison has something to say.
      const lift = i >= currentStart ? 1.12 : 1;
      out[metric][d] = Math.max(0, Math.round((base + swing * wobble(d, metric)) * lift));
    });
  }
  return out;
}

export const EXAMPLE_TERMS: RawTerm[] = [
  { searchKeyword: "coffee near me", insightsValue: { value: "142" } },
  { searchKeyword: "best flat white", insightsValue: { value: "86" } },
  { searchKeyword: "cafe open now", insightsValue: { value: "61" } },
  { searchKeyword: "brunch", insightsValue: { value: "37" } },
  { searchKeyword: "vegan pastries", insightsValue: { value: "24" } },
  { searchKeyword: "cafe with wifi", insightsValue: { threshold: "15" } },
  { searchKeyword: "oat milk latte", insightsValue: { threshold: "15" } },
];
