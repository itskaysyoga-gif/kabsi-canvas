import assert from "node:assert/strict";
import { LIFE_SAMPLE } from "./email/catalog.ts";
import { CARD_PAYMENTS_COMING, lifecycleEmail, PLAN_PRICES, PRICES_SENTENCE } from "./email/lifecycle-copy.ts";
import { dueSteps, lifecycleKey, marketingAllowed, OPT_IN_COUNTRIES, type Snapshot, type StepId } from "./lifecycle.ts";
import { type LifecycleDeps, runLifecycle } from "./lifecycle-run.ts";

const H = 3_600_000, D = 86_400_000;
const T0 = new Date("2026-11-02T09:00:00Z");
const at = (ms: number) => new Date(T0.getTime() + ms);
const base: Snapshot = { ...LIFE_SAMPLE, createdAt: T0, consentAt: null, accessGrantedAt: null, status: "onboarding", entitlement: "none", trialStartedAt: null, trialEndsAt: null,
  firstApprovalAt: null, waitingReviews: 0, waitingChanges: 0, recap: { repliesPrepared: 0, repliesSent: 0, postsSent: 0, changesCaught: 0 } };
const SINCE = at(-D);

// A business that goes through every stage: signs up, asks for access, gets it, approves a reply, a trial of 14 days,
// grace, expiry. The clock moves one hour at a time; the fake outbox dedupes like the engine does.
function journey(over: Partial<Snapshot> = {}) {
  return (now: Date): Snapshot => {
    const t = now.getTime() - T0.getTime();
    const consentAt = at(10 * 60_000), accessAt = at(5 * D), trialStart = at(5 * D), trialEnd = new Date(trialStart.getTime() + 14 * D);
    const hasAccess = now >= accessAt;
    const entitlement = !hasAccess ? "none" : now < trialEnd ? "trial" : now < new Date(trialEnd.getTime() + 7 * D) ? "grace" : "ended";
    return {
      ...base, status: hasAccess ? "active" : "access_pending", consentAt: t >= 10 * 60_000 ? consentAt : null, accessGrantedAt: hasAccess ? accessAt : null,
      entitlement, trialStartedAt: hasAccess ? trialStart : null, trialEndsAt: hasAccess ? trialEnd : null,
      firstApprovalAt: now >= at(6 * D) ? at(6 * D) : null, waitingReviews: 3, recap: { repliesPrepared: 7, repliesSent: 4, postsSent: 0, changesCaught: 1 }, ...over,
    };
  };
}

function run(snapshotAt: (n: Date) => Snapshot, hours: number, opts: { since?: Date; notice?: boolean } = {}) {
  const sent: { step: StepId; at: Date; key: string }[] = [];
  const keys = new Set<string>();
  let now = T0;
  const deps: LifecycleDeps = {
    now: () => now, appUrl: "https://kabsi.co", report: (e) => { throw e; },
    settings: async () => ({ on: true, since: opts.since ?? SINCE, marketingNoticeOn: !!opts.notice, removalOn: true }),
    snapshots: async (n) => [snapshotAt(n)],
    send: async (o) => {
      if (keys.has(o.key)) return 0; // the engine's dedupe: the same event to the same people is sent once
      keys.add(o.key);
      sent.push({ step: o.step, at: now, key: o.key });
      return 1;
    },
  };
  return (async () => {
    for (let h = 0; h <= hours; h++) {
      now = at(h * H);
      await runLifecycle(deps);
    }
    return sent;
  })();
}

Deno.test("time travel: each trigger produces its email once, in order, and none twice", async () => {
  const sent = await run(journey(), 60 * 24);
  assert.deepEqual(sent.map((s) => s.step), [
    "welcome", "no_access_1h", "no_access_24h", "no_access_72h",
    "first_reply_approved", "trial_day2", "trial_day7", "trial_day11", "trial_day14", "winback_17", "winback_30",
  ]);
  assert.equal(new Set(sent.map((s) => s.key)).size, sent.length);
  const when = Object.fromEntries(sent.map((s) => [s.step, (s.at.getTime() - T0.getTime()) / H]));
  assert.equal(when.welcome, 0);
  // access was asked for at 00:10 and the clock ticks on the hour, so each goes at the first tick after its time
  assert.equal(when.no_access_1h, 2);
  assert.equal(when.no_access_24h, 25);
  assert.equal(when.no_access_72h, 73);
  // access and trial start on day 5, 09:00
  assert.equal(when.trial_day2, 5 * 24 + 48);
  assert.equal(when.first_reply_approved, 6 * 24);
  assert.equal(when.trial_day7, 5 * 24 + 7 * 24);
  assert.equal(when.trial_day11, 5 * 24 + 11 * 24);
  assert.equal(when.trial_day14, 5 * 24 + 14 * 24);
  assert.equal(when.winback_17, 5 * 24 + (14 + 17) * 24);
  assert.equal(when.winback_30, 5 * 24 + (14 + 30) * 24);
});

