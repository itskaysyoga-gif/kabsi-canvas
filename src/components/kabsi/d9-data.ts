// Design 9 lines for kabsi.co (Web 5, master plan 30.24, lane R's approval of Design 9 from kabsi-design-studio
// e90e40b). Every line is checked against knowledge/kabsi-facts.md; where Design 9 said more than the facts, the facts'
// wording is used and the change is listed in COPY.md section 43. Every business and person here is an Example.
// Lines that depend on Kabsi's WhatsApp number follow WHATSAPP_ON.

import { WHATSAPP_ON } from "@/lib/site";

export const D9_BUSINESS = "Hollis Hair, Bristol";

/** Home's hero line (Design 9, approved with "photos" kept, 30.24 item 2). The meta description stays HOME_LINE. */
export const D9_HERO_LINE =
  "Kabsi checks your Google profile every day, prepares fixes, posts, photos and replies, and asks for your yes on WhatsApp.";

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
 * status and map location; the owner chooses "Keep my information" or "Google is right"; nothing is put back by itself.
 * Design 9's "special hours, description" and "phone, categories or open status: you change them yourself" said more
 * than the facts and are not used.
 */
export const D9_WATCH = {
  title: "When Google shows something different, you choose.",
  /** Polish 4 (30.25 item 3): one line of at most 20 words. Channel-free, so it is true with WHATSAPP_ON either way. */
  line: "Kabsi checks your Google profile every day. When something differs, you choose, and nothing changes without your yes.",
  watched: [
    "Name",
    "Hours",
    "Phone",
    "Website",
    "Address",
    "Category",
    "Open status",
    "Map location",
  ],
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
  /** Polish 4 (30.25 item 3): a yellow label, the headline's second sentence in yellow on the charcoal band, one line, three points. */
  label: "On WhatsApp",
  title: "Send a photo.",
  titleMark: "Get a Google post.",
  line: "Send it with a line about it. Kabsi writes the post and asks for your yes.",
  points: ["Send a photo and a line", "Read the post", "Say yes. It goes on Google."],
  ownerLine: "New balayage colours this month. Saturdays are open.",
  ready: "Post ready with your photo:",
  quote: "New balayage colours this month. Saturdays are open.",
  buttons: ["Approve", "Edit", "Skip"],
  states: ["Approved", "Sent to Google", "Live on Google"],
  caption:
    "Example: the owner of an invented salon sends a photo and a line on WhatsApp, Kabsi prepares a Google post with that photo, the owner approves it, and it goes from Approved to Sent to Google to Live on Google.",
} as const;

/* ---------- The supporting row ---------- */

/** Polish 4: the row gets a visible headline; each point is one short line. */
export const D9_SUPPORT_TITLE = "Replies, holidays and a weekly report.";
export const D9_SUPPORT = [
  {
    id: "reviews",
    title: "A reply for every new review",
    text: "In the review's language. Yes, Edit or Skip.",
  },
  {
    id: "holiday",
    title: "Holiday hours, asked in time",
    text: "Five days before a bank holiday.",
  },
] as const;

export const D9_REPORT = {
  title: "Your weekly report",
  when: "Every Monday",
  line: "What Kabsi did, what waits for your yes, and one next step.",
  done: ["6 replies live on Google", "1 post", "Details checked every day"],
  next: "Add 3 photos of the team at work.",
} as const;

/* ---------- Where you show up (one section; open from 5 Nov 2026, Go live 1) ---------- */

