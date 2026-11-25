// The words of the core public pages on blueprint 3.1 (SITE-1, R-163, docs/kabsi-final/KABSI-WEBSITE-AND-CONVERSION-BLUEPRINT.md).
// Where the blueprint gives the words they are copied as they stand; docs/COPY.md section 90 lists every line with its source.
// Every business, person and number in an Example here is invented. Prices and the trial come from src/lib/offer.ts only.
import { PRICE_MONTHLY_USD, TRIAL_LINE } from "@/lib/offer";

/* ---------- Home (blueprint section 3) ---------- */

export const HOME_HERO = {
  title: "Your business on Google. Taken care of.",
  mark: "Taken care of.",
  line: "Kabsi answers your reviews, protects your listing and keeps it fresh. You approve on WhatsApp or email.",
  under: "Free check. No card. 20 seconds.",
} as const;

/** The invented business in every Example on Home. */
export const EXAMPLE_BUSINESS = "Maple Street Salon";

export type ChatTurn =
  | {
      from: "kabsi";
      title?: string;
      lines: string[];
      quote?: string;
      approve?: boolean | undefined;
    }
  | { from: "owner"; text: string; photo?: boolean | undefined };

/** The hero picture: a new 5-star review with its reply, then the owner changes Saturday's hours. */
export const HERO_CHAT: ChatTurn[] = [
  {
    from: "kabsi",
    title: "New 5-star review",
    quote: "Lovely cut and a warm welcome. Sam took real care.",
    lines: [
      "Reply ready:",
      "Thank you, Jess. We are glad Sam took care of you. See you next time.",
    ],
    approve: true,
  },
  { from: "owner", text: "Close at 3 this Saturday" },
  {
    from: "kabsi",
    title: "Saturday hours",
    lines: ["Saturday 29 November: 9:00 to 15:00.", "Every other day stays the same."],
    approve: true,
  },
];

/** The same approval as an email (the switch under the hero picture). The subject follows R-30. */
export const HERO_EMAIL = {
  subject: `${EXAMPLE_BUSINESS}: new 5-star review, reply ready`,
  quote: "Lovely cut and a warm welcome. Sam took real care.",
  reply: "Thank you, Jess. We are glad Sam took care of you. See you next time.",
} as const;

/* ---------- SITE-3 (R-164 item 7): the home page redone to convert ---------- */

/**
 * SITE-8 (R-167 rule 4): the page's one trust list, short, under the hero button. Home and the trade pages show it once
 * and nowhere else (the "You stay in charge" band is gone).
 */
export const HERO_MARKS = [
  "No Google password",
  "Nothing is published without your yes",
  "Kabsi never contacts your customers",
  "Independent and not affiliated with Google",
] as const;

/** The hero phone plays three short scenes in turn, each ending with the owner's yes. All Example. */
export const HERO_SCENES: { name: string; turns: ChatTurn[]; done: string }[] = [
  {
    name: "A review reply approved",
    turns: [
      {
        from: "kabsi",
        title: "New 5-star review",
        quote: "Lovely cut and a warm welcome. Sam took real care.",
        lines: ["Reply ready:", "Thank you, Jess. We are glad Sam took care of you."],
        approve: true,
      },
    ],
    done: "Your reply is live on Google.",
  },
  {
    name: "Saturday's hours approved",
    turns: [
      { from: "owner", text: "Close at 3 this Saturday" },
      {
        from: "kabsi",
        title: "Saturday hours",
        lines: ["Saturday 29 November: 9:00 to 15:00.", "Every other day stays the same."],
        approve: true,
      },
    ],
    done: "Your new hours are live on Google.",
  },
  {
    name: "A photo posted",
    turns: [
      { from: "owner", text: "Post this", photo: true },
      {
        from: "kabsi",
        title: "Post ready",
        lines: ["Fresh colour, done in the salon this week. Book a visit any day."],
        approve: true,
      },
    ],
    done: "Your post is live on Google.",
  },
];

/**
 * The problem, on the page's charcoal band. Each point is what Google's own help pages say, with the link; read as raw
 * page text on 24 Nov 2026. No numbers. A point with no Google source is left out.
 */
