// Run: deno test --allow-env --allow-read supabase/functions/_shared/partner-notices.test.ts
// Fix 5 (Partners 3 LATER row): the three partner event emails run as their own dispatcher step, partner_notices, and
// each fires once. The fake send keeps sent keys the way notify() does (a key already sent sends nothing).
import assert from "node:assert/strict";
import { type NoticeDeps, partnerNotices } from "./partner-notices.ts";
import type { Events } from "./partner-plan.ts";

const partner = { email: "p@example.test", user_id: "u1", status: "approved", payout_last4: "1234" };
const events = (): Events => ({
  trials: [
    { partner_id: "p1", partner, trade: "Hair salon", area: "Leeds", started_at: "2026-11-10T10:00:00Z" },
    { partner_id: "p1", partner, trade: "Barber", area: "York", started_at: "2026-11-11T10:00:00Z" },
  ],
  payments: [{ partner_id: "p1", partner, cents: 975, earned_at: "2026-10-01T10:00:00Z", hold_until: "2026-10-31T10:00:00Z", hadEarlier: false }],
  payouts: [{ id: "po1", partner, cents: 5000, method: "paypal", month: "2026-10", sent_at: "2026-11-05T10:00:00Z", lines: [] }],
});

function world() {
  const keys = new Set<string>();
  const sent: string[] = [];
  const deps: NoticeDeps = {
    read: () => Promise.resolve(events()),
    send: (n) => {
      if (keys.has(n.key)) return Promise.resolve({ sent: 0, failed: 0 });
      keys.add(n.key);
      sent.push(n.kind);
      return Promise.resolve({ sent: 1, failed: 0 });
    },
  };
  return { deps, sent };
}

Deno.test("each partner event email fires once, however often the step runs", async () => {
  const w = world();
  const first = await partnerNotices(new Date("2026-11-11T12:00:00Z"), w.deps);
  assert.deepEqual(first, { partner_emails_sent: 3, partner_emails_failed: 0 });
  assert.deepEqual(w.sent.sort(), ["partner_first_payment", "partner_payout_sent", "partner_referral_started"]);
  for (let i = 0; i < 3; i++) {
    assert.deepEqual(await partnerNotices(new Date("2026-11-11T12:05:00Z"), w.deps), { partner_emails_sent: 0, partner_emails_failed: 0 });
  }
  assert.equal(w.sent.filter((k) => k === "partner_referral_started").length, 1, "first trial once");
  assert.equal(w.sent.filter((k) => k === "partner_first_payment").length, 1, "first payment once");
  assert.equal(w.sent.filter((k) => k === "partner_payout_sent").length, 1, "payout sent once");
});

Deno.test("a failed send is counted and never throws out of the step", async () => {
  const reported: string[] = [];
  const deps: NoticeDeps = {
    read: () => Promise.resolve(events()),
    send: () => Promise.reject(new Error("down")),
    report: (_e, kind) => Promise.resolve(void reported.push(kind)),
  };
  assert.deepEqual(await partnerNotices(new Date("2026-11-11T12:00:00Z"), deps), { partner_emails_sent: 0, partner_emails_failed: 3 });
  assert.equal(reported.length, 3);
});

Deno.test("the dispatcher runs the partner emails as their own step, not inside the trial reminders", async () => {
  const src = await Deno.readTextFile(new URL("../api/jobs.ts", import.meta.url));
  assert.match(src, /partner_notices: step\("partner_notices", \(\) => partnerNotices\(\)\)/);
  assert.match(src, /trial_reminders: step\("trials", trialsJob\),/);
});
