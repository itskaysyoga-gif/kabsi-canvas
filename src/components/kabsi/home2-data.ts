// Home 2 (lane R R-158 item 4, 11 Nov 2026): the lines of Home's sections below the hero and of How it works' four jobs,
// in their own module so the pages that share d9-data.ts (Pricing's steps line, the industry pages) do not carry them.
// Every line and the fact it rests on: docs/site4/home.md. It replaces Site 3a's site3-data.ts.
import type { Look2Message } from "./look2";

/* ---------- 1. The hero's picture: one day on WhatsApp (Example) ---------- */

/** An owner's own message in the thread. */
export type OwnerLine = { id: string; owner: true; text: string; photo?: boolean; time: string };

/**
 * One day at the Example salon, in the words the product sends (COPY.md 77; whatsapp/say.ts, agent.ts, deliver.ts):
 * a review reply to approve, "Closed Monday" turned into hours for Google, a photo turned into a post. Each waits for
 * Approve, the yes first.
 */
export const HOME2_THREAD: readonly (Look2Message | OwnerLine)[] = [
  {
    id: "review",
    marker: "review",
    title: "New 5-star review",
    business: "Hollis Hair",
    facts: [
      { text: "From Chloe B." },
      { text: "Amber did a lovely colour. Booked again.", quote: true },
      { text: "Kabsi's reply:" },
      { text: "Thank you, Chloe. We will tell Amber. See you in six weeks.", quote: true },
    ],
    status: "Post this reply on Google?",
    buttons: ["Approve", "Edit on kabsi.co"],
    time: "08:12",
  },
  { id: "closed", owner: true, text: "Closed Monday", time: "11:40" },
  {
    id: "hours",
    marker: "hours",
    title: "New hours for Google",
    business: "Hollis Hair",
    facts: [{ text: "Monday 23 November: closed all day." }],
    status: "Kabsi sets them on Google after your yes.",
    buttons: ["Approve", "Edit on kabsi.co"],
    time: "11:40",
  },
  {
    id: "photo",
    owner: true,
    text: "New balayage colours this month.",
    photo: true,
    time: "15:05",
  },
  {
    id: "post",
    marker: "post",
    title: "Post ready for Google",
    business: "Hollis Hair",
    facts: [{ text: "New balayage colours this month. Saturdays are open.", quote: true }],
    status: "Post it on your Google profile?",
    buttons: ["Approve", "Edit on kabsi.co"],
    time: "15:06",
  },
];

export const HOME2_THREAD_CAPTION =
  "Example: one day of Kabsi messages to an invented salon on WhatsApp: a new 5-star review with a reply to approve, the owner's \"Closed Monday\" turned into hours for Google, and a photo turned into a Google post. Each waits for the owner's Approve.";

/* ---------- 2. The four jobs: the strip under the hero, and the titles of "What Kabsi does" ---------- */

export const HOME2_JOBS = [
  { id: "reviews", title: "Reviews answered" },
  { id: "listing", title: "Listing kept right" },
  { id: "posts", title: "Posts from your photos" },
  { id: "ai", title: "Found in AI answers" },
] as const;
export type JobId = (typeof HOME2_JOBS)[number]["id"];

/* ---------- 3. The problem, in owner words ---------- */

export const HOME2_PROBLEM = {
  title: "Customers decide in seconds.",
  mark: "in seconds.",
  line: "They pick a business on Google Maps and, more and more, by asking an AI assistant. They go by what they see. Most owners have no time to keep up.",
  label: "What they see",
  seen: [
    { id: "stars", title: "Stars and replies", text: "Is every review answered?" },
    { id: "hours", title: "Hours", text: "Are you open when they come?" },
    { id: "photos", title: "Photos", text: "Does it look like you today?" },
    { id: "ai", title: "The AI answer", text: "Are you named, and is it right?" },
  ],
} as const;

/* ---------- 4. What Kabsi does: the four jobs (Home, and How it works' first lines) ---------- */

export type Home2Job = {
  id: JobId;
  title: string;
  kabsi: string;
  you: string;
  /** The plan line, from the facts (02, 01). */
  plan?: string;
  /** The rule or honest limit the job carries. */
  note?: string;
};

