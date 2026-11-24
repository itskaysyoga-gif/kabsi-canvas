// GATE-2: the reads behind the WhatsApp report answers (blueprint 11.2 rows 11 to 14, 18). Each is fresh from Google when the
// owner asks, and nothing read here is stored: Google's figures and the reviews stay in memory for the answer, the nearby totals
// go through competitorTotals ("request": at most one read a week, no provider call when too soon). A real owner never sees
// example figures; only the demo business keeps its labelled examples (30.18 section 3).
import { admin } from "../kabsi.ts";
import { dailyFigures, listReviews, performanceSource } from "../google/index.ts";
import type { DailySeries } from "../insights/summary.ts";
import { competitorRead, type Loc, LOC_COLS, REVIEWS_READ } from "./build.ts";
import { ALL_METRICS, exampleMonthSeries, figuresRange, type MonthlyReport, reportedMonth } from "./compose.ts";
import type { CompetitorResult } from "./competitors.ts";
import { recurringFeedback, type Theme } from "./feedback.ts";
import type { Checklist } from "./profile-health.ts";

async function loc(locationId: string): Promise<Loc | null> {
  const { data, error } = await admin().from("locations").select(LOC_COLS).eq("id", locationId).maybeSingle();
  if (error) throw error;
  const l = data as Loc | null;
  return l && l.status === "active" && !l.concierge ? l : null;
}

export async function googleFiguresFor(locationId: string, now = new Date()): Promise<{ series: DailySeries; source: "live" | "mock" } | null> {
  const l = await loc(locationId);
  if (!l) return null;
  const source = performanceSource(l.google_location_id);
  const month = reportedMonth(now);
  if (source === "none") return null;
  if (source === "mock") return l.is_demo ? { series: exampleMonthSeries(month), source: "mock" } : null;
  const r = figuresRange(month);
  return { series: await dailyFigures(l.google_location_id!, ALL_METRICS, r.start, r.end), source: "live" };
}

export async function feedbackFor(locationId: string, now = new Date()): Promise<Theme[] | null> {
  const l = await loc(locationId);
  if (!l || !l.google_account_id || !l.google_location_id) return null;
  if (performanceSource(l.google_location_id) === "mock" && !l.is_demo) return null;
  return recurringFeedback(await listReviews(l.google_account_id, l.google_location_id, REVIEWS_READ), now);
}

export async function competitorsFor(locationId: string): Promise<CompetitorResult> {
  const l = await loc(locationId);
  return l ? await competitorRead(l, "request") : { state: "unavailable" };
}

export async function latestMonthlyReport(locationId: string): Promise<MonthlyReport | null> {
  const { data, error } = await admin().from("monthly_reports").select("data").eq("location_id", locationId)
    .order("month_of", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return (data?.data as MonthlyReport | undefined) ?? null;
}

export async function profileChecklist(locationId: string): Promise<Checklist | null> {
  const { data, error } = await admin().rpc("coach_checklist", { p_location: locationId });
  if (error) throw error;
  return (data ?? null) as Checklist | null;
}