Deno.test("the no-access reminders stop at access", async () => {
  const sent = await run(journey({ }), 4 * 24);
  assert.deepEqual(sent.map((s) => s.step), ["welcome", "no_access_1h", "no_access_24h", "no_access_72h"]);
  const early = await run((n) => ({ ...journey()(n), accessGrantedAt: n >= at(30 * H) ? at(30 * H) : null, status: n >= at(30 * H) ? "active" : "access_pending" }), 5 * 24);
  assert.equal(early.some((s) => s.step === "no_access_72h"), false, "access came on day 1, so the 72 hour reminder never goes");
  assert.equal(early.some((s) => s.step === "no_access_24h"), true);
});

Deno.test("an event before the switch-on never sends: nothing arrives late or in a burst", async () => {
  const sent = await run(journey(), 60 * 24, { since: at(12 * D) });
  assert.deepEqual(sent.map((s) => s.step), ["trial_day7", "trial_day11", "trial_day14", "winback_17", "winback_30"]);
  assert.equal(sent.some((s) => s.step === "welcome" || s.step === "trial_day2"), false);
});

Deno.test("a missed step is not sent days late", () => {
  const s = journey()(at(5 * D));
  assert.deepEqual(dueSteps(s, at(5 * D + 2 * D + 4 * D), { since: SINCE }), [], "day 2 mail is stale after 3 days");
  assert.deepEqual(dueSteps(journey()(at(5 * D + 2 * D + 2 * D)), at(5 * D + 2 * D + 2 * D), { since: SINCE }), ["trial_day2"]);
});

Deno.test("trial rules (P0.4-06): trial mail only while on trial; concierge, demo and paying businesses get none", () => {
  const trial = (e: Snapshot["entitlement"]) => ({ ...journey()(at(5 * D + 7 * D)), entitlement: e });
  const now = at(5 * D + 7 * D);
  assert.deepEqual(dueSteps(trial("trial"), now, { since: SINCE }), ["trial_day7"]);
  for (const e of ["paid", "concierge", "demo", "none", "ended", "grace"] as const) assert.deepEqual(dueSteps(trial(e), now, { since: SINCE }), [], e);
  // day 14 is for a business whose trial ended and has not paid; a paying one gets nothing
  const end = at(5 * D + 14 * D);
  assert.deepEqual(dueSteps({ ...journey()(end), entitlement: "grace" }, end, { since: SINCE }), ["trial_day14"]);
  assert.deepEqual(dueSteps({ ...journey()(end), entitlement: "paid" }, end, { since: SINCE }), []);
  // the first mail to a new concierge or demo business is not sent either
  assert.deepEqual(dueSteps({ ...base, entitlement: "concierge" }, T0, { since: SINCE }), []);
  assert.deepEqual(dueSteps({ ...base, entitlement: "demo" }, T0, { since: SINCE }), []);
});

Deno.test("a business with no owner account gets nothing", () => {
  assert.deepEqual(dueSteps({ ...base, owners: [] }, T0, { since: SINCE }), []);
});

