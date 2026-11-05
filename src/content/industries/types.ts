// One content file per industry (brief section 16, item 3). The page component (d9-industry.tsx, Industries 2) only lays
// these out; every line a reader sees about the trade comes from the trade's own file, written from its own facts.
// Industries 2 (5 Nov 2026): one flat list, no groups (Rashid), so there is no hub field any more.
import type { Photo } from "@/components/kabsi/photos";

export type ChatLine = {
  from: "kabsi" | "owner";
  text: string;
  /** Reply buttons under a Kabsi message. */
  buttons?: string[];
};

export type Industry = {
  slug: string;
  /** Singular, lower case: "Your hair salon on Google." */
  name: string;
  /** "Hair salons", for lists and hubs. */
  plural: string;
  /** Finished pages are indexed and linked; the rest stay noindex and unlinked until Content 1 finishes them. */
  finished: boolean;
  /**
   * false keeps a finished page noindex, out of the sitemap and unlinked from the hubs and related links until
   * docs/claims holds its claim sheet (Fix 1, lane R 2 Nov 2026: the dental clinic page; Go live 1, B-013, unlinked
   * it). The address still answers. Leave it out once the sheet exists.
   */
  indexed?: false;
  lead: string;
  /** The search the free check is prefilled with. */
  keyword: string;
  /** The invented business on this page (Example) and its nearby check. */
  example: {
    business: string;
    city: string;
    /** "salon" in "Near your salon". */
    kind: string;
    rival: string;
    rival2: string;
    /** B and C on the nearby drawing. Example names; kabsi-canvas takes them from the checked points. */
    near: [string, string];
  };
  /** Industries 2: the wide photo (3:2, the hero and the /for card) and the tall one (beside the photo to post). */
  photos: [Photo, Photo];
  /** object-position for the hero crop. */
  focus?: string;
  /** What customers type: the chips under "What people search for". */
  searches: string[];
  /** Industries 3 (master plan 30.33 item 2): "Your Google profile, as a <trade> owner", two to four cards. */
  profile: Card[];
  /** Industries 2: the page on Design 9. Every finished page has it. */
  page: D9Trade;

  /* Industries 3: the rest are short cards; a page shows only the groups it has, in this order. */
  /** "What customers write about": two or three cards; a health or injury card keeps its no-draft rule. */
  reviews?: Card[];
  /** "Google categories that fit": the names as chips, then one line. */
  categories?: { primary: string; more: string[]; line: string };
  /** "Holidays and busy dates": two or three cards. */
  holidays?: Card[];
  /** "Photos and posts": two or three cards. */
  photoCards?: Card[];
  story?: { title: string; lead: string; lines: ChatLine[] };
  faqs?: { q: string; a: string }[];
  /** Three guide slugs (GUIDE_TITLES), chosen by the page's jobs; the page links the ones that are public. */
  guides: [string, string, string];
  /** Design 8 (Web 4c): the four trades written for their own page. The other pages take the template's defaults. */
  d8?: TradePage;
};

/** One Kabsi message in the hero, the one most typical of the trade's week (Example). */
export type TradeCard = {
  label: string;
  text: string;
  quote?: string;
  buttons: string[];
  time: string;
};

export type TradePage = {
  /** docs/SEO-PLAN.md: a title under 90 characters and a description under 170, written for the trade. Not on the page. */
  seo: { title: string; description: string };
  /** The invented business of the hero message and the free check example: "Fade and Co, Leeds". */
  business: string;
  card: TradeCard;
  jobsTitle: string;
  /** The free check's Example rows: only what the check reads from Google's public data (K-82). */
  /** Polish 2 (lane R, 3 Nov 2026): a "warn" row carries the next step Kabsi can do today. */
  check: { label: string; value: string; tone: "ok" | "warn"; next?: string }[];
  checkText: string;
};

export type Task = { title: string; text: string };
/** Industries 3: a card with a short title (at most 6 words) and one line (at most 15 words). */
export type Card = Task;

/**
 * Industries 2 (master plan 30.32): the Design 9 page of one trade. Every line is the trade's own and is checked against
 * knowledge/kabsi-facts.md; every business, person and number is an Example.
 */
export type D9Trade = {
  /** The one search the page is written for, in owners' words (COPY.md section 52). */
  query: string;
  /** Under 60 characters: "<Trade> Google Business Profile help | Kabsi". */
  title: string;
  /** Under 160 characters, with the query once. */
  description: string;
  /** The H1: at most 8 words. `mark` is the phrase on the yellow bar, once. */
  h1: string;
  mark: string;
  /** The hero line: at most 20 words. */
  line: string;
  /** One short line for the /for card. */
  card: string;
  /** The first answer (search and AI answers read it): what Kabsi does for this trade, with the query once. At most 25 words. */
  answer: string;
  /** The profile watch Example: one detail Google shows differently from what the owner confirmed. */
  watch: {
    business: string;
    /** At most 20 words. */
    line: string;
    /** The details this trade's customers look at first, from the ones Kabsi watches (facts 04, Google Profile). */
    fields: string[];
    /** "Saturday" or "Website": what the two boxes compare. */
    what: string;
    google: string;
    owner: string;
    /** Kabsi's WhatsApp line about it. */
    message: string;
  };
  /** The photo to post Example: what the owner sends with the photo, and the post Kabsi prepares. */
  post: { owner: string; quote: string };
  /** Three jobs that come back for this trade: only what Kabsi does today. */
  jobs: [Task, Task, Task];
  /** The nearby Example: "Near your <kind> you came up 2nd for '<term>'." */
  nearby: { kind: string; term: string };
  /** The AI answer Example with its question. */
  ai: { question: string; answer: string; sources: [string, string] };
  /** Six related trades, by slug, closest first: the same kind of work, then the nearest. Never the page itself. */
  related: [string, string, string, string, string, string];
};
