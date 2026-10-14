// What the review pipeline does with a risk level (K-13, P0.3-03), kept pure so the tests read exactly what happens:
// whether a draft is written, which reviews are emailed right away, and the guidance email for a high-risk review.
import { esc } from "./email-layout.ts";
import { HIGH_RISK_CHECKLIST, HIGH_RISK_TITLE, issueLines, type Risk } from "./ai/risk.ts";

/** High risk gets no draft; the holding reply comes only when the owner asks, and a new version of it stays a holding
 *  reply. An instruction on a high-risk review with no reply yet is refused: there is nothing to change. */
export function riskPlan(o: { risk: Risk; holding?: boolean; hasDraft: boolean; instruction?: string }): "draft" | "holding" | "no_draft" {
  if (o.risk !== "high") return "draft";
  if (o.holding || o.hasDraft) return "holding";
  if (o.instruction) throw new Error("high_risk_no_draft");
  return "no_draft";
}

/** D220 adapted to K-13: medium and high reviews are emailed one by one, right away; low ones wait for the digest. */
export const instantEmail = (r: { risk: string }) => r.risk !== "low";

/** The guidance email for a high-risk review: what Kabsi noticed and the checklist. No draft and no link that changes
 *  anything; the layout's one button opens Kabsi. */
export function highRiskBlock(r: { risk_reasons: string[] | null }, reviewHtml: string) {
  const issues = issueLines(r.risk_reasons ?? []);
  const steps = HIGH_RISK_CHECKLIST.map((c) => `<li style="margin:0 0 6px 0;">${esc(c)}</li>`).join("");
  return {
    html: reviewHtml + (issues.length ? `<p style="margin:0 0 12px 0;">${issues.map(esc).join("<br>")}</p>` : "") +
      `<p style="margin:0 0 8px 0;"><strong>${esc(HIGH_RISK_TITLE)}</strong> Kabsi did not draft a reply.</p><ol style="margin:0 0 16px 0;padding-left:20px;">${steps}</ol>`,
    text: `${issues.join("\n")}\n\n${HIGH_RISK_TITLE} Kabsi did not draft a reply.\n${HIGH_RISK_CHECKLIST.map((c, i) => `${i + 1}. ${c}`).join("\n")}`.trim(),
  };
}
