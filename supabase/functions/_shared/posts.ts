// Post drafting with the model, used by `content` when the owner asks Kabsi to write (posts-weekly retired in P0.5-02).
// Every post is a draft until the owner clicks Post on the exact text (D202).
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { draftMessage, message, type Meter, newMeter, noDashes, parseJson, task } from "./ai.ts";
import { businessFacts, hasPostFacts, type KnowledgeCard, loadCard } from "./facts.ts";
import { contactIssues } from "./contact.ts";
import { buildKeywords } from "./keywords.ts";
import { recordAiUsage, takeAiBudget } from "./ai-budget.ts";
import { googleMode, placeCategory, searchKeywords } from "./google/index.ts";

// The Growth agent writes posts (master plan 28.6); its two steps and their models are in ai/agents.ts.
const CHECK = task("growth", "check_post"), DRAFT = task("growth", "draft_post");

// Buttons Google's localPosts API accepts. CALL uses the phone on the profile; the others need a link.
export const CTAS = ["CALL", "BOOK", "ORDER", "SHOP", "LEARN_MORE", "SIGN_UP"];

export type PostLoc = {
  id: string; name: string; status: string; place_id: string | null; time_zone: string;
  google_account_id: string | null; google_location_id: string | null;
  /** Verified Business Knowledge for posts (P0.3-01), filled by withFacts; empty until then. */
  card?: KnowledgeCard;
  category: string | null; category_label: string | null; area: string | null; post_slot: string | null;
  concierge?: boolean;
};
export const POST_LOC_COLUMNS =
  "id, name, status, place_id, time_zone, google_account_id, google_location_id, category, category_label, area, post_slot, concierge";

// Professional services post early in the week, shops and dining before the weekend.
const PRO = /(doctor|dentist|dental|clinic|hospital|medical|physio|chiropract|lawyer|legal|attorney|notary|account|insurance|real_estate|consult|agency|corporate|office|school|university|bank|financ|veterinar|therap|psycholog|architect|engineer|laborator)/;
export const slotFor = (category: string | null) => (category && PRO.test(category) ? "pro" : "retail");

// Category and area of the business for the post prompt, read from Places when the post is written and never stored
// (master plan 30.10: nothing from Places is kept but the place ID). Only Kabsi's own posting slot is saved.
export async function ensureCategory(db: SupabaseClient, loc: PostLoc) {
  if (!loc.place_id) return loc;
  const c = await placeCategory(loc.place_id).catch(() => null);
  if (!c) return loc;
  if (!loc.post_slot) {
    const post_slot = slotFor(c.category);
    await db.from("locations").update({ post_slot }).eq("id", loc.id);
    return { ...loc, ...c, post_slot };
  }
  return { ...loc, ...c };
}

// Grounded facts only: verified Business Knowledge meant for posts (P0.3-01, K-10, K-11; shared builder, D260).
// Posts never carry the phone number or staff names.
const cardFacts = (card: KnowledgeCard | undefined) => businessFacts(card ?? {}, "post");
export const hasFacts = (card: KnowledgeCard | undefined) => hasPostFacts(card ?? {});
const avoidOf = (card: KnowledgeCard | undefined) => (typeof card?.avoid === "string" ? card.avoid.trim() : "");

/** The business with the facts a post may use. */
export async function withFacts<T extends PostLoc>(db: SupabaseClient, loc: T): Promise<T> {
  return { ...loc, card: await loadCard(db, loc.id, "posts") };
}

// Keyword suggestions, best first: real search terms (live), category + area, the owner's services. Never phrases
// taken from reviews (K-113.3, R-19).
export async function suggestKeywords(db: SupabaseClient, loc: PostLoc) {
  const l = await ensureCategory(db, loc);
  const searchTerms = googleMode() === "live" && l.google_location_id
    ? (await searchKeywords(l.google_location_id).catch(() => [])).map((s) => s.keyword)
    : [];
  const keywords = buildKeywords({ name: loc.name, searchTerms, categoryLabel: l.category_label, area: l.area, services: l.card?.services });
  return { loc: l, keywords };
}

