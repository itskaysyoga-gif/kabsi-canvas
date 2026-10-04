// Run: deno test supabase/functions/_shared/demo.test.ts
import assert from "node:assert/strict";
import { DEMO_PREFIX, googleModeFor, isDemoLocationId } from "./demo.ts";

Deno.test("isDemoLocationId", () => {
  assert.equal(isDemoLocationId(`${DEMO_PREFIX}harbour-lane-coffee`), true);
  for (const v of ["locations/mock-9803ee99", "locations/concierge-5cb0205e", "locations/123456", "accounts/demo", "", null, undefined]) {
    assert.equal(isDemoLocationId(v), false, String(v));
  }
});

Deno.test("a demo business is always mock, whatever the global mode says (R-17)", () => {
  assert.equal(googleModeFor("locations/demo-juniper-hair-studio", "live"), "mock");
  assert.equal(googleModeFor("locations/demo-juniper-hair-studio", "mock"), "mock");
  assert.equal(googleModeFor("locations/123456", "live"), "live");
  assert.equal(googleModeFor("locations/mock-9803ee99", "mock"), "mock");
  assert.equal(googleModeFor(null, "live"), "live");
});
