// The hero lines a route's head needs (Design 8, Web 4). Their own tiny file: route heads stay in the shared bundle on
// every page (Lean 1), so a head must never import a page component or a page's data.

/** Home's supporting line (lane R, Polish 2, 3 Nov 2026: the owner's benefit first, then how it works). */
export const HOME_LINE =
  "Your details kept right, every review answered and your profile kept fresh, without doing it yourself. Kabsi prepares the work and asks for your yes before anything goes live.";

/** The free check's hero. */
export const CHECK_HERO = {
  title: "Check your business on Google, free.",
  line: "See what customers see on your Google profile and what to do first. About 10 seconds, and no access needed.",
} as const;

/** Pricing's hero (approved, COPY 34 and 38). */
export const PRICING_HERO = {
  title: "Two plans. Free for 14 days.",
  line: "Each plan does the Google work for one business, and you approve every change.",
} as const;

/** How it works' hero (Design 7 headline, Design 8 line). */
export const HOW_HERO = {
  title: "Kabsi prepares. You approve. Kabsi follows through.",
  // Polish 4 (LATER row): the meta description describes the page's three cases, as the page now shows them.
  line: "Three Example cases at an invented salon in Bristol: hours changed on Google, a photo turned into a post and a new review, from your yes to live on Google.",
} as const;

/** FAQ's hero (Design 8; the headline approved). */
export const FAQ_HERO = {
  title: "Questions owners ask",
  line: "Short answers, in five groups. If yours is not here, write to hello@kabsi.co and a person answers.",
} as const;

/** About's hero (Design 8; the headline approved). */
export const ABOUT_HERO = {
  title: "Kabsi is built for the owner at the counter.",
  line: "One founder, one job: the Google work a local business never has time for, done and brought to the owner for a yes.",
} as const;

/** Security's hero (Design 8). */
export const SECURITY_HERO = {
  title: "Your Google profile stays yours.",
  line: "Kabsi works as a Manager you add, never sees your password, publishes nothing without your yes, and is gone the moment you remove it.",
} as const;

/** Founding 25's hero (approved). */
export const FOUNDING_HERO = {
  title: "Founding 25: three months of Kabsi Pro, free.",
  line: "For 25 businesses. Kabsi does the Google work; you tell Rashid what to make better.",
  action: "Apply for a place",
} as const;

/** Partners' hero (approved). */
export const PARTNERS_HERO = {
  title: "Earn 25% of every payment.",
  line: "Recommend Kabsi to local business owners you know. You earn while the referred subscription stays paid. Kabsi Partners opens when card payments open.",
} as const;

/** The Businesses hub's hero (Design 8). */
export const HUB_HERO = {
  title: "The Google work your kind of business has.",
  line: "A barbershop's week on Google is not a restaurant's. Pick your trade to see the jobs that come back, the searches people use, and what the free check shows.",
} as const;
