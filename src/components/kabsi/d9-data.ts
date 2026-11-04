// Design 9 lines for kabsi.co (Web 5, master plan 30.24, lane R's approval of Design 9 from kabsi-design-studio
// e90e40b). Every line is checked against knowledge/kabsi-facts.md; where Design 9 said more than the facts, the facts'
// wording is used and the change is listed in COPY.md section 43. Every business and person here is an Example.
// Lines that depend on Kabsi's WhatsApp number follow WHATSAPP_ON; the nearby check and the AI answer follow NEARBY_ON.

import { NEARBY_ON, WHATSAPP_ON } from "@/lib/site";

export const D9_BUSINESS = "Hollis Hair, Bristol";

/** Home's hero line (Design 9, approved with "photos" kept, 30.24 item 2). The meta description stays HOME_LINE. */
export const D9_HERO_LINE =
  "Kabsi checks your Google profile every day, prepares the fixes, posts, photos and replies it needs, and brings each one to you on WhatsApp for a yes.";

/* ---------- The whole job, in one line of steps ---------- */

export const D9_STEPS = [
  { id: "check", word: "Kabsi checks", text: "Your Google profile, every day." },
  { id: "prepare", word: "prepares", text: "Replies, posts and fixes, ready for you to read." },
  { id: "ask", word: "asks you on WhatsApp", text: "You say yes, edit it or skip it." },
  {
    id: "follow",
    word: "follows through",
    text: "Sent to Google, then checked until it is live.",
  },
  { id: "report", word: "reports", text: "Your weekly report, every Monday." },
] as const;
export type StepId = (typeof D9_STEPS)[number]["id"];

/* ---------- The hero phone (Example) ---------- */

export type D9Message = {
  id: string;
  label: string;
  text: string;
  quote?: string;
  buttons?: readonly string[];
  photo?: boolean;
  time: string;
};

/** Buttons as the product sends them (30.24 item 2): Yes, Edit, Skip for replies; Approve, Edit, Skip for posts. */
export const D9_HERO_STREAM: D9Message[] = [
  {
    id: "hours",
    label: "Your details",
    text: "Google shows you closed on bank holiday Monday. You told me 10:00 to 16:00.",
    buttons: ["Use my hours", "Keep Google's"],
    time: "08:02",
  },
  {
    id: "post",
    label: "Post",
    text: "Post ready with your photo:",
    quote: "New balayage colours this month. Saturdays are open.",
    buttons: ["Approve", "Edit", "Skip"],
    photo: true,
    time: "12:40",
  },
  {
    id: "review",
    label: "Review",
    text: "New 5-star review from Chloe B. Reply ready:",
    quote: "Thank you, Chloe. We will tell Amber. See you in six weeks.",
    buttons: ["Yes", "Edit", "Skip"],
    time: "15:15",
  },
];

/* ---------- Profile watch (the most weight) ---------- */

/**
 * Changed to the facts (COPY 43): Kabsi watches the name, phone, website, address, opening hours, main category, open
 * status and map pin; the owner chooses "Keep my information" or "Google is right"; nothing is put back by itself.
 * Design 9's "special hours, description" and "phone, categories or open status: you change them yourself" said more
 * than the facts and are not used.
 */
export const D9_WATCH = {
  title: "When Google shows something different, you choose.",
  line: WHATSAPP_ON
    ? "Kabsi checks your Google profile every day: hours, phone, website, address, category, open status and more. When Google shows something different, Kabsi tells you on WhatsApp."
    : "Kabsi checks your Google profile every day: hours, phone, website, address, category, open status and more. When Google shows something different, you hear about it by email, and on WhatsApp once it opens.",
  watched: ["Name", "Hours", "Phone", "Website", "Address", "Category", "Open status", "Map pin"],
  rules: [
    {
      title: "Keep my information",
      text: "Kabsi puts your version back on Google once you say yes, then checks it shows.",
    },
    {
      title: "Google is right",
      text: "Google's version becomes yours, and nothing is sent to Google.",
    },
    { title: "Never by itself", text: "Kabsi never puts anything back without your yes." },
  ],
  google: { label: "What Google shows", day: "Bank holiday Monday", value: "Closed" },
  owner: { label: "What you told Kabsi", day: "Bank holiday Monday", value: "10:00 to 16:00" },
  message: "Google shows you closed on bank holiday Monday. You told me 10:00 to 16:00.",
  buttons: ["Use my hours", "Keep Google's"],
  caption:
    "Example: Google shows an invented salon closed on a bank holiday Monday, the owner told Kabsi 10:00 to 16:00, and Kabsi asks with Use my hours and Keep Google's.",
} as const;

