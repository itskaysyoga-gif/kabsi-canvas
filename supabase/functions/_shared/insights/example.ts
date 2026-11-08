// Example figures (P0.5-05, K-26). While Google is in mock mode there are no real figures, and the mock Performance
// module returns zeros so that nothing invented can reach a report (guardrail 23). The Insights screen still has to be
// shown working, so in mock mode this module makes a fixed, recognisable set of numbers and the screen labels every
// one of them "Example". The numbers depend only on the date, so a reload shows the same screen. They are never
// stored, never emailed and never used in the Weekly Care Report as Kabsi's own work.
// The example search terms follow the business's trade (Fixes B, R-126): a hair salon is never shown cafe searches.
import { daysBetween, type Periods } from "./periods.ts";
import type { DailySeries } from "./summary.ts";
import type { RawTerm } from "./terms.ts";

const PER_DAY: Record<string, [base: number, swing: number]> = {
  CALL_CLICKS: [2, 2],
  WEBSITE_CLICKS: [3, 2],
  BUSINESS_DIRECTION_REQUESTS: [4, 3],
  BUSINESS_IMPRESSIONS_DESKTOP_MAPS: [9, 4],
  BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: [14, 5],
  BUSINESS_IMPRESSIONS_MOBILE_MAPS: [24, 8],
  BUSINESS_IMPRESSIONS_MOBILE_SEARCH: [38, 10],
};

/** A small repeatable wobble from the date and metric, so the chart is not a flat line. */
function wobble(day: string, metric: string): number {
  let h = 0;
  for (const c of `${day}|${metric}`) h = (h * 31 + c.charCodeAt(0)) % 9973;
  return h / 9973;
}

export function exampleSeries(p: Periods): DailySeries {
  const out: DailySeries = {};
  const days = [...daysBetween(p.previous.start, p.previous.end), ...daysBetween(p.current.start, p.current.end)];
  const currentStart = days.length - daysBetween(p.current.start, p.current.end).length;
  for (const [metric, [base, swing]] of Object.entries(PER_DAY)) {
    out[metric] = {};
    days.forEach((d, i) => {
      // The current period runs a little above the previous one, so the comparison has something to say.
      const lift = i >= currentStart ? 1.12 : 1;
      out[metric][d] = Math.max(0, Math.round((base + swing * wobble(d, metric)) * lift));
    });
  }
  return out;
}

export type Trade = "hair_salon" | "barber" | "beauty_nails" | "spa" | "clinic" | "restaurant" | "cafe" | "gym" | "general";

// Every list has the same shape: five terms with a count, then two below Google's threshold ("fewer than 15").
const list = (terms: string[]): RawTerm[] =>
  terms.map((searchKeyword, i) => ({ searchKeyword, insightsValue: i < 5 ? { value: String([142, 86, 61, 37, 24][i]) } : { threshold: "15" } }));

export const EXAMPLE_TERMS_BY_TRADE: Record<Trade, RawTerm[]> = {
  hair_salon: list(["hair salon near me", "balayage near me", "haircut open now", "curly hair specialist", "colour correction", "hair salon with parking", "bridal hair trial"]),
  barber: list(["barber near me", "best fade haircut", "barber open now", "beard trim", "walk in barber", "hot towel shave", "boys haircut"]),
  beauty_nails: list(["nail salon near me", "gel nails", "beauty salon open now", "eyebrow tinting", "lash lift", "waxing near me", "manicure and pedicure"]),
  spa: list(["day spa near me", "massage near me", "spa open now", "facial treatment", "couples massage", "spa gift voucher", "hot stone massage"]),
  clinic: list(["clinic near me", "walk in clinic", "clinic open now", "book a doctor appointment", "same day appointment", "clinic with parking", "health check"]),
  restaurant: list(["restaurant near me", "best restaurant for dinner", "restaurant open now", "book a table", "sunday lunch", "restaurant with outdoor seating", "vegetarian dinner"]),
  cafe: list(["coffee near me", "best flat white", "cafe open now", "brunch", "vegan pastries", "cafe with wifi", "oat milk latte"]),
  gym: list(["gym near me", "gym open now", "personal trainer", "gym day pass", "fitness classes", "gym with parking", "strength training"]),
  general: list(["open now near me", "best rated near me", "book an appointment", "opening hours today", "phone number", "reviews near me", "parking nearby"]),
};

// Places types (hair_salon) and the words owners and Google use (Hair salon), most specific first. A hair and beauty
// salon is a hair salon; a barber shop is not.
const TRADE_RULES: [Trade, RegExp][] = [
  ["barber", /\bbarbers?\b/],
  ["hair_salon", /\b(hair|hairdressers?|hairdressing|hairstylists?)\b/],
  ["beauty_nails", /\b(nails?|beauty|manicure|pedicure|lash|lashes|brows?|waxing|makeup)\b/],
  ["spa", /\b(spa|massage|wellness)\b/],
  ["clinic", /\b(clinic|doctor|medical|dentist|dental|physio|physiotherapist|physiotherapy|chiropractor)\b/],
  ["restaurant", /\b(restaurant|bistro|grill|diner|pizzeria|steakhouse|takeaway)\b/],
  ["cafe", /\b(cafe|coffee|tea room|tearoom)\b/],
  ["gym", /\b(gym|fitness|crossfit|pilates|yoga)\b/],
];

/** The trade of a business from its Google category, the category's label and, last, its name. Anything else is general. */
export function tradeOf(b: { category?: string | null; categoryLabel?: string | null; name?: string | null }): Trade {
  for (const raw of [b.category, b.categoryLabel, b.name]) {
    const text = String(raw ?? "").toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
    if (!text) continue;
    for (const [trade, re] of TRADE_RULES) if (re.test(text)) return trade;
  }
  return "general";
}

export const exampleTermsFor = (b: Parameters<typeof tradeOf>[0]): RawTerm[] => EXAMPLE_TERMS_BY_TRADE[tradeOf(b)];
