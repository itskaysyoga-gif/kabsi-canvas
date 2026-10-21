// Weekly Care Report (D222, K-28): Monday from 08:00 local time, one email per active location, kept in Insights. Facts only:
// what Kabsi did this week (counted from the audit log, P0.5-04), Google rating and its change, reviews received, replies
// posted, card taps (bots excluded), the week's customer activity (Google's numbers; examples while Google is in mock mode),
// what needs the owner, the Profile Coach's plan, the time saved (an estimate with its formula) and, on Pro, how people found
// the profile. No review text and no quotes (K-113.3, R-19). No advice, no claims about causes.
import { dailyFigures, getPlace, performanceSource, searchTermsFor } from "./google/index.ts";
import { ALL_METRICS } from "./insights/summary.ts";
import { termsMonth } from "./insights/periods.ts";
import { EXAMPLE_TERMS } from "./insights/example.ts";
import { normaliseTerms, termCountText } from "./insights/terms.ts";
import { type Counts, composeCare, exampleWeekSeries, type Inputs, type ReportTerms, type WeekActivity, weekActivity, weekPeriods } from "./care-report/compose.ts";
import { admin, APP_URL, esc } from "./kabsi.ts";
import { notify } from "./notify.ts";
import * as copy from "./email/copy.ts";
import { renderReport } from "./email/report-body.ts";

type Loc = { id: string; name: string; place_id: string | null; time_zone: string; emails_paused_until: string | null; google_location_id?: string | null };
const DAY = 86400_000;

function localParts(tz: string, at = new Date()) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(at); // YYYY-MM-DD
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(at);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "numeric", hour12: false }).format(at));
  return { date, weekday, hour };
}
const fmtDay = (d: Date, tz: string) => new Intl.DateTimeFormat("en-US", { timeZone: tz, day: "numeric", month: "short" }).format(d);

// Public Google rating from Places API (New). Works before the GBP API grant.
async function placesRating(placeId: string) {
  const key = Deno.env.get("PLACES_API_KEY");
  if (!key) return null;
  const { ok, status, data: d, backSoon } = await getPlace(key, placeId, "rating,userRatingCount");
  if (backSoon) return null; // today's Places cap is reached; tomorrow's run takes the snapshot
  if (!ok) throw new Error(`places details ${status}`);
  return { rating: typeof d.rating === "number" ? Math.round(d.rating * 10) / 10 : null, count: d.userRatingCount ?? null };
}

// Once a day per location: store today's public rating so the report can show the change over 7 days.
export async function snapshotRatings(locs: Loc[]) {
  const db = admin();
  let taken = 0;
  for (const loc of locs) {
    if (!loc.place_id) continue;
    const today = localParts(loc.time_zone).date;
    const { data: have } = await db.from("rating_snapshots").select("taken_on").eq("location_id", loc.id).eq("taken_on", today).maybeSingle();
    if (have) continue;
    const r = await placesRating(loc.place_id);
    if (!r) continue;
    await db.from("rating_snapshots").insert({ location_id: loc.id, taken_on: today, rating: r.rating, review_count: r.count });
    taken++;
  }
  return taken;
}

// The new blocks (P0.5-04). The counts come from one database function over the audit log; Google's numbers are read here and
// kept in the report copy for 30 days at most (K-40). A failed Google read leaves its block out, never the report.
async function careBlocks(loc: Loc, now: Date) {
  const db = admin();
  const since = new Date(now.getTime() - 7 * DAY);
  const { data, error } = await db.rpc("care_report_inputs", { p_location: loc.id, p_from: since.toISOString(), p_to: now.toISOString(), p_tz: loc.time_zone });
  if (error) throw error;
  const inputs = data as Inputs & { counts: Counts };

  let activity: WeekActivity | null = null;
  let terms: ReportTerms | null = null;
  const source = performanceSource(loc.google_location_id);
  if (source !== "none") {
    const access = await db.rpc("feature_access", { p_location: loc.id });
    const pro = !access.error && (access.data as { pro?: boolean } | null)?.pro === true;
    try {
      if (source === "mock") {
        activity = weekActivity(exampleWeekSeries(now), now, "mock");
      } else {
        const p = weekPeriods(now);
        activity = weekActivity(await dailyFigures(loc.google_location_id!, ALL_METRICS, p.previous.start, p.current.end), now, "live");
      }
      if (pro) {
        const month = termsMonth(now);
        const raw = source === "mock" ? EXAMPLE_TERMS : await searchTermsFor(loc.google_location_id!, month);
        terms = {
          source, example: source === "mock", month_label: month.label, fetched_at: now.toISOString(),
          items: normaliseTerms(raw).slice(0, 5).map((t) => ({ term: t.term, count: termCountText(t) })),
        };
      }
    } catch { /* Google's numbers are left out this week; Kabsi's own counts are not */ }
  }
  return composeCare(inputs, { activity, terms });
}

