// Anthropic calls (SPEC D207): claude-sonnet-5 drafts, claude-haiku-4-5-20251001 classifies and checks.
const DRAFT_MODEL = "claude-sonnet-5";
const CHECK_MODEL = "claude-haiku-4-5-20251001";

function apiKey() {
  // The key was saved as "Anthropic_Api" in the dashboard; accept both names.
  const key = Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("Anthropic_Api");
  if (!key) throw new Error("anthropic_not_configured");
  return key;
}

async function message(model: string, system: string, user: string, maxTokens: number) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey(), "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return (data.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("").trim();
}

function parseJson<T>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error(`model returned no JSON: ${text.slice(0, 120)}`);
  return JSON.parse(text.slice(start, end + 1)) as T;
}

export type ReviewInput = { reviewer: string; rating: number; comment: string | null };
export type Card = Record<string, unknown> & {
  signature?: string; tone?: string; contact_phone?: string; hours_note?: string; mention?: string; staff_names?: string[];
};

const URGENT_WORDS = /(sick|food poison|poison|ill\b|vomit|hospital|police|lawyer|lawsuit|court|sue\b|theft|stole|harass|racis|discriminat|rat\b|cockroach|insect|تسمم|مريض|شرطة|محامي|سرقة|تحرش|صرصور|empoison|malade|police|avocat|vol\b|harcèlement)/i;

// Language + urgency (D220). Urgent if rating ≤ 2, the keyword list matches, or the model says so.
export async function classify(r: ReviewInput) {
  const keywordUrgent = r.rating <= 2 || URGENT_WORDS.test(r.comment ?? "");
  if (!r.comment?.trim()) return { language: "none", urgent: keywordUrgent, reasons: keywordUrgent ? ["low rating"] : [] };
  const out = await message(CHECK_MODEL,
    `You classify Google reviews for a small business. Reply with JSON only:
{"language": "<ISO code of the review's language, or 'franco' for Arabic written in Latin letters>",
 "urgent": <true if the review mentions illness, food safety, hygiene, staff behaviour, theft, harassment, discrimination, police or legal action>,
 "reasons": ["<short reason>", ...]}`,
    `Rating: ${r.rating}/5\nReview:\n${r.comment}`, 200);
  const j = parseJson<{ language?: string; urgent?: boolean; reasons?: string[] }>(out);
  const reasons = [...(r.rating <= 2 ? ["low rating"] : []), ...(j.reasons ?? [])].slice(0, 5);
  return { language: (j.language ?? "unknown").slice(0, 12), urgent: keywordUrgent || j.urgent === true, reasons };
}

function cardFacts(card: Card) {
  const lines: string[] = [];
  if (card.signature) lines.push(`Sign-off used by the owner (always allowed): ${card.signature}`);
  if (card.hours_note) lines.push(`Opening hours: ${card.hours_note}`);
  if (card.contact_phone) lines.push(`Phone for unhappy customers: ${card.contact_phone}`);
  if (card.mention) lines.push(`Things the owner wants mentioned when relevant: ${card.mention}`);
  if (card.staff_names?.length) lines.push(`Staff names that may be used: ${card.staff_names.join(", ")}`);
  for (const faq of (card.faqs as { q?: string; a?: string }[] | undefined) ?? []) if (faq.q && faq.a) lines.push(`${faq.q} → ${faq.a}`);
  return lines.length ? lines.join("\n") : "(no extra facts)";
}

// Grounded draft (D223). Returns the reply text only.
export async function draftReply(o: { review: ReviewInput; business: string; card: Card; language: string; urgent: boolean; instruction?: string; previous?: string }) {
  const tone = o.card.tone === "formal" ? "formal and courteous" : o.card.tone === "short" ? "short and friendly" : "warm and personal";
  const system = `You write replies to Google reviews on behalf of "${o.business}". The owner reads every reply and approves it before it is posted.
Rules — never break them:
- Write in the same language and script as the review (Arabic stays Arabic, Franco-Arabic stays Franco, French stays French, English stays English).${o.language === "none" ? " The review has no text: reply briefly in English thanking them for the rating." : ""}
- Match the reviewer's dialect and register (e.g. Lebanese Arabic gets a Lebanese reply, not formal Arabic).
- At most 80 words. Tone: ${tone}. Sound like a real local owner, not a company. You may greet the reviewer by the name they used.
- Use ONLY these facts about the business, and only a fact that answers a topic the reviewer themselves raised (hours if they ask when you open, delivery if they mention delivery). Never add a fact just to promote it. If something is not listed, do not mention it:
${cardFacts(o.card)}
- Never offer discounts, refunds, vouchers, free items or any compensation.
- Never admit fault, liability or wrongdoing, and never argue with the customer.
- Never ask the customer to change or remove their review. No links, no promotions, no reminders about services, no hashtags.
- Never mention staff names unless they are in the list above. Never include personal data.
- Never make medical, legal or safety claims.
${o.urgent ? "- This review is sensitive: stay calm, thank them for telling you, say you take it seriously, and invite them to continue privately" + (o.card.contact_phone ? ` at ${o.card.contact_phone}` : "") + ". Do not discuss details in public.\n" : ""}- End with this sign-off on its own line: ${o.card.signature || o.business}
Output only the reply text.`;
  const user = o.instruction && o.previous
    ? `Review (${o.review.rating}/5) by ${o.review.reviewer}:\n${o.review.comment ?? "(no text)"}\n\nCurrent draft:\n${o.previous}\n\nOwner's instruction for the new version: ${o.instruction}`
    : `Review (${o.review.rating}/5) by ${o.review.reviewer}:\n${o.review.comment ?? "(no text)"}`;
  return (await message(DRAFT_MODEL, system, user, 400)).replace(/^["“]|["”]$/g, "").trim();
}

// Safety check (D223): blocks drafts that break the rules above.
export async function checkDraft(o: { review: ReviewInput; draft: string; card: Card }) {
  const out = await message(CHECK_MODEL,
    `You check a drafted reply to a Google review before a business owner sees it. Reply with JSON only:
{"ok": <true|false>, "issues": ["<short issue>", ...]}
Allowed and NOT problems: using the reviewer's own name; the owner's sign-off; saying sorry to hear it or sorry they feel unwell; thanking them; saying the business takes it seriously, wants to understand what happened or will look into it; inviting them to continue privately or to call the listed phone number.
"Admits fault" means ONLY an explicit statement that the business caused the problem (e.g. "our food made you sick", "it was our mistake", "we will pay"). Empathy and investigating are not admitting fault.
Set ok=false if the draft: states a fact about the business not in the allowed facts; mentions an allowed fact (like delivery or hours) on a topic the reviewer did not raise, i.e. promotes it; admits fault or liability; offers a discount, refund, voucher or compensation; insults or argues; includes personal data; names a staff member who is not the reviewer, not in the sign-off and not in the allowed list; asks to change or remove the review; includes links, promotions or unrelated service reminders; makes medical, legal or safety claims; or is in a different language from the review.`,
    `Allowed facts:\n${cardFacts(o.card)}\n\nReview (${o.review.rating}/5) by ${o.review.reviewer} (the reviewer's name, always allowed in the reply):\n${o.review.comment ?? "(no text)"}\n\nDraft:\n${o.draft}`, 250);
  const j = parseJson<{ ok?: boolean; issues?: string[] }>(out);
  return { ok: j.ok === true, issues: (j.issues ?? []).slice(0, 6), model: CHECK_MODEL };
}

export const MODELS = { draft: DRAFT_MODEL, check: CHECK_MODEL };
