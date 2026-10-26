// Plans and prices (COPY.md section 3). Prices in US dollars.
export type PlanId = "essentials" | "pro";
export const PLANS: {
  id: PlanId;
  name: string;
  monthly: number;
  yearly: number;
  line: string;
  /** Three concrete differences, work first (brief section 14.8, master plan 30.16 section 5). */
  work: [string, string, string];
  badge?: string;
}[] = [
  {
    id: "essentials",
    name: "Essentials",
    monthly: 19,
    yearly: 190,
    line: "For one business that wants its Google work done and its details kept right.",
    work: [
      "A reply ready for every new review",
      "Holiday hours, 2 posts a month and photos from WhatsApp",
      "1 search term checked monthly",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 39,
    yearly: 390,
    line: "For a business that wants more posts, a team that approves, and weekly checks.",
    work: [
      "Weekly posts, with your menu and offers kept current",
      "Team roles and approval rules",
      "5 search terms checked weekly",
    ],
    badge: "Weekly checks",
  },
];

/** The founding price is for the first 30 paying businesses; the places left come from billing-creem/founding. */
export const FOUNDING_TOTAL = 30;

// The work first, the checks second (master plan 30.15 section 5).
export const PLAN_ROWS: [string, string, string][] = [
  ["Review replies, ready for your yes", "Unlimited", "Unlimited"],
  [
    "Posts and photos",
    "Holiday hours, 2 posts a month, photos from WhatsApp",
    "Weekly posts, photos from WhatsApp, menu and offers kept current",
  ],
  ["WhatsApp approvals, Ask Kabsi, voice notes", "Yes", "Yes"],
  ["Google Protection: alerts when your details change or Google warns you", "Yes", "Yes"],
  [
    "Review Growth: your review link, a QR card and a ready message to forward after a visit",
    "Yes",
    "Yes",
  ],
  ["Profile Coach and category check", "Yes", "Yes"],
  ["Team roles and approval rules", "No", "Yes"],
  ["Results Report", "Weekly", "Weekly and a monthly PDF"],
  ["Nearby check on Google Maps", "1 search term checked monthly", "5 search terms checked weekly"],
  [
    "An answer customers might see, from ChatGPT and Perplexity",
    "3 questions, monthly",
    "10 questions, every 2 weeks",
  ],
  ["Competitor Watch", "3 competitors, monthly", "5 competitors, weekly"],
];
