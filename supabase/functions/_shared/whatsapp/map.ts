// The map on WhatsApp (session 13b part 2; master plan 27.3 item 1, 28.5, docs/COPY.md sections 0.1 and 20). Pure.
//   - The search Kabsi suggests for the first map: from the business's own search terms report when Google has one, else
//     its category. The owner confirms it (or types another) before any map runs; that is the owner's yes of 27.3 item 1.
//   - The words of a typed search are checked here: a short search a customer would type, never a link or a sentence.
//   - "Show me" under the map: the numbers behind the line, in plain words (places, never spots).

/** The search to suggest: the most used search term that names what the business is, else the category in plain words. */
export function suggestKeyword(terms: { keyword: string; count: number }[], category: string | null, business: string): string | null {
  const name = business.toLowerCase();
  const clean = (k: string) => k.toLowerCase().replace(/[^\p{L}\p{N}\s'&-]/gu, " ").replace(/\s+/g, " ").trim();
  const words = new Set(clean(category ?? "").split(" ").filter((w) => w.length > 2));
  const usable = terms.map((t) => ({ k: clean(t.keyword), n: t.count }))
    .filter((t) => t.k.length >= 3 && t.k.length <= 40 && t.k.split(" ").length <= 4 && !name.includes(t.k) && !t.k.includes(name))
    .sort((a, b) => b.n - a.n);
  const byCategory = usable.find((t) => t.k.split(" ").some((w) => words.has(w) || words.has(w.replace(/s$/, ""))));
  if (byCategory) return byCategory.k;
  const cat = clean(category ?? "");
  if (cat && cat.length <= 40) return cat;
  return usable[0]?.k ?? null;
}

/** A search the owner typed: 2 to 80 characters, at most 6 words, no link, no phone number. Null when it is not one. */
export function keywordFrom(text: string): string | null {
  const k = text.trim().replace(/^["'“”‘’]+|["'“”‘’.]+$/g, "").replace(/\s+/g, " ").toLowerCase();
  if (k.length < 2 || k.length > 80 || k.split(" ").length > 6) return null;
  if (/https?:|www\.|\.com\b|@|\d{5,}/.test(k)) return null;
  return k;
}

export type MapDetails = {
  business: string; keyword: string; points: number; top3: number; ranked: number; average: number | null; competitors: string[];
};

/** "Show me" under the map: the numbers behind the line. */
export function mapDetailsText(d: MapDetails): string {
  const avg = d.average === null ? null : d.average > 20 ? "not in the top 20 on average" : `place ${String(d.average).replace(/\.0$/, "")} on average (1 is first)`;
  const rivals = d.competitors.slice(0, 3);
  const list = rivals.length <= 1 ? rivals.join("") : `${rivals.slice(0, -1).join(", ")} and ${rivals.at(-1)}`;
  return [
    `${d.business}, '${d.keyword}' searched from ${d.points} places around you:`,
    `Top 3 from ${d.top3} of them. In the top 20 from ${d.ranked}.${avg ? ` You came up ${avg}.` : ""}`,
    rivals.length ? `Who comes up most around you: ${list}.` : null,
    "Kabsi rank check, not provided by Google. You can pick the businesses Kabsi watches for you on kabsi.co.",
  ].filter(Boolean).join("\n");
}
