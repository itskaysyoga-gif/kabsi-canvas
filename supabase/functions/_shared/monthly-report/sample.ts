// Invented businesses for the monthly report's fixtures: the email catalog, the tests and the expected texts in
// tests/fixtures/proof2/ all read these, so a report built from them is the one expected report, line by line. Nothing here
// is a real business, a real review or a real figure.
import type { Counts } from "../care-report/compose.ts";
import { type Month, type MonthlyInputs, type Nearby, monthFigures, exampleMonthSeries } from "./compose.ts";

export const SAMPLE_MONTH: Month = { year: 2026, month: 10 };
const NOW = new Date("2026-11-01T05:00:00Z"); // 09:00 on 1 November in Dubai

const COUNTS: Counts = {
  replies_prepared: 14, replies_published: 12, posts_published: 2, photos_published: 3, photo_batches: 1, hours_updates: 1, profile_updates: 0,
  profile_checks: 8640, changes_found: 1, changes_kept: 0, changes_put_back: 1,
};

/** A full month: work, results, Google's figures, a recurring topic, nearby totals, a link that stopped and loaded again. */
export const FULL: MonthlyInputs = {
  business: "Rose Lane Salon", month: SAMPLE_MONTH, now: NOW, tz: "Asia/Dubai", counts: COUNTS,
  needs: [{ title: "A reply to Maya K.'s review", path: "/app/reviews?f=needs" }],
  plan: [{ title: "Add photos of your business", path: "/app/photos" }],
  taps: [
    { code: "ABC234", label: "Front desk", kind: "card", placement: null, taps: 5 },
    { code: "DEF567", label: "Booking confirmation", kind: "link", placement: "booking", taps: 3 },
    { code: "GHJ789", label: "Receipt", kind: "link", placement: "receipt", taps: 1 },
    { code: "KMN234", label: "Social bio", kind: "link", placement: "social_bio", taps: 0 },
  ],
  linkEvents: [
    { kind: "booking", event: "down", at: "2026-10-03T07:10:00Z" },
    { kind: "booking", event: "back", at: "2026-10-04T05:20:00Z" },
  ],
  google: {
    source: "live", rating: { rating: 4.7, count: 212, then: 4.6 },
    figures: {
      calls: { total: 38, previous: 31, change: "23% more" }, directions: { total: 47, previous: 47, change: "no change" },
      website_clicks: { total: 66, previous: 70, change: "6% fewer" }, views: { total: 880, previous: 820, change: "7% more" },
    },
    reviews: { received: 14, replied: 12, atLeast: false },
    feedback: [{ id: "waiting", label: "waiting time", count: 4, lean: "low" }, { id: "staff", label: "the staff", count: 6, lean: "high" }],
  },
  demo: false,
};
export const FULL_NEARBY: Nearby = {
  read_on: "2026-11-01",
  items: [{ name: "Juniper Hair Studio", rating: 4.5, count: 301 }, { name: "The Cutting Room", rating: 4.8, count: 96 }],
};

/** A quiet month with nothing sent and no Google read: the report still says so plainly. */
export const QUIET: MonthlyInputs = {
  ...FULL, business: "Harbour Lane Coffee", needs: [], plan: [],
  counts: { ...COUNTS, replies_prepared: 0, replies_published: 0, posts_published: 0, photos_published: 0, photo_batches: 0, hours_updates: 0, changes_found: 0, changes_put_back: 0 },
  taps: [], linkEvents: [], google: null,
};

/** The demo business in Google's mock mode: example figures, labelled. */
export const DEMO: MonthlyInputs = {
  ...QUIET, business: "Demo Salon", demo: true,
  google: { source: "mock", rating: null, figures: monthFigures(exampleMonthSeries(SAMPLE_MONTH), SAMPLE_MONTH), reviews: null, feedback: [] },
};
