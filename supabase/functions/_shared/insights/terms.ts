// Search terms (P0.5-05, K-138): the words people searched before they saw the profile, from the Performance API's
// monthly keyword impressions. Google sends a threshold instead of a value for small counts, and Kabsi shows that as
// "fewer than N", never as a number (K-26). Nothing here is stored.
export type RawTerm = { searchKeyword?: string; insightsValue?: { value?: string; threshold?: string } };
export type Term = { term: string; count: number | null; fewer_than: number | null };

const MAX_TERMS = 10;
const MAX_LENGTH = 80;

export function normaliseTerms(raw: RawTerm[]): Term[] {
  const seen = new Map<string, Term>();
  for (const r of raw) {
    const term = String(r.searchKeyword ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_LENGTH);
    if (!term) continue;
    const value = r.insightsValue?.value;
    const threshold = r.insightsValue?.threshold;
    let row: Term;
    if (value !== undefined && Number.isFinite(Number(value))) row = { term, count: Number(value), fewer_than: null };
    else if (threshold !== undefined && Number.isFinite(Number(threshold))) row = { term, count: null, fewer_than: Number(threshold) };
    else continue;
    const key = term.toLowerCase();
    const have = seen.get(key);
    // A repeated term keeps the row with a real count.
    if (!have || (have.count === null && row.count !== null)) seen.set(key, row);
  }
  return [...seen.values()]
    .sort((a, b) => (b.count ?? -1) - (a.count ?? -1) || a.term.localeCompare(b.term))
    .slice(0, MAX_TERMS);
}

/** How a row reads on screen. */
export function termCountText(t: Term): string {
  return t.count !== null ? String(t.count) : `fewer than ${t.fewer_than}`;
}
