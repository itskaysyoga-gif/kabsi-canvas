// Run: deno test --no-check supabase/functions/_shared/free-reply.test.ts
// SITE-3 (free check step 4): the latest review and the reply Kabsi would write (a fixed template, no model call).
import assert from "node:assert/strict";
import fx from "../../../tests/fixtures/google/places.get.reviews.json" with { type: "json" };
import type { PlaceReview } from "./google/types.ts";
import { firstName, latestReview, REVIEW_SHOWN_MAX, templateReply, truncate } from "./free-reply.ts";
import { CONTACT_LINE } from "./ai/prompts/reply.v4.ts";
import { STOCK_PHRASES } from "./ai/checks.ts";

const REVIEWS = fx.reviews as PlaceReview[];
const review = (o: Partial<PlaceReview>): PlaceReview => ({ rating: 5, text: { text: "Great bread." }, publishTime: "2026-11-01T10:00:00Z", ...o });

Deno.test("the newest review with words: stars, text, reply and the author; one with no text is skipped", () => {
  // The fixture's newest review (22 Nov) has no text, so the 15 Nov one is shown.
  const r = latestReview({ reviews: REVIEWS })!;
  assert.deepEqual(Object.keys(r).sort(), ["author", "reply", "stars", "text"]);
  assert.equal(r.stars, 2);
  assert.match(r.text, /^Waited 25 minutes/);
  assert.equal(r.author, "Maya Haddad");
  assert.match(r.reply, /^Thank you for writing this, Maya\./);
});

Deno.test("no review with words, no rating or no reviews at all: no latest review", () => {
  assert.equal(latestReview({}), null);
  assert.equal(latestReview({ reviews: [] }), null);
  assert.equal(latestReview({ reviews: [review({ text: { text: "   " } }), review({ text: undefined })] }), null);
  assert.equal(latestReview({ reviews: [review({ rating: undefined })] }), null);
});

Deno.test("a review in Arabic script is skipped (R-61: no Arabic on Kabsi's public pages)", () => {
  const r = latestReview({ reviews: [review({ text: { text: "خبز رائع" }, publishTime: "2026-11-20T00:00:00Z" }), review({ text: { text: "Lovely." } })] })!;
  assert.equal(r.text, "Lovely.");
});

Deno.test("the text is cut to about 280 characters at a word, with an ellipsis", () => {
  const long = "word ".repeat(120).trim();
  const t = truncate(long);
  assert.ok(t.length <= REVIEW_SHOWN_MAX, String(t.length));
  assert.ok(t.endsWith("word…"));
  assert.equal(truncate("Short and sweet."), "Short and sweet.");
  const r = latestReview({ reviews: [review({ text: { text: long } })] })!;
  assert.ok(r.text.length <= REVIEW_SHOWN_MAX);
});

Deno.test("the template: thanks by first name when it looks like one, an apology and the contact line for 1 to 3 stars", () => {
  for (const stars of [1, 2, 3]) {
    const t = templateReply(stars, "Maya Haddad");
    assert.match(t, /^Thank you for writing this, Maya\. We are sorry/);
    assert.ok(t.toLowerCase().includes(CONTACT_LINE));
  }
  for (const stars of [4, 5]) {
    const t = templateReply(stars, "Sam Carter");
    assert.equal(t, "Thank you, Sam. We are glad you took the time to write this, and we hope to see you again.");
  }
  // A generic or odd name is not used.
  for (const n of ["A Google user", "user12345", "j.", "", null, "ماي", "THE BEST"]) assert.equal(firstName(n), null, String(n));
  assert.match(templateReply(5, "A Google user"), /^Thank you\. We are glad/);
});

Deno.test("the template keeps the house rules: no dashes, no exclamation marks, no money, no stock phrases", () => {
  for (const stars of [1, 2, 3, 4, 5]) {
    for (const name of ["Maya", null]) {
      const t = templateReply(stars, name);
      assert.doesNotMatch(t, /[—–!]/);
      assert.doesNotMatch(t, /refund|discount|voucher|free|\d/i);
      for (const p of STOCK_PHRASES) assert.ok(!t.toLowerCase().includes(p), p);
    }
  }
});
