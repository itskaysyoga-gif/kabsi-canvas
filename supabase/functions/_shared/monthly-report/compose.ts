// The monthly report (PROOF-2, blueprint section 8), pure. Three bands, kept apart:
//   Work done: counts from Kabsi's own records and read-backs. A check is never counted as work.
//   Results: rating and review count, replies, taps on review links and cards by placement, and Google's own calls, direction
//            requests and website clicks, read fresh from the Performance API for the month and the month before.
//   What is next: one or two steps.
// Then, only when there is something to say: recurring feedback (3 or more reviews mention the same thing) and the totals of
// up to 3 nearby businesses from one live read (shown, never stored). Nothing says Kabsi caused a review, a ranking or revenue.
//
// Storage (register section 2): everything derived from Google's API sits under `google` and is removed after 30 days
// (public.clear_old_monthly_numbers). Kabsi's own counts, taps and the link findings stay. Nearby totals from Places are not
// part of the stored report at all: build() returns them beside it, for the email and the message only.
import { type Counts, type Line } from "../care-report/compose.ts";
import { ALL_METRICS, changeWords, type DailySeries, METRICS } from "../insights/summary.ts";
import { monthName } from "../insights/periods.ts";
import { type Chip, CARD_TAP_NOTE, didChips } from "../results-report/receipt.ts";
import { LINK_LABEL, type LinkKind } from "../link-watch/link-watch.ts";
import { type Theme, themeLine } from "./feedback.ts";

export type Month = { year: number; month: number };
const pad = (n: number) => String(n).padStart(2, "0");
export const monthOfDate = (m: Month) => `${m.year}-${pad(m.month)}-01`;
export const monthLabel = (m: Month) => `${monthName(m.month)} ${m.year}`;
export const parseMonthOf = (s: string): Month => ({ year: Number(s.slice(0, 4)), month: Number(s.slice(5, 7)) });
export const shiftMonth = (m: Month, by: number): Month => {
  const t = new Date(Date.UTC(m.year, m.month - 1 + by, 1));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1 };
};
/** The month a report made on `now` is about: the one that just ended. */
export const reportedMonth = (now: Date): Month => shiftMonth({ year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }, -1);
export const daysIn = (m: Month) => new Date(Date.UTC(m.year, m.month, 0)).getUTCDate();

/** The instant a month starts in the business's own time zone (its first midnight), so the month's counts are the owner's month. */
export function zonedMonthStart(tz: string, m: Month): Date {
  const guess = Date.UTC(m.year, m.month - 1, 1);
  const offset = (t: number) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(t));
    const g = (k: string) => Number(parts.find((x) => x.type === k)!.value);
    return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - t;
  };
  const first = guess - offset(guess);
  return new Date(guess - offset(first));
}

/** Labelled example figures for the demo business in Google's mock mode: the same every month, so nobody mistakes them for results. */
export function exampleMonthSeries(m: Month): DailySeries {
  const fill = (metric: string, thisMonth: number, lastMonth: number): [string, Record<string, number>] => {
    const out: Record<string, number> = {};
    const put = (mm: Month, total: number) => {
      const n = daysIn(mm);
      for (let d = 1; d <= n; d++) out[`${mm.year}-${pad(mm.month)}-${pad(d)}`] = Math.floor(total / n) + (d <= total % n ? 1 : 0);
    };
    put(m, thisMonth);
    put(shiftMonth(m, -1), lastMonth);
    return [metric, out];
  };
  return Object.fromEntries([
    fill("BUSINESS_IMPRESSIONS_MOBILE_SEARCH", 880, 820), fill("CALL_CLICKS", 38, 31), fill("WEBSITE_CLICKS", 66, 70), fill("BUSINESS_DIRECTION_REQUESTS", 47, 47),
  ]);
}

// ── Google's figures for a month.
export type Pair = { total: number; previous: number; change: string };
export type Figures = { calls: Pair; directions: Pair; website_clicks: Pair; views: Pair };