const LINES: Record<JobId, Omit<Home2Job, "id" | "title">> = {
  reviews: {
    kabsi: "Kabsi drafts a reply to every new review, in your tone and in the review's language.",
    you: "Read it and tap Approve.",
    note: "Kabsi never offers anything for a review and never hides one.",
  },
  listing: {
    kabsi:
      "Kabsi checks your hours, holiday hours, photos and details every day. When Google shows something different from what you told Kabsi, it asks you.",
    you: "Tap Keep my information or Google is right.",
  },
  posts: {
    kabsi: "Send a photo with a few words on WhatsApp. Kabsi writes a Google post with that photo.",
    you: "Read it and tap Approve.",
    plan: "2 posts a month on Essentials, every week on Pro.",
  },
  ai: {
    kabsi:
      "Kabsi asks ChatGPT and Perplexity the questions your customers ask. It shows whether you are named, what is said, and what to fix on your listing.",
    you: "Approve the fix it suggests.",
    plan: "3 questions a month on Essentials, 10 every 2 weeks on Pro.",
    note: "No one can promise an AI assistant will recommend you.",
  },
};

export const HOME2_DOES: readonly Home2Job[] = HOME2_JOBS.map((j) => ({ ...j, ...LINES[j.id] }));
export const HOME2_DOES_TITLE = "What Kabsi does, and what you do.";
export const HOME2_DOES_MARK = "what you do.";

/** The small Examples inside the blocks (Example business, invented). */
export const HOME2_EXAMPLES = {
  review: {
    stars: 4,
    from: "Sam K.",
    text: "Good cut, a short wait.",
    reply: "Thank you, Sam. Sorry for the wait. See you next time.",
  },
  listing: {
    google: { label: "What Google shows", day: "Monday", value: "Closed" },
    owner: { label: "What you told Kabsi", day: "Monday", value: "10:00 to 16:00" },
  },
  post: {
    owner: "New balayage colours this month.",
    post: "New balayage colours this month. Saturdays are open.",
  },
} as const;

/* ---------- 5. You stay in control ---------- */

export const HOME2_CONTROL = {
  title: "You stay in control.",
  mark: "in control.",
  line: "The AI agent does the work. You decide.",
  points: [
    { title: "No password shared", text: "Kabsi uses Google's own Manager access." },
    {
      title: "Nothing goes live without your yes",
      text: "Every reply, post and change waits for your tap.",
    },
    {
      title: "Remove Kabsi any time",
      text: "On Google, in People and access. Kabsi stops at once.",
    },
  ],
} as const;

/* ---------- 6. How it starts ---------- */

export const HOME2_START = {
  title: "How it starts.",
  mark: "starts.",
  steps: [
    { title: "Run the free check", text: "About 30 seconds. No access needed." },
    { title: "Add Kabsi as a Manager on Google", text: "About 2 minutes, with each step shown." },
    {
      title: "Say yes on WhatsApp",
      text: "Kabsi starts the work and asks before anything goes live.",
    },
  ],
} as const;

/* ---------- 7. For your kind of business ---------- */

export const HOME2_TRADES = {
  title: "For your kind of business.",
  mark: "your kind",
  /** Voice notes join this line once they are switched on (facts 01: not on yet; docs/site4/home.md section 7). */
  line: "Kabsi works wherever your customers use Google. You can write to Kabsi on WhatsApp in your own language. The website is in English.",
  /** Each slug is an indexed industry page (tests/home2.test.ts). */
  chips: [
    { slug: "barbershop", label: "Barbershop" },
    { slug: "hair-salon", label: "Hair salon" },
    { slug: "nail-salon", label: "Nail salon" },
    { slug: "restaurant", label: "Restaurant" },
    { slug: "cafe", label: "Cafe" },
    { slug: "bakery", label: "Bakery" },
    { slug: "gym-and-fitness", label: "Gym" },
    { slug: "medical-and-aesthetic-clinic", label: "Clinic" },
    { slug: "auto-repair", label: "Garage" },
    { slug: "florist", label: "Florist" },
  ],
  all: "Every kind of business",
} as const;

/* ---------- 9. Five questions ---------- */

export const HOME2_FAQ = [
  {
    q: "Do I need to be good with technology?",
    a: "No. If you can use WhatsApp, you can use Kabsi. Adding Kabsi on Google is one guided step, and after that you answer with a tap.",
  },
  {
    q: "Will Kabsi post anything without asking me?",
    a: "No. Every reply, post and change waits for your yes. After you tap Approve you have 10 seconds to undo it.",
  },
  {
    q: "What is a Manager on Google, and can I remove Kabsi?",
    a: "A Manager is Google's own way to let a service help with your listing. You add Kabsi as a Manager and never share your password. You stay the owner, and you can remove Kabsi on Google any time. Kabsi stops at once.",
  },
  {
    q: "Does it work in my country?",
    a: "Yes. Kabsi works for a verified Google listing in any country, at the same prices. Replies follow each reviewer's language. The website is in English.",
  },
  {
    q: "Will Kabsi make ChatGPT recommend me?",
    a: "No one can promise that. Kabsi checks what ChatGPT and Perplexity say about you, and helps you fix your listing where an answer gets a fact wrong.",
  },
] as const;
