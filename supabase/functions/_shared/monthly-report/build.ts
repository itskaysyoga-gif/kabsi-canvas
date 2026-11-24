// The monthly_report job (PROOF-2): builds one business's report for the month that just ended, stores it, and sends the email.
// Kabsi's own counts come from the audit log (care_report_inputs, the same query the weekly report uses, for a month) and the
// taps from link_taps. Everything from Google is read fresh now: the rating and review count, the month's reviews (for the
// recurring feedback only), Google's own calls, direction requests and website clicks, and the nearby totals from one live Places
// read. Each read is on its own: a failed one leaves its own lines out, never the report. Google's figures are kept under
// "google" for 30 days at most; the nearby totals are not kept at all (see compose.ts).
import { admin, APP_URL, captureError } from "../kabsi.ts";
import { notify } from "../notify.ts";
import * as copy from "../email/copy.ts";
import { renderMonthly } from "../email/monthly-body.ts";
import { isConciergeLocationId } from "../concierge.ts";
import { dailyFigures, googleMode, listReviews, performanceSource, placeTotals, profileRating } from "../google/index.ts";
import type { Job } from "../jobs.ts";
import type { Counts, Line } from "../care-report/compose.ts";
import {
  ALL_METRICS, exampleMonthSeries, figuresRange, type LinkEvent, type Month, monthFigures, monthLabel, type MonthlyInputs, type MonthlyReport,
  monthOfDate, type Nearby, parseMonthOf, type RatingRead, reportedMonth, shiftMonth, type TapRow, zonedMonthStart, composeMonthly,
} from "./compose.ts";
import { competitorTotals } from "./competitors.ts";
import { recurringFeedback } from "./feedback.ts";

type Loc = {
  id: string; name: string; time_zone: string; google_location_id: string | null; google_account_id: string | null;
  is_demo: boolean | null; concierge: boolean | null; emails_paused_until: string | null; status: string;
};
const LOC_COLS = "id, name, time_zone, google_location_id, google_account_id, is_demo, concierge, emails_paused_until, status";
const DAY = 86400_000;
const REVIEWS_READ = 100;

async function ratingRead(loc: Loc, now: Date): Promise<RatingRead | null> {
  if (!loc.google_account_id || !loc.google_location_id) return null;
  const r = await profileRating(loc.google_account_id, loc.google_location_id);
  if (r.rating === null) return null;
  // A month ago, from Kabsi's own daily rating (kept 30 days, K-40): the oldest one it still has, if it is about a month old.
  const { data } = await admin().from("rating_snapshots").select("taken_on, rating")
    .eq("location_id", loc.id).lte("taken_on", new Date(now.getTime() - 25 * DAY).toISOString().slice(0, 10))
    .order("taken_on", { ascending: false }).limit(1);
  return { rating: r.rating, count: r.count, then: (data?.[0]?.rating as number | undefined) ?? null };
}

async function googleBlock(loc: Loc, month: Month, now: Date): Promise<MonthlyInputs["google"]> {
  const source = performanceSource(loc.google_location_id);
  if (source === "none") return null;
  if (source === "mock") {
    // A real owner's report never shows example figures (30.18 section 3); only the demo business keeps its labelled examples.
    if (!loc.is_demo) return null;
    return { source: "mock", rating: null, figures: monthFigures(exampleMonthSeries(month), month), reviews: null, feedback: [] };
  }
  const part = async <T>(what: string, run: () => Promise<T>): Promise<T | null> => {
    try {
      return await run();
    } catch (e) {
      await captureError("monthly-report", e, { part: what, location: loc.id });
      return null;
    }
  };
  const range = figuresRange(month);
  const [rating, series, list] = await Promise.all([
    part("rating", () => ratingRead(loc, now)),
    part("figures", () => dailyFigures(loc.google_location_id!, ALL_METRICS, range.start, range.end)),
    part("reviews", () => listReviews(loc.google_account_id!, loc.google_location_id!, REVIEWS_READ)),
  ]);
  // The owner's month, in the business's own time zone, the same as the counts and taps.
  const start = zonedMonthStart(loc.time_zone, month).getTime();
  const end = zonedMonthStart(loc.time_zone, shiftMonth(month, 1)).getTime();
  const within = (iso: string) => Date.parse(iso) >= start && Date.parse(iso) < end;
  const inMonth = (list ?? []).filter((r) => within(r.createTime));
  const oldest = list?.length ? list[list.length - 1]!.createTime : "";
  return {
    source: "live",
    rating,
    figures: series ? monthFigures(series, month) : null,
    reviews: list ? { received: inMonth.length, replied: inMonth.filter((r) => !!r.reply).length, atLeast: list.length >= REVIEWS_READ && within(oldest) } : null,
    feedback: list ? recurringFeedback(list, now) : [],
  };
}

