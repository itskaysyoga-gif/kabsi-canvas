// The grounded reply pipeline (K-14 steps 2 to 6, K-39, K-116.4, K-113.4, K-120). Trusted context is the business's
// memory (verified facts, voice, the owner's rules, open questions) and the owner's last approved replies; the review is
// the only untrusted input. The model answers {reply, facts_used, language, topics}; code checks every fact it cites
// and every detail it states; a second model judges tone. A failed check keeps the draft with the problem marked,
// never as ready.
import { type JsonSchema, message, parseJson, type Meter, type System } from "./client.ts";
import { task } from "./agents.ts";
import { fenceDraft, fenceReview, houseStyle, type ReviewInput, UNTRUSTED } from "./fence.ts";
import { type Memory, memoryParts } from "./memory.ts";
import { type ReplyOutput, replyChecks } from "./checks.ts";
import { runContract, type Send, type Workflow } from "./contract.ts";
import { REPLY_RULES, REPLY_V2, replyTask } from "./prompts/reply.v2.ts";
import { CHECK_RULES } from "./prompts/check.v1.ts";
import { CLASSIFY_RULES } from "./prompts/classify.v2.ts";
import { type Industry, mergeRisk, type Risk, riskByRules, type RiskReason } from "./risk.ts";

export { CONTACT_LINE } from "./prompts/reply.v2.ts";

// Language and risk level (K-13, P0.3-03): code rules first, then the small model; the higher level wins. A review
// with no text is not sent to a model, and neither is one the code rules already mark high: nothing can lower it and
// it gets no draft, so its language is left unknown (null) until the owner asks for a holding reply.
export async function classify(r: ReviewInput, o: { industry?: Industry | null; meter?: Meter; call?: typeof message } = {}): Promise<{ language: string | null; risk: Risk; reasons: RiskReason[] }> {
  const code = riskByRules(r, o.industry ?? null);
  if (!r.comment?.trim()) return { language: "none", ...code };
  if (code.risk === "high") return { language: null, ...code };
  const t = task("reply", "classify");
  const out = await (o.call ?? message)(t.model, CLASSIFY_RULES, fenceReview(r), t.maxTokens, o.meter);
  const j = parseJson<{ language?: string; risk?: unknown; reasons?: unknown }>(out);
  return { language: String(j.language ?? "unknown").slice(0, 12), ...mergeRisk(code, j) };
}

// Which language the reply is written in (D232, K-119). Franco gets English.
export function languageRule(language: string) {
  if (language === "none") return "The review has no text: reply in English with one or two short sentences thanking them for the rating.";
  if (language === "franco") return "The review is in Franco-Arabic (Arabic in Latin letters, often mixed with English). Reply in simple, natural English. If the review is positive you may open with ONE common Lebanese word in Latin letters such as 'Yislamo' or 'Ahla w sahla', nothing more; for a complaint, just use their name or 'Hi'. Never write Franco with numbers for letters (no 2, 3, 7).";
  if (language.startsWith("ar")) return "The review is in Arabic script. Reply in Arabic script. If it is Lebanese dialect, reply in natural, polite Lebanese Arabic as a respectful local owner would write it publicly; otherwise use simple Modern Standard Arabic.";
  return "Reply in the same language as the review.";
}

export type ReplyInput = {
  review: ReviewInput; memory: Memory; language: string; risk: Risk;
  /** risk.ts reason keys: the careful lines for a medium review. */
  reasons?: readonly string[];
  /** Health, legal or financial (from the Google category): replies never confirm a patient or client. */
  industry?: Industry | null;
  /** The neutral holding reply a high-risk review gets only when the owner asks for it (K-13). */
  holding?: boolean;
  /** The last 20 replies of this business, for the repeat check. */
  recentReplies: string[];
  instruction?: string; previous?: string;
};

export const replySystem = (memory: Memory): System => [{ text: REPLY_RULES, cache: true }, ...memoryParts(memory)];
export const replyUser = (i: ReplyInput) => `${fenceReview(i.review)}\n\n${replyTask({ languageRule: languageRule(i.language), risk: i.risk, reasons: i.reasons, industry: i.industry, holding: i.holding, instruction: i.instruction, previous: i.previous })}`;

/** The draft's fixed shape, sent as the structured output schema (26.1); parseReply checks it again in code. */
export const REPLY_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    reply: { type: "string" },
    facts_used: { type: "array", items: { type: "string" } },
    language: { type: "string" },
    topics: { type: "array", items: { type: "string" } },
  },
  required: ["reply", "facts_used", "language", "topics"],
  additionalProperties: false,
};

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
  const draft = task("reply", "draft"), check = task("reply", "check");
  return {
    promptVersion: REPLY_V2,
    system: (i) => replySystem(i.memory),
    user: replyUser,
    maxTokens: draft.maxTokens,
    effort: draft.effort,
    schema: REPLY_SCHEMA,
    parse: (text) => parseReply(text),
    codeChecks: (out, i) => replyChecks({ out, memory: i.memory, reviewer: i.review.reviewer, reviewText: i.review.comment ?? "", recentReplies: i.recentReplies, industry: i.industry ?? null }),
    modelCheck: async (out, i) => {
      const facts = Object.entries(i.memory.factText).map(([r, t]) => `[${r}] ${t}`).join("\n") || "(none)";
      const avoid = typeof i.memory.card.avoid === "string" && i.memory.card.avoid.trim() ? `\nThe owner asked never to mention or promise (set ok=false if the draft does): ${i.memory.card.avoid.trim()}\n` : "";
      const raw = await call(check.model, CHECK_RULES,
        `Allowed facts:\n${facts}\n${avoid}\nThe review (the reviewer's name is always allowed in the reply):\n${fenceReview(i.review)}\n\nThe draft to judge:\n${fenceDraft(out.reply)}`, check.maxTokens, o.meter);
      const j = parseJson<{ ok?: boolean; issues?: string[] }>(raw);
      return { ok: j.ok === true, problems: (j.issues ?? []).map((s) => `The safety check flagged: ${String(s)}`).slice(0, 6), model: check.model };
    },
  };
}

/** One grounded draft. `send` writes it (the draft model, a stub in tests); the check call is the second model. */
export function draftGrounded(i: ReplyInput, send: Send, o: { checkCall?: typeof message; meter?: Meter } = {}) {
  return runContract(replyWorkflow(o), i, send);
}

export { UNTRUSTED };