function monthTotal(series: DailySeries, key: keyof typeof METRICS, m: Month): number {
  const prefix = `${m.year}-${pad(m.month)}-`;
  let sum = 0;
  for (const metric of METRICS[key]) for (const [day, v] of Object.entries(series[metric] ?? {})) if (day.startsWith(prefix)) sum += v;
  return sum;
}
const pair = (series: DailySeries, key: keyof typeof METRICS, m: Month): Pair => {
  const total = monthTotal(series, key, m);
  const previous = monthTotal(series, key, shiftMonth(m, -1));
  return { total, previous, change: changeWords(total, previous) };
};
/** The month and the month before it, from the daily series the Performance API gave. */
export function monthFigures(series: DailySeries, m: Month): Figures {
  return { calls: pair(series, "calls", m), directions: pair(series, "directions", m), website_clicks: pair(series, "website_clicks", m), views: pair(series, "views", m) };
}
/** The first and last day to ask Google for: the month before and the month itself. */
export function figuresRange(m: Month) {
  const p = shiftMonth(m, -1);
  return { start: { year: p.year, month: p.month, day: 1 }, end: { year: m.year, month: m.month, day: daysIn(m) } };
}
export { ALL_METRICS };

// ── The report.
export type TapRow = { code: string; label: string | null; kind: string; placement: string | null; taps: number };
export type LinkEvent = { kind: LinkKind; event: "down" | "back"; at: string };
export type RatingRead = { rating: number | null; count: number | null; then: number | null };
export type MonthlyInputs = {
  business: string;
  month: Month;
  now: Date;
  tz: string;
  counts: Counts;
  needs: Line[];
  plan: Line[];
  taps: TapRow[];
  linkEvents: LinkEvent[];
  /** Everything below came from Google's API when the report was built; null when a read failed or Google is not live. */
  google: {
    source: "live" | "mock";
    rating: RatingRead | null;
    figures: Figures | null;
    reviews: { received: number; replied: number; atLeast: boolean } | null;
    feedback: Theme[];
  } | null;
  demo: boolean;
};

export type MonthlyReport = {
  v: 1;
  month_of: string;
  label: string;
  business: string;
  // The lines are stored with the numbers, so the page, the email and the message say exactly the same words (the page never
  // words a number itself). Google's lines are under `google` and go with it after 30 days.
  work: { did: Chip[]; total: number; found: string[]; quiet: boolean; watched: boolean; lines: string[] };
  results: { taps: { total: number; places: { place: string; taps: number }[]; note: string; lines: string[] } };
  next: { title: string; path: string }[];
  /** Removed after 30 days. */
  google?: {
    fetched_at: string;
    example: boolean;
    rating: { value: number; count: number | null; change: string | null } | null;
    figures: Figures | null;
    reviews: { received: number; replied: number; at_least: boolean } | null;
    feedback: { label: string; count: number; line: string }[];
    /** Rating, new reviews, then calls, direction requests and website clicks. */
    results: string[];
  };
};

const PLACE_LABEL: Record<string, string> = { booking: "Booking confirmation", receipt: "Receipt", email_signature: "Email signature", social_bio: "Social bio" };
/** " (23% more than last month)" or " (no change from last month)"; nothing when there was nothing to compare with. */
export const againstWords = (change: string, than = "last month") => (!change ? "" : change === "no change" ? ` (no change from ${than})` : ` (${change} than ${than})`);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const dayWords = (iso: string, tz: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: tz }).format(new Date(iso));