Deno.test("consent by country (G-24): no win-back reaches an address without the consent its country needs", async () => {
  const win = at(5 * D + (14 + 17) * D + H);
  const snap = (country: string | null, consent: boolean): Snapshot => ({ ...journey()(win), country, marketingConsent: consent, entitlement: "ended" });
  assert.deepEqual(dueSteps(snap("US", true), win, { since: SINCE }), ["winback_17"], "a yes sends");
  for (const country of ["US", "CA", "AU", "NZ", "SG", "LB", "GB", "IE", "DE", "FR", "AE", "SA", null]) {
    assert.deepEqual(dueSteps(snap(country, false), win, { since: SINCE }), [], `${country}: no yes, no signup notice, nothing sent`);
  }
  // once a clear notice at signup exists, opt-out countries may send; opt-in countries never without a yes
  assert.deepEqual(dueSteps(snap("US", false), win, { since: SINCE, marketingNoticeOn: true }), ["winback_17"]);
  for (const country of ["GB", "IE", "DE", "AE", "SA", null]) assert.deepEqual(dueSteps(snap(country, false), win, { since: SINCE, marketingNoticeOn: true }), [], country ?? "unknown");
  assert.equal(marketingAllowed("gb", false, true), false);
  for (const c of ["GB", "IE", "AE", "SA", "FR", "NO"]) assert.ok(OPT_IN_COUNTRIES.has(c), c);
  // service mail is part of the trial and needs no separate yes, in any country
  const svc = { ...journey()(at(5 * D + 7 * D)), country: "DE", marketingConsent: false };
  assert.deepEqual(dueSteps(svc, at(5 * D + 7 * D), { since: SINCE }), ["trial_day7"]);
  // and the win-back waits for real waiting items
  assert.deepEqual(dueSteps({ ...snap("US", true), waitingReviews: 0, waitingChanges: 0 }, win, { since: SINCE }), []);
});

Deno.test("the engine path: a failed send is reported and the next business still gets its email", async () => {
  const errors: unknown[] = [];
  const sent: string[] = [];
  const deps: LifecycleDeps = {
    now: () => T0, appUrl: "https://kabsi.co", report: (e) => errors.push(e),
    settings: async () => ({ on: true, since: SINCE, marketingNoticeOn: false, removalOn: false }),
    snapshots: async () => [{ ...base, locationId: "a" }, { ...base, locationId: "b" }],
    send: async (o) => { if (o.locationId === "a") throw new Error("resend 500"); sent.push(o.locationId); return 1; },
  };
  const r = await runLifecycle(deps);
  assert.deepEqual(r, { checked: 2, due: 2, sent: 1, failed: 1 });
  assert.equal(errors.length, 1);
  assert.deepEqual(sent, ["b"]);
});

Deno.test("off means off: nothing is loaded or sent", async () => {
  let loaded = false;
  const deps: LifecycleDeps = {
    now: () => T0, appUrl: "https://kabsi.co", report: () => {}, settings: async () => ({ on: false, since: SINCE, marketingNoticeOn: false, removalOn: false }),
    snapshots: async () => { loaded = true; return []; }, send: async () => 1,
  };
  assert.deepEqual(await runLifecycle(deps), { checked: 0, due: 0, sent: 0, failed: 0 });
  assert.equal(loaded, false);
  const noSince: LifecycleDeps = { ...deps, settings: async () => ({ on: true, since: null, marketingNoticeOn: false, removalOn: false }) };
  assert.deepEqual(await runLifecycle(noSince), { checked: 0, due: 0, sent: 0, failed: 0 });
});

Deno.test("the day-7 recap says exactly the numbers of the snapshot, which come from the audit log", () => {
  const s = { ...LIFE_SAMPLE, recap: { repliesPrepared: 12, repliesSent: 8, postsSent: 2, changesCaught: 3 } };
  const mail = lifecycleEmail("trial_day7", s, { appUrl: "https://kabsi.co", removalOn: true });
  assert.match(mail.text, /12 replies prepared/);
  assert.match(mail.text, /8 replies you approved and Kabsi sent to Google/);
  assert.match(mail.text, /2 posts you approved/);
  assert.match(mail.text, /3 changes to your Google profile caught/);
  const one = lifecycleEmail("trial_day7", { ...s, recap: { repliesPrepared: 1, repliesSent: 1, postsSent: 0, changesCaught: 0 } }, { appUrl: "https://kabsi.co", removalOn: true });
  assert.match(one.text, /1 reply prepared/);
  assert.match(one.text, /0 changes to your Google profile caught/);
  assert.doesNotMatch(one.text, /posts? you approved/);
});

