// The private founding offer (blueprint 3.1, R-163; private since Founding 1, R-151): the words that only the invited page
// /founding/<slug> uses. Kept out of every file a public page loads, so no public page carries them. The price and the
// trial come from src/lib/offer.ts.
import { FOUNDING_LINE, FOUNDING_MONTHLY_USD, TRIAL_LINE } from "@/lib/offer";

export const FOUNDING_HERO = {
  title: `Founding offer: ${FOUNDING_MONTHLY_USD} US dollars a month.`,
  mark: `${FOUNDING_MONTHLY_USD} US dollars a month.`,
  line: "For the first 25 businesses Rashid invites. Kabsi does the Google work; you tell Rashid what to make better.",
  action: "Apply for a place",
} as const;

/** Under the hero's button and beside the checkout: the founding price, then the trial. */
export const FOUNDING25_UNDER = FOUNDING_LINE;
export const FOUNDING_TRIAL = TRIAL_LINE.replace(
  "Then 29 US dollars a month",
  `Then ${FOUNDING_MONTHLY_USD} US dollars a month`,
);

/** "Questions about the founding offer" on the invited page. No FAQPage data: the page is not indexed. */
export const FOUNDING_FAQ = [
  {
    q: "What happens after 12 months?",
    a: "From month 13 the price is 29 US dollars a month. We email you 14 days before the change.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. 14 days free. A card is needed to start. Cancel before day 14 and you pay nothing.",
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
    q: "Can I cancel?",
    a: "Any time. One tap in Settings, or tell Kabsi on WhatsApp.",
  },
];
