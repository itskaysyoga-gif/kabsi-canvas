// Mock of the Performance API. No search terms (as before the move: posts fall back to the owner's own words) and
// zero daily values, so no invented number can appear in a report (guardrail 23).
import type { DailyMetricsResponse, GDate, SearchKeywordsResponse } from "../types.ts";

export const searchKeywordsMonthly = (_location: string, _start: { year: number; month: number }, _end: { year: number; month: number }): Promise<SearchKeywordsResponse> =>
  Promise.resolve({});

export function dailyMetrics(_location: string, metrics: string[], start: GDate, end: GDate): Promise<DailyMetricsResponse> {
  const days: GDate[] = [];
  for (let t = Date.UTC(start.year, start.month - 1, start.day); t <= Date.UTC(end.year, end.month - 1, end.day); t += 86400_000) {
    const d = new Date(t);
    days.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
  }
  return Promise.resolve({
    multiDailyMetricTimeSeries: [{
      dailyMetricTimeSeries: metrics.map((dailyMetric) => ({ dailyMetric, timeSeries: { datedValues: days.map((date) => ({ date, value: "0" })) } })),
    }],
  });
}
