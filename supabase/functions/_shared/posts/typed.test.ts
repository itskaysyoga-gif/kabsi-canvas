// Run: deno test supabase/functions/_shared/posts/typed.test.ts
import assert from "node:assert/strict";
import { checkTypedPost } from "./typed.ts";

Deno.test("a typed post keeps the owner's words in the house style", () => {
  assert.deepEqual(checkTypedPost("New cakes this weekend! Come by — we open early!!"), { ok: true, text: "New cakes this weekend. Come by, we open early." });
});

Deno.test("a typed post with a phone number, a link, a handle or a hashtag is refused", () => {
  for (const t of ["Call us on +1 555 010 4477 for orders", "See www.example.com for the menu", "Follow @cornerloaf for news", "Fresh bread today #bakery"]) {
    const r = checkTypedPost(t);
    assert.equal(r.ok, false, t);
  }
});

Deno.test("too short or too long is refused", () => {
  assert.equal(checkTypedPost("Hi").ok, false);
  assert.equal(checkTypedPost("a".repeat(1501)).ok, false);
});
