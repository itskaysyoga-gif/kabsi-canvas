// The words of the core public pages on blueprint 3.1 (SITE-1, R-163, docs/kabsi-final/KABSI-WEBSITE-AND-CONVERSION-BLUEPRINT.md).
// Where the blueprint gives the words they are copied as they stand; docs/COPY.md section 90 lists every line with its source.
// Every business, person and number in an Example here is invented. Prices and the trial come from src/lib/offer.ts only.
import { PRICE_MONTHLY_USD, TRIAL_LINE } from "@/lib/offer";

/* ---------- Home (blueprint section 3) ---------- */

export const HOME_HERO = {
  title: "Your business on Google. Taken care of.",
  mark: "Taken care of.",
  line: "Kabsi answers your reviews, protects your listing and keeps your profile fresh. You approve and make changes from WhatsApp or email.",
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

export const TELL = {
  title: "Just tell Kabsi.",
  mark: "Just tell",
  line: "No app to learn. Message Kabsi like you would message a manager.",
  voice: "Or send a voice note.",
} as const;

export type TellChip = { ask: string; photo?: boolean; answer: string[]; approve?: boolean };

/**
 * The example messages (blueprint 3.3). Only what works on main is shown (blueprint 3, rules for the page): until
 * OFFER-2 ships the "waiting" read and the QR image in the chat, "Send me my review link" takes the place of "What needs
 * my attention?" and "Send me my review QR code" is left out. Flip these two when OFFER-2 is on main.
 */
export const OFFER2_ON = false;
export const QR_IMAGE_ON = false;

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
    { title: "Find your business.", text: "Search for it by name, as it shows on Google." },
    {
      title: "Add Kabsi as a manager on Google.",
      text: "Kabsi never asks for your Google password.",
    },
    { title: "Choose WhatsApp or email.", text: "That is where Kabsi asks for your yes." },
  ],
  firstDay:
    "On your first day, every unanswered review from the last 90 days arrives with a reply ready to approve.",
} as const;

export const PROOF = {
  title: "See exactly what was done.",
  mark: "exactly",
  month: "Monthly report, November",
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

export const PRICE = {
  title: "One price.",
  mark: "One price.",
  amount: `${PRICE_MONTHLY_USD} US dollars`,
  per: "a month per location.",
  card: `${PRICE_MONTHLY_USD} US dollars a month per location.`,
  terms: TRIAL_LINE,
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
    a: "Yes. Message it in plain words or send a voice note: your hours, a photo, a post, a reply. Kabsi shows you exactly what will change before anything goes to Google.",
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

/** Home shows six at most (blueprint 3.9). */
export const HOME_FAQ = [0, 1, 2, 3, 4, 6].map((i) => FAQ_V31[i]!);

export const CLOSING = { title: "Start with a free check.", mark: "free check." } as const;

/* ---------- Pricing (blueprint section 4) ---------- */

export const PRICING = {
  title: "One plan. 29 US dollars a month.",
  mark: "29 US dollars a month.",
  line: "Everything Kabsi does, for one location. You approve every change.",
  included: [
    "A reply to every review",
    "Alerts for bad reviews",
    "Your listing checked every day",
    "Website and booking link checked every day",
    "Holiday hours",
    "Up to 2 posts a month and photos from your phone",
    "Review link, QR code and counter card tools",
    "A weekly summary and a monthly report",
  ],
  notIncluded:
    "Kabsi does not message your customers, run ads, build websites or promise rankings.",
  free: "Google Business Profile is free from Google. Kabsi is an independent paid service.",
} as const;

/* ---------- How it works (blueprint section 5) ---------- */

export const HOW = {
  title: "How Kabsi works.",
  mark: "works.",
  line: "Kabsi prepares the work. You approve it on WhatsApp or email. Nothing goes to Google without your yes.",
  steps: [
    {
      title: "Connect Google.",
      text: "Add Kabsi as a manager on your Google Business Profile. Kabsi never asks for your password, and you can remove it any time.",
    },
    {
      title: "Choose how you hear from Kabsi.",
      text: "WhatsApp or email. That is where replies, fixes and posts arrive for your yes.",
    },
    {
      title: "Your first day.",
      text: "Every unanswered review from the last 90 days arrives with a reply ready, plus the first check of your listing and links.",
    },
    {
      title: "A normal week.",
      text: "A reply for each new review, an alert if a bad one comes in, and a fix ready if something on your listing changed. A short summary every week.",
    },
    {
      title: "Your monthly report.",
      text: "What Kabsi did, what it found, and what Google shows for your profile, kept apart so you can see each.",
    },
  ],
  ask: "You can also message Kabsi any time: change your hours, send a photo to post, or ask for a shorter reply.",
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
