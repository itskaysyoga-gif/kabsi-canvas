// The checks every post passes before the owner sees it (P0.5-02; K-24, K-80, K-116.3, K-116.5, K-113.3, R-19).
// All in code, whatever a model says: contact details, links other than the owner's own site in the button, prices
// and offers that are not the owner's, superlatives, keyword stuffing, health, safety or results claims, a post too
// like one of the last 90 days, the category rules, and the fields each post type needs. Kabsi never invents an
// offer, price, event, service, policy, staff member or hours; an Offer or Event exists only because the owner typed it.
import { contactIssues } from "../contact.ts";

export type PostType = "STANDARD" | "OFFER" | "EVENT";
export const POST_TYPES: PostType[] = ["STANDARD", "OFFER", "EVENT"];
export const CTAS = ["CALL", "BOOK", "ORDER", "SHOP", "LEARN_MORE", "SIGN_UP"];

export type PostFields = {
  type: PostType;
  summary: string;
  ctaType?: string | null;
  ctaUrl?: string | null;
  // Event and Offer: the dates (YYYY-MM-DD) and, for an Event, the times (HH:MM, optional).
  title?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  terms?: string | null;
  couponCode?: string | null;
  redeemUrl?: string | null;
};

export type CheckContext = {
  // What the owner wrote and the verified facts a post may use: prices and offers must come from here.
  allowedText: string;
  // The owner's own website, from Business Knowledge (the only domain a button may open).
  website: string | null;
  // Google's category id and the plain category and area, for the category rules and the stuffing check.
  category: string | null;
  categoryLabel: string | null;
  city: string | null;
  country: string | null;
  // Posts of the last 90 days (published, waiting or prepared), to keep each one different.
  recent: string[];
  // A Kabsi draft (not the owner's own text) is held to the 150 to 300 character rule.
  kabsiDraft?: boolean;
  today?: string;
};

export type Issue = { code: string; text: string };

// Countries where alcohol may not be promoted. Kept equal to src/lib/region.ts by tests/posts.test.ts.
export const ALCOHOL_PROMOTION_RESTRICTED = ["AE", "AF", "IR", "KW", "LY", "MR", "QA", "SA", "SD", "SO", "YE"];

const SUPERLATIVE = /\b(best|number one|no\.? ?1|cheapest|finest|greatest|top[- ]rated|unbeatable|unmatched|world[- ]class|most trusted|award[- ]winning)\b|(?:^|\s)#1\b/i;
const CLAIM = /\b(cures?|cured|heals?|healing|guarantee[sd]?|guaranteed results|100% safe|risk[- ]free|painless|clinically proven|no side effects|permanent results|lose weight|weight loss|miracle|safest)\b/i;
const MEDICAL_RESULT = /\b(results|treats?|treatment that works|effective|proven|recovery|relief|fix(es)? your|get rid of)\b/i;
const OFFER_WORDS = /(\d+\s?%\s?off|\bdiscount|\bsale\b|\bdeal\b|\bcoupon|\bpromo|\bfor free\b|\bfree (?:gift|delivery|shipping|drink|coffee|dessert|item|sample|trial)\b|\bget one free\b|\bhalf price|\bbuy one|\b2 for 1\b|\bbogo\b)/gi;
const ALCOHOL = /\b(beer|beers|wine|wines|cocktails?|whisk(e)?y|vodka|gin|rum|tequila|champagne|prosecco|arak|liquor|spirits|alcohol|happy hour|pints?)\b/i;
const MEDICAL_CATEGORY = /(doctor|dentist|dental|clinic|hospital|medical|physio|chiropract|pharmac|optometr|dermatolog|therap|psycholog|veterinar|surgeon|orthodont|health)/i;
const LODGING_CATEGORY = /(hotel|lodging|motel|hostel|resort|guest_?house|bed_and_breakfast|inn\b|campground|holiday_home|vacation)/i;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

const words = (s: string) => s.toLowerCase().normalize("NFKC").match(/[\p{L}\p{N}]+/gu) ?? [];

/** How alike two texts are, 0 to 1: the share of word pairs they have in common (Dice coefficient). */
export function similarity(a: string, b: string): number {
  const pairs = (s: string) => {
    const w = words(s);
    const out = new Set<string>();
    for (let i = 0; i < w.length - 1; i++) out.add(`${w[i]} ${w[i + 1]}`);
    if (w.length === 1) out.add(w[0]);
    return out;
  };
  const x = pairs(a), y = pairs(b);
  if (!x.size || !y.size) return 0;
  let both = 0;
  for (const p of x) if (y.has(p)) both++;
  return (2 * both) / (x.size + y.size);
}

/** The host of a web address, without "www.", or null when it is not a usable https or http address. */
export function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);
    return u.hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

