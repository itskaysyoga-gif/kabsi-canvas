// Photos from WhatsApp on both plans (master plan 30.15 section 3.4, V3). The owner or a manager sends a photo; the photo
// engine checks it and makes a clean copy (no hidden details, GPS included); Kabsi then asks Yes, Edit or Skip on WhatsApp.
// Yes is the one publication pipeline (channel whatsapp, 10 second undo); Edit changes the category; Skip drops it. A member of
// staff can send a photo but never approves one: the owner is asked. Pure text and parsing here, no database.
import type { Button } from "../whatsapp/channel.ts";
import { MARK, render } from "../whatsapp/look.ts";

/** What the owner picks on Edit: the plain word, Google's category, and the words after "as". Numbers are the menu order. */
export const PHOTO_CATEGORIES = [
  { n: 1, key: "EXTERIOR", label: "the outside", words: /^(outside|exterior|front|shopfront|entrance)$/ },
  { n: 2, key: "INTERIOR", label: "the inside", words: /^(inside|interior|indoors?)$/ },
  { n: 3, key: "TEAMS", label: "your team", words: /^(team|staff|people)$/ },
  { n: 4, key: "AT_WORK", label: "your work", words: /^(work|at work|my work|our work|results?)$/ },
  { n: 5, key: "PRODUCT", label: "what you sell", words: /^(products?|what (i|we) sell|items?)$/ },
  { n: 6, key: "FOOD_AND_DRINK", label: "food and drink", words: /^(food|drinks?|food and drink|dishes)$/ },
  { n: 7, key: "MENU", label: "your menu", words: /^(menu)$/ },
  { n: 8, key: "ADDITIONAL", label: "something else", words: /^(other|something else|else|additional)$/ },
] as const;
export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number]["key"];

export const categoryLabel = (key: string | null | undefined): string => PHOTO_CATEGORIES.find((c) => c.key === key)?.label ?? "something else";

/** A number from the menu, or the word for it. Null when it is neither. */
export function pickCategory(text: string): PhotoCategory | null {
  const t = text.trim().toLowerCase().replace(/[.!?]+$/g, "").replace(/^(the|a|an|my|our)\s+/, "").replace(/\s+/g, " ");
  const n = /^\d$/.test(t) ? Number(t) : null;
  return (PHOTO_CATEGORIES.find((c) => c.n === n || c.words.test(t)) ?? null)?.key ?? null;
}

export const CATEGORY_MENU = `What is it a photo of? Reply with the number.\n\n${PHOTO_CATEGORIES.map((c) => `${c.n}. ${c.label[0].toUpperCase()}${c.label.slice(1)}`).join("\n")}`;

export type ReadyPhoto = { business: string; category: string | null; note: string | null; suitable: boolean | null; forOwner: boolean };

/** The "photo is ready" message in look 2 (30.50 item 2): a picture and the title with the business, what Kabsi did and
 *  the category, one per line, then the one question. */
export function photoReadyBody(p: ReadyPhoto): string {
  const facts = [
    `Goes on Google as ${categoryLabel(p.category)}`,
    ...(p.forOwner ? ["Sent by your team"] : ["Size and light checked", "Saved with no location details"]),
    ...(p.note ? [`Kabsi noticed: ${p.note.replace(/[–—!]/g, "")}`] : []),
  ];
  return render({ mark: MARK.picture, title: p.forOwner ? "A photo from your team" : "Your photo is ready", business: p.business, facts,
    end: "Put it on your Google profile?" }).slice(0, 1024);
}

export function photoRefusedBody(business: string, note: string | null): string {
  return render({ mark: MARK.picture, title: "Could not use that photo", business,
    facts: note ? [note.replace(/[–—!]/g, "").replace(/\.$/, "") + "."] : [], end: "Please send another one." });
}

/** Yes goes to the one pipeline (the approval token); Edit asks for the category; Skip drops the photo. */
export const photoButtons = (token: string, photoId: string): Button[] => [
  { id: `a:${token}`, title: "Yes" },
  { id: `pe:${photoId}`, title: "Edit" },
  { id: `ps:${token}`, title: "Skip" },
];
