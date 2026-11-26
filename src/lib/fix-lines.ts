// APP-3 (R-169): "things to fix", said the same way on Home's profile strip and on the Google profile screen, with the
// same count, and each card short: a bold line and at most 20 words under it. The task engine writes longer reasons
// (and WhatsApp keeps them); the screens show the short line from here. Pure, so tests/fix-lines.test.ts checks every
// line's length and the count.
import type { Task, TaskKind } from "@/lib/tasks";

/** The open tasks that count as "things to fix": what is missing or unconfirmed on the profile, and lost access.
 *  Changes others made and Google's warnings have their own cards. */
export const FIX_KINDS: readonly TaskKind[] = [
  "profile_gap",
  "knowledge_confirm",
  "hours_confirm",
  "reconnect",
];

export const thingsToFix = <T extends Pick<Task, "kind">>(tasks: T[]): T[] =>
  tasks.filter((t) => FIX_KINDS.includes(t.kind));

/** "Nothing to fix", "1 thing to fix", "3 things to fix": the one wording on both screens. */
export const fixCountLine = (n: number) =>
  n === 0 ? "Nothing to fix" : `${n} ${n === 1 ? "thing" : "things"} to fix`;

export const MAX_FIX_WORDS = 20;

/** The short line under a coach item's title (evidence.coach). */
export const COACH_SHORT: Record<string, string> = {
  description:
    "Say what you do in a few lines. Kabsi drafts it from your facts and you approve it.",
  attributes:
    "Payment options and accessibility help customers decide. You approve each detail before it goes on Google.",
  categories: "Extra categories help Google show you for more of what you do.",
  services: "List what you sell, from what you told Kabsi about your business.",
  photos: "Customers look for the outside, the inside, your team, your work and what you sell.",
  service_area: "Show the areas you serve instead of your address. You approve it first.",
  website_tracking: "A small tag on your website link counts the visits that come from Google.",
  website_match:
    "Your website and profile should show the same name, phone, address and opening times.",
};

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);

/** The first sentences of a longer reason that fit in 20 words; a first sentence that is longer is cut at 20 words. */
export function shortWhy(why: string): string {
  if (!words(why.replace(/[.?]/g, "")).length) return "";
  const sentences = why.match(/[^.?]+[.?]+/g) ?? [why];
  let out = "";
  for (const s of sentences) {
    const next = `${out} ${s.trim()}`.trim();
    if (words(next).length > MAX_FIX_WORDS) break;
    out = next;
  }
  if (out) return out;
  return `${words(why)
    .slice(0, MAX_FIX_WORDS)
    .join(" ")
    .replace(/[,;:]$/, "")}.`;
}

/** The short line for one thing to fix. */
export function fixLine(t: Pick<Task, "kind" | "why" | "evidence">): string {
  const e = t.evidence ?? {};
  const coach = typeof e["coach"] === "string" ? COACH_SHORT[e["coach"]] : undefined;
  if (coach) return coach;
  if (typeof e["failures"] === "number")
    return "It did not load in 3 tries today. Fix the page, or change the link on your profile.";
  if (typeof e["missing"] === "string")
    return `Missing on Google: ${e["missing"]}. Complete details help customers reach you.`;
  if (typeof e["of"] === "number")
    return "Replies and posts use only the facts you confirmed, so they sound like you.";
  if (typeof e["have"] === "number")
    return "Start with the outside, the inside, your team and what you sell.";
  return shortWhy(t.why ?? "");
}
