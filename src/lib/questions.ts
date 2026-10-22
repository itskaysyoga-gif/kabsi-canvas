// The five questions of onboarding step 4 (K-45, K-10, K-18; design review "While you wait: five quick questions"):
// how you sign off, the tone with three tappable examples, how unhappy customers can reach you, one thing customers love,
// and one thing never to say. Each answer is saved as a verified fact the owner gave (source owner) through the facts
// RPC of P0.3-01 (`save_fact`), and nothing else writes knowledge here. Skipping any or all of them is fine: drafts then
// use the safe defaults below. Pure, so a test reads every word.
import type { Field } from "@/lib/knowledge";

export type QuestionId = "signature" | "tone" | "contact" | "love" | "never";

export type Question = {
  id: QuestionId;
  /** The field of About your business the answer is saved to. */
  field: Field;
  label: string;
  hint?: string;
  placeholder?: string;
  max: number;
  type?: "tel";
};

export const QUESTIONS_FIVE: Question[] = [
  {
    id: "signature",
    field: "signature",
    label: "How do you sign off a reply?",
    placeholder: "e.g. Luca, Trattoria Verde",
    max: 80,
  },
  { id: "tone", field: "tone", label: "How should replies sound?", max: 20 },
  {
    id: "contact",
    field: "contact_phone",
    label: "How can an unhappy customer reach you?",
    hint: "A phone or WhatsApp number. Kabsi never writes it in a public reply: Google can reject replies that do. Customers are asked to use the details on your Google profile.",
    placeholder: "e.g. +1 555 010 0100",
    max: 30,
    type: "tel",
  },
  {
    id: "love",
    field: "mention",
    label: "One thing customers love about you",
    placeholder: "e.g. Fresh bread every morning",
    max: 200,
  },
  {
    id: "never",
    field: "avoid",
    label: "One thing Kabsi should never say or promise",
    placeholder: "e.g. Same-day delivery",
    max: 200,
  },
];

/** The three tones, each with a sample reply line so the owner picks by ear, not by label. No dashes, no exclamation marks. */
export const TONE_EXAMPLES = [
  {
    value: "warm",
    label: "Warm",
    example: "Thank you so much, Sara. We loved having you here and we hope to see you again soon.",
  },
  {
    value: "formal",
    label: "Formal",
    example: "Thank you for your review, Ms Haddad. We are pleased that you enjoyed your visit.",
  },
  { value: "short", label: "Short and friendly", example: "Thanks, Sara. See you soon." },
] as const;
export type ToneValue = (typeof TONE_EXAMPLES)[number]["value"];

/** What Kabsi does when a question is skipped (the drafting memory's own defaults, supabase/functions/_shared/ai/memory.ts). */
export const SKIP_DEFAULTS = [
  "Replies are signed with your business name.",
  "Replies sound warm.",
  "Unhappy customers are asked to use the details on your Google profile.",
  "Nothing is added to what Kabsi says or avoids.",
];

export type Answers = Partial<Record<Exclude<QuestionId, "tone">, string>> & { tone?: ToneValue };

const PHONE = /^\+?[0-9 ()./-]{4,30}$/;

/** What one answer needs before it is saved: null when it is fine or empty, else the owner's words. */
export function answerProblem(q: Question, raw: string | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  if (v.length > q.max) return `Keep it to ${q.max} characters.`;
  if (q.id === "contact" && !PHONE.test(v)) return "That does not look like a phone number.";
  return null;
}

/** The facts to save: only the answers that are filled in and fine, in the order of the questions. A skip saves nothing. */
export function factsToSave(answers: Answers): { id: QuestionId; field: Field; value: string }[] {
  const out: { id: QuestionId; field: Field; value: string }[] = [];
  for (const q of QUESTIONS_FIVE) {
    const v = (q.id === "tone" ? answers.tone : answers[q.id])?.trim();
    if (!v || answerProblem(q, v)) continue;
    out.push({ id: q.id, field: q.field, value: v });
  }
  return out;
}

/** True when nothing was answered: the button says Skip for now. */
export const nothingAnswered = (answers: Answers) => factsToSave(answers).length === 0;
