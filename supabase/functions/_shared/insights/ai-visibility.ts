// Insights, AI Visibility part (master plan 28.6, 27.3 item 2): the sources AI answers cited, turned into actions the
// owner can say yes to. "A list on timeout.com names three of your competitors." States what the answers cited, never a
// cause and never a promise (K-144). Pure; the numbers come from visibility/ai/numbers.ts.
import type { DoneRun } from "../visibility/ai/numbers.ts";

export type SourceAction = { domain: string; title: string; competitors: string[]; answers: number; text: string; detail: string };

// Not a page a business can be added to.
const SKIP = /(^|\.)(google|googleapis|gstatic|youtube|bing|wikipedia|reddit)\.[a-z.]+$/i;

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const count = (n: number) => WORDS[n] ?? String(n);

/** Up to `limit` actions, the source naming the most competitors first. Only answers that did not name the business count against it. */
export function sourceActions(runs: DoneRun[], o: { ownDomain?: string | null; limit?: number } = {}): SourceAction[] {
  const by = new Map<string, { domain: string; title: string; competitors: Set<string>; answers: number }>();
  for (const r of runs) {
    if (r.named || !r.competitors.length) continue;
    for (const s of r.sources) {
      if (SKIP.test(s.domain) || (o.ownDomain && s.domain === o.ownDomain.replace(/^www\./, ""))) continue;
      const cur = by.get(s.domain) ?? { domain: s.domain, title: s.title, competitors: new Set<string>(), answers: 0 };
      cur.answers++;
      for (const c of r.competitors) cur.competitors.add(c.name);
      if (!cur.title && s.title) cur.title = s.title;
      by.set(s.domain, cur);
    }
  }
  return [...by.values()]
    .filter((s) => s.competitors.size >= 1)
    .sort((a, b) => b.competitors.size - a.competitors.size || b.answers - a.answers || a.domain.localeCompare(b.domain))
    .slice(0, o.limit ?? 3)
    .map((s) => {
      const list = /\b(best|top|list|guide|\d+)\b/i.test(s.title) || !s.title;
      const n = s.competitors.size;
      return {
        domain: s.domain, title: s.title, competitors: [...s.competitors], answers: s.answers,
        text: `${list ? "A list" : "A page"} on ${s.domain} names ${n === 1 ? "one of your competitors" : `${count(n)} of your competitors`}.`,
        detail: `AI assistants cited it in ${s.answers} ${s.answers === 1 ? "answer" : "answers"} that did not name you. Ask the site to include your business, or make sure your listing there is right.`,
      };
    });
}
