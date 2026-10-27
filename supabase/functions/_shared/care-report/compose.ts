// The Weekly Care Report's new blocks (P0.5-04, K-28, K-72, K-135, K-136, K-138). Kabsi's own counts come from the audit log
// (public.care_report_inputs) and nothing here changes them: this only words them. The one estimate is the time saved, which is
// the counts times a formula the owner can read, never turned into money (K-72). No review text, no review names. Pure.
import { METRICS } from "../insights/summary.ts";
import type { DailySeries } from "../insights/summary.ts";
import { changeWords } from "../insights/summary.ts";

export type Counts = {
  replies_prepared: number;
  replies_published: number;
  posts_published: number;
  photos_published: number;
  photo_batches: number;
  hours_updates: number;
  profile_updates: number;
  profile_checks: number;
  changes_found: number;
  changes_kept: number;
  changes_put_back: number;
};
export type Line = { title: string; path: string; priority?: string };
export type Inputs = { counts: Counts; needs: Line[]; needs_total: number; plan: Line[] };

/** K-72: minutes of an owner's time each kind of work saves. */
export const MINUTES = { reply: 5, update: 15, photo_batch: 10, profile_check: 10 } as const;
export const FORMULA =
  "5 minutes for each reply sent to Google, 15 for each update (a post, a change to your hours or a profile detail), 10 for each batch of photos and 10 for each profile check that found something. It is an estimate, counted from what Kabsi did.";

/** Posts, hours changes and profile edits that went to Google: the "updates" of K-28. */
export const updatesCount = (c: Counts) => c.posts_published + c.hours_updates + c.profile_updates;
/** Each real action once: a reply prepared, an update or a photo published, a change found. A reply that was also published is one thing. */
export const thingsCount = (c: Counts) => c.replies_prepared + updatesCount(c) + c.photos_published + c.changes_found;

export type TimeSaved = { minutes: number; parts: { label: string; count: number; minutes_each: number; minutes: number }[]; formula: string };
export function timeSaved(c: Counts): TimeSaved {
  const parts = [
    { label: "Replies sent to Google", count: c.replies_published, minutes_each: MINUTES.reply },
    { label: "Updates sent to Google", count: updatesCount(c), minutes_each: MINUTES.update },
    { label: "Batches of photos", count: c.photo_batches, minutes_each: MINUTES.photo_batch },
    { label: "Profile checks that found something", count: c.changes_found, minutes_each: MINUTES.profile_check },
  ].map((p) => ({ ...p, minutes: p.count * p.minutes_each }));
  return { minutes: parts.reduce((s, p) => s + p.minutes, 0), parts, formula: FORMULA };
}

/** "About 25 minutes", "About 1 hour 15 minutes", or "" when there is nothing to say. Always an estimate. */
export function minutesWords(minutes: number): string {
  if (minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = h ? `${h} ${h === 1 ? "hour" : "hours"}` : "";
  const mins = m ? `${m} ${m === 1 ? "minute" : "minutes"}` : "";
  return `About ${[hours, mins].filter(Boolean).join(" ")}`;
}

export function headline(c: Counts): string {
  const n = thingsCount(c);
  return n === 0 ? "A quiet week. Kabsi kept watching your profile." : `Kabsi took care of ${n} ${n === 1 ? "thing" : "things"} this week.`;
}

/** The Google Profile line: "Checked 2,016 times. 1 change found and put back." or "No important changes". */
export function profileLine(c: Counts): string {
  const checked = `Checked ${c.profile_checks.toLocaleString("en-US")} ${c.profile_checks === 1 ? "time" : "times"}.`;
  if (c.changes_found === 0) return `${checked} No important changes.`;
  const how = [c.changes_put_back ? `${c.changes_put_back} put back` : "", c.changes_kept ? `${c.changes_kept} kept as Google changed it` : ""].filter(Boolean).join(", ");
  const open = Math.max(c.changes_found - c.changes_put_back - c.changes_kept, 0);
  return `${checked} ${c.changes_found} ${c.changes_found === 1 ? "change" : "changes"} found${how ? `: ${how}` : ""}${open ? `, ${open} waiting for you` : ""}.`;
}

// ── Customer activity: the week against the week before (Google's numbers; mock until Gate A, then labelled Example).
export type Day = { year: number; month: number; day: number };
export type WeekActivity = {
  source: "live" | "mock";
  example: boolean;
  from: string;
  to: string;
  views: { this: number; last: number; change: string };
  calls: { this: number; last: number; change: string };
  website_clicks: { this: number; last: number; change: string };
  directions: { this: number; last: number; change: string };
  fetched_at: string;
};
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const dayOf = (d: Date): Day => ({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });

/** Seven days ending yesterday (Google's figures lag a day or two) and the seven before. */
export function weekPeriods(now: Date) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const start = new Date(end.getTime() - 6 * 86400_000);
  const prevEnd = new Date(start.getTime() - 86400_000);
  const prevStart = new Date(prevEnd.getTime() - 6 * 86400_000);
  const days = (a: Date) => Array.from({ length: 7 }, (_, i) => iso(new Date(a.getTime() + i * 86400_000)));
  return {
    current: { start: dayOf(start), end: dayOf(end), days: days(start) },
    previous: { start: dayOf(prevStart), end: dayOf(prevEnd), days: days(prevStart) },
  };
}

