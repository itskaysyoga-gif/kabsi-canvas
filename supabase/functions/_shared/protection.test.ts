// Google Protection (P0.2-04): the explanation the owner reads, Google's naming rules (K-77) and what the detector
// hands to record_protection_check. The database side (changes, decisions, guards) is in supabase/tests/protection.sql.
// Run with: deno test --no-check _shared/ (scripts/deno-check.sh).
import assert from "node:assert/strict";
import { buildReads, decisionRefusal, explain, hoursDifference, nameCheck, parseHours } from "./protection.ts";
import type { Listing, ProtectionRead } from "./google/index.ts";

const listing = (over: Partial<Record<keyof Listing, string>> = {}): Listing => {
  const base: Record<string, string> = {
    name: "Yawmiyati", phone: "+961 1 123 456", website: "", address: "Hamra Street, Beirut, Lebanon",
    regular_hours: "Mon to Sat 09:00 to 22:00, Sun 09:00 to 22:00", main_category: "Media company", open_status: "Open", map_pin: "",
  };
  return Object.fromEntries(Object.entries({ ...base, ...over }).map(([k, v]) => [k, { display: v, raw: v }])) as Listing;
};
const read = (over: Partial<Record<keyof Listing, string>> = {}, googleUpdated: ProtectionRead["googleUpdated"] = []): ProtectionRead =>
  ({ listing: listing(over), googleUpdated });
const fact = (key: string, display: string, status = "verified") => ({ key, value: { display }, status });

Deno.test("hours: the first day that differs, in the owner's words (K-19 step 3)", () => {
  assert.equal(
    explain("regular_hours", "Mon to Sun 09:00 to 22:00", "Mon to Sat 09:00 to 22:00, Sun 09:00 to 18:00", true),
    "Google shows Sunday closing at 18:00. You approved 22:00.",
  );
  assert.equal(
    explain("regular_hours", "Mon to Fri 07:00 to 18:00, Sat 08:00 to 16:00, Sun 08:00 to 15:00",
      "Mon to Fri 07:00 to 18:00, Sat Closed, Sun 08:00 to 15:00", true),
    "Google shows Saturday closed. You approved 08:00 to 16:00.",
  );
  // Google's periods ("Mon 08:00 to 19:00, ...") read the same way; a missing day is closed.
  assert.deepEqual(hoursDifference("Mon 08:00 to 19:00, Tue 08:00 to 19:00", "Mon 09:00 to 19:00"),
    { google: "Monday opening at 09:00", approved: "08:00", more: true });
  assert.equal(parseHours("Open most days"), null);
  assert.equal(hoursDifference("Mon to Sun 09:00 to 18:00", "Mon to Sun 09:00 to 18:00"), null);
});

Deno.test("other fields, and a value the owner never confirmed", () => {
  assert.equal(explain("phone", "+961 1 123 456", "+961 1 999 999", true),
    "Google shows “+961 1 999 999” as your phone number. You approved “+961 1 123 456”.");
  assert.equal(explain("website", "https://yawmiyati.com", "", false),
    "Google shows nothing as your website. Kabsi saw “https://yawmiyati.com” before. Not yet confirmed by you.");
  // Free text that is not in the day form falls back to the plain sentence.
  assert.match(explain("regular_hours", "Always open", "Mon to Sun 09:00 to 18:00", true), /^Google shows “Mon to Sun/);
});

Deno.test("K-77: Yawmiyati.com to Yawmiyati recommends Google is right, with the reason", () => {
  assert.deepEqual(nameCheck("Yawmiyati.com", "Yawmiyati"), {
    recommend: "accept",
    reason: "Google removed '.com'. Business names on Google can't include web addresses, and putting it back can lead to a suspension.",
  });
  const city = nameCheck("Harbour Lane Coffee Larkhaven", "Harbour Lane Coffee", "18 Harbour Lane, Larkhaven, USA");
  assert.equal(city?.recommend, "accept");
  assert.match(city!.reason, /^Google removed 'Larkhaven'\. .*a city or area/);
  const slogan = nameCheck("Juniper Hair Studio | Best Cuts In Town", "Juniper Hair Studio");
  assert.match(slogan!.reason, /slogans or extra keywords/);
  // Nothing to say when Google renamed the business or only removed an ordinary word: the owner decides alone.
  assert.equal(nameCheck("Yawmiyati", "Daily Media"), null);
  assert.equal(nameCheck("Harbour Lane Coffee", "Harbour Coffee", "18 Harbour Lane, Larkhaven, USA"), null);
  assert.equal(nameCheck("Yawmiyati", "Yawmiyati.com"), null);
});

Deno.test("the detector hands every watched field, with the explanation written against the value it compared with", () => {
  const reads = buildReads(
    read({ name: "Yawmiyati", regular_hours: "Mon to Sat 09:00 to 22:00, Sun 09:00 to 18:00", open_status: "Permanently closed" }, ["open_status"]),
    [fact("name", "Yawmiyati.com", "needs_confirmation"), fact("regular_hours", "Mon to Sun 09:00 to 22:00"), fact("open_status", "Open"),
      fact("phone", "+961 1 123 456"), fact("website", "x", "outdated")],
  );
  assert.deepEqual(reads.map((r) => r.field), ["name", "phone", "website", "address", "regular_hours", "main_category", "open_status", "map_pin"]);
  const by = Object.fromEntries(reads.map((r) => [r.field, r]));
  assert.equal(by.regular_hours.explanation, "Google shows Sunday closing at 18:00. You approved 22:00.");
  assert.equal(by.regular_hours.previous, "Mon to Sun 09:00 to 22:00");
  assert.equal(by.open_status.google_updated, true);
  assert.equal(by.open_status.explanation, "Google shows “Permanently closed” as your open status. You approved “Open”.");
  assert.equal(by.name.recommend, "accept");
  assert.match(by.name.explanation!, /Not yet confirmed by you\.$/);
  // Same value: nothing to explain. No fact, or a value cleared after 30 days: nothing to compare with.
  assert.equal(by.phone.explanation, null);
  assert.equal(by.address.previous, null);
  assert.equal(by.website.previous, null);
  assert.equal(by.address.explanation, null);
});

Deno.test("refusals read as plain words; anything else is not a refusal", () => {
  assert.equal(decisionRefusal("sign_in_required")?.status, 403);
  assert.match(decisionRefusal("sign_in_required")!.text, /verify your business again\.$/);
  assert.match(decisionRefusal("high_risk_wait 2026-10-17T09:14Z")!.text, /Sat, 17 Oct 2026/);
  assert.equal(decisionRefusal("not_confirmed")?.code, "not_confirmed");
  assert.equal(decisionRefusal("something else"), null);
});
