// Business Profile Performance API: monthly search keywords and daily metrics.
// https://developers.google.com/my-business/reference/performance/rest
import { gbp, PERF } from "../client.ts";
import type { DailyMetricsResponse, GDate, SearchKeywordsResponse } from "../types.ts";

const month = (k: string, d: { year: number; month: number }) => `monthlyRange.${k}.year=${d.year}&monthlyRange.${k}.month=${d.month}`;
export const searchKeywordsMonthly = (location: string, start: { year: number; month: number }, end: { year: number; month: number }): Promise<SearchKeywordsResponse> =>
  gbp(`${PERF}/${location}/searchkeywords/impressions/monthly?${month("startMonth", start)}&${month("endMonth", end)}&pageSize=50`);

const day = (k: string, d: GDate) => `dailyRange.${k}.year=${d.year}&dailyRange.${k}.month=${d.month}&dailyRange.${k}.day=${d.day}`;
export const dailyMetrics = (location: string, metrics: string[], start: GDate, end: GDate): Promise<DailyMetricsResponse> =>
  gbp(`${PERF}/${location}:fetchMultiDailyMetricsTimeSeries?${metrics.map((m) => `dailyMetrics=${m}`).join("&")}&${day("startDate", start)}&${day("endDate", end)}`);
