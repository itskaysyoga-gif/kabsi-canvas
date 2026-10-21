// Insights figures and the headline (P0.5-05, K-26). Plain counts and plain comparisons: Kabsi says what changed and
// by how much, never why (K-26: "This changed", never a cause).
import { daysBetween, type Periods } from "./periods.ts";

/** Google's daily metric names, as they come back; values are counts per ISO day. */
export type DailySeries = Record<string, Record<string, number>>;

export const METRICS = {
  calls: ["CALL_CLICKS"],
  website_clicks: ["WEBSITE_CLICKS"],
  directions: ["BUSINESS_DIRECTION_REQUESTS"],
  views: [
    "BUSINESS_IMPRESSIONS_DESKTOP_MAPS", "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
    "BUSINESS_IMPRESSIONS_MOBILE_MAPS", "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
  ],
  bookings: ["BUSINESS_BOOKINGS"],
  messages: ["BUSINESS_CONVERSATIONS"],
} as const;
export type TileKey = keyof typeof METRICS;
export const ALL_METRICS: string[] = Object.values(METRICS).flat();
/** What counts as someone interacting with the profile. Views are people seeing it, not interacting. */
const INTERACTIONS: TileKey[] = ["calls", "website_clicks", "directions", "bookings", "messages"];

export type Tile = { key: TileKey; label: string; this: number; last: number; change: string };
export type Summary = {
  headline: string;
  interactions: { this: number; last: number };
  tiles: Tile[];
  daily: { date: string; calls: number; website_clicks: number; directions: number; views: number }[];
  periods: { kind: Periods["kind"]; this_label: string; last_label: string };
};

const LABEL: Record<TileKey, string> = {
  calls: "Calls", website_clicks: "Website clicks", directions: "Direction requests", views: "Times your profile was seen",
  bookings: "Bookings", messages: "Messages",
};

function total(series: DailySeries, key: TileKey, days: string[]): number {
  let sum = 0;
  for (const metric of METRICS[key]) for (const d of days) sum += series[metric]?.[d] ?? 0;
  return sum;
}
const dayValue = (series: DailySeries, key: TileKey, day: string) => METRICS[key].reduce((s, m) => s + (series[m]?.[day] ?? 0), 0);

/** "12% more", "12% fewer", "no change", or "" when last period had nothing to compare with. */
export function changeWords(now: number, before: number): string {
  if (before <= 0) return "";
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return "no change";
  return `${Math.abs(pct)}% ${pct > 0 ? "more" : "fewer"}`;
}

export function headline(interactions: { this: number; last: number }, p: Periods): string {
  const when = p.kind === "month_so_far" ? "this month" : `in ${p.current.label}`;
  const against = p.kind === "month_so_far" ? "last month" : p.previous.label;
  const noun = interactions.this === 1 ? "customer" : "customers";
  const base = `${interactions.this} ${noun} interacted with your Google profile ${when}`;
  const change = changeWords(interactions.this, interactions.last);
  if (!change) return `${base}.`;
  if (change === "no change") return `${base}, the same as ${against}.`;
  return `${base}, ${change} than ${against}.`;
}

export function summarise(series: DailySeries, p: Periods): Summary {
  const thisDays = daysBetween(p.current.start, p.current.end);
  const lastDays = daysBetween(p.previous.start, p.previous.end);
  const interactions = {
    this: INTERACTIONS.reduce((s, k) => s + total(series, k, thisDays), 0),
    last: INTERACTIONS.reduce((s, k) => s + total(series, k, lastDays), 0),
  };
  const keys: TileKey[] = ["calls", "website_clicks", "directions", "views"];
  // Bookings and messages appear only where Google returns them for this profile.
  for (const k of ["bookings", "messages"] as const) if (total(series, k, thisDays) + total(series, k, lastDays) > 0) keys.push(k);
  const tiles: Tile[] = keys.map((key) => {
    const a = total(series, key, thisDays), b = total(series, key, lastDays);
    return { key, label: LABEL[key], this: a, last: b, change: changeWords(a, b) };
  });
  const daily = thisDays.map((date) => ({
    date,
    calls: dayValue(series, "calls", date),
    website_clicks: dayValue(series, "website_clicks", date),
    directions: dayValue(series, "directions", date),
    views: dayValue(series, "views", date),
  }));
  return {
    headline: headline(interactions, p),
    interactions,
    tiles,
    daily,
    periods: { kind: p.kind, this_label: p.current.label, last_label: p.previous.label },
  };
}