/* ---------- Photo to post ---------- */

export const D9_PHOTO = {
  title: "Send a photo. Get a Google post.",
  line: "Take a photo at work and send it to Kabsi on WhatsApp with a line about it. Kabsi turns it into a Google post with that photo and asks for your yes.",
  /** 30.24 item 2: a photo with no words waits for the owner's yes like every photo. */
  noWords: "A photo with no words becomes a photo on your Google profile, also after your yes.",
  cadence: "Kabsi also prepares posts for you: 2 a month on Essentials, every week on Pro.",
  ownerLine: "New balayage colours this month. Saturdays are open.",
  ready: "Post ready with your photo:",
  quote: "New balayage colours this month. Saturdays are open.",
  buttons: ["Approve", "Edit", "Skip"],
  states: ["Approved", "Sent to Google", "Live on Google"],
  caption:
    "Example: the owner of an invented salon sends a photo and a line on WhatsApp, Kabsi prepares a Google post with that photo, the owner approves it, and it goes from Approved to Sent to Google to Live on Google.",
} as const;

/* ---------- The supporting row ---------- */

export const D9_SUPPORT = [
  {
    id: "reviews",
    title: "A reply for every new review",
    text: "Ready in the review's language. You say Yes, Edit or Skip.",
  },
  {
    id: "holiday",
    title: "Holiday hours, asked in time",
    text: "Five days before a bank holiday Kabsi asks what you will do.",
  },
] as const;

export const D9_REPORT = {
  title: "Your weekly report",
  when: "Every Monday",
  line: "What Kabsi did, what waits for your yes, and one next step.",
  done: ["6 replies live on Google", "1 post", "Details checked every day"],
  next: "Add 3 photos of the team at work.",
} as const;

/* ---------- Where you show up (one section; At launch until NEARBY_ON) ---------- */

export const D9_SHOW_UP = {
  title: "Where you show up",
  line: "Two checks Kabsi runs from launch, shown as they are. No score.",
  atLaunch: !NEARBY_ON,
  map: {
    title: "Near you on Google Maps",
    line: "Kabsi searches Google Maps from places around your business, like a customer standing there. The number is where you came up. 1 is first.",
    sample: "Sample Google Maps results, not customer counts.",
    search: "Searched: hair salon, 2 Nov 2026",
    count: "You came up in the first 3 at 3 of 8 places Kabsi checked.",
  },
  ai: {
    title: "An answer customers might see",
    question: "Which hair salon near Gloucester Road in Bristol takes late appointments?",
    assistant: "ChatGPT",
    date: "2 Nov 2026",
    answer:
      "Hollis Hair on Gloucester Road takes late appointments every Thursday until 8 pm this month.",
    sources: ["Hollis Hair's Google profile", "Hollis Hair's website"],
    label:
      "Answers from ChatGPT and Perplexity through their API, which can differ from their apps.",
  },
} as const;

/** Sample points for the map: x and y in percent of the map, and where the business came up (Example). */
export const D9_MAP_POINTS: { x: number; y: number; rank: number }[] = [
  { x: 22, y: 20, rank: 4 },
  { x: 52, y: 14, rank: 2 },
  { x: 80, y: 24, rank: 7 },
  { x: 16, y: 54, rank: 1 },
  { x: 84, y: 56, rank: 14 },
  { x: 28, y: 84, rank: 3 },
  { x: 58, y: 86, rank: 9 },
  { x: 86, y: 86, rank: 25 },
];
