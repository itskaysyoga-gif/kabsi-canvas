// Weekly report (D222): Monday from 09:00 local time, one email per active location. Facts only:
// Google rating and its change, reviews received, replies posted, card taps (bots excluded),
// up to three short quotes copied word for word. No advice, no claims about causes.
import { admin, APP_URL, emailLayout, esc, ownerEmails, sendEmail } from "./kabsi.ts";

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
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { "x-goog-api-key": key, "x-goog-fieldmask": "rating,userRatingCount" },
  });
  if (!res.ok) throw new Error(`places details ${res.status}`);
  const d = await res.json();
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

// Short verbatim quote: first sentence, cut at a word boundary. Never reworded.
function quoteOf(text: string) {
  const first = text.trim().split(/(?<=[.!?؟])\s/)[0] ?? text;
  if (first.length <= 90) return first;
  return first.slice(0, 90).replace(/\s+\S*$/, "") + "…";
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

  const { data: reviews } = await db.from("reviews").select("star_rating, comment, state, existing_reply, review_created_at")
    .eq("location_id", loc.id).gte("review_created_at", since).order("review_created_at", { ascending: false });
  const list = reviews ?? [];
  const replied = list.filter((r) => r.state === "posted" || r.existing_reply).length;
  const avgNew = list.length ? Math.round((list.reduce((s, r) => s + r.star_rating, 0) / list.length) * 10) / 10 : null;
  const withText = list.filter((r) => r.comment && r.comment.trim().length >= 8);
  const quotes = withText.length >= 3 ? withText.slice(0, 3).map((r) => quoteOf(r.comment!)) : [];

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
    taps: { total: nfc + qr, nfc, qr }, quotes,
  };
}
export type Report = Awaited<ReturnType<typeof buildReport>>;

function row(label: string, value: string) {
  return `<tr><td style="padding:10px 0;border-bottom:1px solid #E4E0D7;color:#5E5B55;">${esc(label)}</td><td style="padding:10px 0;border-bottom:1px solid #E4E0D7;text-align:right;font-weight:700;">${value}</td></tr>`;
}

export function renderReport(loc: Loc, r: Report) {
  const ratingText = r.rating == null ? "Not available"
    : `${r.rating.toFixed(1)}${r.rating_change == null ? "" : r.rating_change === 0 ? " (no change)" : ` (${r.rating_change > 0 ? "+" : ""}${r.rating_change.toFixed(1)})`}`;
  const rows = [
    row("Google rating", esc(ratingText) + (r.rating_count != null ? `<br><span style="font-weight:400;color:#5E5B55;font-size:14px;">${r.rating_count} reviews in total</span>` : "")),
    row("New reviews", String(r.new_reviews) + (r.new_avg != null ? `<br><span style="font-weight:400;color:#5E5B55;font-size:14px;">average ${r.new_avg.toFixed(1)} of 5</span>` : "")),
    row("Replied", `${r.replied} of ${r.new_reviews}`),
    row("Card taps", r.taps.total ? `${r.taps.total}<br><span style="font-weight:400;color:#5E5B55;font-size:14px;">${r.taps.nfc} tap · ${r.taps.qr} QR</span>` : "0"),
  ].join("");
  const drop = r.rating_drop ? `<p style="margin:0 0 16px 0;padding:12px 14px;border:2px solid #111111;border-radius:14px;">Your Google rating went down ${Math.abs(r.rating_change!).toFixed(1)} this week.</p>` : "";
  const quotes = r.quotes.length
    ? `<p style="margin:22px 0 8px 0;font-weight:700;">What customers wrote</p>` + r.quotes.map((q) => `<p style="margin:0 0 8px 0;padding:10px 14px;background:#F6F4EF;border-radius:14px;" dir="auto">“${esc(q)}”</p>`).join("")
    : "";
  const waiting = r.waiting ? `<p style="margin:18px 0 0 0;">${r.waiting} ${r.waiting === 1 ? "review is" : "reviews are"} waiting for your reply.</p>` : "";
  const html = `<p style="margin:0 0 16px 0;color:#5E5B55;">${esc(loc.name)} · ${esc(r.period.from)} to ${esc(r.period.to)}</p>${drop}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:16px;">${rows}</table>${quotes}${waiting}`;
  const text = [
    `${loc.name}, ${r.period.from} to ${r.period.to}`,
    `Google rating: ${ratingText}`,
    `New reviews: ${r.new_reviews}`, `Replied: ${r.replied} of ${r.new_reviews}`, `Card taps: ${r.taps.total}`,
    ...r.quotes.map((q) => `"${q}"`),
    r.waiting ? `${r.waiting} waiting for your reply.` : "",
  ].filter(Boolean).join("\n");
  return { html, text };
}

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
    for (const to of await ownerEmails(loc.id)) {
      await sendEmail({
        kind: "weekly_report", to, locationId: loc.id, dedupeKey: `weekly:${loc.id}:${date}:${to}`,
        subject: `Your week on Google: ${loc.name}`,
        html: emailLayout({ preheader: `${data.new_reviews} new reviews, ${data.replied} replied.`, title: "Your week on Google", bodyHtml: body.html, button: { label: "Open Kabsi", url: `${APP_URL}/app/report` } }),
        text: `${body.text}\n\nOpen Kabsi: ${APP_URL}/app/report`,
      });
    }
    sent++;
  }
  return sent;
}
