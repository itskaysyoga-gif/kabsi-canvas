// The numbers of AI Visibility (master plan 27.3 item 2, 28.6 Scout): the share of runs that name the business over the
// period, its trend, the competitors named most and the sources cited most. Always a sample: AI answers change from run
// to run, so nothing here is a ranking or a promise (K-144). Pure.
import type { CompetitorNamed } from "./analyze.ts";
import type { AiSource } from "./providers.ts";

export const SAMPLE_LABEL = "One sample. AI answers change from run to run.";

export type DoneRun = {
  provider: string; run_at: string; named: boolean; position: number | null; competitors: CompetitorNamed[]; sources: AiSource[];
};
export type Trend = { direction: "up" | "down" | "same" | "none"; points: number };
export type AiNumbers = {
  runs: number; named: number; share: number | null; trend: Trend;
  topCompetitors: { name: string; count: number }[]; topSources: { domain: string; title: string; count: number }[];
  byProvider: { provider: string; runs: number; named: number }[];
};

const share = (named: number, runs: number) => (runs ? Math.round((named / runs) * 100) : null);

/** The period's numbers and the trend against the period before it (runs the same length just earlier). */
export function numbers(runs: DoneRun[], period: { from: Date; to: Date }): AiNumbers {
  const len = period.to.getTime() - period.from.getTime();
  const prevFrom = period.from.getTime() - len;
  const inside = runs.filter((r) => { const t = new Date(r.run_at).getTime(); return t >= period.from.getTime() && t < period.to.getTime(); });
  const before = runs.filter((r) => { const t = new Date(r.run_at).getTime(); return t >= prevFrom && t < period.from.getTime(); });
  const named = inside.filter((r) => r.named).length;
  const now = share(named, inside.length), then = share(before.filter((r) => r.named).length, before.length);
  let trend: Trend = { direction: "none", points: 0 };
  if (now != null && then != null) {
    const d = now - then;
    // Five points either way is noise in a sample this small.
    trend = { direction: d >= 5 ? "up" : d <= -5 ? "down" : "same", points: d };
  }
  const comp = new Map<string, number>();
  const src = new Map<string, { domain: string; title: string; count: number }>();
  for (const r of inside) {
    for (const n of new Set(r.competitors.map((c) => c.name))) comp.set(n, (comp.get(n) ?? 0) + 1);
    for (const s of r.sources) {
      const k = `${s.domain}|${s.title}`;
      const cur = src.get(k) ?? { ...s, count: 0 };
      cur.count++;
      src.set(k, cur);
    }
  }
  const byProvider = new Map<string, { provider: string; runs: number; named: number }>();
  for (const r of inside) {
    const p = byProvider.get(r.provider) ?? { provider: r.provider, runs: 0, named: 0 };
    p.runs++;
    if (r.named) p.named++;
    byProvider.set(r.provider, p);
  }
  const top = <T extends { count: number }>(m: Map<string, T>, n: number) => [...m.values()].sort((a, b) => b.count - a.count).slice(0, n);
  return {
    runs: inside.length, named, share: now, trend,
    topCompetitors: [...comp].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 5),
    topSources: top(src, 5),
    byProvider: [...byProvider.values()],
  };
}

// ─── the owner's line (docs/COPY.md 0.1, 2, 19; the sender is the whatsapp sender interface) ─────────────────────
export type PeriodWords = "this month" | "in the last 2 weeks" | "this week";

/**
 * "AI assistants named you in 2 of 6 answers this month. They named Harbor Bakes in 5." then the sample label.
 * Null when there is nothing to say yet.
 */
export function ownerLine(n: AiNumbers, when: PeriodWords = "this month"): string | null {
  if (!n.runs) return null;
  const answers = n.runs === 1 ? "1 answer" : `${n.runs} answers`;
  const first = n.named
    ? `AI assistants named you in ${n.named} of ${n.runs} answers ${when}.`
    : `AI assistants did not name you in ${n.runs === 1 ? "the 1 answer" : `any of ${answers}`} ${when}.`;
  const rivals = n.topCompetitors.slice(0, 2);
  const second = rivals.length === 0 ? null : rivals.length === 1
    ? `They named ${rivals[0].name} in ${rivals[0].count}.`
    : `They named ${rivals[0].name} in ${rivals[0].count} and ${rivals[1].name} in ${rivals[1].count}.`;
  return [first, second, SAMPLE_LABEL].filter(Boolean).join(" ");
}

/** The report's block: the line plus the structured numbers the dashboard and the PDF draw from. */
export function reportBlock(n: AiNumbers, when: PeriodWords = "this month") {
  return {
    heading: "AI answers",
    section: "From public Google Maps and AI checks by Kabsi",
    label: "A sample",
    sample_note: SAMPLE_LABEL,
    line: ownerLine(n, when),
    named: n.named, runs: n.runs, share: n.share, trend: n.trend,
    competitors: n.topCompetitors, sources: n.topSources, providers: n.byProvider,
  };
}