// A link the owner owns: the website on the profile, or a page on it (a subdomain counts).
function ownLink(url: string, website: string | null): boolean {
  const host = hostOf(url), own = hostOf(website);
  if (!host || !own || !/^https:\/\//i.test(url.trim())) return false;
  return host === own || host.endsWith(`.${own}`);
}

const count = (text: string, phrase: string) => {
  const p = words(phrase);
  if (!p.length) return 0;
  const w = words(text);
  let n = 0;
  for (let i = 0; i + p.length <= w.length; i++) if (p.every((x, j) => w[i + j] === x)) n++;
  return n;
};

export function checkPost(f: PostFields, c: CheckContext): Issue[] {
  const out: Issue[] = [];
  const add = (code: string, text: string) => out.push({ code, text });
  const text = (f.summary ?? "").trim();
  const all = [text, f.title ?? "", f.terms ?? ""].join("\n");

  if (!POST_TYPES.includes(f.type)) add("type", "Choose Update, Offer or Event.");
  if (text.length < 10 || text.length > 1500) add("length", "A post is 10 to 1,500 characters.");
  if (c.kabsiDraft && (text.length < 150 || text.length > 300)) add("draft_length", "Kabsi's drafts are 150 to 300 characters.");

  // Contact details, links, handles, hashtags and prices not in the owner's facts (K-113.4, K-116.3).
  for (const i of contactIssues(all, { allowedText: c.allowedText })) add("contact", `This post ${i}.`);

  // Offers only as the owner typed them (K-24, K-80).
  const allowed = c.allowedText.toLowerCase();
  for (const m of all.matchAll(OFFER_WORDS)) {
    if (!allowed.includes(m[0].toLowerCase())) {
      add("offer_not_given", `"${m[0]}" is not an offer you gave Kabsi. Kabsi only uses offers you typed.`);
      break;
    }
  }

  if (SUPERLATIVE.test(all)) add("superlative", "Say what you do, not that it is the best. Google does not allow claims like that.");
  if (CLAIM.test(all)) add("claim", "No health, safety or results promises.");

  // Keyword stuffing: the category or the city more than twice.
  for (const phrase of [c.categoryLabel, c.city]) {
    if (phrase && count(all, phrase) > 2) add("stuffing", `"${phrase}" appears more than twice. Say it once, the way you would to a customer.`);
  }

  const near = c.recent.find((r) => similarity(text, r) > 0.7);
  if (near) add("repeat", "This is too close to a post from the last 90 days. Say something new.");

  // Category rules.
  if (c.category && MEDICAL_CATEGORY.test(c.category) && MEDICAL_RESULT.test(all)) {
    add("medical", "A clinic's post cannot promise medical results.");
  }
  if (f.type === "OFFER" && c.category && LODGING_CATEGORY.test(c.category)) add("lodging_offer", "Hotels and other places to stay cannot post offers on Google.");
  if (c.country && ALCOHOL_PROMOTION_RESTRICTED.includes(c.country.toUpperCase()) && ALCOHOL.test(all)) {
    add("alcohol", "Posts here cannot promote alcohol.");
  }

  // One button; a link button opens only the owner's own website (K-113.3).
  if (f.ctaType) {
    if (!CTAS.includes(f.ctaType)) add("button", "Choose one of Google's buttons.");
    else if (f.ctaType !== "CALL" && !ownLink(f.ctaUrl ?? "", c.website)) {
      add("button_link", c.website ? "The button can only open your own website." : "Add your website first; the button can only open your own website.");
    }
  }

  const today = c.today ?? new Date().toISOString().slice(0, 10);
  if (f.type === "OFFER") {
    if (!f.startDate || !f.endDate || !DATE.test(f.startDate) || !DATE.test(f.endDate)) add("offer_dates", "An offer needs a start and an end date.");
    else if (f.endDate < f.startDate) add("offer_dates", "The offer ends before it starts.");
    else if (f.endDate < today) add("offer_dates", "This offer has already ended.");
    if (!(f.terms ?? "").trim()) add("offer_terms", "An offer needs its terms, in your words.");
    if (f.redeemUrl && !ownLink(f.redeemUrl, c.website)) add("redeem_link", "The redeem link can only open your own website.");
    if (f.couponCode && !/^[\p{L}\p{N}_-]{2,30}$/u.test(f.couponCode)) add("coupon", "A code is letters and numbers, up to 30.");
  }
  if (f.type === "EVENT") {
    if (!(f.title ?? "").trim() || (f.title ?? "").length > 58) add("event_title", "An event needs a title, up to 58 characters.");
    if (!f.startDate || !f.endDate || !DATE.test(f.startDate) || !DATE.test(f.endDate)) add("event_dates", "An event needs a start and an end date.");
    else if (f.endDate < f.startDate) add("event_dates", "The event ends before it starts.");
    else if (f.endDate < today) add("event_dates", "This event has already ended.");
    if ((f.startTime && !TIME.test(f.startTime)) || (f.endTime && !TIME.test(f.endTime))) add("event_times", "Times are hours and minutes, like 18:30.");
  }
  return out;
}

/** The one question Kabsi asks when it has nothing true to say (K-24). */
export const NOTHING_NEW_QUESTION = "Anything new this month? A dish, a service, an event?";
