// Post drafting shared by `content` (owner asks) and `posts-weekly` (Kabsi drafts once a week).
// Every post is a draft until the owner clicks Post on the exact text (D202).
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { message, noDashes, parseJson } from "./ai.ts";
import { googleMode, placeCategory, searchKeywords } from "./google.ts";

const DRAFT_MODEL = "claude-sonnet-5";
const CHECK_MODEL = "claude-haiku-4-5-20251001";

// Buttons Google's localPosts API accepts. CALL uses the phone on the profile; the others need a link.
export const CTAS = ["CALL", "BOOK", "ORDER", "SHOP", "LEARN_MORE", "SIGN_UP"];

export type PostLoc = {
  id: string; name: string; status: string; place_id: string | null; time_zone: string;
  google_account_id: string | null; google_location_id: string | null; knowledge_card: Record<string, unknown>;
  category: string | null; category_label: string | null; area: string | null; post_slot: string | null;
};
export const POST_LOC_COLUMNS =
  "id, name, status, place_id, time_zone, google_account_id, google_location_id, knowledge_card, category, category_label, area, post_slot";

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

// Grounded facts only: the knowledge card as the owner wrote it.
function cardFacts(card: Record<string, unknown>) {
  const facts: string[] = [];
  const add = (label: string, v: unknown) => { if (typeof v === "string" && v.trim()) facts.push(`${label}: ${v.trim()}`); };
  add("Opening hours", card.hours_note);
  add("What the owner wants mentioned", card.mention);
  add("Parking", card.parking);
  add("Wi-Fi", card.wifi);
  if (card.delivery === true) facts.push("Delivery: yes");
  for (const f of (card.faqs as { q?: string; a?: string }[] | undefined) ?? []) if (f?.q && f?.a) facts.push(`Q: ${f.q} A: ${f.a}`);
  return facts;
}
export const hasFacts = (card: Record<string, unknown>) => cardFacts(card).length > 0;

// Phrases customers use in good reviews (Haiku), e.g. "knafeh", "fast delivery". Topics, never quotes.
async function reviewPhrases(db: SupabaseClient, locId: string) {
  const { data } = await db.from("reviews").select("comment").eq("location_id", locId).gte("star_rating", 4)
    .not("comment", "is", null).order("review_created_at", { ascending: false }).limit(40);
  const text = (data ?? []).map((r) => String(r.comment).slice(0, 400)).join("\n---\n");
  if (text.length < 40) return [];
  try {
    const out = await message(CHECK_MODEL,
      `From these customer reviews, list up to 6 short phrases (1 to 4 words) naming the specific products, dishes or services customers mention most, the way someone would search for them (e.g. \"manakish\", \"home delivery\", \"kids haircut\"). Use the reviews' own words and language. No generic praise (\"great food\", \"amazing staff\", \"nice place\"), no names of people, no ratings. Return fewer or none rather than generic ones. JSON only: {"phrases": ["..."]}`,
      text, 200);
    return (parseJson<{ phrases?: string[] }>(out).phrases ?? []).map(String).map((p) => p.trim()).filter((p) => p && p.length <= 40).slice(0, 6);
  } catch { return []; }
}

// Keyword suggestions, best first: real search terms (live), category + area, review phrases.
export async function suggestKeywords(db: SupabaseClient, loc: PostLoc) {
  const l = await ensureCategory(db, loc);
  const out: { keyword: string; source: "search" | "category" | "reviews" }[] = [];
  const seen = new Set<string>();
  const push = (keyword: string, source: "search" | "category" | "reviews") => {
    const k = keyword.trim().toLowerCase();
    if (k && !seen.has(k) && k !== loc.name.toLowerCase()) { seen.add(k); out.push({ keyword: keyword.trim(), source }); }
  };
  if (googleMode() === "live" && l.google_location_id) {
    for (const s of (await searchKeywords(l.google_location_id).catch(() => [])).slice(0, 5)) push(s.keyword, "search");
  }
  const label = l.category_label?.toLowerCase();
  if (label && l.area) push(`${label} in ${l.area}`, "category");
  if (label) push(label, "category");
  for (const p of await reviewPhrases(db, l.id)) push(p, "reviews");
  return { loc: l, keywords: out.slice(0, 10) };
}

export function postSystem(loc: PostLoc, keywords: string[]) {
  const facts = cardFacts(loc.knowledge_card ?? {});
  return `You write a Google Business Profile update ("post") for "${loc.name}"${loc.category_label ? `, a ${loc.category_label.toLowerCase()}` : ""}${loc.area ? ` in ${loc.area}` : ""}. The owner reads it and approves it before it is posted.
Rules:
- Write in the same language as the owner's note. Plain, friendly, specific. 40 to 120 words, 2 short paragraphs at most. No hashtags, no emojis, no ALL CAPS, no filler.
- Use ONLY what the owner wrote and these facts, exactly as given (don't add "every day" or anything else they didn't say):
${facts.length ? facts.map((f) => `  * ${f}`).join("\n") : "  * (no extra facts)"}
- Never invent prices, dates, offers, awards, numbers or claims. Never quote or mention reviews, ratings, rankings, SEO or "best in town". Never ask for reviews.
${keywords.length ? `- Search phrases: ${keywords.join("; ")}. Work the most relevant one into the first sentence, within the first 80 characters, as normal speech (e.g. "our bakery in Hamra"). Use others only where they read naturally. Never list them.\n` : ""}- No phone numbers, links or URLs in the text (the button handles that).
- Never use em dashes or en dashes as punctuation. Use a comma or a full stop instead.
Output only the post text.`;
}

// Grounding check (Haiku): the post may only state what the owner wrote or the facts allow.
async function checkPost(loc: PostLoc, user: string, post: string) {
  const out = await message(CHECK_MODEL,
    `You check a drafted Google Business Profile post before the owner sees it. Reply with JSON only: {"ok": true|false, "issues": ["<short issue>"]}
Set ok=false if the post states anything not supported by the owner's note or the allowed facts: added days ("every day", "7 days a week"), prices, offers, dates, awards, numbers, services or promises; or if it mentions reviews, ratings, rankings or SEO; or contains a phone number, link or URL; or uses hashtags or emojis. Friendly wording is fine.`,
    `Allowed facts:\n${cardFacts(loc.knowledge_card ?? {}).join("\n") || "(none)"}\n\nOwner's note and instructions:\n${user}\n\nPost:\n${post}`, 200);
  const j = parseJson<{ ok?: boolean; issues?: string[] }>(out);
  return { ok: j.ok === true, issues: (j.issues ?? []).map(String).slice(0, 5) };
}

// Draft, check, and redraft once if the check finds invented facts. `ok` false means the second try failed too.
export async function writePost(loc: PostLoc, keywords: string[], user: string) {
  const draft = async (u: string) =>
    noDashes((await message(DRAFT_MODEL, postSystem(loc, keywords), u, 700)).replace(/^["“]|["”]$/g, "").trim()).slice(0, 1500);
  let text = await draft(user);
  let check = await checkPost(loc, user, text).catch(() => ({ ok: true, issues: [] as string[] }));
  if (!check.ok) {
    text = await draft(`${user}\n\nA previous version had these problems, avoid them: ${check.issues.join("; ")}`);
    check = await checkPost(loc, user, text).catch(() => ({ ok: true, issues: [] as string[] }));
  }
  return { text, ok: check.ok, issues: check.issues };
}