const sum = (s: DailySeries, key: keyof typeof METRICS, days: string[]) =>
  METRICS[key].reduce((t, m) => t + days.reduce((u, d) => u + (s[m]?.[d] ?? 0), 0), 0);
const pair = (s: DailySeries, key: keyof typeof METRICS, p: ReturnType<typeof weekPeriods>) => {
  const t = sum(s, key, p.current.days);
  const l = sum(s, key, p.previous.days);
  return { this: t, last: l, change: changeWords(t, l) };
};

export function weekActivity(series: DailySeries, now: Date, source: "live" | "mock"): WeekActivity {
  const p = weekPeriods(now);
  return {
    source, example: source === "mock", from: p.current.days[0]!, to: p.current.days[6]!, fetched_at: now.toISOString(),
    views: pair(series, "views", p), calls: pair(series, "calls", p),
    website_clicks: pair(series, "website_clicks", p), directions: pair(series, "directions", p),
  };
}

/** Labelled example figures for Google's mock mode: the same every week, so nobody mistakes them for results. */
export function exampleWeekSeries(now: Date): DailySeries {
  const p = weekPeriods(now);
  const fill = (m: string, thisWeek: number, lastWeek: number) => {
    const out: Record<string, number> = {};
    p.current.days.forEach((d, i) => (out[d] = Math.floor(thisWeek / 7) + (i < thisWeek % 7 ? 1 : 0)));
    p.previous.days.forEach((d, i) => (out[d] = Math.floor(lastWeek / 7) + (i < lastWeek % 7 ? 1 : 0)));
    return [m, out] as const;
  };
  return Object.fromEntries([
    fill("BUSINESS_IMPRESSIONS_MOBILE_SEARCH", 214, 198), fill("CALL_CLICKS", 9, 7), fill("WEBSITE_CLICKS", 17, 15), fill("BUSINESS_DIRECTION_REQUESTS", 12, 11),
  ]);
}

export type ReportTerms = { source: "live" | "mock"; example: boolean; month_label: string; items: { term: string; count: string }[]; fetched_at: string };

export type CareBlocks = {
  v: 2;
  care: { headline: string; things: number; counts: Counts; profile_line: string };
  time_saved: TimeSaved & { words: string };
  needs: Line[];
  needs_total: number;
  plan: Line[];
  activity?: WeekActivity;
  terms?: ReportTerms;
};

export function composeCare(i: Inputs, extra: { activity?: WeekActivity | null; terms?: ReportTerms | null }): CareBlocks {
  const ts = timeSaved(i.counts);
  return {
    v: 2,
    care: { headline: headline(i.counts), things: thingsCount(i.counts), counts: i.counts, profile_line: profileLine(i.counts) },
    time_saved: { ...ts, words: minutesWords(ts.minutes) },
    needs: i.needs.slice(0, 3),
    needs_total: i.needs_total,
    plan: i.plan.slice(0, 3),
    ...(extra.activity ? { activity: extra.activity } : {}),
    ...(extra.terms ? { terms: extra.terms } : {}),
  };
}
