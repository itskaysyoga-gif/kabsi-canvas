// The shared FAQ (COPY.md section 16), numbered as there.
export const FAQ: { q: string; a: string }[] = [
  {
    q: "Does Kabsi need my Google password?",
    a: "No. You add Kabsi as a Manager on your Google profile. You stay the owner and can remove Kabsi any time.",
  },
  {
    q: "Is anything posted without me?",
    a: "No. Every reply, post and change waits for your yes on WhatsApp.",
  },
  {
    q: "What if I already reply to reviews myself?",
    a: "Keep going. Kabsi drafts a reply for each new review, and you can edit or skip any of them.",
  },
  {
    q: "Can Kabsi promise where I come up on Google Maps?",
    a: "No one can promise that. Kabsi shows where you show up, what changed, and what you can do next.",
  },
  { q: "Can I edit replies?", a: "Yes. Tap Edit on WhatsApp or on the Kabsi website." },
  {
    q: "Is this safe with Google?",
    a: "Kabsi uses Google's tools for managers and only acts after your yes. Kabsi is independent and not affiliated with Google.",
  },
  {
    q: "What happens after the trial?",
    a: "Choose a plan to keep going. If you do not, Kabsi stops publishing and you keep your review link and QR code.",
  },
  {
    q: "Can I cancel?",
    a: "Yes, any time. Your plan runs to the end of the period you paid for.",
  },
  {
    q: "Where does the ranking data come from?",
    a: "Kabsi runs its own checks of public Google Maps and AI answers. They are separate from the numbers in your Google Business Profile.",
  },
  { q: "Is my data safe?", a: "Yes. Read how Kabsi handles it on the Privacy page." },
  // 11, from the outside review (master plan 30.16 section 5): the honest answer.
  {
    q: "Can't I do this myself for free?",
    a: "Yes. Your Google profile is free, and you can reply to reviews and update it yourself. The subscription pays for the ongoing work: Kabsi keeps checking, drafts the replies and posts, follows up, and brings each one to you on WhatsApp for a yes.",
  },
];

// Web 4 (Design 8): the fourth question on Home is "Can I cancel?".
export const HOME_FAQ = [11, 1, 4, 8];

/** Pricing's "Billing questions" (Design 8), checked against the facts (4.3, 4.5, which cancel is which). With the shared FAQ
 * because the route head builds the FAQPage data from them. */
export const BILLING_FAQ: { q: string; a: string }[] = [
  {
    q: "Do I need a card for the trial?",
    a: "No. The trial is 14 days of Pro with no card, one per business. It starts when Kabsi's access to your Google profile works.",
  },
  {
    q: "What happens after the trial?",
    a: "Choose a plan to keep going. If you do not, Kabsi keeps watching and drafting for 7 more days and publishes nothing. Your review link and QR code keep working.",
  },
  FAQ[7]!,
  {
    q: "Which cancel is which?",
    a: "Cancelling on the Plan page or by asking Kabsi ends your plan at the end of the period you paid for, and everything keeps working until then. Cancelling in Creem's own billing page ends the plan at once.",
  },
  {
    q: "Can I get a refund?",
    a: "Yearly plans are refundable in full within 14 days of the plan starting. A monthly plan runs to the end of the month paid for. Write to hello@kabsi.co.",
  },
  {
    q: "Can I pay today?",
    a: "Nothing to pay today. Card payments in US dollars are coming. Payments are processed by Creem, our merchant of record.",
  },
];
