// Post drafting shared by `content` (owner asks) and `posts-weekly` (Kabsi drafts once a week).
// Every post is a draft until the owner clicks Post on the exact text (D202).
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { draftMessage, message, noDashes, parseJson } from "./ai.ts";
import { MODELS } from "./models.ts";
import { businessFacts, hasPostFacts } from "./facts.ts";
import { contactIssues } from "./contact.ts";
import { buildKeywords } from "./keywords.ts";
import { googleMode, placeCategory, searchKeywords } from "./google.ts";

const CHECK_MODEL = MODELS.check;

// Buttons Google's localPosts API accepts. CALL uses the phone on the profile; the others need a link.
export const CTAS = ["CALL", "BOOK", "ORDER", "SHOP", "LEARN_MORE", "SIGN_UP"];

export type PostLoc = {
  id: string; name: string; status: string; place_id: string | null; time_zone: string;
  google_account_id: string | null; google_location_id: string | null; knowledge_card: Record<string, unknown>;
  category: string | null; category_label: string | null; area: string | null; post_slot: string | null;
  concierge?: boolean;
};
export const POST_LOC_COLUMNS =
  "id, name, status, place_id, time_zone, google_account_id, google_location_id, knowledge_card, category, category_label, area, post_slot, concierge";

// Professional services post early in the week, shops and dining before the weekend.
const PRO = /(doctor|dentist|dental|clinic|hospital|medical|physio|chiropract|lawyer|legal|attorney|notary|account|insurance|real_estate|consult|agency|corporate|office|school|university|bank|financ|veterinar|therap|psycholog|architect|engineer|laborator)/;
export const slotFor = (category: string | null) => (category && PRO.test(category) ? "pro" : "retail");

// Cache category, area and slot on the location (one Places call, then reused).
export async function ensureCategory(db: SupabaseClient, loc: PostLoc) {
  if (loc.category || !loc.place_id) return loc;
  const c = await placeCategory(loc.place_id).catch(() => null);
  if (!c) return loc;
  // "none" caches a place Google gives no type for, so Places isn't asked again every run.
  const next = { ...c, category: c.category ?? "none", post_slot: loc.post_slot ?? slotFor(c.category) };
  await db.from("locations").update(next).eq("id", loc.id);
  return { ...loc, ...next };
}

// Grounded facts only: the knowledge card as the owner wrote it (shared builder, D260). Posts never carry the
// phone number or staff names.
const cardFacts = (card: Record<string, unknown>) => businessFacts(card, "post");
export const hasFacts = (card: Record<string, unknown>) => hasPostFacts(card);

// Keyword suggestions, best first: real search terms (live), category + area, the owner's services. Never phrases
// taken from reviews (K-113.3, R-19).
export async function suggestKeywords(db: SupabaseClient, loc: PostLoc) {
  const l = await ensureCategory(db, loc);
  const searchTerms = googleMode() === "live" && l.google_location_id
    ? (await searchKeywords(l.google_location_id).catch(() => [])).map((s) => s.keyword)
    : [];
  const keywords = buildKeywords({ name: loc.name, searchTerms, categoryLabel: l.category_label, area: l.area, services: l.knowledge_card?.services });
  return { loc: l, keywords };
}

export function postSystem(loc: PostLoc, keywords: string[]) {
  const facts = cardFacts(loc.knowledge_card ?? {});
  return `You write a Google Business Profile update ("post") for "${loc.name}"${loc.category_label ? `, a ${loc.category_label.toLowerCase()}` : ""}${loc.area ? ` in ${loc.area}` : ""}. The owner reads it and approves it before it is posted.
Rules:
- Write in the same language as the owner's note. Plain, friendly, specific. 40 to 120 words, 2 short paragraphs at most. No hashtags, no emojis, no ALL CAPS, no filler.
- Use ONLY what the owner wrote and these facts, exactly as given (don't add "every day" or anything else they didn't say):
${facts.length ? facts.map((f) => `  * ${f}`).join("\n") : "  * (no extra facts)"}
- Never invent prices, dates, offers, awards, numbers or claims. Never quote or mention reviews, ratings, rankings, SEO or "best in town". Never ask for reviews.
${keywords.length ? `- Search phrases: ${keywords.join("; ")}. Work the most relevant one into the first sentence, within the first 80 characters, as normal speech (e.g. "our bakery in Park Slope"). Use others only where they read naturally. Never list them.\n` : ""}- No phone numbers, email addresses, links, URLs, social media handles or hashtags in the text (the button handles that). No prices unless the owner's note or the facts give them.
${typeof loc.knowledge_card?.avoid === "string" && loc.knowledge_card.avoid.trim() ? `- The owner asked never to mention or promise: ${loc.knowledge_card.avoid.trim()}\n` : ""}- Never use em dashes or en dashes as punctuation. Use a comma or a full stop instead.
Output only the post text.`;
}

// Grounding check (Haiku): the post may only state what the owner wrote or the facts allow.
async function checkPost(loc: PostLoc, user: string, post: string) {
  // Contact details, links, handles, hashtags and unlisted prices fail in code first (K-116.3, K-113.4).
  const fixed = contactIssues(post, { allowedText: `${cardFacts(loc.knowledge_card ?? {}).join("\n")}\n${user}` });
  if (fixed.length) return { ok: false, issues: fixed };
  const out = await message(CHECK_MODEL,
    `You check a drafted Google Business Profile post before the owner sees it. Reply with JSON only: {"ok": true|false, "issues": ["<short issue>"]}
Set ok=false if the post states anything not supported by the owner's note or the allowed facts: added days ("every day", "7 days a week"), prices, offers, dates, awards, numbers, services or promises; or if it mentions reviews, ratings, rankings or SEO; or contains a phone number, email address, link, URL or social media handle; or uses hashtags or emojis; or mentions anything the owner asked never to mention. Friendly wording is fine.`,
    `Allowed facts:\n${cardFacts(loc.knowledge_card ?? {}).join("\n") || "(none)"}\n${typeof loc.knowledge_card?.avoid === "string" && loc.knowledge_card.avoid.trim() ? `\nThe owner asked never to mention or promise: ${loc.knowledge_card.avoid.trim()}\n` : ""}\nOwner's note and instructions:\n${user}\n\nPost:\n${post}`, 200);
  const j = parseJson<{ ok?: boolean; issues?: string[] }>(out);
  return { ok: j.ok === true, issues: (j.issues ?? []).map(String).slice(0, 5) };
}

// Draft, check, and redraft once if the check finds a problem. `ok` false means the second try failed too.
// If the model check itself fails, the code check result stands (contact details are never let through).
export async function writePost(loc: PostLoc, keywords: string[], user: string) {
  const draft = async (u: string) =>
    noDashes((await draftMessage(postSystem(loc, keywords), u, 700)).text.replace(/^["“]|["”]$/g, "").trim()).slice(0, 1500);
  const check = (text: string) => checkPost(loc, user, text).catch(() => {
    const fixed = contactIssues(text, { allowedText: `${cardFacts(loc.knowledge_card ?? {}).join("\n")}\n${user}` });
    return { ok: fixed.length === 0, issues: fixed };
  });
  let text = await draft(user);
  let result = await check(text);
  if (!result.ok) {
    text = await draft(`${user}\n\nA previous version had these problems, avoid them: ${result.issues.join("; ")}`);
    result = await check(text);
  }
  return { text, ok: result.ok, issues: result.issues };
}
