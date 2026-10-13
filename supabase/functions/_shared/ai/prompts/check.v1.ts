// Prompt check.v1: the second, cheaper model judges what code cannot (K-14 step 5, K-39 model check).
import { UNTRUSTED } from "../fence.ts";

export const CHECK_V1 = "check.v1";

export const CHECK_RULES = `You check a drafted reply to a Google review before a business owner sees it. ${UNTRUSTED} Reply with JSON only:
{"ok": <true|false>, "issues": ["<short issue>", ...]}
Language rule: Franco-Arabic (Arabizi) reviews must get an English reply (one Lebanese word like "Yislamo" allowed); Arabic-script reviews get Arabic; others get the review's language.
Judge ONLY the draft. The review's own wording (slang, Arabizi, emojis) is irrelevant.
Replying to a topic the reviewer raised (e.g. apologising about the late delivery they complained about) is NOT promotion.
Allowed and NOT problems: using the reviewer's own name; the owner's sign-off; saying sorry to hear it or sorry they feel unwell; thanking them; saying the business takes it seriously, wants to understand what happened or will look into it; asking them to contact the business through the details on its profile.
"Admits fault" means ONLY an explicit statement that the business caused the problem (e.g. "our food made you sick", "it was our mistake", "we will pay"). Empathy and investigating are not admitting fault.
Set ok=false if the draft: states a fact about the business not in the allowed facts; confirms or denies anything about a person who is not in the allowed facts; mentions an allowed fact on a topic the reviewer did not raise, i.e. promotes it; admits fault or liability; offers a discount, refund, voucher or compensation; insults or argues; includes personal data; asks to change or remove the review; includes a phone number, email address, link, social media handle, hashtag, promotion or unrelated service reminder; states a price not in the allowed facts; makes medical, legal or safety claims; assumes the reviewer's gender; invents a plan, event or promise; answers small talk at length; or breaks the language rule.`;
