// GATE-2 (blueprint 11.2 rows 11 to 14 and 18): the report answers on WhatsApp, built on PROOF-2's pure functions in
// `../monthly-report/api.ts`. Google's own calls, direction requests and website clicks for "stats"; and on request the nearby
// totals (at most one read a week, no provider call beyond that), recurring feedback (only topics with 3 or more mentions),
// profile health and the monthly report summary with its link. Pure: the reads come in as data, the text goes out.
import type { DailySeries } from "../insights/summary.ts";
import {
  type Checklist, type CompetitorResult, googleFiguresSummary, latestMonthlySummary, type MonthlyReport, nearbyLines,
  profileHealthSummary, type Theme, themeLine,
} from "../monthly-report/api.ts";

const longDay = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

/** The block "stats" adds: Google's own figures for the month that just ended, from a fresh read. Empty when there is none. */
export function googleStatsBlock(read: { series: DailySeries; source: "live" | "mock" } | null, now: Date): string {
  if (!read) return "";
  const g = googleFiguresSummary(read.series, now, read.source);
  return [`From Google, ${g.month}`, ...g.lines].join("\n");
}

/** "how do I compare": the nearby totals, or why there are none now. Totals only, never a claim about why. */
export function competitorsText(r: CompetitorResult, appUrl: string): string {
  switch (r.state) {
    case "ok":
      return ["Nearby businesses", ...nearbyLines(r.nearby), "", "Read live from Google just now. Kabsi does not keep these figures."].join("\n");
    case "none":
      return `No nearby businesses picked\nPick up to 3 in Kabsi and I can show their rating and review count: ${appUrl}/app/insights#competitors`;
    case "too_soon":
      return `Nearby businesses\nKabsi reads them at most once a week. Ask again on ${longDay(r.again_on)}, or see them in your monthly report.`;
    case "back_soon":
      return "Nearby businesses\nGoogle cannot be read for this right now. Please ask again tomorrow.";
    default:
      return "Nearby businesses\nGoogle did not return their figures this time. Please ask again next week.";
  }
}

/** "what do customers say": topics 3 or more reviews of the last 90 days mention; null means the reviews could not be read. */
export function feedbackText(themes: Theme[] | null): string {
  if (themes === null) return "What customers mention\nI could not read your reviews from Google just now. Please ask again later.";
  if (!themes.length) return "What customers mention\nNo topic comes up in 3 or more reviews of the last 90 days yet.";
  return ["What customers mention", ...themes.map(themeLine)].join("\n");
}

/** "profile health": the short summary from Profile Coach and the page that explains each item. */
export function profileHealthText(c: Checklist | null, appUrl: string): string {
  const h = profileHealthSummary(c);
  return `Your profile\n${h.line}\n\nDetails: ${appUrl}${h.path}`;
}

/** "monthly report": the latest monthly report as a short summary with its link. */
export function monthlyText(r: MonthlyReport | null, appUrl: string): string {
  const s = latestMonthlySummary(r);
  if (!s.found) return `Your monthly report\n${s.line}\n\nYour reports: ${appUrl}${s.path}`;
  return [s.title, ...s.facts, "", s.end, "", `The full report: ${appUrl}${s.path}`].join("\n");
}
