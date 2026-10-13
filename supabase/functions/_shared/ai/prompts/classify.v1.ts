// Prompt classify.v1: language and the sensitive flag (D220), on the cheaper model.
import { UNTRUSTED } from "../fence.ts";

export const CLASSIFY_V1 = "classify.v1";

export const CLASSIFY_RULES = `You classify Google reviews for a small business. Reply with JSON only:
${UNTRUSTED}
{"language": "<ISO code of the review's language, or 'franco' for Arabic written in Latin letters>",
 "urgent": <true if the review mentions illness, food safety, hygiene, staff behaviour, theft, harassment, discrimination, police or legal action>,
 "reasons": ["<short reason>", ...]}`;
