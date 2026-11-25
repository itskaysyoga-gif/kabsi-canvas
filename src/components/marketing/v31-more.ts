// SITE-5: the words only Pricing and How it works show, in a file of their own so Home's script does not carry them
// (v31-data.ts is shared with Home). Every business, person and number in an Example is invented.
import { PRICE_MONTHLY_USD, TRIAL_DAYS } from "@/lib/offer";
import type { ChatTurn } from "./v31-data";

/* ---------- Pricing's own content (SITE-5, lane R decision 3): nothing here repeats Home ---------- */

/** "Your first 14 days", day by day, from the facts (06: 4.2, 4.3, 4.4, 4.5). */
export const FIRST_DAYS = {
  title: `Your first ${TRIAL_DAYS} days.`,
  // SITE-8 (R-167): a bold line and a few words a day; the full trial terms are in the price band only.
  steps: [
    {
      when: "Day 1",
      title: "Setup and your first replies.",
      text: "Replies for the last 90 days of reviews.",
    },
    {
      when: `Days 2 to ${TRIAL_DAYS - 1}`,
      title: "The work, every day.",
      text: "Each piece waits for your yes.",
    },
    {
      when: "Before the end",
      title: "A note from Kabsi.",
      text: "What comes next, and the price.",
    },
    {
      when: `Day ${TRIAL_DAYS}`,
      title: "The first charge, unless you cancelled.",
      text: `${PRICE_MONTHLY_USD} US dollars, then monthly.`,
    },
  ],
  starts: "Your 14 days start once Kabsi's Google access works.",
} as const;

/** Cancel and refunds, in plain words (facts 4.2 and 4.5). */
export const LEAVING = {
  title: "Cancel and refunds, in plain words.",
  // SITE-8 (R-167 rule 2): a bold line and one short line each, in a 2x2 grid; the meaning is unchanged.
  points: [
    {
      title: "Cancelling takes one tap.",
      text: "In Settings or on WhatsApp. Kabsi checks once; you can undo it.",
    },
    {
      title: "During the 14 days, you pay nothing.",
      text: "Cancel before day 14: no charge, and Kabsi publishes nothing more.",
    },
    {
      title: "After that, your month runs to its end.",
      text: "It all works to the end of the paid month. A paid month is not refunded.",
    },
    {
      title: "Your Google profile stays yours.",
      text: "Cancelling does not remove Kabsi's access; that is your choice. Your review link and QR code keep working.",
    },
  ],
  law: "Nothing in the terms limits a refund you are entitled to by law.",
} as const;

/** What the plan includes and what it does not, as two lists. */
export const PLAN_LISTS = {
  title: "What the plan includes.",
  notTitle: "Not included",
  not: ["Messages to your customers", "Ads", "Building a website", "Ranking promises"],
} as const;

/** Six billing questions. None of them is on Home. */
export const BILLING_QUESTIONS = [
  {
    q: "Why do I need a card for a free trial?",
    a: `So the plan can carry on after day ${TRIAL_DAYS} without a gap. Nothing is charged during the ${TRIAL_DAYS} days. One trial per business.`,
  },
  {
    q: "What does a second location cost?",
    a: `The same, ${PRICE_MONTHLY_USD} US dollars a month. Each Google profile is its own plan.`,
  },
  {
    q: "Is there a yearly price or a discount?",
    a: "No. There is one monthly plan at one price, the same in every country.",
  },
  {
    q: "Can I pay today?",
    a: "Not yet. Card payments are not open yet, and until then nothing is charged.",
  },
  {
    q: "Who takes the payment?",
    a: "Card payments will be processed by Creem, our merchant of record. Prices are in US dollars, plus tax where it applies.",
  },
  {
    q: "What if my card does not go through?",
    a: "Kabsi keeps working for 7 days and sends a link to update your card, with reminders on days 3 and 6. Then the plan pauses: Kabsi publishes nothing, and nothing is lost.",
  },
] as const;

