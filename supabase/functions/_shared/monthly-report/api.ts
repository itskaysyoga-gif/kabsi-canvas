// The pure server functions GATE-2 wires into WhatsApp (PROOF-2 item 5): the monthly report summary, Google's own figures,
// competitor totals, recurring feedback and a profile health summary. Each returns plain data and plain lines, with no
// database, network or WhatsApp dependency, so the tests run on fixtures and the WhatsApp tools only choose what to say.
import type { DailySeries } from "../insights/summary.ts";
import { againstWords, type Figures, type MonthlyReport, monthFigures, monthLabel, type Month, monthlySummary, reportedMonth } from "./compose.ts";

export { competitorTotals, nextAllowed } from "./competitors.ts";
export type { CompetitorDeps, CompetitorResult } from "./competitors.ts";
export { recurringFeedback, themeLine } from "./feedback.ts";
export type { ReviewForThemes, Theme } from "./feedback.ts";
export { profileHealthSummary } from "./profile-health.ts";
export type { Checklist, ProfileHealth } from "./profile-health.ts";
export { monthlySummary, monthlyText, nearbyLines, reportLines } from "./compose.ts";
export type { MonthlyReport, Nearby } from "./compose.ts";

/** The latest monthly report as a short summary, or the line to say when there is none yet. */
export function latestMonthlySummary(r: MonthlyReport | null) {
  return r
    ? { found: true as const, ...monthlySummary(r) }
    : { found: false as const, line: "Your first monthly report is made on the 1st of next month.", path: "/app/report" };
}

/** Google's own calls, direction requests and website clicks for a month, from a fresh read of the daily series.
 *  `month` defaults to the month that just ended. The lines are the ones the stats answer adds. */
export function googleFiguresSummary(series: DailySeries, now: Date, source: "live" | "mock", month: Month = reportedMonth(now)) {
  const f: Figures = monthFigures(series, month);
  const ex = source === "mock" ? " (example figures)" : "";
  const vs = (p: { change: string }) => againstWords(p.change, "the month before");
  return {
    month: monthLabel(month), example: source === "mock", figures: f,
    lines: [
      `Calls from your Google profile: ${f.calls.total}${vs(f.calls)}${ex}.`,
      `Direction requests: ${f.directions.total}${vs(f.directions)}${ex}.`,
      `Website clicks: ${f.website_clicks.total}${vs(f.website_clicks)}${ex}.`,
    ],
  };
}