export const PROBLEM = {
  title: "Is your Google profile working for you?",
  // SITE-8 (R-167 rule 5): each claim is one short line; the sources sit in one footnote for the band.
  points: [
    {
      stat: "Replies",
      text: "Google says a reply shows customers you value their feedback.",
      source: "https://support.google.com/business/answer/7091?hl=en",
    },
    {
      stat: "4 days",
      text: "Leave a suggested edit unanswered and Google may publish it.",
      source: "https://support.google.com/business/answer/3480441?hl=en",
    },
    {
      stat: "Hours",
      text: "Wrong details may keep you out of searches near you.",
      source: "https://support.google.com/business/answer/7091?hl=en",
    },
  ],
} as const;

/** A week with Kabsi: four days, each a small drawn card. Example. The weekly summary arrives on Monday (facts 04). */
export const WEEK = {
  title: "A week with Kabsi.",
  // SITE-8 (R-167 rule 3): the pictures show each day, so each keeps its title only.
  days: [
    { day: "Monday", title: "A review, answered in one tap." },
    { day: "Wednesday", title: "Changed hours, set back." },
    { day: "Friday", title: "Your photo, posted." },
    { day: "Next Monday", title: "Your weekly summary." },
  ],
} as const;

/** The short weekly summary beside the monthly report (PROOF-2: 3 to 5 fact lines, then what waits and one next step). */
export const WEEKLY_SUMMARY = {
  title: "Your week, Maple Street Salon",
  lines: [
    "4 replies live on Google.",
    "1 change caught on Google and set back.",
    "1 post live on Google.",
    "Your review link was tapped 6 times.",
  ],
  next: "Nothing waits for you. Next: holiday hours for December.",
} as const;

export const TELL = {
  title: "Just tell Kabsi.",
  mark: "Just tell",
  line: "No app to learn. Message it like a manager.",
  voice: "Or send a voice note.",
  voiceLine: "You see the change in writing first.",
} as const;

export type TellChip = { ask: string; photo?: boolean; answer: string[]; approve?: boolean };

/**
 * The example messages (blueprint 3.3). Only what works on main is shown (blueprint 3, rules for the page): until
 * OFFER-2 ships the "waiting" read and the QR image in the chat, "Send me my review link" takes the place of "What needs
 * my attention?" and "Send me my review QR code" is left out. OFFER-2 (PR 593) shipped both on 24 Nov 2026.
 */
export const OFFER2_ON = true;
export const QR_IMAGE_ON = true;

const ATTENTION: TellChip = {
  ask: "What needs my attention?",
  answer: [
    "2 things wait for your yes:",
    "a reply to a 4-star review, and holiday hours for 25 December.",
  ],
};
const REVIEW_LINK: TellChip = {
  ask: "Send me my review link",
  answer: [
    "Here is your review link. Share it at the till or on your receipts.",
    "go.kabsi.co/maple-street",
  ],
};
const QR_CODE: TellChip = {
  ask: "Send me my review QR code",
  answer: ["Here is your QR code. Print it for the counter."],
};

export const TELL_CHIPS: TellChip[] = [
  OFFER2_ON ? ATTENTION : REVIEW_LINK,
  {
    ask: "Make this reply shorter",
    answer: ["Shorter reply:", "Thank you, Jess. Glad Sam took care of you."],
    approve: true,
  },
  {
    ask: "Close at 3 this Saturday",
    answer: ["Saturday 29 November: 9:00 to 15:00.", "Every other day stays the same."],
    approve: true,
  },
  {
    ask: "Post this",
    photo: true,
    answer: ["Post ready:", "Fresh colour, done in the salon this week. Book a visit any day."],
    approve: true,
  },
  {
    ask: "How many reviews this month?",
    answer: ["6 new reviews this month, all answered.", "Your rating is 4.8."],
  },
  ...(QR_IMAGE_ON ? [QR_CODE] : []),
];

export const BENEFITS = [
  {
    title: "Every review answered.",
    text: "A reply written in your voice for every review, and an alert the moment a bad one arrives.",
  },
  {
    title: "Your listing protected.",
    text: "Hours, phone, website and booking link checked every day. One tap to fix what changed.",
  },
  {
    title: "Proof of the work.",
    text: "A short summary every week and a full report every month.",
  },
] as const;

export const BENEFITS_TITLE = {
  title: "What Kabsi does without being asked.",
  mark: "without being asked.",
} as const;
export const ALSO_INCLUDED =
  "Also included: holiday hours, up to 2 posts a month, photos from your phone, and tools to get more reviews.";