/** SITE-5: How it works shows a reply approved in the chat, changed first by the owner's own words. Example. */
export const HOW_CHAT: ChatTurn[] = [
  {
    from: "kabsi",
    title: "New 4-star review",
    quote: "Love the colour. The wait was a bit long.",
    lines: [
      "Reply ready:",
      "Thank you, Priya. We are so glad you love the colour, and sorry about the wait. We are working on it.",
    ],
    approve: true,
  },
  { from: "owner", text: "Make it shorter" },
  {
    from: "kabsi",
    lines: [
      "Shorter reply:",
      "Thank you, Priya. Glad you love the colour, and sorry for the wait.",
    ],
    approve: true,
  },
  // SITE-8: the Saturday hours turns are gone (Home shows them), so the chat is about half as tall.
];

/** SITE-5: what Kabsi watches on the profile every day, beside the Google Protection screen. */
export const WATCHED = [
  { title: "Hours", text: "Opening and holiday hours." },
  { title: "Phone", text: "The number customers call." },
  { title: "Website and booking link", text: "A broken link is caught." },
] as const;

/* SITE-7: moved here from v31-data.ts, so Home's script does not carry the words only these pages show. */

/* ---------- How it works (blueprint section 5) ---------- */

export const HOW = {
  title: "How Kabsi works.",
  mark: "works.",
  line: "Kabsi prepares the work. You approve it on WhatsApp or email.",
  // SITE-8 (R-167): a bold line and at most 12 words a step.
  steps: [
    {
      title: "Connect Google.",
      text: "Add Kabsi as a manager. No Google password. Remove it any time.",
    },
    {
      title: "Choose WhatsApp or email.",
      text: "Replies, fixes and posts arrive there for your yes.",
    },
    {
      title: "Your first day.",
      text: "A reply ready for every unanswered review from the last 90 days.",
    },
    { title: "A normal week.", text: "A reply for each review. A fix if your listing changes." },
    { title: "Your monthly report.", text: "What Kabsi did, what it found, what Google shows." },
  ],
  ask: "Change your hours, post a photo or shorten a reply.",
} as const;

/* ---------- About and Security (shortened to the same message) ---------- */

export const ABOUT = {
  title: "Built for owners who have no time for Google.",
  mark: "no time for Google.",
  line: "Kabsi looks after your Google business profile and asks for your yes on WhatsApp or email.",
  why: [
    "Owners run the business all day. The Google profile waits.",
    "Reviews go unanswered and details on Google go out of date.",
    "Kabsi does that work and brings each piece to the owner for a yes.",
  ],
  who: "Kabsi is run by Rashid Abou Hamzy, who works in digital marketing and saw the same gap at every local business: unanswered reviews and Google details out of date.",
} as const;

export const SECURITY = {
  title: "Your Google profile stays yours.",
  mark: "stays yours.",
  line: "Kabsi works as a manager you add. It never sees your password and publishes nothing without your yes.",
  answers: [
    {
      q: "Does Kabsi need my password?",
      a: "No. You add Kabsi as a manager in your Google profile.",
    },
    { q: "What can Kabsi change?", a: "Only what you approve: a reply, a fix, a post or a photo." },
    {
      q: "Does Kabsi contact my customers?",
      a: "No, never. It stores no customer contact details.",
    },
    {
      q: "How do I remove Kabsi?",
      a: "Remove it as a manager in your Google profile. Access ends at once.",
    },
  ],
  stored: {
    title: "What Kabsi keeps",
    items: [
      "Your business details, your settings and the work Kabsi did.",
      "Kabsi's database is in Frankfurt, Germany.",
      "Card payments will be processed by Creem, our merchant of record.",
      "No Google password and no customer contact list.",
    ],
  },
} as const;

export const PRICING = {
  title: "One plan. Everything Kabsi does.",
  mark: "Everything Kabsi does.",
  line: "Nothing extra to unlock.",
  included: [
    "A reply to every review",
    "Alerts for bad reviews",
    "Your listing checked every day",
    "Links checked every day",
    "Holiday hours",
    "Up to 2 posts a month, from your photos",
    "Review link, QR code and counter card",
    "A weekly summary and a monthly report",
  ],
  notIncluded:
    "Kabsi does not message your customers, run ads, build websites or promise rankings.",
  free: "Google Business Profile is free from Google. Kabsi is an independent paid service.",
} as const;
