// Design 7 and Design 8 lines for kabsi.co (Web 4, lane R's approval of 1 Nov 2026). Every line is checked against
// knowledge/kabsi-facts.md (lane R decision 1); where Design 8 said more than the facts, the facts' wording is used and
// the change is listed in COPY.md section 38. Every business and person here is an Example.

import { NEARBY_ON } from "@/lib/site";

export { HOME_LINE } from "./hero-lines";

export const HERO_BUSINESS = "Hollis Hair, Bristol";

export type StreamItem = {
  id: string;
  /** A short label above the message, so the jobs read at a glance. */
  label: string;
  text: string;
  quote?: string;
  buttons?: readonly string[];
  photo?: boolean;
  time: string;
};

/** The hero phone: three different jobs (Example; Polish 2 moved the weekly report to its own card, HERO_REPORT). The
 * hours buttons are lane R decision 3 of 1 Nov. */
export const HERO_STREAM: StreamItem[] = [
  {
    id: "hours",
    label: "Hours",
    text: "Google shows you closed on bank holiday Monday. You told me 10:00 to 16:00.",
    buttons: ["Use my hours", "Keep Google's"],
    time: "08:02",
  },
  {
    id: "review",
    label: "Review",
    text: "New 5-star review from Chloe B. Reply ready:",
    quote: "Thank you, Chloe. We will tell Amber. See you in six weeks.",
    buttons: ["Yes", "Edit", "Skip"],
    time: "10:15",
  },
  {
    id: "post",
    label: "Post",
    text: "Post ready with your photo:",
    quote: "Late appointments every Thursday until 8 pm this month.",
    buttons: ["Approve", "Edit", "Skip"],
    photo: true,
    time: "12:40",
  },
];

/** The weekly report beside the hero phone (Polish 2, lane R decision 3 of 3 Nov 2026; Example). */
export const HERO_REPORT = {
  title: "Your weekly report",
  when: "Every Monday",
  done: ["6 replies live on Google", "1 post", "Details checked every day"],
  next: "Add 3 photos of the team at work.",
} as const;

/** The work Kabsi does (Design 7). "At launch" follows the one switch for the nearby check and the AI answer, NEARBY_ON
 * (Polish 3, lane R decision 2 of 3 Nov 2026): the two jobs about them carry the pill while it is false. */
export type Job = { title: string; text: string; atLaunch?: boolean };
export const jobs = (nearbyOn: boolean = NEARBY_ON): Job[] => [
  // Polish 2 (lane R, 3 Nov 2026): each job leads with the owner's benefit, then how Kabsi does it.
  {
    title: "Your details kept right",
    // Facts 2 (Google Protection): Kabsi tells the owner after Google shows a change; "you hear first" said more.
    text: "Kabsi checks your hours, phone, website and address every day. If Google shows something different, Kabsi tells you and you choose.",
  },
  {
    title: "Every review answered",
    text: "A reply in your voice, using only what the review says. You read it, then say Yes, Edit or Skip.",
  },
  {
    title: "Your profile kept fresh",
    text: "Send a photo with a line about it. Kabsi turns it into a Google post and asks for your yes.",
  },
  {
    title: "The right hours on every holiday",
    text: "Five days before a bank holiday Kabsi asks what you will do, so Google shows the right hours.",
  },
  {
    title: "Your weekly report",
    text: "Every Monday: what Kabsi did, what waits for your yes, and one next step.",
  },
  {
    title: "See where you show up nearby",
    text: "Kabsi searches Google Maps from places around you, like a customer standing there.",
    atLaunch: !nearbyOn,
  },
  {
    title: "Know what AI assistants say",
    text: "When ChatGPT names you with the wrong closing time, Kabsi shows you the exact sentence.",
    atLaunch: !nearbyOn,
  },
];
export const JOBS: Job[] = jobs();

export const BEATS = [
  { title: "Kabsi prepares.", text: "Each reply, post and fix comes to you ready, word for word." },
  { title: "You approve.", text: "Read the exact words, then say Yes, Edit or Skip." },
  {
    title: "Kabsi follows through.",
    text: "It sends your yes to Google, checks it is live, and tells you if anything did not go through.",
  },
] as const;

export const CONTROL = [
  {
    title: "Manager access, not ownership",
    text: "You add Kabsi as a Manager on your Google profile. You stay the owner.",
  },
  { title: "No password", text: "Kabsi never asks for your Google password or a code." },
  {
    title: "Nothing goes live without your yes",
    text: "Not a reply, not a post, not an hours change.",
  },
  { title: "Remove Kabsi any time", text: "One step in your Google profile, and Kabsi is gone." },
  {
    title: "Independent of Google",
    text: "Google Business Profile is free from Google. Kabsi is an independent paid service.",
  },
] as const;

/**
 * The Example free check result (Design 8, Hollis Hair). Changed to the facts (lane R decision 1): the free check reads
 * only Google's public data, which has no review replies, holiday hours or post dates (K-82, the check says so itself),
 * so the Example leads with a finding the check can really make and lists only what it reads. Polish 2 (lane R, 3 Nov
 * 2026): the first finding is one Kabsi really acts on today (missing hours); Kabsi cannot add a missing website.
 */
export const EXAMPLE_RESULT = {
  business: "Hollis Hair",
  address: "14 Gloucester Road, Bristol",
  first: {
    fact: "No opening hours are shown on Google.",
    action: "Kabsi asks you for your hours and sends them to Google once you say yes.",
  },
  found: [
    { label: "Website", value: "Shown" },
    { label: "Phone", value: "Shown" },
    { label: "Photos", value: "23" },
  ],
  ai: {
    line: "ChatGPT's answer gives your closing time on Saturday as 17:00. Your Google profile says otherwise.",
  },
} as const;

export const CHECK_SHOWS = [
  {
    title: "The one thing to fix first",
    text: "In plain words, with why it matters to your business.",
  },
  {
    title: "What customers see today",
    // Changed to the facts: the free check reads public data (no replies or posts).
    text: "Your hours, phone, website, photos and reviews, read live from Google.",
  },
  {
    title: "What Kabsi would do from day one",
    text: "The work, listed. Nothing happens unless you start.",
  },
] as const;