/** What link watch found, one line each: "Your booking link stopped loading on 3 November and loaded again on 4 November." */
export function linkFindings(events: LinkEvent[], tz: string): string[] {
  const out: string[] = [];
  for (const kind of ["website", "booking", "menu"] as LinkKind[]) {
    const mine = events.filter((e) => e.kind === kind).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    let down: LinkEvent | null = null;
    for (const e of mine) {
      if (e.event === "down") down = e;
      else if (down) {
        out.push(`Your ${LINK_LABEL[kind]} stopped loading on ${dayWords(down.at, tz)} and loaded again on ${dayWords(e.at, tz)}.`);
        down = null;
      }
    }
    if (down) out.push(`Your ${LINK_LABEL[kind]} stopped loading on ${dayWords(down.at, tz)} and was not loading at the end of the month.`);
  }
  return out;
}

export function composeMonthly(i: MonthlyInputs): MonthlyReport {
  const did = didChips(i.counts);
  const found = linkFindings(i.linkEvents, i.tz);
  // Taps by placement: a placement link says where it was pasted; a card or review link says its own label.
  const places = i.taps.filter((t) => t.taps > 0).map((t) => ({
    place: (t.placement ? PLACE_LABEL[t.placement] : t.label?.trim()) || `Link ${t.code}`, taps: t.taps,
  }));
  const taps = i.taps.reduce((s, t) => s + t.taps, 0);
  const next: { title: string; path: string }[] = [];
  for (const l of [...i.needs, ...i.plan]) {
    if (next.length >= 2) break;
    if (!next.some((n) => n.title === l.title)) next.push({ title: l.title, path: l.path });
  }

  const g = i.google;
  const google: MonthlyReport["google"] = g
    ? {
      fetched_at: i.now.toISOString(),
      example: g.source === "mock",
      rating: g.rating?.rating != null
        ? {
          value: g.rating.rating, count: g.rating.count,
          change: g.rating.then != null ? ratingChange(g.rating.rating, g.rating.then) : null,
        }
        : null,
      figures: g.figures,
      reviews: g.reviews ? { received: g.reviews.received, replied: g.reviews.replied, at_least: g.reviews.atLeast } : null,
      feedback: g.feedback.map((t) => ({ label: t.label, count: t.count, line: themeLine(t) })),
      results: [],
    }
    : undefined;

  const watched = i.counts.profile_checks > 0;
  const tapLines = taps > 0
    ? [`Review link and card taps: ${taps}. ${CARD_TAP_NOTE}`, ...places.map((p) => `${p.place}: ${plural(p.taps, "tap", "taps")}`)]
    : [];
  if (google) google.results = googleResultLines(google);
  return {
    v: 1,
    month_of: monthOfDate(i.month),
    label: monthLabel(i.month),
    business: i.business,
    work: { did, total: did.reduce((s, c) => s + c.count, 0), found, quiet: did.length === 0, watched, lines: workLines(did, watched, found) },
    results: { taps: { total: taps, places, note: CARD_TAP_NOTE, lines: tapLines } },
    next,
    ...(google ? { google } : {}),
  };
}

function workLines(did: Chip[], watched: boolean, found: string[]): string[] {
  const out: string[] = did.length ? did.map((c) => `${c.label}: ${c.count}`) : ["A quiet month. Nothing needed to go to Google."];
  if (watched && !did.length) out.push("Kabsi kept watching your Google profile.");
  return [...out, ...found];
}

/** The Google lines of the Results band: rating, new reviews, then Google's own calls, direction requests and website clicks. */
function googleResultLines(g: NonNullable<MonthlyReport["google"]>): string[] {
  const out: string[] = [];
  const ex = g.example ? " (example figures)" : "";
  if (g.rating) {
    const count = g.rating.count != null ? ` from ${plural(g.rating.count, "review", "reviews")}` : "";
    out.push(`Your rating is ${g.rating.value.toFixed(1)}${count}${g.rating.change ? `, ${g.rating.change}` : ""}.`);
  }
  if (g.reviews) out.push(`New reviews: ${g.reviews.at_least ? "at least " : ""}${g.reviews.received}. With a reply: ${g.reviews.replied}.`);
  if (g.figures) {
    const f = g.figures;
    out.push(`Calls from your Google profile: ${f.calls.total}${againstWords(f.calls.change)}${ex}.`);
    out.push(`Direction requests: ${f.directions.total}${againstWords(f.directions.change)}${ex}.`);
    out.push(`Website clicks: ${f.website_clicks.total}${againstWords(f.website_clicks.change)}${ex}.`);
  }
  return out;
}

