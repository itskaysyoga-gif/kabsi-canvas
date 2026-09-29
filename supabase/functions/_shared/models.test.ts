// Run: deno test supabase/functions/_shared/models.test.ts
import assert from "node:assert/strict";
import { MODELS, shouldFallBack } from "./models.ts";

Deno.test("drafting defaults to Sonnet 5.5 with Sonnet 5 as fallback, checks stay on Haiku", () => {
  assert.equal(MODELS.draft, "claude-sonnet-5-5");
  assert.equal(MODELS.fallback, "claude-sonnet-5");
  assert.equal(MODELS.check, "claude-haiku-4-5-20251001");
});

Deno.test("fall back only for unavailable-model errors", () => {
  for (const s of [404, 429, 500, 502, 503, 529]) assert.equal(shouldFallBack(s), true, String(s));
  for (const s of [400, 401, 403, 413, undefined]) assert.equal(shouldFallBack(s), false, String(s));
});
