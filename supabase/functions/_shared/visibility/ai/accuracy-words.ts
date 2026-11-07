// AI Answers 1, the words (docs/COPY.md 37): the Home item, its weekly report line and where the owner acts. Its only import is
// the pure possessive helper, so the signed-in website's report (src/components/report/work-receipt.tsx, through results-report/receipt.ts) can use it.
import { possessive } from "../../possessive.ts";

export type FactKey = "hours" | "phone" | "address" | "website" | "services" | "price";
export type Detail = "closing_time" | "opening_time" | "closed_day" | "open_day" | FactKey;
export type Finding = {
  fact: FactKey; detail: Detail; sentence: string; assistant: string; question: string; asked_at: string; kabsi: string;
};

export const ASSISTANT: Record<string, string> = { chatgpt: "ChatGPT", perplexity: "Perplexity" };
export const ACCURACY_LABEL = "Answers from ChatGPT and Perplexity through their API, which can differ from their apps.";
export const ACCURACY_ACTION = "Make sure your Google profile and website say this. AI assistants read them.";
export const FACT_WORD: Record<Detail, string> = {
  closing_time: "closing time", opening_time: "opening time", closed_day: "opening days", open_day: "opening days",
  hours: "opening hours", phone: "phone number", address: "address", website: "website", services: "services", price: "price level",
};
/** Where the owner acts on it: hours, the Google profile, or Business Knowledge. */
export const ACTION: Record<FactKey, { label: string; path: string }> = {
  hours: { label: "Check your hours", path: "/app/hours" },
  phone: { label: "Check your Google profile", path: "/app/shield" },
  address: { label: "Check your Google profile", path: "/app/shield" },
  website: { label: "Check your Google profile", path: "/app/shield" },
  services: { label: "Check your business details", path: "/app/knowledge" },
  price: { label: "Check your business details", path: "/app/knowledge" },
};

const PLURAL = new Set<Detail>(["closed_day", "open_day", "hours", "services"]);
export const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 3).trimEnd()}...` : s);

/** The Home item and its weekly report line, from one finding. Never a promise that an assistant will change. */
export function findingTask(f: Finding, tz = "UTC") {
  const who = ASSISTANT[f.assistant] ?? f.assistant;
  const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: tz }).format(new Date(f.asked_at));
  const sentence = clip(f.sentence.replace(/\s+/g, " ").trim(), 220);
  const why = clip(`${who} was asked "${clip(f.question, 120)}" on ${when}. It said: "${sentence}" Kabsi has: ${clip(f.kabsi, 120)}.`, 500);
  return {
    title: `${possessive(who)} answer gives ${PLURAL.has(f.detail) ? "different" : "a different"} ${FACT_WORD[f.detail]} for your business`,
    why,
    recommendation: ACCURACY_ACTION,
    evidence: { fact: f.fact, detail: f.detail, assistant: f.assistant, question: f.question, asked_at: f.asked_at, sentence: f.sentence, kabsi: f.kabsi, label: ACCURACY_LABEL },
    action: ACTION[f.fact],
  };
}