export async function buildReport(loc: Loc, now = new Date()) {
  const db = admin();
  const since = new Date(now.getTime() - 7 * DAY).toISOString();
  const today = localParts(loc.time_zone, now).date;
  const weekAgo = localParts(loc.time_zone, new Date(now.getTime() - 7 * DAY)).date;

  const { data: snaps } = await db.from("rating_snapshots").select("taken_on, rating, review_count")
    .eq("location_id", loc.id).lte("taken_on", today).order("taken_on", { ascending: false }).limit(30);
  const current = snaps?.[0] ?? null;
  const previous = (snaps ?? []).find((s) => s.taken_on <= weekAgo) ?? null;
  const change = current?.rating != null && previous?.rating != null ? Math.round((current.rating - previous.rating) * 10) / 10 : null;

  const { data: reviews } = await db.from("reviews").select("star_rating, state, existing_reply, review_created_at")
    .eq("location_id", loc.id).gte("review_created_at", since).order("review_created_at", { ascending: false });
  const list = reviews ?? [];
  const replied = list.filter((r) => r.state === "posted" || r.existing_reply).length;
  const avgNew = list.length ? Math.round((list.reduce((s, r) => s + r.star_rating, 0) / list.length) * 10) / 10 : null;

  const { count: waiting } = await db.from("reviews").select("id", { count: "exact", head: true })
    .eq("location_id", loc.id).in("state", ["drafted", "blocked"]);
  const { data: taps } = await db.from("taps").select("source").eq("location_id", loc.id).eq("is_bot", false).gte("created_at", since);
  const nfc = (taps ?? []).filter((t) => t.source === "nfc").length;
  const qr = (taps ?? []).filter((t) => t.source === "qr").length;

  const care = await careBlocks(loc, now);

  return {
    ...care,
    period: { from: fmtDay(new Date(now.getTime() - 7 * DAY), loc.time_zone), to: fmtDay(now, loc.time_zone) },
    rating: current?.rating ?? null, rating_count: current?.review_count ?? null, rating_change: change,
    rating_drop: change != null && change <= -0.1,
    new_reviews: list.length, new_avg: avgNew, replied, waiting: waiting ?? 0,
    taps: { total: nfc + qr, nfc, qr },
  };
}
export type Report = Awaited<ReturnType<typeof buildReport>>;

// Cron: every tick, but only acts on Monday from 08:00 local, once per location per week (unique row).
export async function weeklyReports(locs: Loc[], opts: { forceLocation?: string } = {}) {
  const db = admin();
  let sent = 0;
  for (const loc of locs) {
    const forced = opts.forceLocation === loc.id;
    if (!forced && opts.forceLocation) continue;
    const { date, weekday, hour } = localParts(loc.time_zone);
    if (!forced && (weekday !== "Mon" || hour < 8)) continue;
    if (!forced && loc.emails_paused_until && Date.parse(loc.emails_paused_until) > Date.now()) continue;
    const data = await buildReport(loc);
    const { error } = await db.from("weekly_reports").insert({ location_id: loc.id, week_of: date, data });
    if (error) { if (error.code === "23505") continue; throw error; } // already sent this week
    const body = renderReport(loc, data);
    await notify({
      category: "weekly_report", kind: "weekly_report", key: `weekly:${loc.id}:${date}`, locationId: loc.id, to: "owners",
      inApp: { title: "Your Weekly Care Report is ready", link: "/app/report" },
      content: copy.weeklyReport(loc.name, { newReviews: data.new_reviews, replied: data.replied, headline: data.care.headline }, body.html, body.text, APP_URL),
    });
    sent++;
  }
  // K-40: Google's numbers in older copies are dropped after 30 days; Kabsi's own counts stay.
  await db.rpc("clear_old_report_numbers");
  return sent;
}
