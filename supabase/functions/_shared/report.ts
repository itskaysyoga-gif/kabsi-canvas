// Weekly Care Report (D222, K-28): Monday from 08:00 local time, one email per active location, kept in Insights. Facts only:
// what Kabsi did this week (counted from the audit log, P0.5-04), Google rating and its change, reviews received, replies
// posted, card taps (bots excluded), the week's customer activity (Google's numbers; examples while Google is in mock mode),
// what needs the owner, the Profile Coach's plan, the time saved (an estimate with its formula) and, on Pro, how people found
// the profile. No review text and no quotes (K-113.3, R-19). No advice, no claims about causes.
import { dailyFigures, performanceSource, profileRating, searchTermsFor } from "./google/index.ts";
import { isConciergeLocationId } from "./concierge.ts";
import { ALL_METRICS } from "./insights/summary.ts";
import { termsMonth } from "./insights/periods.ts";
import { EXAMPLE_TERMS } from "./insights/example.ts";
import { normaliseTerms, termCountText } from "./insights/terms.ts";
import { type Counts, composeCare, exampleWeekSeries, type Inputs, type ReportTerms, type WeekActivity, weekActivity, weekPeriods } from "./care-report/compose.ts";
import { admin, APP_URL, captureError, esc } from "./kabsi.ts";
import { notify } from "./notify.ts";
import * as copy from "./email/copy.ts";
import { renderReport } from "./email/report-body.ts";
import { type AiAnswer, type GrowthStats, monthlyWeek, receipt, type RivalChange } from "./results-report/receipt.ts";
import { sourceActions } from "./insights/ai-visibility.ts";
import type { DoneRun } from "./visibility/ai/numbers.ts";

type Loc = { id: string; name: string; place_id: string | null; time_zone: string; emails_paused_until: string | null; google_location_id?: string | null; google_account_id?: string | null; is_demo?: boolean | null };
const DAY = 86400_000;

function localParts(tz: string, at = new Date()) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(at); // YYYY-MM-DD
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(at);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "numeric", hour12: false }).format(at));
  return { date, weekday, hour };
}
const fmtDay = (d: Date, tz: string) => new Intl.DateTimeFormat("en-US", { timeZone: tz, day: "numeric", month: "short" }).format(d);

