// The weekly report (D222, K-28; short since PROOF-2): Monday from 08:00 local time, one email per active location, kept in
// Reports. Facts only: what Kabsi did this week (counted from the audit log, P0.5-04), what waits for the owner, one next step,
// and the taps on review links and cards by place (bots excluded). Google's own figures, nearby totals and recurring feedback
// are in the monthly report (_shared/monthly-report/), which reads them fresh. No review text and no quotes (K-113.3, R-19). No
// advice, no claims about causes, and no line that counts a check as work.
import { profileRating } from "./google/index.ts";
import { isConciergeLocationId } from "./concierge.ts";
import { type Counts, composeCare, type Inputs } from "./care-report/compose.ts";
import { admin, APP_URL, captureError, esc } from "./kabsi.ts";
import { notify } from "./notify.ts";
import * as copy from "./email/copy.ts";
import { dateRange, renderReport } from "./email/report-body.ts";
import { type GrowthStats, receipt } from "./results-report/receipt.ts";

type Loc = { id: string; name: string; place_id: string | null; time_zone: string; emails_paused_until: string | null; google_location_id?: string | null; google_account_id?: string | null; is_demo?: boolean | null };
const DAY = 86400_000;

function localParts(tz: string, at = new Date()) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(at); // YYYY-MM-DD
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(at);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "numeric", hour12: false }).format(at));
  return { date, weekday, hour };
}
// The report's days as YYYY-MM-DD in the business's time zone; dateRange (email/report-body.ts) turns them into words.
const isoDay = (d: Date, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);

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

// The blocks from Kabsi's own records (P0.5-04). The counts come from one database function over the audit log. Since PROOF-2
// the weekly report asks Google for nothing: its figures are in the monthly report.
async function careBlocks(loc: Loc, now: Date) {
  const db = admin();
  const since = new Date(now.getTime() - 7 * DAY);
  const { data, error } = await db.rpc("care_report_inputs", { p_location: loc.id, p_from: since.toISOString(), p_to: now.toISOString(), p_tz: loc.time_zone });
  if (error) throw error;
  const inputs = data as Inputs & { counts: Counts };
  return composeCare(inputs, { activity: null, terms: null });
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
  // Taps by place: each card and each placement link (booking confirmation, receipt, email signature, social bio) with its taps
  // this week, bots left out, this business's taps only. Only the ones that were tapped. Taps, never reviews.
  const { data: tapRows, error: tapError } = await db.rpc("link_taps", { p_location: loc.id, p_from: since, p_to: now.toISOString() });
  if (tapError) throw tapError;
  const PLACE: Record<string, string> = { booking: "Booking confirmation", receipt: "Receipt", email_signature: "Email signature", social_bio: "Social bio" };
  const cards = ((tapRows ?? []) as { code: string; label: string | null; placement: string | null; taps: number }[])
    .filter((t) => t.taps > 0).map((t) => ({ code: t.code, label: t.placement ? PLACE[t.placement] ?? t.label : t.label, this_week: t.taps }));
  // The 7 days before the Monday it is sent: Monday to Sunday.
  const period = { from: isoDay(new Date(now.getTime() - 7 * DAY), loc.time_zone), to: isoDay(new Date(now.getTime() - DAY), loc.time_zone) };
  const work = receipt({
    dates: dateRange(period),
    business: loc.name, counts: care.care.counts, needs: care.needs, needsTotal: care.needs_total, plan: care.plan,
    activity: null, demo: !!loc.is_demo, growth, tz: loc.time_zone, cards,
  });

  return {
    ...care,
    period,
    rating: current?.rating ?? null, rating_count: current?.review_count ?? null, rating_change: change,
    rating_drop: change != null && change <= -0.1,
    new_reviews: list.length, new_avg: avgNew, replied, waiting: waiting ?? 0,
    taps: { total: nfc + qr + message, nfc, qr, message },
    receipt: work,
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
      inApp: { title: "Your weekly report is ready", link: "/app/report" },
      content: copy.weeklyReport(loc.name, { dates: body.dates, preheader: body.preheader, subject: body.subject, button: body.button }, body.html, body.text, APP_URL),
    });
    sent++;
  }
  // K-40: Google's numbers in older copies are dropped after 30 days; Kabsi's own counts stay.
  await db.rpc("clear_old_report_numbers");
  return sent;
}