/** Up to 3 nearby businesses from one live read. Never in mock mode, never for a demo, never stored. */
async function nearbyFor(loc: Loc, kind: "monthly" | "request"): Promise<Nearby | null> {
  if (loc.is_demo || googleMode() === "mock" || performanceSource(loc.google_location_id) !== "live") return null;
  const db = admin();
  const r = await competitorTotals(kind, {
    picks: async () => {
      const { data, error } = await db.from("competitor_picks").select("place_id").eq("location_id", loc.id).not("place_id", "is", null).order("picked_at").limit(3);
      if (error) throw error;
      return (data ?? []) as { place_id: string | null }[];
    },
    read: (placeId) => placeTotals(placeId),
    lastRead: async () => {
      const { data, error } = await db.from("competitor_reads").select("read_at").eq("location_id", loc.id).order("read_at", { ascending: false }).limit(1);
      if (error) throw error;
      return data?.[0] ? new Date(data[0].read_at as string) : null;
    },
    log: async (k) => {
      const { error } = await db.from("competitor_reads").insert({ location_id: loc.id, kind: k });
      if (error) throw error;
    },
    now: () => new Date(),
  });
  return r.state === "ok" ? r.nearby : null;
}

export async function buildMonthly(loc: Loc, month: Month, now = new Date()): Promise<{ report: MonthlyReport; nearby: Nearby | null }> {
  const db = admin();
  const from = zonedMonthStart(loc.time_zone, month);
  const to = zonedMonthStart(loc.time_zone, shiftMonth(month, 1));
  const { data: inputs, error } = await db.rpc("care_report_inputs", { p_location: loc.id, p_from: from.toISOString(), p_to: to.toISOString(), p_tz: loc.time_zone });
  if (error) throw error;
  const base = inputs as { counts: Counts; needs: Line[]; plan: Line[] };
  const taps = await db.rpc("link_taps", { p_location: loc.id, p_from: from.toISOString(), p_to: to.toISOString() });
  if (taps.error) throw taps.error;
  const events = await db.from("link_watch_events").select("kind, event, at").eq("location_id", loc.id)
    .gte("at", from.toISOString()).lt("at", to.toISOString()).order("at");
  if (events.error) throw events.error;

  const [google, nearby] = await Promise.all([
    googleBlock(loc, month, now),
    nearbyFor(loc, "monthly").catch(async (e) => {
      await captureError("monthly-report", e, { part: "nearby", location: loc.id });
      return null;
    }),
  ]);
  const report = composeMonthly({
    business: loc.name, month, now, tz: loc.time_zone, counts: base.counts, needs: base.needs ?? [], plan: base.plan ?? [],
    taps: (taps.data ?? []) as TapRow[], linkEvents: (events.data ?? []) as LinkEvent[], google, demo: !!loc.is_demo,
  });
  return { report, nearby };
}

// The monthly_report job: one business, one month. The row's unique key keeps it single; a report that exists is left alone.
export async function monthlyReportJob(job: Job): Promise<{ skipped: string } | { sent: number }> {
  const db = admin();
  if (!job.location_id) throw new Error("monthly_report needs a business");
  const { data, error } = await db.from("locations").select(LOC_COLS).eq("id", job.location_id).maybeSingle();
  if (error) throw error;
  const loc = data as Loc | null;
  if (!loc || loc.status !== "active" || loc.concierge || isConciergeLocationId(loc.google_location_id)) return { skipped: "not_readable" };
  const now = new Date();
  const asked = String(job.payload.month_of ?? "");
  const month = /^\d{4}-\d{2}-01$/.test(asked) ? parseMonthOf(asked) : reportedMonth(now);
  const monthOf = monthOfDate(month);
  const have = await db.from("monthly_reports").select("id, data").eq("location_id", loc.id).eq("month_of", monthOf).maybeSingle();
  let report: MonthlyReport;
  let nearby: Nearby | null = null;
  if (have.data) {
    // The report was stored but the email may not have gone (the job failed after the insert). The email has its own key, so
    // sending again is safe; the nearby totals were not kept, so they are not in this copy.
    report = have.data.data as MonthlyReport;
  } else {
    const built = await buildMonthly(loc, month, now);
    report = built.report;
    nearby = built.nearby;
    const ins = await db.from("monthly_reports").insert({ location_id: loc.id, month_of: monthOf, data: report });
    if (ins.error) {
      if (ins.error.code === "23505") return { skipped: "exists" };
      throw ins.error;
    }
  }
  const body = renderMonthly(report, nearby);
  const sent = await notify({
    category: "weekly_report", kind: "monthly_report", key: `monthly:${loc.id}:${monthOf}`, locationId: loc.id, to: "owners",
    inApp: { title: `Your ${monthLabel(month)} report is ready`, link: "/app/report" },
    content: copy.monthlyReport(loc.name, report.label, { preheader: body.preheader, subject: body.subject }, body.html, body.text, APP_URL),
  });
  return { sent: sent.sent };
}