function ratingChange(now: number, then: number): string {
  const d = Math.round((now - then) * 10) / 10;
  return d === 0 ? "the same as a month ago" : `${d > 0 ? "up" : "down"} ${Math.abs(d).toFixed(1)} from a month ago`;
}

// ── Nearby totals: shown beside the report, never part of it.
export type NearbyTotal = { name: string; rating: number | null; count: number | null };
export type Nearby = { read_on: string; items: NearbyTotal[] };

export function nearbyLines(n: Nearby | null): string[] {
  if (!n || !n.items.length) return [];
  return n.items.map((x) => {
    const rating = x.rating != null ? `${x.rating.toFixed(1)} stars` : "no rating shown";
    const count = x.count != null ? ` from ${plural(x.count, "review", "reviews")}` : "";
    return `${x.name}: ${rating}${count}.`;
  });
}
export const NEARBY_NOTE = "Read live from Google when this report was made. Kabsi does not keep these figures.";

// ── The words, one list used by the email, the page and the message. Plain lines, no markup.
export type Lines = { work: string[]; results: string[]; feedback: string[]; nearby: string[]; next: string[] };

export function reportLines(r: MonthlyReport, nearby: Nearby | null = null): Lines {
  const results = [...(r.google?.results ?? []), ...r.results.taps.lines];
  return {
    work: r.work.lines,
    results: results.length ? results : ["Nothing to show yet. The numbers fill in once Google shares them."],
    feedback: r.google?.feedback.map((x) => x.line) ?? [],
    nearby: nearbyLines(nearby),
    next: r.next.map((n) => n.title),
  };
}

/** The first line of the email and the subject: the work, counted from the chips. */
export function monthSubject(r: MonthlyReport): string {
  const sent = r.work.did.filter((c) => ["replies", "posts", "photos", "hours", "details", "put_back"].includes(c.key)).reduce((s, c) => s + c.count, 0);
  return sent
    ? `Your Kabsi month: ${plural(sent, "thing", "things")} sent to Google in ${monthName(parseMonthOf(r.month_of).month)}`
    : `Your Kabsi month: ${monthName(parseMonthOf(r.month_of).month)}`;
}

/** Plain text for the message and for tests: the title, each band under its label. */
export function monthlyText(r: MonthlyReport, nearby: Nearby | null = null): string {
  const l = reportLines(r, nearby);
  const out = [`Your monthly report: ${r.business}, ${r.label}`, "", "Work done", ...l.work, "", "Results", ...l.results];
  if (l.feedback.length) out.push("", "What customers mention", ...l.feedback);
  if (l.nearby.length) out.push("", "Nearby businesses", ...l.nearby, NEARBY_NOTE);
  out.push("", "What is next", ...(l.next.length ? l.next : ["Nothing needs you right now."]));
  return out.join("\n");
}

/** The short summary the owner asks for on WhatsApp (wired by GATE-2): at most 5 facts, the most useful first, then the link. */
export function monthlySummary(r: MonthlyReport): { title: string; facts: string[]; end: string; path: string } {
  const l = reportLines(r);
  const facts = [...l.work.slice(0, 2), ...l.results.filter((x) => !x.startsWith("A tap")).slice(0, 3)].slice(0, 5);
  return {
    title: "Your monthly report",
    facts: [r.label, ...facts].slice(0, 6),
    end: r.next[0] ? `Next step: ${r.next[0].title}.` : "Nothing needs you right now.",
    path: "/app/report",
  };
}
