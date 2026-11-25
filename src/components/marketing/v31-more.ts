// SITE-5: the words only Pricing and How it works show, in a file of their own so Home's script does not carry them
// (v31-data.ts is shared with Home). Every business, person and number in an Example is invented.
import { PRICE_MONTHLY_USD, TRIAL_DAYS } from "@/lib/offer";
import type { ChatTurn } from "./v31-data";

/* ---------- Pricing's own content (SITE-5, lane R decision 3): nothing here repeats Home ---------- */

/** "Your first 14 days", day by day, from the facts (06: 4.2, 4.3, 4.4, 4.5). */
export const FIRST_DAYS = {
  title: `Your first ${TRIAL_DAYS} days.`,
  line: "What happens on each day, and when the first charge comes.",
  steps: [
    {
      when: "Day 1",
      title: "Setup and your first replies.",
      text: "Start with a card; nothing is charged. Replies arrive for every unanswered review from the last 90 days.",
    },
    {
      when: `Days 2 to ${TRIAL_DAYS - 1}`,
      title: "The work, every day.",
      text: "Replies, alerts, daily checks of your hours and links, and posts from your photos. Each waits for your yes.",
    },
    {
      when: "Before the end",
      title: "A note from Kabsi.",
      text: `An email before the ${TRIAL_DAYS} days end, with what happens next and the price.`,
    },
    {
      when: `Day ${TRIAL_DAYS}`,
      title: "The first charge, unless you cancelled.",
      text: `${PRICE_MONTHLY_USD} US dollars, then each month after. Cancel before day ${TRIAL_DAYS} and you pay nothing.`,
    },
  ],
  cta: "The free check comes first. Then you add Kabsi on Google and start your 14 days.",
  starts:
    "Your 14 days start when Kabsi's access to your Google profile works, so waiting for access costs you no days.",
} as const;

/** Cancel and refunds, in plain words (facts 4.2 and 4.5). */
export const LEAVING = {
  title: "Cancel and refunds, in plain words.",
  points: [
    {
      title: "Cancelling takes one tap.",
      text: "In Settings, or tell Kabsi on WhatsApp. Kabsi asks once to make sure, and you can undo it before it happens.",
    },
    {
      title: "During the 14 days, you pay nothing.",
      text: "Cancel before day 14 and nothing is charged. Kabsi stops its work and publishes nothing more.",
    },
    {
      title: "After that, your month runs to its end.",
      text: "Everything keeps working until the end of the month you paid for. A month already paid for is not refunded.",
    },
    {
      title: "Your Google profile stays yours.",
      text: "Cancelling never removes Kabsi's access by itself; removing it is your choice. Your review link and QR code keep working.",
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
    a: `So the plan can carry on after day ${TRIAL_DAYS} without a gap. Nothing is charged during the ${TRIAL_DAYS} days, and if you cancel before day ${TRIAL_DAYS} you pay nothing. One trial per business.`,
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
    a: "Kabsi keeps working for 7 days and sends you a link to update your card, with reminders on day 3 and day 6. After that the plan pauses: Kabsi keeps watching and preparing, publishes nothing, and nothing is lost.",
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
];

/** SITE-5: what Kabsi watches on the profile every day, beside the Google Protection screen. */
export const WATCHED = [
  { title: "Hours", text: "Opening hours and holiday hours." },
  { title: "Phone", text: "The number customers call." },
  { title: "Website and booking link", text: "Checked every day, so a broken link is caught." },
] as const;
