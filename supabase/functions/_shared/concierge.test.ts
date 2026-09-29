// Run: deno test supabase/functions/_shared/concierge.test.ts
import assert from "node:assert/strict";
import { isConciergeLocationId, matchConciergeReview } from "./concierge.ts";

Deno.test("isConciergeLocationId", () => {
  assert.equal(isConciergeLocationId("locations/concierge-5cb0205e-25db-47b2-9d4b-2c4a526161f9"), true);
  for (const v of ["locations/mock-9803ee99", "locations/123456", "accounts/concierge", "", null, undefined]) {
    assert.equal(isConciergeLocationId(v), false, String(v));
  }
});

const cand = (id: string, reviewer: string, rating: number, createdAt: string) => ({ id, reviewer, rating, createdAt });
const g = { reviewer: "Sam R.", rating: 4, createTime: "2026-10-05T10:00:00Z" };

Deno.test("matchConciergeReview: one clear match", () => {
  const list = [cand("a", "sam r", 4, "2026-10-04T12:00:00Z"), cand("b", "Jo", 4, "2026-10-05T12:00:00Z")];
  assert.equal(matchConciergeReview(g, list)?.id, "a");
});

Deno.test("matchConciergeReview: no match on stars, name or a date more than two days away", () => {
  assert.equal(matchConciergeReview(g, [cand("a", "Sam R.", 5, "2026-10-05T12:00:00Z")]), null);
  assert.equal(matchConciergeReview(g, [cand("a", "Sam", 4, "2026-10-05T12:00:00Z")]), null);
  assert.equal(matchConciergeReview(g, [cand("a", "Sam R.", 4, "2026-10-01T12:00:00Z")]), null);
});

Deno.test("matchConciergeReview: two candidates means no match", () => {
  const list = [cand("a", "Sam R.", 4, "2026-10-04T12:00:00Z"), cand("b", "sam r", 4, "2026-10-06T08:00:00Z")];
  assert.equal(matchConciergeReview(g, list), null);
});

Deno.test("matchConciergeReview: accents and punctuation are ignored", () => {
  assert.equal(matchConciergeReview({ ...g, reviewer: "Élise M." }, [cand("a", "elise m", 4, "2026-10-05T09:00:00Z")])?.id, "a");
});
