// Partners 2 (30.50 items 4 to 6, 30.51 item 6): the payout confirm seam, the staff tap at the money and the owner's link,
// inside the real agent on the fake world (world.test-helpers.ts). The database side (one use, the 10 minutes, the phone
// that was asked, the staff role, the free month and the partner link) is tested in supabase/tests/partners2.sql.
import assert from "node:assert/strict";
import { receive } from "./agent.ts";
import { type FirstPayout, PARTNERS_SAY, type PartnersWaDb } from "./partners.ts";
import { msg, PHONES, World } from "./world.test-helpers.ts";
import { payoutChannel } from "../programs.ts";

const CHANGE = "11111111-2222-4333-8444-000000000001";
const PAYOUT = "11111111-2222-4333-8444-000000000002";

function fake(log: string[]): PartnersWaDb {
  let used = false;
  let reviewed = false;
  const rows: FirstPayout[] = [{ id: PAYOUT, code: "P-AB23CD", kind: "card_seller", country: "AE", amount_cents: 5400, lines: 4 }];
  return {
    confirmPayout: async (id, phone) => {
      log.push(`confirm:${id}:${phone}`);
      if (id !== CHANGE || phone !== PHONES.partner || used) return { result: "unknown" };
      used = true;
      return { result: "confirmed", method: "paypal", last4: "e.co" };
    },
    firstPayouts: async (phone) => (phone === PHONES.rashid ? (reviewed ? [] : rows) : null),
    reviewPayout: async (id, phone) => {
      if (phone !== PHONES.rashid || id !== PAYOUT || reviewed) return { result: "unknown" };
      reviewed = true;
      return { result: "approved", code: "P-AB23CD", amount_cents: 5400, founding_partner: true, founding_count: 1 };
    },
    referralLink: async (_loc, phone) => (phone === PHONES.both ? { result: "partner", code: "P-NOOR22" } : { result: "owner", code: "R-XY23ZW" }),
  };
}

Deno.test("partners2: \"Yes, it's me\" from the partner's own number saves the payout method, once", async () => {
  const w = new World();
  const log: string[] = [];
  const deps = { ...w.deps(), partners: fake(log) };
  assert.equal(await receive(deps, msg(w, PHONES.partner, { button: `pc:${CHANGE}` })), "payout_confirmed");
  assert.equal(w.repliesTo(PHONES.partner).at(-1)!.body, PARTNERS_SAY.payoutSaved("paypal", "e.co"));
  assert.match(w.repliesTo(PHONES.partner).at(-1)!.body, /^✅ \*Payout method saved\*\n\nPayPal ending in e\.co\n\n/);
  assert.equal(await receive(deps, msg(w, PHONES.partner, { button: `pc:${CHANGE}` })), "payout_tap_refused", "a tap works once");
  assert.equal(await receive(deps, msg(w, PHONES.unknown, { button: `pc:${CHANGE}` })), "payout_tap_refused", "another number is refused");
  assert.equal(w.repliesTo(PHONES.unknown).at(-1)!.body, PARTNERS_SAY.payoutEnded);
  assert.equal(await receive(deps, msg(w, PHONES.partner, { button: `pc:${CHANGE}`, forwarded: true })), "payout_forwarded", "a forwarded tap is never the partner's");
  assert.equal(w.aiCalls, 0, "no model call");
});

Deno.test("partners2: the payout ask is look 2: one marker, a bold title, the method, one line; one button", () => {
  const body = PARTNERS_SAY.payoutAsk("usdt", "9f3a");
  assert.equal(body, "❓ *Change your payout method?*\n\nUSDT ending in 9f3a\n\nOnly tap if you asked for this on kabsi.co just now.");
  assert.ok(PARTNERS_SAY.payoutYes.length <= 20);
  assert.doesNotMatch(Object.values(PARTNERS_SAY).map((v) => (typeof v === "string" ? v : "")).join(" "), /[—–!]/);
});

Deno.test("partners2: WhatsApp when the account has a confirmed number and the window is open; else the email code", () => {
  assert.equal(payoutChannel({ phone: "+971500000301", windowOpen: true, stopped: false }), "whatsapp");
  assert.equal(payoutChannel({ phone: null, windowOpen: true, stopped: false }), "email", "no WhatsApp on the account");
  assert.equal(payoutChannel({ phone: "+971500000301", windowOpen: false, stopped: false }), "email", "window closed");
  assert.equal(payoutChannel({ phone: "+971500000301", windowOpen: true, stopped: true }), "email", "stopped");
});

Deno.test("partners2: \"payouts\" from the staff phone lists first payouts; one tap approves", async () => {
  const w = new World();
  const deps = { ...w.deps(), partners: fake([]) };
  assert.equal(await receive(deps, msg(w, PHONES.rashid, { text: "payouts" })), "payouts_list");
  const list = w.repliesTo(PHONES.rashid).at(-1)!;
  assert.match(list.body, /^\*🧾 First payouts to review\*\n\nP-AB23CD · review card seller · AE · \$54\.00\n\n/);
  assert.deepEqual(list.buttons, ["Approve P-AB23CD"]);
  assert.equal(await receive(deps, msg(w, PHONES.rashid, { button: `pr:${PAYOUT}` })), "payouts_approved");
  assert.match(w.repliesTo(PHONES.rashid).at(-1)!.body, /^\*✅ Payout approved\*\n\nP-AB23CD · \$54\.00\nFounding Partner 1 of 20\n\n/);
  assert.equal(await receive(deps, msg(w, PHONES.rashid, { button: `pr:${PAYOUT}` })), "stale_button", "a second tap does nothing");
  // Anyone else: the staff list is never revealed.
  assert.notEqual(await receive(deps, msg(w, PHONES.owner, { button: `pr:${PAYOUT}` })), "payouts_approved");
});

Deno.test("partners2: an owner's \"my link\" is the referral link; a partner who owns a business gets the partner link", async () => {
  const w = new World();
  const deps = { ...w.deps(), partners: fake([]) };
  assert.equal(await receive(deps, msg(w, PHONES.owner, { text: "my link" })), "referral_owner");
  const r = w.repliesTo(PHONES.owner).at(-1)!.body;
  assert.match(r, /^\*📋 Your referral link\*/);
  assert.ok(r.includes("https://kabsi.co/?via=R-XY23ZW"));
  assert.ok(r.includes("One free month for each business that pays"));
  // "review link" stays the review link.
  assert.match(await receive(deps, msg(w, PHONES.owner, { text: "review link" })), /^(review_link|no_review_link)$/);
});
