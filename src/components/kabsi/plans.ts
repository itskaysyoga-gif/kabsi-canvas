// Plans and prices (COPY.md sections 3 and 34). Prices in US dollars: the list price, and the founding price for the
// first 30 paying businesses (Price 1, master plan 30.20 section 6). Every row names only what is built today
// (master plan 30.21 section 2, the Design 6 audit); more checks come later.
import { FOUNDING_PRICES, FOUNDING_TOTAL, HELP_LINES, PLAN_PRICES } from "@/lib/site";

export type PlanId = "essentials" | "pro";
export const PLANS: {
  id: PlanId;
  name: string;
  monthly: number;
  yearly: number;
  foundingMonthly: number;
  foundingYearly: number;
  line: string;
  /** Pro's list opens with this line, so its list names only what Pro adds (Design 6). */
  lead?: string;
  /** What the plan does, work first, built features only. */
  work: string[];
  /** The help line of 30.21 section 2. */
  help: string;
  badge?: string;
}[] = [
  {
    id: "essentials",
    name: "Essentials",
    monthly: PLAN_PRICES.essentialsMonthly,
    yearly: PLAN_PRICES.essentialsYearly,
    foundingMonthly: FOUNDING_PRICES.essentialsMonthly,
    foundingYearly: FOUNDING_PRICES.essentialsYearly,
    line: "For one business that wants its Google work done and its details kept right.",
    work: [
      "A reply ready for every new review",
      "Your details checked every day, with an alert when something changes",
      "Holiday hours, 2 posts a month and your photos, made ready",
      "Your review link, a QR card and a ready message to send after a visit",
      "Profile Coach suggestions",
      "A Results Report every Monday, with one next step",
    ],
    help: HELP_LINES.essentials,
  },
  {
    id: "pro",
    name: "Pro",
    monthly: PLAN_PRICES.proMonthly,
    yearly: PLAN_PRICES.proYearly,
    foundingMonthly: FOUNDING_PRICES.proMonthly,
    foundingYearly: FOUNDING_PRICES.proYearly,
    line: "For a business that wants weekly posts and a team that approves.",
    lead: "Everything in Essentials, and:",
    work: [
      "A post every week, with your menu and offers kept current",
      "Team roles and approval rules: choose who can say yes",
      "Review graphics: turn a good review into an image to share",
      "The words people searched on Google to find you, every month",
      "A guide to report a review that breaks Google's rules",
    ],
    help: HELP_LINES.pro,
    badge: "Weekly posts",
  },
];

/** The founding price is for the first 30 paying businesses; the places left come from billing-creem/founding. */
export { FOUNDING_TOTAL };

/** Under the comparison table: nothing that is not built is listed. */
export const MORE_LATER = "More checks come later.";

// The work first. Built features only (Price 1): checks that are not built are not listed until they open (the facts,
// section 2, say which).
export const PLAN_ROWS: [string, string, string][] = [
  ["A reply ready for every new review", "Yes", "Yes"],
  ["Your details checked every day, with an alert when something changes", "Yes", "Yes"],
  ["Posts", "Holiday hours and 2 posts a month", "A post every week, menu and offers kept current"],
  ["Your photos, made ready for Google", "Yes", "Yes"],
  ["Your review link, a QR card and a ready message", "Yes", "Yes"],
  ["Profile Coach suggestions", "Yes", "Yes"],
  // Lane R, 30 Oct 2026: the Coach's actions (built, Pro only) are named in this table only, not on the cards.
  ["Profile Coach actions: the change made for you after your yes", "No", "Yes"],
  ["Results Report every Monday, with one next step", "Yes", "Yes"],
  ["Team roles and approval rules", "No", "Yes"],
  ["Review graphics to share", "No", "Yes"],
  ["The words people searched on Google to find you", "No", "Yes"],
  ["A guide to report a review that breaks Google's rules", "No", "Yes"],
  ["A person on WhatsApp", "The same working day", "Within 4 working hours, and a call"],
];
