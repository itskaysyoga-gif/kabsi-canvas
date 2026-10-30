// Design 6 (master plan 30.20 section 3, 30.21; Web 3): the hero line and the demonstration's Example review.

/** The hero's supporting line (30.20 section 3, approved). The "at launch" line follows it while WhatsApp is off. */
export const HERO_LINE =
  "Reviews to reply to. Details to keep right. Posts to prepare. Kabsi does the work and asks for your yes on WhatsApp.";

/* ---------- The demonstration: one review, Rose Lane Salon (Example) ---------- */

export const DEMO = {
  business: "Rose Lane Salon",
  reviewer: "Layla K.",
  stars: 5,
  quote: "Hana did my colour and it is exactly what I asked for.",
  reply: "Thank you, Layla. We will pass this on to Hana. See you at your next visit.",
  ownerEdit: "Add that we are glad she loves it.",
  edited:
    "Thank you, Layla. We are glad you love it, and we will pass this on to Hana. See you at your next visit.",
} as const;
