// The grounded reply pipeline (K-14 steps 2 to 6, K-39, K-116.4, K-113.4, K-120). Trusted context is the business's
// memory (verified facts, voice, the owner's rules, open questions) and the owner's last approved replies; the review is
// the only untrusted input. The model answers {reply, facts_used, language, topics}; code checks every fact it cites
// and every detail it states; a second model judges tone. A failed check keeps the draft with the problem marked,
// never as ready.
import { MODELS } from "../models.ts";
import { message, parseJson, type Meter, type System } from "./client.ts";
import { fenceReview, houseStyle, type ReviewInput, UNTRUSTED } from "./fence.ts";
import { type Memory, memoryParts } from "./memory.ts";
import { type ReplyOutput, replyChecks } from "./checks.ts";
import { runContract, type Send, type Workflow } from "./contract.ts";
import { REPLY_RULES, REPLY_V1, replyTask } from "./prompts/reply.v1.ts";
import { CHECK_RULES } from "./prompts/check.v1.ts";
import { CLASSIFY_RULES } from "./prompts/classify.v1.ts";

export { CONTACT_LINE } from "./prompts/reply.v1.ts";

const URGENT_WORDS = /(sick|food poison|poison|ill\b|vomit|hospital|police|lawyer|lawsuit|court|sue\b|theft|stole|harass|racis|discriminat|rat\b|cockroach|insect|تسمم|مريض|شرطة|محامي|سرقة|تحرش|صرصور|empoison|malade|police|avocat|vol\b|harcèlement)/i;

// Language and urgency (D220). Urgent if rating ≤ 2, the keyword list matches, or the model says so.
export async function classify(r: ReviewInput, meter?: Meter, call = message) {
  const keywordUrgent = r.rating <= 2 || URGENT_WORDS.test(r.comment ?? "");
  if (!r.comment?.trim()) return { language: "none", urgent: keywordUrgent, reasons: keywordUrgent ? ["low rating"] : [] };
  const out = await call(MODELS.check, CLASSIFY_RULES, fenceReview(r), 200, meter);
  const j = parseJson<{ language?: string; urgent?: boolean; reasons?: string[] }>(out);
  const reasons = [...(r.rating <= 2 ? ["low rating"] : []), ...(j.reasons ?? [])].slice(0, 5);
  return { language: (j.language ?? "unknown").slice(0, 12), urgent: keywordUrgent || j.urgent === true, reasons };
}

// Which language the reply is written in (D232, K-119). Franco gets English.
export function languageRule(language: string) {
  if (language === "none") return "The review has no text: reply in English with one or two short sentences thanking them for the rating.";
  if (language === "franco") return "The review is in Franco-Arabic (Arabic in Latin letters, often mixed with English). Reply in simple, natural English. If the review is positive you may open with ONE common Lebanese word in Latin letters such as 'Yislamo' or 'Ahla w sahla', nothing more; for a complaint, just use their name or 'Hi'. Never write Franco with numbers for letters (no 2, 3, 7).";
  if (language.startsWith("ar")) return "The review is in Arabic script. Reply in Arabic script. If it is Lebanese dialect, reply in natural, polite Lebanese Arabic as a respectful local owner would write it publicly; otherwise use simple Modern Standard Arabic.";
  return "Reply in the same language as the review.";
}

export type ReplyInput = {
  review: ReviewInput; memory: Memory; language: string; urgent: boolean;
  /** The last 20 replies of this business, for the repeat check. */
  recentReplies: string[];
  instruction?: string; previous?: string;
};

export const replySystem = (memory: Memory): System => [{ text: REPLY_RULES, cache: true }, ...memoryParts(memory)];
export const replyUser = (i: ReplyInput) => `${fenceReview(i.review)}\n\n${replyTask({ languageRule: languageRule(i.language), urgent: i.urgent, instruction: i.instruction, previous: i.previous })}`;

/** Structured output (K-39): anything that does not fit is thrown away. */
export function parseReply(text: string): ReplyOutput {
  const j = parseJson<Record<string, unknown>>(text);
  if (typeof j.reply !== "string" || !j.reply.trim()) throw new Error("reply missing");
  const list = (v: unknown) => (Array.isArray(v) && v.every((x) => typeof x === "string") ? (v as string[]) : null);
  const facts = list(j.facts_used ?? []), topics = list(j.topics ?? []);
  if (!facts || !topics) throw new Error("facts_used and topics must be lists of text");
  const reply = houseStyle(j.reply.replace(/^["“]|["”]$/g, "").trim());
  return { reply, facts_used: facts.slice(0, 20), language: String(j.language ?? "").slice(0, 12), topics: topics.slice(0, 8).map((t) => t.slice(0, 40)) };
}

export function replyWorkflow(o: { checkCall?: typeof message; meter?: Meter } = {}): Workflow<ReplyInput, ReplyOutput> {
  const call = o.checkCall ?? message;
  return {
    promptVersion: REPLY_V1,
    system: (i) => replySystem(i.memory),
    user: replyUser,
    maxTokens: 500,
    parse: (text) => parseReply(text),
    codeChecks: (out, i) => replyChecks({ out, memory: i.memory, reviewer: i.review.reviewer, reviewText: i.review.comment ?? "", recentReplies: i.recentReplies }),
    modelCheck: async (out, i) => {
      const facts = Object.entries(i.memory.factText).map(([r, t]) => `[${r}] ${t}`).join("\n") || "(none)";
      const avoid = typeof i.memory.card.avoid === "string" && i.memory.card.avoid.trim() ? `\nThe owner asked never to mention or promise (set ok=false if the draft does): ${i.memory.card.avoid.trim()}\n` : "";
      const raw = await call(MODELS.check, CHECK_RULES,
        `Allowed facts:\n${facts}\n${avoid}\nThe review (the reviewer's name is always allowed in the reply):\n${fenceReview(i.review)}\n\nDraft:\n${out.reply}`, 250, o.meter);
      const j = parseJson<{ ok?: boolean; issues?: string[] }>(raw);
      return { ok: j.ok === true, problems: (j.issues ?? []).map((s) => `The safety check flagged: ${String(s)}`).slice(0, 6), model: MODELS.check };
    },
  };
}

/** One grounded draft. `send` writes it (the draft model, a stub in tests); the check call is the second model. */
export function draftGrounded(i: ReplyInput, send: Send, o: { checkCall?: typeof message; meter?: Meter } = {}) {
  return runContract(replyWorkflow(o), i, send);
}

export { UNTRUSTED };