Deno.test("prices and offer: Essentials, Pro and an extra location, card payments marked coming, no end-of-trial discount", () => {
  const ctx = { appUrl: "https://kabsi.co", removalOn: true };
  assert.deepEqual(Object.values(PLAN_PRICES), [19, 190, 39, 390, 15, 150]);
  for (const step of ["trial_day7", "trial_day11", "trial_day14", "winback_17", "winback_30"] as const) {
    const m = lifecycleEmail(step, LIFE_SAMPLE, ctx);
    for (const t of [m.text, m.bodyHtml]) {
      assert.match(t, /Essentials is \$19 a month or \$190 a year/, step);
      assert.match(t, /Pro is \$39 a month or \$390 a year/, step);
      assert.match(t, /An extra location is \$15 a month or \$150 a year/, step);
      assert.match(t, /plus tax where it applies/, step);
    }
    assert.ok(m.text.includes(PRICES_SENTENCE), step);
    assert.ok(m.text.includes(CARD_PAYMENTS_COMING), step);
    assert.equal(m.button?.label, "See your plan", step);
    assert.doesNotMatch(m.text, /Kabsi Pro is \$19|Choose a plan:|checkout/i, step);
  }
  for (const step of Object.keys({ welcome: 1, no_access_1h: 1, no_access_24h: 1, no_access_72h: 1, first_reply_approved: 1, trial_day2: 1, trial_day7: 1, trial_day11: 1, trial_day14: 1, winback_17: 1, winback_30: 1 }) as StepId[]) {
    const m = lifecycleEmail(step, LIFE_SAMPLE, ctx);
    assert.doesNotMatch(`${m.subject} ${m.text}`, /discount|% off|limited time|last chance|coupon/i, step);
  }
});

Deno.test("day 14 mentions removing access only when removal is on (the plan says so truthfully)", () => {
  const on = lifecycleEmail("trial_day14", LIFE_SAMPLE, { appUrl: "https://kabsi.co", removalOn: true });
  const off = lifecycleEmail("trial_day14", LIFE_SAMPLE, { appUrl: "https://kabsi.co", removalOn: false });
  assert.match(on.text, /removes its Manager access/);
  assert.doesNotMatch(off.text, /removes its Manager access/);
});

// ─── P0.4-04: the setup-help reminders (K-95, K-97, K-61) ───────────────────────────────────────────────────────────

Deno.test("verification check-backs: every 2 days while the profile is not verified, each once, none after access", async () => {
  const waiting = (n: Date): Snapshot => ({ ...base, consentAt: null, status: "onboarding", createdAt: at(-30 * D), scenario: { id: "needs_verifying", variant: null, startedAt: at(H), doneAt: null } });
  const sent = await run(waiting, 14 * 24, { since: at(-60 * D) });
  const checks = sent.filter((s) => s.step.startsWith("verify_"));
  assert.deepEqual(checks.map((s) => s.step), ["verify_1", "verify_2", "verify_3", "verify_4", "verify_5"]);
  assert.deepEqual(checks.map((s) => (s.at.getTime() - T0.getTime()) / H), [1 + 48, 1 + 96, 1 + 144, 1 + 192, 1 + 240]);
  assert.equal(new Set(checks.map((s) => s.key)).size, 5);
  // access on day 5: the third and later never go
  const early = await run((n) => ({ ...waiting(n), accessGrantedAt: n >= at(5 * D) ? at(5 * D) : null }), 14 * 24, { since: at(-60 * D) });
  assert.deepEqual(early.filter((s) => s.step.startsWith("verify_")).map((s) => s.step), ["verify_1", "verify_2"]);
});

Deno.test("verification check-backs also run while Google is reviewing, and stop when the owner clears the situation", async () => {
  const reviewing = (n: Date): Snapshot => ({ ...base, consentAt: null, createdAt: at(-30 * D), scenario: { id: "google_reviewing", variant: null, startedAt: at(0), doneAt: null } });
  assert.deepEqual((await run(reviewing, 5 * 24, { since: at(-60 * D) })).filter((s) => s.step.startsWith("verify_")).map((s) => s.step), ["verify_1", "verify_2"]);
  const cleared = (n: Date): Snapshot => ({ ...base, consentAt: null, createdAt: at(-30 * D), scenario: n < at(3 * D) ? { id: "google_reviewing", variant: null, startedAt: at(0), doneAt: null } : null });
  assert.deepEqual((await run(cleared, 12 * 24, { since: at(-60 * D) })).filter((s) => s.step.startsWith("verify_")).map((s) => s.step), ["verify_1"]);
});