// Public Google rating from Places API (New). Works before the GBP API grant.
// Once a day per location: store today's rating and review count from the business's own Business Profile, so the
// report can show the change over 7 days (kept 30 days, K-40). Not from Places: nothing from Places is stored but the
// place ID (master plan 30.10). A business Kabsi cannot read yet (no access, concierge) is skipped.
export async function snapshotRatings(locs: Loc[]) {
  const db = admin();
  let taken = 0;
  for (const loc of locs) {
    if (!loc.google_location_id || !loc.google_account_id || isConciergeLocationId(loc.google_location_id)) continue;
    const today = localParts(loc.time_zone).date;
    const { data: have } = await db.from("rating_snapshots").select("taken_on").eq("location_id", loc.id).eq("taken_on", today).maybeSingle();
    if (have) continue;
    const r = await profileRating(loc.google_account_id, loc.google_location_id).catch(async (e) => {
      await captureError("cron-tick", e, { job: "ratings", location: loc.id });
      return null;
    });
    if (!r || r.rating === null) continue;
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
        // 30.18 section 3: a real owner's report never shows example figures; only the demo business keeps its labelled examples.
        if (loc.is_demo) activity = weekActivity(exampleWeekSeries(now), now, "mock");
      } else {
        const p = weekPeriods(now);
        activity = weekActivity(await dailyFigures(loc.google_location_id!, ALL_METRICS, p.previous.start, p.current.end), now, "live");
      }
      if (pro && (source === "live" || loc.is_demo)) {
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
  // V3, V4: link opens from review_growth_stats, the same counts the WhatsApp stats line uses (message, QR and tag apart).
  const { data: gs, error: gsError } = await db.rpc("review_growth_stats", { p_location: loc.id, p_days: 7 });
  if (gsError) throw gsError;
  const growth = gs as GrowthStats;
  const nfc = growth.opens_tag, qr = growth.opens_qr, message = growth.opens_message;

  const care = await careBlocks(loc, now);
  const work = receipt({
    business: loc.name, counts: care.care.counts, needs: care.needs, needsTotal: care.needs_total, plan: care.plan,
    activity: care.activity ?? null, demo: !!loc.is_demo, growth, tz: loc.time_zone,
    ai: await latestAiAnswer(loc.id, now).catch(() => null), aiThisWeek: monthlyWeek(today),
    rivals: await rivalChanges(loc.id, now).catch(() => []),
  });

  return {
    ...care,
    period: { from: fmtDay(new Date(now.getTime() - 7 * DAY), loc.time_zone), to: fmtDay(now, loc.time_zone) },
    rating: current?.rating ?? null, rating_count: current?.review_count ?? null, rating_change: change,
    rating_drop: change != null && change <= -0.1,
    new_reviews: list.length, new_avg: avgNew, replied, waiting: waiting ?? 0,
    taps: { total: nfc + qr + message, nfc, qr, message },
    receipt: work,
  };
}

// 30.15 3.8: the month's latest AI answer for the business: the exact question, which assistant and when, named or not, the sources.
async function latestAiAnswer(locationId: string, now: Date): Promise<AiAnswer | null> {
  const since = new Date(now.getTime() - 31 * DAY).toISOString();
  const { data } = await admin().from("ai_visibility_runs").select("provider, run_at, named, position, competitors, sources, ai_visibility_prompts(text)")
    .eq("location_id", locationId).eq("state", "done").eq("source", "live").gte("run_at", since).order("run_at", { ascending: false }).limit(20);
  const runs = (data ?? []) as (DoneRun & { ai_visibility_prompts: { text: string } | { text: string }[] | null })[];
  const r = runs[0];
  if (!r) return null;
  const p = Array.isArray(r.ai_visibility_prompts) ? r.ai_visibility_prompts[0] : r.ai_visibility_prompts;
  if (!p?.text) return null;
  return {
    question: p.text, provider: r.provider, asked_at: r.run_at, named: r.named,
    sources: (r.sources ?? []).slice(0, 3).map((x) => ({ domain: x.domain, title: x.title })),
    noticed: sourceActions(runs)[0]?.text ?? null,
  };
}

// 30.15 3.9: review gains over about a month for the business and the competitors it watches, from Kabsi's own public snapshots.
async function rivalChanges(locationId: string, now: Date): Promise<RivalChange[]> {
  const since = new Date(now.getTime() - 35 * DAY).toISOString().slice(0, 10);
  const { data } = await admin().from("competitor_snapshots").select("key, is_self, name, reviews, taken_on")
    .eq("location_id", locationId).gte("taken_on", since).order("taken_on");
  const by = new Map<string, { name: string; self: boolean; first: number | null; last: number | null; days: number }>();
  const first = new Map<string, string>();
  for (const s of (data ?? []) as { key: string; is_self: boolean; name: string; reviews: number | null; taken_on: string }[]) {
    const cur = by.get(s.key) ?? { name: s.name, self: s.is_self, first: s.reviews, last: s.reviews, days: 0 };
    if (!first.has(s.key)) first.set(s.key, s.taken_on);
    cur.last = s.reviews ?? cur.last;
    cur.days = (Date.parse(s.taken_on) - Date.parse(first.get(s.key)!)) / DAY;
    by.set(s.key, cur);
  }
  const gain = (x: { first: number | null; last: number | null }) => (x.first == null || x.last == null ? null : Math.max(0, x.last - x.first));
  const me = [...by.values()].find((x) => x.self);
  const mine = me ? gain(me) : null;
  // Two snapshots at least three weeks apart, or it is not "this month".
  if (!me || mine == null || me.days < 21) return [];
  return [...by.values()].filter((x) => !x.self && x.days >= 21 && gain(x) != null).map((x) => ({ name: x.name, theirs: gain(x)!, mine }));
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
    // One business whose report cannot be built never stops the others; it is tried again on the next tick.
    let data: Report;
    try {
      data = await buildReport(loc);
    } catch (e) {
      await captureError("cron-tick", e, { job: "weekly", location: loc.id });
      continue;
    }
    const { error } = await db.from("weekly_reports").insert({ location_id: loc.id, week_of: date, data });
    if (error) { if (error.code === "23505") continue; throw error; } // already sent this week
    const body = renderReport(loc, data);
    await notify({
      category: "weekly_report", kind: "weekly_report", key: `weekly:${loc.id}:${date}`, locationId: loc.id, to: "owners",
      inApp: { title: "Your Results Report is ready", link: "/app/report" },
      content: copy.weeklyReport(loc.name, { newReviews: data.new_reviews, replied: data.replied, headline: data.care.headline }, body.html, body.text, APP_URL),
    });
    sent++;
  }
  // K-40: Google's numbers in older copies are dropped after 30 days; Kabsi's own counts stay.
  await db.rpc("clear_old_report_numbers");
  return sent;
}