export const START = {
  title: "How it starts.",
  mark: "starts.",
  steps: [
    { title: "Find your business by name." },
    { title: "Add Kabsi as a manager on Google." },
    { title: "Choose WhatsApp or email for your yes." },
  ],
  firstDay: "Day 1: a reply ready for every unanswered review from the last 90 days.",
} as const;

export const PROOF = {
  title: "See exactly what was done.",
  mark: "exactly",
  month: "November report",
  bands: [
    {
      name: "Work done",
      rows: [
        ["Reviews answered", "9"],
        ["Replies live on Google", "9"],
        ["Changes fixed after your yes", "1"],
        ["Posts and photos live", "3"],
      ],
    },
    {
      name: "Found",
      rows: [
        ["Hours changed on Google", "1"],
        ["Website and booking link", "Working"],
      ],
    },
    {
      name: "Observed",
      rows: [
        ["New reviews", "9"],
        ["Review link taps", "21"],
      ],
    },
  ],
} as const;

/** SITE-8 (R-167 rule 4): the short trial form beside a button away from the price band. */
export const TRIAL_SHORT = "14 days free";

export const PRICE = {
  title: "One price.",
  mark: "One price.",
  amount: `${PRICE_MONTHLY_USD} US dollars`,
  per: "a month per location.",
  card: `${PRICE_MONTHLY_USD} US dollars a month per location.`,
  terms: TRIAL_LINE,
  /** SITE-8: TRIAL_LINE, a sentence a line (the price band shows it so). */
  termLines: TRIAL_LINE.split(/(?<=\.) /),
} as const;

export const TRUST = {
  title: "You stay in charge.",
  mark: "in charge.",
  lines: [
    "No Google password.",
    "Nothing is published without your yes.",
    "Kabsi never contacts your customers.",
    "Kabsi is independent and not affiliated with Google.",
  ],
} as const;

/* ---------- FAQ (blueprint section 6, word for word) ---------- */

export const FAQ_V31 = [
  {
    q: "What does Kabsi do?",
    a: "It answers your reviews, keeps your Google listing right, keeps your profile fresh, and shows you what it did.",
  },
  {
    q: "Do I have to do anything?",
    a: "Tap yes. Kabsi prepares the reply, the fix or the post, and you approve it on WhatsApp or email.",
  },
  {
    q: "Can I ask Kabsi to change something?",
    a: "Yes. Message it or send a voice note: your hours, a photo, a post, a reply. You see the change before it goes to Google.",
  },
  {
    q: "Does Kabsi contact my customers?",
    a: "No, never. Kabsi gives you a review link, a QR code and a counter card to use yourself.",
  },
  {
    q: "Does Kabsi need my Google password?",
    a: "No. You add Kabsi as a manager and can remove it at any time.",
  },
  {
    q: "What if a bad review comes in?",
    a: "Kabsi tells you at once and writes a calm reply for you to approve or change.",
  },
  {
    q: "Will this raise my ranking?",
    a: "Kabsi does not promise rankings. It does the work that keeps a listing healthy.",
  },
  {
    q: "Which countries?",
    a: "Any English-speaking business with a Google Business Profile.",
  },
  {
    q: "How do I cancel?",
    a: "One tap in Settings, or tell Kabsi on WhatsApp.",
  },
  {
    q: "Is Kabsi part of Google?",
    a: "No. Kabsi is independent.",
  },
] as const;

/** Pricing's questions: the ones about paying, doing and leaving (SITE-3). */
export const PRICING_FAQ = [1, 4, 7, 8, 9].map((i) => FAQ_V31[i]!);

/**
 * Home shows six at most (blueprint 3.9). SITE-8 (R-167 rule 4): the password and customers questions are left out,
 * since the trust list under the hero says both.
 */
export const HOME_FAQ = [1, 2, 5, 6].map((i) => FAQ_V31[i]!);

/** SITE-8: the general questions after a trade's own three (none repeats the hero's trust list). */
export const TRADE_GENERAL_FAQ = [1].map((i) => FAQ_V31[i]!);

export const CLOSING = { title: "Start with a free check.", mark: "free check." } as const;

/* ---------- Pricing (blueprint section 4) ---------- */

// SITE-7: PRICING moved to v31-more.ts (only Pricing shows its lists).

// SITE-7: HOW, ABOUT and SECURITY moved to v31-more.ts (only How it works, About and Security show them).
