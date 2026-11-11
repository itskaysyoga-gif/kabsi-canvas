// Cards 2 (master plan 30.50 item 9, R-150): the WhatsApp side of review cards. Pure: words, patterns and the database's
// shape; agent.ts wires them (cardRoute) and db.ts calls the database (20261111120000_cards2_owner.sql).
//   - "Link card CODE" (the whole message; the activate page fills it in): one business, "Link card CODE to [business]?"
//     with one button; several, the phone is asked which one (the pick is the yes); an unknown phone is sent to sign in
//     with the code kept (kabsi.co/start?code=CODE links it as soon as the business exists).
//   - After the link, the place: Front desk, Till or Table as buttons, or a place typed back within 10 minutes.
//   - "cards": each card with its place and its taps this week and last week, as a WhatsApp list (look 2: a row never cuts
//     a word). A row opens the card, to change its place.
// Words: always taps, never reviews, and never a claim that a tap became a review. Labels are places, never people: there
// is no ranking of people and no target for anyone (Google's review rules). The business always comes from the database's
// check of the phone, never from the button alone.
import { fitParts, type ListMsg, ROW_DESC_MAX, ROW_TITLE_MAX, wholeWords } from "./look.ts";

export const CARD_CODE = "[2-9A-HJKMNP-Z]{6}";
/** The whole message, in any case: "Link card ABC234". */
export const LINK_CARD_RE = new RegExp(`^\\s*link\\s+card\\s+(${CARD_CODE})\\s*[.]?\\s*$`, "i");
/** "Yes, link it" or a business picked for the card: lc:<CODE>:<business>. */
export const CARD_LINK_BTN = new RegExp(`^lc:(${CARD_CODE}):([0-9a-f-]{36})$`);
/** A place tapped for the card: cl:<CODE>:<f|t|b>. */
export const CARD_LABEL_BTN = new RegExp(`^cl:(${CARD_CODE}):([ftb])$`);
/** A row of the "cards" list: cr:<CODE>. */
export const CARD_ROW_BTN = new RegExp(`^cr:(${CARD_CODE})$`);

export const PLACES = { f: "Front desk", t: "Till", b: "Table" } as const;
export type PlaceKey = keyof typeof PLACES;
/** How long a typed place is read as the card's label. */
export const LABEL_OPEN_MS = 10 * 60_000;

export type CardCheck =
  | { result: "unknown" | "disabled" | "limited" | "other_business" }
  // Cards 2 partner side: a partner card whose business is set may be linked only to the phone's businesses with that place.
  | { result: "ask"; only?: string[] | null }
  // A partner card: the partner's code goes in the sign-up link (Partners 2's attribution, 30 days of Pro).
  | { result: "signup"; partner_code?: string | null }
  | { result: "already"; location_id: string; label: string | null };
export type CardWeek = { code: string; label: string | null; this_week: number; last_week: number };
export interface CardsDb {
  /** What "Link card CODE" means for this phone. Refused codes count against the phone (10 an hour). */
  check(code: string, phone: string): Promise<CardCheck>;
  /** The tap: links the card to this business, when the business is the phone's own. */
  link(code: string, locationId: string, phone: string): Promise<{ result: "linked" | "unknown" | "disabled" | "limited" | "no_place" | "other_business"; label?: string | null }>;
  /** The place label, for a card of one of the phone's own businesses. */
  label(code: string, label: string, phone: string): Promise<{ result: "labelled" | "unknown" | "bad_label"; label?: string }>;
  /** "cards": taps per card this week (from Monday) and last week, for one of the phone's own businesses. */
  list(locationId: string, phone: string): Promise<{ result: "ok" | "unknown"; cards?: CardWeek[] }>;
}

const taps = (n: number) => `${n} ${n === 1 ? "tap" : "taps"}`;
const TAP_NOTE = "A tap is not a review.";

