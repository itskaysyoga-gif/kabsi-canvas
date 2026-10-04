// Search phrases for posts, best first (K-113.3, R-19). Never taken from review text: only Google's search terms
// (live mode), the category and area, and what the owner wrote about their services.
export type KeywordSource = "search" | "category" | "owner";
export type Keyword = { keyword: string; source: KeywordSource };

export function buildKeywords(o: {
  name: string; searchTerms: string[]; categoryLabel: string | null; area: string | null; services?: unknown;
}): Keyword[] {
  const out: Keyword[] = [];
  const seen = new Set<string>();
  const push = (keyword: string, source: KeywordSource) => {
    const k = keyword.trim().toLowerCase();
    if (k && k.length <= 40 && !seen.has(k) && k !== o.name.toLowerCase()) { seen.add(k); out.push({ keyword: keyword.trim(), source }); }
  };
  for (const s of o.searchTerms.slice(0, 5)) push(s, "search");
  const label = o.categoryLabel?.toLowerCase();
  if (label && o.area) push(`${label} in ${o.area}`, "category");
  if (label) push(label, "category");
  const services = typeof o.services === "string" ? o.services.split(/[,;\n]/) : [];
  for (const s of services.slice(0, 3)) push(s, "owner");
  return out.slice(0, 10);
}
