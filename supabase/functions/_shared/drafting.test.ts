// Run: deno test supabase/functions/_shared/drafting.test.ts
// P0.1-04: Google's rules for replies and posts (K-113.4, K-14, K-116.3, K-116.4), no review-derived keywords
// (K-113.3) and the review length cap (K-99.5, R-21).
import assert from "node:assert/strict";
import { checkDraft, draftReply, fenceReview, REVIEW_MAX, replySystem } from "./ai.ts";
import { contactIssues } from "./contact.ts";
import { buildKeywords } from "./keywords.ts";

const SEVEN_DIGITS = /(?:\p{Nd}[\s().\/-]*){7,}/u;
const card = { contact_phone: "+961 3 956 917", signature: "Yawmiyati team", about: "A bakery in Beirut." };
const askNumber = { reviewer: "Maya", rating: 2, comment: "Bread was stale. What's your number? I want to talk to someone." };

Deno.test("a review that asks for the number gets a draft with no run of 7 or more digits", async () => {
  // The stub answers the way a model would: with any phone number it was given.
  const seen: string[] = [];
  const send = (system: string, user: string) => {
    seen.push(system + user);
    const phone = (system + user).match(/\+?\d[\d ]{6,}\d/)?.[0];
    return Promise.resolve({ text: phone ? `Sorry Maya, please call us on ${phone}.` : "Sorry to hear this, Maya. Please contact us through the details on our profile.\nYawmiyati team", model: "stub" });
  };
  const out = await draftReply({ review: askNumber, business: "Yawmiyati", card, language: "en", urgent: true }, send);
  assert.ok(!SEVEN_DIGITS.test(out.text), out.text);
  assert.ok(!seen.join("").includes("956 917"), "the phone number never reaches the model");
});

Deno.test("an unhappy reviewer is pointed to the details on the profile", () => {
  const system = replySystem({ review: askNumber, business: "Yawmiyati", card, language: "en", urgent: true });
  assert.match(system, /please contact us through the details on our profile/i);
  assert.ok(!/may use the phone|Phone for customers/i.test(system));
});

Deno.test("the code check blocks a reply with contact details before any model call", async () => {
  for (const draft of [
    "Sorry Maya, call us on 03 956 917.", "Write to us at hello@yawmiyati.com.", "See www.yawmiyati.com for more.",
    "Follow us @yawmiyati.", "Thanks Maya #bakery", "Our loaf is $4 now.",
  ]) {
    const r = await checkDraft({ review: askNumber, draft, card });
    assert.equal(r.ok, false, draft);
    assert.equal(r.model, "code", draft);
  }
});

Deno.test("a post draft with 'call 555 0100' fails the check", () => {
  assert.ok(contactIssues("Fresh bread every morning. call 555 0100 to order.", { allowedText: "" }).length > 0);
});

Deno.test("posts and replies: emails, links, handles and hashtags fail; plain text and times pass", () => {
  const bad = ["mail info@shop.co", "https://shop.example", "visit shop.com today", "DM @shopname", "#freshbread daily", "١٢٣٤٥٦٧٨ call"];
  for (const t of bad) assert.ok(contactIssues(t, { allowedText: "" }).length > 0, t);
  const good = ["Open 8am to 6pm, closed on 25 Dec 2026.", "Our #1 tip: come early.", "Thanks for 5 stars, Maya.", "Since 1998."];
  for (const t of good) assert.deepEqual(contactIssues(t, { allowedText: "" }), [], t);
});

Deno.test("a price is allowed only when the facts carry it", () => {
  assert.ok(contactIssues("A loaf is $4.", { allowedText: "" }).length > 0);
  assert.deepEqual(contactIssues("A loaf is $4.", { allowedText: "Prices: loaf $4, cake $20" }), []);
  assert.ok(contactIssues("Lunch for 15 USD.", { allowedText: "Prices: loaf $4" }).length > 0);
});

Deno.test("a 10,000-character review is fenced at 4,096 characters", () => {
  assert.equal(REVIEW_MAX, 4096);
  const fenced = fenceReview({ reviewer: "Long", rating: 3, comment: "a".repeat(10_000) });
  const inner = fenced.split("\n").slice(1, -1).join("\n");
  assert.equal(inner.length, 4096);
});

Deno.test("keyword suggestions never come from reviews", () => {
  const out = buildKeywords({ name: "Yawmiyati", searchTerms: ["fresh bread beirut"], categoryLabel: "Bakery", area: "Hamra", services: "Manakish, cakes; sourdough" });
  assert.ok(out.length > 0);
  for (const k of out) assert.notEqual(k.source as string, "reviews");
  assert.deepEqual(out.map((k) => k.source), ["search", "category", "category", "owner", "owner", "owner"]);
});
