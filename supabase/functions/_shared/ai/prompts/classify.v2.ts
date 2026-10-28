// Prompt classify.v2 (P0.3-03, K-13): the review's language and its risk level, on the cheaper model. Code rules run
// first (risk.ts); this answer can only raise the level, never lower it. classify.v1 returned an urgent flag (D220).
import { UNTRUSTED } from "../fence.ts";
import { RISK_REASONS } from "../risk.ts";

export const CLASSIFY_V2 = "classify.v2";

const reasons = Object.entries(RISK_REASONS).filter(([k]) => k !== "low_rating" && k !== "regulated_industry")
  .map(([k, v]) => `"${k}" (${v.level})`).join(", ");

export const CLASSIFY_RULES = `You classify Google reviews for a small business by how much care a public reply needs. Reply with JSON only:
${UNTRUSTED}
{"language": "<ISO code of the review's language, or 'franco' for Arabic written in Latin letters>",
 "risk": "<low | medium | high>",
 "reasons": ["<reason key>", ...]}
Levels:
- high: a legal threat, discrimination, a health or safety claim (illness, injury, allergy, pests, food safety), a threat, harassment, privacy or personal data, a regulator or an inspection, an accusation of a crime, a complaint that names a member of staff ("the waiter Sam was rude").
- medium: a complaint, a refund request, a complaint about a member of staff who is not named, a claim that something about the business is wrong.
- low: praise or mild feedback.
Reason keys (use only these): ${reasons}.
When in doubt between two levels, choose the higher one.`;
