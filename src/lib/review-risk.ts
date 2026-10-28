// Review risk levels on the screens (K-13, P0.3-03). The words come from supabase/functions/_shared/ai/risk.ts, which
// the server uses for the emails; tests/review-risk.test.ts keeps the two equal.
export type Risk = "low" | "medium" | "high";

export const RISK_ISSUES: Record<string, { level: Risk; issue: string }> = {
  legal_threat: { level: "high", issue: "They mention a lawyer or legal action." },
  discrimination: {
    level: "high",
    issue: "They say they were treated unfairly because of who they are.",
  },
  health_safety: {
    level: "high",
    issue: "They describe an illness, an injury, an allergy or a safety problem.",
  },
  threat: { level: "high", issue: "The review contains a threat." },
  harassment: { level: "high", issue: "They describe harassment." },
  privacy: { level: "high", issue: "They mention their personal data or privacy." },
  regulator: {
    level: "high",
    issue: "They mention a regulator, an inspection or a report to the authorities.",
  },
  crime: { level: "high", issue: "They accuse someone of a crime." },
  staff_named: { level: "high", issue: "They name someone on your team in a complaint." },
  refund: { level: "medium", issue: "They mention a refund. Kabsi didn't promise one." },
  staff_complaint: {
    level: "medium",
    issue: "They complain about someone on your team. The reply names no one.",
  },
  disputed_fact: {
    level: "medium",
    issue:
      "They say something about your business that may not be right. The reply doesn't confirm or deny it.",
  },
  complaint: {
    level: "medium",
    issue: "They are unhappy with their experience. The reply stays calm and doesn't argue.",
  },
  low_rating: {
    level: "medium",
    issue: "They gave a low rating. The reply stays calm and doesn't argue.",
  },
  regulated_industry: {
    level: "medium",
    issue:
      "Your business is in health, legal or financial services, so the reply never confirms they were a patient or client.",
  },
};

export const HIGH_RISK_TITLE = "This review needs a little more care.";
export const HIGH_RISK_CHECKLIST = [
  "Don't reply straight away. A calm reply later is better than a quick one now.",
  "Check what happened with your team, in private.",
  "If it mentions an illness, an injury or legal action, speak to your insurer or adviser before you reply.",
  "Never share the customer's details or discuss what happened in public.",
  "When you are ready, write your own reply, or ask Kabsi for a short, neutral holding reply.",
];

const RANK: Record<Risk, number> = { low: 0, medium: 1, high: 2 };
const KEYS = Object.keys(RISK_ISSUES);
const rankOf = (k: string) => RANK[RISK_ISSUES[k]?.level ?? "low"];

/** The sentences shown on top of a medium or high review, the same choice as the server's issueLines. */
export function issueLines(reasons: readonly string[] | null | undefined, max = 2): string[] {
  const known = [...new Set((reasons ?? []).filter((k) => k in RISK_ISSUES))].sort(
    (a, b) => rankOf(b) - rankOf(a) || KEYS.indexOf(a) - KEYS.indexOf(b),
  );
  const specific = known.filter((k) => k !== "low_rating" && k !== "regulated_industry");
  const pick = [
    ...(specific.length ? specific : known.filter((k) => k === "low_rating")),
    ...known.filter((k) => k === "regulated_industry"),
  ];
  return pick.slice(0, max).map((k) => RISK_ISSUES[k]?.issue ?? "");
}

/** High first, then medium, then low. */
export const riskRank = (r: string | null | undefined) => RANK[(r as Risk) ?? "low"] ?? 0;
