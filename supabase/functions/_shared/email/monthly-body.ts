// The monthly report email (PROOF-2): the three bands in order, Work done, Results, What is next, then the recurring feedback and
// the nearby totals only when there is something to say. The words come from monthly-report/compose.ts (reportLines), the same
// lines the page and the message use, so the three never differ. Nothing says Kabsi caused a review, a ranking or revenue. No
// review text and no reviewer names (K-113.3). Pure, so a test can read it.
import { card, chips, esc, label, para } from "../email-layout.ts";
import { type MonthlyReport, monthlyText, type Nearby, NEARBY_NOTE, monthSubject, reportLines } from "../monthly-report/compose.ts";
import { TOKENS } from "./tokens.ts";

export type RenderedMonthly = { html: string; text: string; preheader: string; subject: string; button: { label: string; path: string } };

const lines = (l: string[]) => l.map(esc).join("<br>");

export function renderMonthly(r: MonthlyReport, nearby: Nearby | null = null): RenderedMonthly {
  const l = reportLines(r, nearby);
  const parts: string[] = [];
  parts.push(para(`<strong>${esc(r.business)}</strong> · ${esc(r.label)}`, { muted: true }));

  parts.push(label("Work done"));
  if (r.work.did.length) parts.push(chips(r.work.did.map((c) => ({ label: c.label, count: c.count, status: "ok" as const }))));
  const rest = r.work.did.length ? r.work.found : l.work;
  if (rest.length) parts.push(para(lines(rest)));

  parts.push(label("Results"));
  parts.push(para(lines(l.results)));

  if (l.feedback.length) parts.push(card({ label: "What customers mention", html: lines(l.feedback) }));
  if (l.nearby.length) {
    parts.push(card({ label: "Nearby businesses", html: `${lines(l.nearby)}<br><span class="kb-t2" style="font-size:14px;color:${TOKENS.stone};">${esc(NEARBY_NOTE)}</span>` }));
  }
  parts.push(card({ label: "What is next", marker: "👉", html: lines(l.next.length ? l.next : ["Nothing needs you right now."]) }));

  const preheader = r.work.total
    ? `${r.label}: Kabsi did ${r.work.total} ${r.work.total === 1 ? "thing" : "things"} for your Google profile. ${l.next.length ? "One next step inside." : "Nothing needs you."}`
    : `${r.label}: a quiet month. ${l.next.length ? "One next step inside." : "Nothing needs you."}`;
  return { html: parts.join(""), text: monthlyText(r, nearby), preheader, subject: monthSubject(r), button: { label: "Open your report", path: "/app/report" } };
}