/** The words (docs/COPY.md, Cards 2). Each string is in look 2's form: the first line is the title, the last paragraph block 3. */
export const CARDS_SAY = {
  ask: (code: string, business: string) => `Link a card\nEach tap opens your Google review form.\n\nLink card ${code} to ${business}?`,
  yesButton: "Yes, link it",
  which: (code: string) => `Link a card\nCard ${code}\nEach tap opens your Google review form.\n\nWhich business is it for?`,
  whichList: "Pick a business",
  linked: (code: string, business: string) => `Card linked\nCard ${code} · ${business}\nEach tap opens your Google review form.\n\nWhere is it? Tap a place, or type one, like Bar.`,
  already: (code: string, label: string | null) =>
    `Card already linked\nCard ${code} · ${label ?? "No place yet"}\n\nTap a place to change it, or type one, like Bar.`,
  labelled: (code: string, label: string) =>
    `Card ready\nCard ${code} · ${label}\nEach tap opens your Google review form.\n\nWrite "cards" to see its taps each week.`,
  badLabel: "Name the place\nUse 2 to 30 letters for where the card is, like Front desk or Window. Never a person's name.\n\nType the place again, or tap one.",
  unknown: (code: string) => `Card not found\nKabsi could not find card ${code}. Check the code printed on the card.\n\nWrite "talk to a person" for help.`,
  disabled: (code: string) => `This card is off\nCard ${code} is switched off.\n\nWrite "talk to a person" to turn it back on.`,
  limited: "Too many tries\nKabsi stopped card codes from this number for an hour.\n\nPlease try again later.",
  ownerOnly: (code: string) => `Ask the owner\nOnly the owner or a manager can link card ${code}.\n\nAsk them to send "Link card ${code}" to Kabsi.`,
  otherBusiness: (code: string) => `Set for another business\nCard ${code} is set up for a different business on Google.\n\nAsk the person who gave you the card, or write "talk to a person".`,
  noPlace: "Your Google profile first\nKabsi links a card once your business is on Google in Kabsi.\n\nFinish setup on kabsi.co, then send the code again.",
  // An unknown phone: sign in first, the code is kept in the link.
  signup: (code: string, link: string, partner = false) =>
    `Set up Kabsi first\nCard ${code} links to your business once Kabsi is set up. Open this link to sign in. The card links as soon as your business is added:\n${link}${partner ? "\nWith this card, Kabsi is free for 30 days once it is connected. No card payment." : ""}\n\nNothing goes live without your yes.`,
  // "cards"
  listBody: (n: number) => `Your cards\nTaps this week and last week, by place.\n${TAP_NOTE}${n > 10 ? `\nand ${n - 10} more` : ""}\n\nTap one to change its place.`,
  listButton: "Open a card",
  none: `No cards yet\nTo link a card, send "Link card" and the code printed on it.\n\nWrite "talk to a person" for help.`,
} as const;

/** The three place buttons for a card. */
export const placeButtons = (code: string) => (Object.keys(PLACES) as PlaceKey[]).map((k) => ({ id: `cl:${code}:${k}`, title: PLACES[k] }));

/** A list row's title: the place, or "Card CODE" when it has none; whole words only (look 2). */
export const cardRowTitle = (c: CardWeek) => wholeWords(c.label?.trim() ? c.label : `Card ${c.code}`, ROW_TITLE_MAX) || `Card ${c.code}`;
/** A list row's description: this week first; last week is dropped whole, never cut, when it does not fit. */
export const cardRowDescription = (c: CardWeek) => fitParts([`This week: ${taps(c.this_week)}`, `Last week: ${taps(c.last_week)}`], ROW_DESC_MAX);

/** "cards" as a WhatsApp list: at most 10 rows, each opening its card. */
export function cardsList(cards: CardWeek[]): { body: string; list: ListMsg } {
  const rows = cards.slice(0, 10).map((c) => ({ id: `cr:${c.code}`, title: cardRowTitle(c), description: cardRowDescription(c) }));
  return { body: CARDS_SAY.listBody(cards.length), list: { button: CARDS_SAY.listButton, sections: [{ rows }] } };
}

/** Short replies that are never a place ("thanks" after "Card linked" must not become the card's name). */
const NOT_A_PLACE = /^(thanks?( you)?|thank u|thx|ty|ok(ay)?|great|good|cool|nice|perfect|done|got it|no worries|later|cheers|brilliant|lovely|awesome|sure|yes please|no thanks)$/i;
/** Words that name a person or a job, never a place: a card's label is where it is, never who stands there (no ranking of
 *  people, Google's review rules). A possessive ("Sam's till") names a person too. */
export const PERSON_WORD = /\b(staff|employee|waiter|waitress|server|barista|stylist|barber|cashier|manager|owner|therapist|technician|driver|mr|mrs|ms|miss)\b|['\u2019]s\b/i;
/** A typed place: one line of 2 to 30 characters, three words at most, not a question, not a thank-you, not a person. */
export function typedPlace(text: string | null | undefined): string | null {
  const t = (text ?? "").replace(/\s+/g, " ").trim().replace(/[.]$/, "");
  if (t.length < 2 || t.length > 30 || /[<>{}\\?\n]/.test(t) || t.split(" ").length > 3) return null;
  return NOT_A_PLACE.test(t) || PERSON_WORD.test(t) ? null : t;
}

/** The sign-in link that keeps the card code (the activate page's own path), and for a partner card the partner's code
 *  (?via=P-..., the link touch Partners 2's attribution reads; the last link before sign-up wins). */
export const startLink = (appUrl: string, code: string, partner?: string | null) =>
  `${appUrl.replace(/\/+$/, "")}/start?code=${code}${partner && /^P-[2-9A-HJKMNP-Z]{6}$/.test(partner) ? `&via=${partner}` : ""}`;
