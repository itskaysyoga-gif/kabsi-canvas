// Founding 25, private since Founding 1 (R-151, master plan 30.51): the words that only the invited page /founding/<slug> uses.
// Kept out of hero-lines.ts and faq-data.ts, which every public page loads, so no public page carries them.
export const FOUNDING_HERO = {
  title: "Founding 25: three months of Kabsi Pro, free.",
  line: "For 25 businesses. Kabsi does the Google work; you tell Rashid what to make better.",
  action: "Apply for a place",
} as const;

export const FOUNDING25_UNDER =
  "By application. No card. After 90 days, choose a plan or stop, nothing is charged by itself.";

/** "Questions about Founding 25" on the invited page. No FAQPage data: the page is not indexed. */
export const FOUNDING_FAQ = [
  {
    q: "What happens after 90 days?",
    a: "You choose a plan at the launch price, kept while your subscription stays paid, or you stop. Nothing is charged by itself.",
  },
  {
    q: "What goes in a case study?",
    a: "Your words, the work Kabsi did from its own records (replies published, posts, details fixed) and only the numbers you choose to share from your own Google screens. Named or anonymous, and you approve the final text.",
  },
  {
    q: "Why by application?",
    a: "So the 25 cover the kinds of business Kabsi serves, and every place goes to someone who will use it every week.",
  },
  {
    q: "Can I leave before the 90 days end?",
    a: "Any time. Remove Kabsi from your Google profile and tell Rashid.",
  },
];
