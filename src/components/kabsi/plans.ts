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
      "Holiday hours, 2 posts a month and your photos",
      "Profile Coach suggestions, and a next step in every weekly report",
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
    work: [
      "Everything in Essentials, with a post every week",
      "Review graphics to share, and the words people searched to find you",
      "The guide to report a review that breaks Google's rules",
      "Team roles and approval rules",
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
  ["Review replies, ready for your yes", "Unlimited", "Unlimited"],
  [
    "Posts and photos",
    "Holiday hours, 2 posts a month, your photos",
    "A post every week, your photos, menu and offers kept current",
  ],
  ["Google Protection: alerts when your details change or Google warns you", "Yes", "Yes"],
  [
    "Review Growth: your review link, a QR card and a ready message to forward after a visit",
    "Yes",
    "Yes",
  ],
  ["Profile Coach suggestions", "Yes", "Yes"],
  ["Results Report, with a next step", "Weekly", "Weekly"],
  ["Review graphics to share", "No", "Yes"],
  ["The words people searched to find you", "No", "Yes"],
  ["The guide to report a review that breaks Google's rules", "No", "Yes"],
  ["Team roles and approval rules", "No", "Yes"],
  ["A person on WhatsApp", "The same working day", "Within 4 working hours, and a call"],
];