Deno.test("no check-back for a situation that is not about verification, and none without an owner account", () => {
  for (const id of ["suspended", "manager_not_owner", "no_profile_in_account", "not_eligible", "several_locations", "workspace_blocks", "someone_else_owns"]) {
    const s: Snapshot = { ...base, createdAt: at(-30 * D), scenario: { id, variant: null, startedAt: at(-3 * D), doneAt: null } };
    assert.deepEqual(dueSteps(s, at(0), { since: at(-60 * D) }).filter((x) => x.startsWith("verify_")), [], id);
  }
  const v: Snapshot = { ...base, createdAt: at(-30 * D), owners: [], scenario: { id: "needs_verifying", variant: null, startedAt: at(-3 * D), doneAt: null } };
  assert.deepEqual(dueSteps(v, at(0), { since: at(-60 * D) }), []);
});

Deno.test("ownership reminders: day 3 and day 7 after 'I've done it', each once, nothing before the request, none after access", async () => {
  const asked = (n: Date): Snapshot => ({ ...base, consentAt: null, createdAt: at(-30 * D), scenario: { id: "someone_else_owns", variant: "dont_know", startedAt: at(0), doneAt: n >= at(D) ? at(D) : null } });
  const sent = (await run(asked, 12 * 24, { since: at(-60 * D) })).filter((s) => s.step.startsWith("ownership_"));
  assert.deepEqual(sent.map((s) => s.step), ["ownership_day3", "ownership_day7"]);
  assert.deepEqual(sent.map((s) => (s.at.getTime() - T0.getTime()) / D), [4, 8]);
  // never asked: no reminder at all
  const never = await run((n) => ({ ...asked(n), scenario: { id: "someone_else_owns", variant: null, startedAt: at(0), doneAt: null } }), 12 * 24, { since: at(-60 * D) });
  assert.deepEqual(never.filter((s) => s.step.startsWith("ownership_")), []);
  // access on day 5: the day 7 reminder never goes
  const early = await run((n) => ({ ...asked(n), accessGrantedAt: n >= at(5 * D) ? at(5 * D) : null }), 12 * 24, { since: at(-60 * D) });
  assert.deepEqual(early.filter((s) => s.step.startsWith("ownership_")).map((s) => s.step), ["ownership_day3"]);
});

Deno.test("a new situation is a new email: the dedupe key carries the day it began", () => {
  const a = lifecycleKey("verify_1", "loc1", at(0));
  const b = lifecycleKey("verify_1", "loc1", at(20 * D));
  assert.notEqual(a, b);
  assert.equal(lifecycleKey("welcome", "loc1", at(0)), "life:welcome:loc1");
});

Deno.test("the setup-help emails: one yellow button, never ask for a code, house style, business first", () => {
  for (const id of ["verify_1", "verify_2", "ownership_day3", "ownership_day7"] as StepId[]) {
    const snap: Snapshot = { ...LIFE_SAMPLE, accessGrantedAt: null, scenario: { id: id === "verify_2" ? "google_reviewing" : id.startsWith("verify") ? "needs_verifying" : "someone_else_owns", variant: null, startedAt: at(0), doneAt: at(0) } };
    const m = lifecycleEmail(id, snap, { appUrl: "https://kabsi.co", removalOn: false });
    assert.ok(m.subject.startsWith(`${snap.name}:`), id);
    assert.equal(m.button?.url, "https://kabsi.co/start", id);
    const all = `${m.subject} ${m.title} ${m.preheader} ${m.bodyHtml} ${m.text}`;
    assert.ok(!/[—–!]/.test(all), `${id}: no dashes or exclamation marks`);
    assert.match(m.text, /never asks for your Google password or a verification code/, id);
    assert.ok(!/send us your code|your verification code to/i.test(all), id);
  }
  assert.equal(lifecycleEmail("verify_1", { ...LIFE_SAMPLE, scenario: { id: "needs_verifying", variant: null, startedAt: at(0), doneAt: null } }, { appUrl: "https://kabsi.co", removalOn: false }).button?.label, "Verified yet? Tap to continue");
});
