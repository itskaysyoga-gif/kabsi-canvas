// Run: deno test supabase/functions/_shared/plans.test.ts
import assert from "node:assert/strict";
import { dueTrialEmail, paidWindow, trialDays, trialEligible, trialEnd } from "./plans.ts";

const iso = (d: Date) => d.toISOString().replace(".000", "");

Deno.test("trial length: 30 days for partner signups, 14 otherwise", () => {
  for (const s of ["self", "staff", null, undefined]) assert.equal(trialDays(s), 14);
  for (const s of ["partner_link", "partner_invite"]) assert.equal(trialDays(s), 30);
});

Deno.test("trialEnd is the local last day, ending at local midnight after it", () => {
  const cases: [string, string, number, string, string][] = [
    ["2026-10-01T12:00:00Z", "Asia/Beirut", 14, "2026-10-15", "2026-10-15T21:00:00Z"],
    ["2026-10-01T22:30:00Z", "Asia/Beirut", 14, "2026-10-16", "2026-10-16T21:00:00Z"], // already 2 Oct in Beirut
    ["2026-10-20T09:00:00Z", "Asia/Beirut", 14, "2026-11-03", "2026-11-03T22:00:00Z"], // DST ends 25 Oct
    ["2026-03-01T15:00:00Z", "America/New_York", 30, "2026-03-31", "2026-04-01T04:00:00Z"], // DST starts 8 Mar
    ["2026-12-25T00:00:00Z", "UTC", 14, "2027-01-08", "2027-01-09T00:00:00Z"],
  ];
  for (const [start, tz, days, lastDay, endsAt] of cases) {
    const r = trialEnd(new Date(start), tz, days);
    assert.equal(r.lastDay, lastDay, `${start} ${tz} lastDay`);
    assert.equal(iso(r.endsAt), endsAt, `${start} ${tz} endsAt`);
  }
});

Deno.test("dueTrialEmail picks one stage from 09:00 local and never after the last day", () => {
  const last = "2026-10-15";
  const t = (d: string, h: number, sent: ("d7" | "d1" | "d0")[] = [], continues = false) => dueTrialEmail(last, d, h, sent, continues);
  assert.equal(t("2026-10-07", 10), null);
  assert.equal(t("2026-10-08", 8), null);
  assert.equal(t("2026-10-08", 9), "d7");
  assert.equal(t("2026-10-08", 9, ["d7"]), null);
  assert.equal(t("2026-10-10", 14), "d7"); // catch-up after a missed run
  assert.equal(t("2026-10-14", 9), "d1"); // d7 skipped when d1 is already due
  assert.equal(t("2026-10-15", 9, ["d7", "d1"]), "d0");
  assert.equal(t("2026-10-15", 8, ["d7"]), "d1");
  assert.equal(t("2026-10-16", 9), null);
  assert.equal(t("2026-10-08", 9, [], true), null); // a paid plan continues: no reminder
});

Deno.test("paidWindow starts after the latest active plan and clamps month ends", () => {
  const w = (kind: string, now: string, ends: string[] = []) => {
    const r = paidWindow(kind, new Date(now), ends.map((e) => new Date(e)));
    return [iso(r.start), iso(r.end)];
  };
  assert.deepEqual(w("pro_monthly", "2026-10-01T10:00:00Z"), ["2026-10-01T10:00:00Z", "2026-11-01T10:00:00Z"]);
  assert.deepEqual(w("pro_yearly", "2026-10-01T10:00:00Z", ["2026-10-15T21:00:00Z"]), ["2026-10-15T21:00:00Z", "2027-10-15T21:00:00Z"]);
  assert.equal(w("pro_monthly", "2027-01-31T10:00:00Z")[1], "2027-02-28T10:00:00Z");
  assert.equal(w("lebanon_yearly", "2028-02-29T00:00:00Z")[1], "2029-02-28T00:00:00Z");
  assert.deepEqual(w("pro_monthly", "2027-01-01T00:00:00Z", ["2027-05-01T00:00:00Z"]), ["2027-05-01T00:00:00Z", "2027-06-01T00:00:00Z"]);
  assert.equal(w("lebanon_yearly", "2026-10-01T00:00:00Z", ["2026-09-01T00:00:00Z"])[0], "2026-10-01T00:00:00Z"); // ended plans do not delay
  assert.equal(w("pro_6m", "2026-10-01T00:00:00Z")[1], "2027-04-01T00:00:00Z");
});

Deno.test("trialEligible fails each rule on its own", () => {
  const ok = { clockReady: true, partnerCovered: false, trialUsed: false, paidOrWaiting: false, flagOn: true, testOwner: false };
  assert.equal(trialEligible(ok), true);
  assert.equal(trialEligible({ ...ok, partnerCovered: true }), false);
  assert.equal(trialEligible({ ...ok, trialUsed: true }), false);
  assert.equal(trialEligible({ ...ok, paidOrWaiting: true }), false);
  assert.equal(trialEligible({ ...ok, clockReady: false }), false);
  assert.equal(trialEligible({ ...ok, flagOn: false }), false);
  assert.equal(trialEligible({ ...ok, flagOn: false, testOwner: true }), true);
});
