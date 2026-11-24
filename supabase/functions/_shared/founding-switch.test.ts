// Run: deno test supabase/functions/_shared/founding-switch.test.ts
// GATE-2: the month-13 switch of a founding plan. 14 days before founding_ends_at the owner is told (once); 3 days before, the
// plan moves to 29 with no proration, so the payment at the end of month 12 is the first at 29. Never for a plan that ends,
// a yearly plan, a plan not on the founding price, or one already switched.
import assert from "node:assert/strict";
import { FOUNDING_NOTICE_DAYS, FOUNDING_SWITCH_DAYS, foundingChangeDate, foundingEndOf, type FoundingFacts, foundingStep } from "./creem.ts";
import { foundingEndingLine } from "./billing-lines.ts";
import { FOUNDING_LINE } from "./offer.ts";

const firstPaid = new Date("2026-12-08T10:00:00Z");
const ends = foundingEndOf(firstPaid).toISOString();
const sub = (o: Partial<FoundingFacts> = {}): FoundingFacts => ({ founding: true, founding_ends_at: ends, founding_notice_at: null,
  founding_switched_at: null, state: "active", cancel_at_period_end: false, period: "month", ...o });
const before = (days: number) => new Date(Date.parse(ends) - days * 86_400_000);

Deno.test("the founding price ends 12 months after the first payment", () => {
  assert.equal(ends, "2027-12-08T10:00:00.000Z");
  assert.equal(FOUNDING_NOTICE_DAYS, 14, "the email FOUNDING_LINE promises");
  assert.match(FOUNDING_LINE, /14 days before the change/);
});

Deno.test("nothing before day -14; the notice at day -14 once; the switch at day -3 only after the notice", () => {
  assert.equal(foundingStep(sub(), before(15)), null);
  assert.equal(foundingStep(sub(), before(14)), "notice");
  const onTime = before(14).toISOString();
  assert.equal(foundingStep(sub({ founding_notice_at: onTime }), before(5)), null);
  assert.equal(foundingStep(sub({ founding_notice_at: onTime }), before(FOUNDING_SWITCH_DAYS)), "switch");
  assert.equal(foundingStep(sub({ founding_notice_at: onTime }), before(-2)), "switch", "a late run still switches");
  assert.equal(foundingStep(sub(), before(2)), "notice", "never a switch without the notice first");
});

Deno.test("a late notice moves the change one renewal later, so the owner always has 14 days", () => {
  const late = before(2).toISOString();
  assert.equal(foundingChangeDate(ends, late).toISOString(), "2028-01-08T10:00:00.000Z");
  assert.equal(foundingChangeDate(ends, before(14)).toISOString(), ends);
  assert.equal(foundingStep(sub({ founding_notice_at: late }), before(1)), null, "no switch two days after a late notice");
  assert.equal(foundingStep(sub({ founding_notice_at: late }), new Date("2028-01-04T10:00:00Z")), null);
  assert.equal(foundingStep(sub({ founding_notice_at: late }), new Date("2028-01-05T10:00:00Z")), "switch");
  // 31 January plus one month is the last day of February.
  assert.equal(foundingChangeDate("2028-01-31T10:00:00Z", "2028-01-30T10:00:00Z").toISOString(), "2028-02-29T10:00:00.000Z");
});

Deno.test("never for a switched, cancelled, yearly, ended or list-price plan", () => {
  const n = before(14).toISOString();
  assert.equal(foundingStep(sub({ founding_notice_at: n, founding_switched_at: before(3).toISOString() }), before(1)), null);
  assert.equal(foundingStep(sub({ cancel_at_period_end: true }), before(10)), null);
  assert.equal(foundingStep(sub({ period: "year" }), before(10)), null);
  for (const state of ["cancelled", "expired", "paused", "incomplete"]) assert.equal(foundingStep(sub({ state }), before(10)), null, state);
  assert.equal(foundingStep(sub({ founding: false }), before(10)), null);
  assert.equal(foundingStep(sub({ founding_ends_at: null }), before(10)), null);
  assert.equal(foundingStep(sub({ state: "past_due" }), before(10)), "notice");
});

Deno.test("the notice names the date and both prices, in house style", () => {
  const l = foundingEndingLine({ business: "Harbour Lane Coffee", endsAt: ends }, "https://kabsi.co");
  assert.match(l.whatsapp, /Your founding price for Harbour Lane Coffee ends on 8 December 2027\./);
  assert.match(l.whatsapp, /29 US dollars a month/);
  assert.match(l.whatsapp, /19 US dollars a month/);
  assert.match(l.whatsapp, /https:\/\/kabsi\.co\/app\/plan/);
  assert.equal(l.email?.subject, "Harbour Lane Coffee: your Kabsi price changes on 8 December 2027");
  for (const t of [l.whatsapp, l.email!.text, l.email!.subject]) assert.doesNotMatch(t, /[–—!]/);
});
