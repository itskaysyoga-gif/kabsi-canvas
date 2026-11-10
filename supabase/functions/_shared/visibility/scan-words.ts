// Scan 3 (master plan 30.34 item 2, docs/COPY.md 58): the free check result in plain words. One main finding, what Kabsi
// would do in three lines, the nearby result and the AI answer, each from the data the check returned. Pure functions, so
// the page, the emailed report and the WhatsApp text (profile-snapshot.ts; Launch 1, 30.35 item 4) read the same
// words. No count here is ever presented as customers or searches.
import { usualLine } from "./usual.ts";

/** "1st", "2nd", "3rd", "4th", "11th", "21st". */
export function ord(n: number): string {
  const s =
    n % 100 >= 11 && n % 100 <= 13
      ? "th"
      : (({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th");
  return `${n}${s}`;
}

/** The free check reads Google Maps to 20 places deep (DEPTH on the server). */
const DEPTH = 20;

/** "When someone searches for 'barber shop' near you, you appear 2nd in this Google Maps check." */
export function nearbyLead(term: string, rank: number | null): string {
  return rank != null && rank >= 1 && rank <= DEPTH
    ? `When someone searches for '${term}' near you, you appear ${ord(rank)} in this Google Maps check.`
    : `When someone searches for '${term}' near you, you are not in the first ${DEPTH} in this Google Maps check.`;
}

/**
 * Site 3a (master plan 30.50 item 10): the saved result's main finding in words, before any number. The position itself
 * follows in nearbyLead and nearbyCount. Never a promise: it says only where the business came up in this check.
 */
export function nearbyWords(term: string, rank: number | null): string {
  if (rank != null && rank >= 1 && rank <= 3)
    return `When someone nearby searches for '${term}', you come up near the top of Google Maps.`;
  if (rank != null && rank >= 1 && rank <= DEPTH)
    return `When someone nearby searches for '${term}', you come up on Google Maps, but not near the top.`;
  return `When someone nearby searches for '${term}', you did not come up in this Google Maps check.`;
}

/** Site 3a: what a saved report keeps and what it does not, so nothing reads as missing when it was not kept. */
export const SAVED_NOT_KEPT =
  "This saved report keeps the nearby check and the AI answer. What Google shows on your profile is not kept, so Kabsi could not check it here. Run the free check again to see it.";

/** "You appeared in the first three at 5 of 49 points around you." then Scan 2's usual-position sentence. */
export function nearbyCount(
  top3: number,
  points: number,
  ranks: readonly (number | null | undefined)[],
): string {
  const base = `You appeared in the first three at ${top3} of ${points} points around you.`;
  const usual = usualLine(ranks);
  return usual ? `${base} ${usual}` : base;
}

/** One line on why results vary by place (30.34 item 2, the nearby details). */
export const WHY_VARIES =
  "Google Maps shows different results depending on where someone searches, so your position changes across your area.";

/* ---------- The AI part: "Did ChatGPT name your business?" ---------- */

export const AI_QUESTION = "Did ChatGPT name your business?";

export type AiVerdict = { verdict: "yes" | "no" | "inconclusive"; line: string };

/**
 * The verdict: yes, no, or inconclusive when the businesses ChatGPT named cannot be matched to the area on Google Maps
 * (30.34 item 2: an honest inconclusive state instead of a verdict).
 */
export function aiVerdict(a: {
  named: boolean;
  line: string | null;
  named_other?: number | null;
}): AiVerdict {
  if (a.named) return { verdict: "yes", line: "Yes. ChatGPT named your business." };
  const line = a.line ?? "";
  const matched = /It named /.test(line);
  if (!matched && (a.named_other ?? 0) > 0)
    return {
      verdict: "inconclusive",
      line: "Not clear from this answer. ChatGPT named businesses Kabsi could not match to your area on Google Maps, so it does not show whether ChatGPT would name you here.",
    };
  if (matched) {
    const names = line.replace(/^ChatGPT did not name you\. /, "");
    return { verdict: "no", line: `No. ${names}` };
  }
  return { verdict: "no", line: "No. ChatGPT did not name your business in this answer." };
}

/** "gpt-4.1-mini-2025-04-14" reads "gpt-4.1-mini". */
export const modelName = (m: string | null | undefined) =>
  m ? m.replace(/-\d{4}-\d{2}-\d{2}$/, "") : null;

const longDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));

/** The assistant's name as the owner reads it: ChatGPT, or Perplexity (Tidy 1, R-143 item 2). Anything else reads ChatGPT. */
export const assistantName = (a: string | null | undefined) =>
  a === "Perplexity" ? "Perplexity" : "ChatGPT";

/** "Asked ChatGPT on 5 November 2026" and its twin "Asked Perplexity on 5 November 2026" (R-143 item 2: no API words). */
export const askedLead = (assistant: string | null | undefined, iso: string) =>
  `Asked ${assistantName(assistant)} on ${longDate(iso)}`;

/** The question, the model and the date, under the verdict. */
export function aiAskedLines(a: {
  question?: string | null;
  model?: string | null;
  asked_at?: string | null;
  assistant?: string | null;
}): string[] {
  const out: string[] = [];
  if (a.question) out.push(`Question: '${a.question}'`);
  const m = modelName(a.model);
  if (m) out.push(`Model: ChatGPT (${m})`);
  if (a.asked_at) out.push(askedLead(a.assistant, a.asked_at));
  return out;
}

export const AI_SAMPLE =
  "One sample answer. The ChatGPT app can answer differently, and answers change from run to run.";

/* ---------- The main finding and what Kabsi would do ---------- */

type Flag = { tone: "danger" | "warning" | "neutral"; fact: string; action: string };

/** Why the finding matters, in one plain sentence, by the fact Google shows (the flags of profile-snapshot.ts). */
export function whyItMatters(fact: string): string {
  if (/closed/.test(fact)) return "Customers who search for you see this before anything else.";
  if (/opening hours/.test(fact)) return "Customers cannot see when you are open.";
  if (/phone/.test(fact)) return "Customers cannot call you from your profile.";
  if (/website/.test(fact)) return "Customers cannot open your site from your profile.";
  if (/category/.test(fact)) return "Your category tells Google and customers what you do.";
  if (/photos/.test(fact)) return "Photos show customers what to expect before they come.";
  if (/review/.test(fact)) return "People read your reviews before they choose.";
  return "Customers see this on your Google profile.";
}

export type MainFinding = { fact: string; why: string; next: string };

/** The one main finding: the first red flag, else the first amber one, else what Google already shows. */
export function mainFinding(flags: readonly Flag[]): MainFinding {
  const f = flags.find((x) => x.tone === "danger") ?? flags.find((x) => x.tone === "warning");
  if (f) return { fact: f.fact, why: whyItMatters(f.fact), next: f.action };
  return {
    fact: "Google shows the basics of your profile.",
    why: "Customers can see your hours, your phone and your photos.",
    next: "Once connected, Kabsi checks them every day and prepares a reply to every new review.",
  };
}

/**
 * "What Kabsi would do": three short lines that say who does what. The middle line follows the main finding; the first
 * and last are the same for every business.
 */
export function wouldDo(flags: readonly Flag[]): { who: string; line: string }[] {
  const f = flags.find((x) => x.tone === "danger") ?? flags.find((x) => x.tone === "warning");
  const fact = f?.fact ?? "";
  const middle = /photos/.test(fact)
    ? {
        who: "You send, Kabsi prepares",
        line: "You send photos from your phone. Kabsi prepares them and asks for your yes.",
      }
    : /opening hours/.test(fact)
      ? {
          who: "You tell, Kabsi sends",
          line: "You tell Kabsi your hours. Kabsi sends them to Google once you say yes.",
        }
      : /review/.test(fact)
        ? {
            who: "Kabsi prepares, you share",
            line: "Kabsi gives you a review link and QR code. You share them with every customer.",
          }
        : /phone|website|category/.test(fact)
          ? {
              who: "You, on Google",
              line: `You add your ${/phone/.test(fact) ? "phone number" : /website/.test(fact) ? "website" : "category"} on Google. Kabsi then checks it every day.`,
            }
          : /closed/.test(fact)
            ? {
                who: "You, on Google",
                line: "You correct the open status on Google with the steps Kabsi shows. Kabsi then checks it every day.",
              }
            : {
                who: "Kabsi checks",
                line: "Kabsi checks your hours, phone and website on Google every day and tells you when something changes.",
              };
  return [
    {
      who: "Kabsi prepares, you approve",
      line: "Kabsi prepares a reply to every new review. You approve each one.",
    },
    middle,
    {
      who: "Kabsi prepares, you approve",
      line: "Kabsi prepares a post when something changes. Nothing goes live without your yes.",
    },
  ];
}

/** What Kabsi cannot promise, said plainly under the three lines. */
export const CANNOT_PROMISE = "Kabsi cannot promise more reviews or a higher place on Google Maps.";

/* ---------- The trial and Manager access ---------- */

export const TRIAL_BUTTON = "Start your 14-day free trial";
export const TRIAL_LINES = [
  "The 14 days start when Kabsi's access to your Google profile works.",
  "No card. Cancel any time.",
] as const;

export const ACCESS_TITLE = "Why Kabsi asks for Manager access";
export const ACCESS_LINES = [
  "Kabsi needs Manager access to prepare replies, posts and fixes on your profile.",
  "You stay the owner of your Google profile.",
  "Nothing is published without your yes.",
] as const;

/** Scan 3 (30.34 item 2): what the report holds, said before it is asked for. */
export function reportHolds(parts: { nearby: boolean; ai: boolean }): string {
  const extra = [parts.nearby ? "the nearby check" : null, parts.ai ? "the ChatGPT answer" : null]
    .filter(Boolean)
    .join(" and ");
  return `You get the summary of what Google shows${extra ? `, ${extra}` : ""}, and the link to this result.`;
}