export function postSystem(loc: PostLoc, keywords: string[]) {
  const facts = cardFacts(loc.card);
  return `You write a Google Business Profile update ("post") for "${loc.name}"${loc.category_label ? `, a ${loc.category_label.toLowerCase()}` : ""}${loc.area ? ` in ${loc.area}` : ""}. The owner reads it and approves it before it is posted.
Rules:
- Write in the same language as the owner's note. Plain, friendly, specific. 40 to 120 words, 2 short paragraphs at most. No hashtags, no emojis, no ALL CAPS, no filler.
- Use ONLY what the owner wrote and these facts, exactly as given (don't add "every day" or anything else they didn't say):
${facts.length ? facts.map((f) => `  * ${f}`).join("\n") : "  * (no extra facts)"}
- Never invent prices, dates, offers, awards, numbers or claims. Never quote or mention reviews, ratings, rankings, SEO or "best in town". Never ask for reviews.
${keywords.length ? `- Search phrases: ${keywords.join("; ")}. Work the most relevant one into the first sentence, within the first 80 characters, as normal speech (e.g. "our bakery in Park Slope"). Use others only where they read naturally. Never list them.\n` : ""}- No phone numbers, email addresses, links, URLs, social media handles or hashtags in the text (the button handles that). No prices unless the owner's note or the facts give them.
${avoidOf(loc.card) ? `- The owner asked never to mention or promise: ${avoidOf(loc.card)}\n` : ""}- Never use em dashes or en dashes as punctuation. Use a comma or a full stop instead.
Output only the post text.`;
}

// Grounding check (Haiku): the post may only state what the owner wrote or the facts allow.
async function checkPost(loc: PostLoc, user: string, post: string, meter: Meter) {
  // Contact details, links, handles, hashtags and unlisted prices fail in code first (K-116.3, K-113.4).
  const fixed = contactIssues(post, { allowedText: `${cardFacts(loc.card).join("\n")}\n${user}` });
  if (fixed.length) return { ok: false, issues: fixed };
  const out = await message(CHECK.model,
    `You check a drafted Google Business Profile post before the owner sees it. Reply with JSON only: {"ok": true|false, "issues": ["<short issue>"]}
Set ok=false if the post states anything not supported by the owner's note or the allowed facts: added days ("every day", "7 days a week"), prices, offers, dates, awards, numbers, services or promises; or if it mentions reviews, ratings, rankings or SEO; or contains a phone number, email address, link, URL or social media handle; or uses hashtags or emojis; or mentions anything the owner asked never to mention. Friendly wording is fine.`,
    `Allowed facts:\n${cardFacts(loc.card).join("\n") || "(none)"}\n${avoidOf(loc.card) ? `\nThe owner asked never to mention or promise: ${avoidOf(loc.card)}\n` : ""}\nOwner's note and instructions:\n${user}\n\nPost:\n${post}`, CHECK.maxTokens, meter);
  const j = parseJson<{ ok?: boolean; issues?: string[] }>(out);
  return { ok: j.ok === true, issues: (j.issues ?? []).map(String).slice(0, 5) };
}

// Draft, check, and redraft once if the check finds a problem. `ok` false means the second try failed too.
// Counts against the business and global daily AI budget (K-100); throws "ai_budget_*" when it is used up.
// If the model check itself fails, the code check result stands (contact details are never let through).
export async function writePost(loc: PostLoc, keywords: string[], user: string) {
  await takeAiBudget(loc.id);
  const meter = newMeter("growth");
  const draft = async (u: string) =>
    noDashes((await draftMessage(postSystem(loc, keywords), u, DRAFT.maxTokens, meter, { effort: DRAFT.effort })).text.replace(/^["“]|["”]$/g, "").trim()).slice(0, 1500);
  const check = (text: string) => checkPost(loc, user, text, meter).catch(() => {
    const fixed = contactIssues(text, { allowedText: `${cardFacts(loc.card).join("\n")}\n${user}` });
    return { ok: fixed.length === 0, issues: fixed };
  });
  try {
    let text = await draft(user);
    let result = await check(text);
    if (!result.ok) {
      text = await draft(`${user}\n\nA previous version had these problems, avoid them: ${result.issues.join("; ")}`);
      result = await check(text);
    }
    return { text, ok: result.ok, issues: result.issues };
  } finally {
    await recordAiUsage(loc.id, meter);
  }
}
