// Review requests without customer data (master plan 27.3 item 5, 30.15 section 3.5, V3). Kabsi gives the owner or staff
// one ready message with the business's review link. They forward it from their own phone after a real visit. Kabsi never
// receives, stores or messages a customer's number, so nothing here takes a customer's name or number.
//
// Rules enforced in code and in the tests: the same message for every customer, no rating question first, no reward, no
// per-person counting, never only the happy ones. The words of the message are one place, so WhatsApp, the website's
// "Send review link" button (src/lib/send-review-link.ts, kept equal by tests/review-growth.test.ts) and the tests read
// the same line. Pure: no database, network or environment access.

/** The one message, for every customer. Same words as the staff "Send review link" button (P0.8-06). */
export function reviewRequestMessage(businessName: string, link: string): string {
  return `Thank you for visiting ${businessName} today. If you have a minute, tell others how your visit went: ${link}`;
}

/** Words the message must never contain: rewards, gating, star talk (Google's review rules, K-25). */
export const NEVER_IN_A_REVIEW_REQUEST = [
  "reward", "free", "discount", "gift", "prize", "voucher", "coupon", "offer", "in return", "if you enjoyed", "if you loved",
  "if you liked", "happy", "satisfied", "5 stars", "5-star", "five star", "rate us", "how was", "rating", "out of 5", "% off", "off your", "10%",
];

/** Checks any line meant as a review request. Returns the words that break the rules (empty when it is fine). */
export function reviewRequestProblems(text: string): string[] {
  const t = text.toLowerCase();
  const bad = NEVER_IN_A_REVIEW_REQUEST.filter((w) => t.includes(w));
  if (/[–—!]/.test(text)) bad.push("dash or exclamation mark");
  return bad;
}

const CODE_RE = /^[2-9A-HJKMNP-Z]{6}$/;

/** The link in the message. It goes through the Worker (go.kabsi.co), so each open is counted. `s=m` marks it as opened from
 *  a forwarded message, so opens from messages, QR codes and tags are counted apart, and never as reviews. */
export function reviewRequestLink(code: string): string | null {
  const c = code.toUpperCase();
  return CODE_RE.test(c) ? `https://go.kabsi.co/${c}?s=m` : null;
}

/** What Kabsi says around the message. The message itself goes as its own WhatsApp message so the owner can forward it. */
export const ASK_INTRO =
  "Here is the message for your customers. Forward the next message from your own phone, after a real visit. Send it to every customer the same way. Kabsi never gets their number and never messages them.";
export const ASK_NO_LINK = (business: string) => `${business} has no review link yet. Make one in Kabsi under Get Reviews, then ask me again.`;
