// Prompts in customers' words (master plan 27.3 item 2): what a person would ask an AI assistant to find this kind of
// business. Kabsi suggests them from the category, the area and the owner's confirmed Visibility Map search; the
// owner's yes to the search (13b part 2's keyword confirm) is the yes to these. Plan limits come from entitlements
// (Essentials 3 prompts monthly, Pro 10 every 2 weeks), never from code. Pure.

const clean = (s: string | null | undefined) => (s ?? "").replace(/[^\p{L}\p{N}\s'&-]/gu, " ").replace(/\s+/g, " ").trim().toLowerCase();

// Ordered: the first ones are the most natural questions. {t} is the trade or search, {a} the area.
const TEMPLATES = [
  "best {t} in {a}",
  "{t} near {a} open late",
  "top rated {t} in {a}",
  "where can I find a good {t} in {a}",
  "recommend a {t} in {a}",
  "affordable {t} in {a}",
  "{t} in {a} with great reviews",
  "I just moved to {a}, which {t} should I try",
  "best {t} near {a} for a first visit",
  "{t} in {a} open on weekends",
] as const;

export type PromptInput = { category: string | null; keyword: string | null; area: string | null };

/** The area in plain words: Kabsi's stored area, else the town part of the address. */
export function areaOf(area: string | null | undefined, address: string | null | undefined): string | null {
  const a = clean(area);
  if (a) return a;
  const parts = String(address ?? "").split(",").map((p) => clean(p.replace(/\d+/g, " "))).filter((p) => p.length >= 3);
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0] ?? null;
}

/** Up to `limit` prompts, none repeated, each at most 120 characters. Empty when the area is not known: an AI answer needs a place. */
export function suggestPrompts(i: PromptInput, limit: number): string[] {
  const area = clean(i.area);
  const trade = clean(i.keyword) || clean(i.category);
  if (!area || !trade || limit <= 0) return [];
  const out: string[] = [];
  for (const t of TEMPLATES) {
    const p = t.replace("{t}", trade).replace("{a}", area);
    if (p.length <= 120 && !out.includes(p)) out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

/** A prompt the owner typed: 8 to 120 characters, at most 16 words, no link, no phone number, no dash. Null when it is not one. */
export function promptFrom(text: string): string | null {
  const p = text.trim().replace(/^["'“”‘’]+|["'“”‘’.]+$/g, "").replace(/\s+/g, " ");
  if (p.length < 8 || p.length > 120 || p.split(" ").length > 16) return null;
  if (/https?:|www\.|\.com\b|@|\d{5,}|[–—!]/.test(p)) return null;
  return p.toLowerCase();
}

export type Cadence = "monthly" | "biweekly";
/** Entitlements' `ai_every` ("month" or "2 weeks") as a cadence. */
export const cadenceOf = (every: string | null | undefined): Cadence => (every === "2 weeks" ? "biweekly" : "monthly");
export const nextRunAfter = (from: Date, c: Cadence) => new Date(from.getTime() + (c === "biweekly" ? 14 : 30) * 86_400_000);
