// Weekly report (D222): Monday from 09:00 local time, one email per active location. Facts only:
// Google rating and its change, reviews received, replies posted, card taps (bots excluded).
// No review text and no quotes (K-113.3, R-19). No advice, no claims about causes.
import { getPlace } from "./google/index.ts";
import { admin, APP_URL, esc } from "./kabsi.ts";
import { notify } from "./notify.ts";
import * as copy from "./email/copy.ts";
import { renderReport } from "./email/report-body.ts";

type Loc = { id: string; name: string; place_id: string | null; time_zone: string; emails_paused_until: string | null };
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

  return {
    period: { from: fmtDay(new Date(now.getTime() - 7 * DAY), loc.time_zone), to: fmtDay(now, loc.time_zone) },
    rating: current?.rating ?? null, rating_count: current?.review_count ?? null, rating_change: change,
    rating_drop: change != null && change <= -0.1,
    new_reviews: list.length, new_avg: avgNew, replied, waiting: waiting ?? 0,
    taps: { total: nfc + qr, nfc, qr },
  };
}
export type Report = Awaited<ReturnType<typeof buildReport>>;

// Cron: every tick, but only acts on Monday from 09:00 local, once per location per week (unique row).
export async function weeklyReports(locs: Loc[], opts: { forceLocation?: string } = {}) {
  const db = admin();
  let sent = 0;
  for (const loc of locs) {
    const forced = opts.forceLocation === loc.id;
    if (!forced && opts.forceLocation) continue;
    const { date, weekday, hour } = localParts(loc.time_zone);
    if (!forced && (weekday !== "Mon" || hour < 9)) continue;
    if (!forced && loc.emails_paused_until && Date.parse(loc.emails_paused_until) > Date.now()) continue;
    const data = await buildReport(loc);
    const { error } = await db.from("weekly_reports").insert({ location_id: loc.id, week_of: date, data });
    if (error) { if (error.code === "23505") continue; throw error; } // already sent this week
    const body = renderReport(loc, data);
    await notify({
      category: "weekly_report", kind: "weekly_report", key: `weekly:${loc.id}:${date}`, locationId: loc.id, to: "owners",
      inApp: { title: "Your Weekly Care Report is ready", link: "/app/report" },
      content: copy.weeklyReport(loc.name, { newReviews: data.new_reviews, replied: data.replied }, body.html, body.text, APP_URL),
    });
    sent++;
  }
  return sent;
}
