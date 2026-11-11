// Site 3a (master plan 30.50 item 10, R-150): the lines of Home's new sections and How it works' four groups, in their
// own module so the pages that share d9-data.ts (Pricing's steps line, the industry pages) do not carry them.
/* ---------- Site 3a (master plan 30.50 item 10, R-150): Home in its new order ---------- */

/**
 * The three steps (Home's third section). Each line is made of approved words: the steps line above, D9_HOW_LINE's
 * states and the approved "Nothing goes live without your yes" (COPY.md section 81).
 */
export const D9_THREE_STEPS = [
  {
    title: "Kabsi checks and prepares",
    text: "Your Google profile, every day. Replies, posts and fixes, ready for you to read.",
  },
  {
    title: "You say yes on WhatsApp",
    text: "Yes, edit it or skip it. Nothing goes live without your yes.",
  },
  {
    title: "Kabsi follows through",
    text: "Sent to Google, then checked until it is live. Your weekly report every Monday.",
  },
] as const;

/**
 * The one WhatsApp demonstration on Home, in the look of every WhatsApp reply (Look 2, R-150 item 2, COPY.md 77): one
 * marker and a bold title, the facts one per line with reviews and drafts as quote lines, then one status or question;
 * the yes first. The marker is drawn as an icon on the site (DESIGN.md: no emoji on the site). Example business.
 */
export type Look2Line = { text: string; quote?: boolean };
export type Look2Message = {
  id: string;
  marker: "review" | "done";
  title: string;
  business: string;
  facts: readonly Look2Line[];
  status: string;
  buttons?: readonly string[];
  time: string;
};
export const D9_DEMO = {
  title: "One message. Your yes. Done.",
  mark: "Your yes.",
  line: "This is what Kabsi sends when a new review comes in. You read the reply and tap Approve.",
  alert: {
    id: "review",
    marker: "review",
    title: "New 5-star review",
    business: "Hollis Hair",
    facts: [
      { text: "From Chloe B." },
      { text: "Amber did a lovely colour. Booked again for six weeks.", quote: true },
      { text: "Kabsi's reply:" },
      { text: "Thank you, Chloe. We will tell Amber. See you in six weeks.", quote: true },
    ],
    status: "Post this reply on Google?",
    buttons: ["Approve", "Edit on kabsi.co"],
    time: "15:15",
  } satisfies Look2Message,
  tap: "Approve",
  done: {
    id: "approved",
    marker: "done",
    title: "Approved",
    business: "Hollis Hair",
    facts: [{ text: "It goes to Google in 10 seconds." }],
    status: "Press Undo to stop it.",
    buttons: ["Undo"],
    time: "15:16",
  } satisfies Look2Message,
  states: ["Approved", "Sent to Google", "Live on Google"],
  caption:
    "Example: Kabsi tells the owner of an invented salon about a new 5-star review with a reply ready, the owner taps Approve, and Kabsi answers Approved, it goes to Google in 10 seconds, with Undo.",
} as const;

/**
 * What Kabsi handles, in four groups (Home and How it works). The titles are the four approved jobs (kabsi-copy); each
 * line is the facts' own wording from the sections above.
 */
export const D9_HANDLES = [
  {
    id: "reviews",
    group: "Reviews",
    title: "Reply to every review",
    text: "A reply ready for every new review, in the review's language. Yes, Edit or Skip.",
  },
  {
    id: "details",
    group: "Details and hours",
    title: "Keep your details right",
    text: "Your name, hours, phone, website and address checked every day. Holiday hours asked five days before.",
  },
  {
    id: "posts",
    group: "Posts and photos",
    title: "Post when something changes",
    text: "Send a photo and a line. Kabsi writes the post and asks for your yes.",
  },
  {
    id: "report",
    group: "Weekly report",
    title: "See the work, every Monday",
    text: "What Kabsi did, what waits for your yes, and one next step.",
  },
] as const;
