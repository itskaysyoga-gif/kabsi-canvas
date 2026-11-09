// Tidy 1 (R-143 item 3): card checkout is offered only to a business whose Google access works.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { ACCESS_FIRST_LINE, type AccessRow, accessWorks } from "./billing-access.ts";

const working: AccessRow = {
  is_demo: false, concierge: false, google_location_id: "locations/123", access_granted_at: "2026-11-01T09:00:00Z",
  access_state: "granted", voice_of_merchant: true,
};

Deno.test("Tidy 1: access works only when every part of the trial's own test holds", () => {
  assertEquals(accessWorks([working]), true);
  const broken: [string, AccessRow][] = [
    ["a connection that is not granted", { ...working, access_state: "pending" }],
    ["a connection that was lost", { ...working, access_state: "lost" }],
    ["a connection in error", { ...working, access_state: "error" }],
    ["no connection row", { ...working, access_state: null }],
    ["a profile Google does not show as verified", { ...working, voice_of_merchant: false }],
    ["a profile whose verification is not known", { ...working, voice_of_merchant: null }],
    ["no access time", { ...working, access_granted_at: null }],
    ["no Google location", { ...working, google_location_id: null }],
    ["a demo location", { ...working, is_demo: true }],
    ["a concierge location", { ...working, concierge: true }],
    ["a concierge Google location id (private.is_concierge_gid)", { ...working, google_location_id: "locations/concierge-7" }],
  ];
  for (const [name, row] of broken) assertEquals(accessWorks([row]), false, name);
});

Deno.test("Tidy 1: a business with no location, or none that works, cannot reach checkout; one that works can", () => {
  assertEquals(accessWorks([]), false);
  assertEquals(accessWorks([{ ...working, access_state: "none" }, { ...working, voice_of_merchant: false }]), false);
  assertEquals(accessWorks([{ ...working, access_state: "none" }, working]), true, "any one working location is enough");
});

Deno.test("Tidy 1: the refusal line is plain, says nothing is charged, and has no dash or exclamation mark", () => {
  assertEquals(ACCESS_FIRST_LINE, "You can choose a plan once Kabsi's access to your Google profile works. Nothing is charged before then.");
  assert(!/[–—!]/.test(ACCESS_FIRST_LINE));
});