export const D9_SHOW_UP = {
  title: "Where you show up",
  line: "Two checks Kabsi runs, shown as they are. No score.",
  map: {
    title: "Near you on Google Maps",
    line: "Kabsi searches Google Maps from places around your business, like a customer standing there. The number is where you came up. 1 is first.",
    sample: "Sample Google Maps results, not customer counts.",
    search: "Searched: hair salon, 2 Nov 2026",
    count: "In the first 3 at 18 of 49 places Kabsi checked.",
    shows: "The map shows 8 of them.",
  },
  ai: {
    // Fix 2 (master plan 30.27 item 2): the AI half's headline; the old title is the line under it.
    title: "What AI says about you.",
    label2: "An answer customers might see",
    question: "Which hair salon near Gloucester Road in Bristol takes late appointments?",
    assistant: "ChatGPT",
    date: "2 Nov 2026",
    answer:
      "Hollis Hair on Gloucester Road takes late appointments every Thursday until 8 pm this month.",
    sources: ["Hollis Hair's Google profile", "Hollis Hair's website"],
    label:
      "Answers we get from ChatGPT and Perplexity directly, which can differ from what their apps show.",
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

/* ---------- How it works: the demonstration in three cases (Web 5 part C) ---------- */

/** The visible hero line (Design 9); the page's meta description stays HOW_HERO.line. */
export const D9_HOW_LINE =
  "Three Example cases at an invented salon: different hours, a photo to a post, and a new review.";

export type CaseId = "hours" | "photo" | "review";
export type DemoState = "ask" | "approved" | "sent" | "live" | "failed";

export type DemoCase = {
  id: CaseId;
  tab: string;
  /** What the owner sends first (the photo case), shown as the owner's own bubble. */
  ownerFirst?: string;
  ask: string;
  quote?: string;
  photo?: boolean;
  yes: string;
  others: readonly string[];
  approved: string;
  sent: string;
  live: string;
  failed: string;
  summary: string;
};

const APPROVED = "Approved. You can undo it for 10 seconds.";
const SENT = "Sent to Google. I will tell you when it is live.";
const FAILED = "Google did not accept it. Nothing was changed. Kabsi will tell you what to do.";

/** Buttons as the product sends them (30.24 item 2). */
export const D9_CASES: DemoCase[] = [
  {
    id: "hours",
    tab: "Hours changed",
    ask: "Google shows you closed on bank holiday Monday. You told me 10:00 to 16:00.",
    yes: "Use my hours",
    others: ["Keep Google's"],
    approved: APPROVED,
    sent: SENT,
    live: "Live on Google: bank holiday Monday, 10:00 to 16:00.",
    failed: FAILED,
    summary: "Google showed different hours. The owner chose their own.",
  },
  {
    id: "photo",
    tab: "Photo to post",
    ownerFirst: "New balayage colours this month. Saturdays are open.",
    ask: "Post ready with your photo:",
    quote: "New balayage colours this month. Saturdays are open.",
    photo: true,
    yes: "Approve",
    others: ["Edit", "Skip"],
    approved: APPROVED,
    sent: SENT,
    live: "Live on Google: your post with your photo.",
    failed: FAILED,
    summary: "A photo and a line on WhatsApp became a Google post.",
  },
  {
    id: "review",
    tab: "New review",
    ask: "New 5-star review from Chloe B. Reply ready:",
    quote: "Thank you, Chloe. We will tell Amber. See you in six weeks.",
    yes: "Yes",
    others: ["Edit", "Skip"],
    approved: APPROVED,
    sent: SENT,
    live: "Live on Google: your reply to Chloe B.",
    failed: FAILED,
    summary: "A new review got a reply in the owner's voice.",
  },
];

export const D9_STATES: {
  id: Exclude<DemoState, "ask" | "failed">;
  label: string;
  text: string;
}[] = [
  { id: "approved", label: "Approved", text: "You said yes. Nothing has reached Google yet." },
  { id: "sent", label: "Sent to Google", text: "Kabsi sent it and has not seen it on Google yet." },
  { id: "live", label: "Live on Google", text: "Kabsi checked it shows, then told you." },
];
export const D9_FAILED_LABEL = "Did not go through";
export const D9_FAILED_TEXT = "Google said no. Kabsi tells you and nothing changes.";

/** What the owner's other buttons answer in the demonstration. */
export function d9OtherLine(label: string): string {
  if (label === "Keep Google's") return "Kept. Google's hours stay, and nothing is sent.";
  if (label === "Skip") return "Skipped. Nothing is sent.";
  return "Edit opens the words for you to change, then you approve.";
}

/** The demonstration's pure steps, so the order is tested without a browser (tests/web5.test.ts). */
export const D9_UNDO_SECONDS = 10;
export function d9NextState(state: DemoState, googleSaysNo: boolean): DemoState {
  if (state === "approved") return "sent";
  if (state === "sent") return googleSaysNo ? "failed" : "live";
  return state;
}
