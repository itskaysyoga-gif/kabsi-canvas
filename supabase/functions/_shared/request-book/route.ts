// RB-F4 (R-149 item 1): which messages belong to the request book, read by code with no model. Pure: no database, network
// or environment access.
//
// At a business with the request book on, the order is: STOP and the commands that need no model, then the request book
// (its commands, then a message about a person and what they want or did), then the off-topic guard, then everything else.
// The pack's words win over Kabsi's own product words: where the pack names a trial, "trial" is the business's own. A message is about Kabsi itself
// only when it names Kabsi, the plan, billing or the owner's own trial; then it is never the request book's.
import type { Pack } from "./packs/schema.ts";
import { normalizeVocabulary } from "./normalize/vocabulary.ts";

export const ROUTE_VERSION = 1;

/** Names Kabsi itself: Kabsi, the plan, billing, or the owner's own trial ("my trial", "our free trial"). */
const KABSI = /\b(?:kabsi|kabsi's|billing|(?:my|our|kabsi'?s?) (?:bill|invoices?|receipts?|subscription|card|refund|payment)|(?:my|our|the|your|which|kabsi'?s?) (?:plan|plans|pro plan|essentials plan)|(?:my|our) (?:free )?trial)\b/i;
/** Kabsi's own jobs: a message about these goes the way it went before (the router and Kabsi's tools). */
const KABSI_JOB = /\b(?:reviews?|reply|replies|replied to the review|google|listing|profile|posts?|photos?|pictures?|opening hours|hours|stats|qr|review link)\b/i;

export const namesKabsi = (text: string): boolean => KABSI.test(text);
export const kabsiJob = (text: string): boolean => KABSI_JOB.test(text);

/** What a person wanted or did, written after their name ("Maya asked about a trial", "Ali called", "Sarah wants a trim"). */
const ACTION = new RegExp(String.raw`^(?:(?:has|had|just|is|was|will|already|also)\s+)*(?:` + [
  "asked", "asking", "asks", "enquired", "enquiring", "inquired", "inquiring", "wants?", "wanted", "would like", "'d like", "needs?", "needed",
  "booked", "is booking", "booking", "wants to book", "called", "calling", "rang", "phoned", "messaged", "texted", "dm'?d", "came in", "came by", "came",
  "comes", "coming", "dropped in", "dropped by", "dropped off", "cancell?ed", "cancels", "interested", "looking for", "joining", "joined", "signed up",
  "is here for",
].join("|") + String.raw`)\b`, "i");
/** The same words anywhere after the name ("Maya saw our post and wants a trial"). */
const ACTION_ANY = new RegExp(ACTION.source.replace(/^\^/, "\\b"), "i");

/** Words that are never a customer's name at the start of a message. */
const NOT_A_NAME = new Set([
  "a", "an", "the", "i", "i'm", "im", "i'd", "i've", "me", "my", "we", "we're", "our", "us", "you", "your", "it", "it's", "its", "this", "that", "these",
  "those", "there", "here", "they", "he", "she", "his", "her", "them", "what", "what's", "whats", "who", "who's", "whos", "when", "where", "why", "how",
  "which", "can", "could", "would", "should", "will", "shall", "may", "might", "must", "do", "does", "did", "is", "are", "was", "were", "be", "have",
  "has", "had", "please", "pls", "plz", "write", "tell", "show", "send", "make", "give", "help", "thanks", "thank", "thx", "ok", "okay", "yes", "no",
  "hi", "hello", "hey", "good", "great", "nice", "cool", "sure", "fine", "not", "just", "also", "and", "but", "so", "if", "then", "now", "today",
  "tomorrow", "tonight", "yesterday", "all", "any", "some", "every", "each", "new", "last", "next", "more", "less", "stop", "start", "translate",
  "nothing", "everything", "something", "anything", "everyone", "nobody", "somebody", "lets", "let's", "let", "want", "need", "get", "got", "go",
  "see", "look", "check", "find", "read", "change", "update", "cancel", "delete", "remove", "add", "book", "save", "undo", "switch", "post", "reply",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "morning", "afternoon", "evening", "customer", "customers",
  "client", "clients", "member", "members", "people", "guy", "lady", "man", "woman", "kabsi", "test", "reset", "status", "stats", "price", "prices",
  "free", "why's", "how's", "where's", "when's", "don't", "dont", "can't", "cant", "won't", "isn't", "wasn't", "about", "as", "at", "by", "in", "on",
  "of", "to", "with", "from", "after", "before", "maybe", "still", "again", "very", "really", "too", "much", "many", "one", "two", "three",
  // Review: people and companies who are not customers ("Staff called in sick", "DHL came").
  "staff", "team", "bank", "landlord", "supplier", "suppliers", "delivery", "courier", "dhl", "fedex", "ups", "aramex", "postman", "manager",
  "plumber", "electrician", "accountant", "cleaner", "boss", "owner", "agent", "driver", "police", "council", "insurance", "someone's",
  "discount", "offer", "promo", "special", "sale", "approved", "done", "ready", "closed", "open",
]);
/** Someone not named: "someone asked about a trial", "a client wants a trim". */
const SOMEONE = /^(?:someone|somebody|a (?:client|customer|member|guy|lady|man|woman|girl|boy|mum|mom|dad|new client|new customer|new member))\s+/i;
/** The words a booking starts with: "Book Sarah for highlights", "add Ali Corolla brakes", "new appointment for Maya". */
const BOOK_FORM = /^(?:please\s+)?(?:can you\s+)?(book|new (?:appointment|booking|enquiry|inquiry|job|visit|request)|add|pencil in|put down|note down|write down)\b\s+(?:in\s+|for\s+)?(?=[a-z])/i;

const words = (s: string) => s.replace(/[\u2018\u2019\u02bc`]/g, "'").trim().split(/\s+/).filter(Boolean);
const bareWord = (w: string) => w.toLowerCase().replace(/^[^a-z']+|[^a-z']+$/g, "").replace(/'s$/, "");
/** One or two words that could be a person's name: letters only, not a word that is never a name. */
function nameLength(ws: string[]): number {
  const first = bareWord(ws[0] ?? "");
  if (!/^[a-z][a-z'-]{1,30}$/.test(first) || NOT_A_NAME.has(first)) return 0;
  // A second word that starts with a capital or is a single letter is part of the name ("Sarah K", "Ali Hassan").
  const second = ws[1] ?? "";
  if (/^[A-Z][a-z'-]{0,30}$/.test(second.replace(/[,.:]$/, "")) && !NOT_A_NAME.has(bareWord(second)) && /^[A-Z]/.test(ws[0] ?? "")) return 2;
  return 1;
}

export type Intent = "person" | "booking" | "service";

/**
 * Is this message the request book's at a business with this pack? "person": a person and what they want or did; "booking":
 * the words a booking starts with; "service": a name and one of the pack's services, or a service and when. Null: not the
 * request book's, so it goes on as before (the off-topic guard, then the router).
 */
export function bookIntent(text: string, pack: Pick<Pack, "services">): Intent | null {
  const t = text.trim();
  if (!t || t.length > 300 || /\n/.test(t)) return null;
  if (namesKabsi(t)) return null;
  const ws = words(t);
  if (ws.length > 25) return null;
  const lower = t.toLowerCase();
  // A question to Kabsi ("what is a trial?", "how much is it?") is never a request.
  if (/^(?:what|how|why|when|where|which|who|is|are|do|does|can|could|would|should|will)\b/.test(lower)) return null;
  // Kabsi's own jobs (reviews, posts, Google, hours) are not the book's, unless a named person wants or did something
  // ("Maya saw our Instagram post and wants a trial").
  const n0 = nameLength(ws);
  if (kabsiJob(t) && !(n0 && ACTION_ANY.test(ws.slice(n0).join(" ")))) return null;
  const form = BOOK_FORM.exec(t);
  if (form) {
    // Review: the words after the verb must be a person or one of the pack's services, so "Add our new menu" or "Put down
    // closed friday" (posts and hours) are never requests. "Book" and "new appointment" take a name; "add" and the others
    // need a service or a person and what they want.
    const rest = t.slice(form[0].length);
    const rw = words(rest);
    const n = nameLength(rw);
    if (hasService(rest, pack)) return "booking";
    if (n && /^(?:book|new)/i.test(form[1]!)) return "booking";
    if (n && ACTION.test(rw.slice(n).join(" "))) return "booking";
    return null;
  }
  const someone = SOMEONE.exec(t);
  if (someone) return ACTION.test(t.slice(someone[0].length)) ? "person" : hasService(t, pack) ? "service" : null;
  // "manicure friday afternoon", "trial": a service first, at most a few words after it.
  if (ws.length <= 8 && startsWithService(t, pack)) return "service";
  const n = nameLength(ws);
  if (!n) return null;
  const rest = ws.slice(n).join(" ").replace(/^'s\b\s*/i, "");
  if (!rest) return null;
  if (ACTION.test(rest)) return "person";
  // "Rana trim thuesday 3pm", "Ali Corolla brakes, car's here", "Lina manicur tmrw": a name, then one of the pack's services.
  return hasService(rest, pack) ? "service" : null;
}

function hasService(text: string, pack: Pick<Pack, "services">): boolean {
  const v = normalizeVocabulary(text, pack);
  return v.status === "ok" && (v.matches.length > 0 || !!v.ties?.length);
}

function startsWithService(text: string, pack: Pick<Pack, "services">): boolean {
  const s = text.replace(/^(?:a|an|the|some)\s+/i, "");
  const offset = text.length - s.length;
  const v = normalizeVocabulary(text, pack);
  if (v.status !== "ok") return false;
  return v.matches.some((m) => m.start === offset) || !!v.ties?.some((x) => x.start === offset);
}

/**
 * RB-F4: after the router, at a business with the book on: a "question", "trial" or "prices" answer that does not name
 * Kabsi but uses one of the pack's own words is the business's own enquiry, never Kabsi's product (R-149 item 1).
 */
export function packWordWins(text: string, pack: Pick<Pack, "services">): boolean {
  if (namesKabsi(text)) return false;
  const ws = words(text);
  const n = nameLength(ws);
  if (kabsiJob(text) && !(n && ACTION_ANY.test(ws.slice(n).join(" ")))) return false;
  return hasService(text, pack);
}
