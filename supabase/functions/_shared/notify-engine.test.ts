import assert from "node:assert/strict";
import type { Frequency } from "./notify-categories.ts";
import { type Deps, type EmailState, type NewRow, type NotifyInput, type Outgoing, releaseDue, runNotify, type StoredItem } from "./notify-engine.ts";
import type { EmailContent } from "./email-render.ts";

const LOC = "00000000-0000-4000-8000-0000000000c1";
const OWNER = { email: "owner@example.test", userId: "00000000-0000-4000-8000-0000000000a1", role: "owner" };
const MANAGER = { email: "manager@example.test", userId: "00000000-0000-4000-8000-0000000000a4", role: "manager" };
const ALERT = { email: "front-desk@example.test", userId: null, role: "alert" };

type Stored = NewRow & { id: string; email_id: string | null };

// An in-memory outbox: the same contract as the database wiring in notify.ts.
function fake(opts: { now?: string; prefs?: Record<string, Frequency>; hours?: string | null; paused?: string | null; people?: typeof OWNER[]; failFirstSend?: boolean } = {}) {
  const rows: Stored[] = [];
  const sent: Outgoing[] = [];
  const built: string[] = [];
  let clock = new Date(opts.now ?? "2026-11-10T10:00:00Z"); // 12:00 in Beirut
  let failNext = !!opts.failFirstSend;
  const deps: Deps = {
    now: () => clock,
    appUrl: "https://kabsi.test",
    recipients: async () => (opts.people ?? [OWNER, MANAGER, ALERT]),
    business: async () => ({ name: "Yawmiyati", tz: "Asia/Beirut", digestHour: 19, pausedUntil: opts.paused ?? null }),
    prefs: async (userId) => new Map(Object.entries(userId === OWNER.userId ? (opts.prefs ?? {}) : {})) as Map<string, Frequency>,
    hours: async () => opts.hours ?? null,
    async insert(row) {
      const same = rows.find((r) => r.dedupe_key === row.dedupe_key && r.to_address === row.to_address);
      if (same) return { id: same.id, fresh: false, state: same.email_state };
      const stored: Stored = { ...row, id: `n${rows.length + 1}`, email_id: null };
      rows.push(stored);
      return { id: stored.id, fresh: true, state: stored.email_state };
    },
    async update(id, patch) {
      const r = rows.find((x) => x.id === id)!;
      Object.assign(r, patch);
    },
    async deliver(o) {
      if (failNext) { failNext = false; throw new Error("resend 500"); }
      sent.push(o);
      return { sent: `r${sent.length}` };
    },
    async listDue(now) {
      return rows.filter((r) => (r.email_state === "held" || r.email_state === "digest") && r.email_content && Date.parse(r.email_due_at!) <= now.getTime())
        .map((r): StoredItem => ({
          id: r.id, location_id: r.location_id!, user_id: r.user_id, to_address: r.to_address, category: r.category, kind: r.kind,
          dedupe_key: r.dedupe_key, title: r.title, link: r.link, email_state: r.email_state as "held" | "digest",
          email_due_at: r.email_due_at!, email_content: r.email_content!,
        }));
    },
    log: () => {},
  };
  return { deps, rows, sent, built, setNow: (iso: string) => { clock = new Date(iso); } };
}

const content = (subject: string, extra: Partial<EmailContent> = {}): EmailContent => ({
  subject, preheader: "Nothing is published until you approve it.", title: subject, bodyHtml: `<p>${subject}</p>`, text: subject, ...extra,
});
const input = (o: Partial<NotifyInput> & { key: string }): NotifyInput => ({
  category: "review_new", kind: "review_new", locationId: LOC, to: "members", content: content("New review"), inApp: { title: "New 4-star review", link: "/app/reviews" }, ...o,
});
const states = (rows: Stored[]) => rows.map((r) => [r.to_address, r.email_state] as [string, EmailState]);

Deno.test("the same event to the same people is recorded, shown and sent once", async () => {
  const f = fake();
  const a = await runNotify(input({ key: "review:1" }), f.deps);
  const b = await runNotify(input({ key: "review:1" }), f.deps);
  assert.equal(a.sent, 3);
  assert.equal(b.sent, 0);
  assert.equal(b.duplicate, 3);
  assert.equal(f.sent.length, 3);
  assert.equal(f.rows.length, 3);
  assert.deepEqual(f.sent.map((s) => s.dedupeKey).sort(), ["review:1:front-desk@example.test", "review:1:manager@example.test", "review:1:owner@example.test"]);
});

Deno.test("a duplicate builds nothing, so no approval link is made for an email that is not sent", async () => {
  const f = fake();
  let built = 0;
  const i = input({ key: "review:2", content: async () => (built++, content("New review")) });
  await runNotify(i, f.deps);
  await runNotify(i, f.deps);
  assert.equal(built, 3);
});

Deno.test("the bell shows the event for people with an account, not for an address", async () => {
  const f = fake();
  const r = await runNotify(input({ key: "review:3" }), f.deps);
  assert.equal(r.inApp, 2);
  assert.deepEqual(f.rows.map((x) => [x.to_address, x.in_app]), [["owner@example.test", true], ["manager@example.test", true], ["front-desk@example.test", false]]);
});

Deno.test("an owner who switched a category off gets no email for it, and still sees it in the bell", async () => {
  const f = fake({ prefs: { "review_new:email": "off" } });
  const r = await runNotify(input({ key: "review:4" }), f.deps);
  assert.equal(r.off, 1);
  assert.equal(r.sent, 2); // the manager and the front desk address keep their own choices
  assert.deepEqual(states(f.rows).find(([to]) => to === OWNER.email), [OWNER.email, "off"]);
  assert.equal(f.rows.find((x) => x.to_address === OWNER.email)!.in_app, true);
});

Deno.test("an owner can switch the bell off for a category", async () => {
  const f = fake({ prefs: { "review_new:in_app": "off" } });
  await runNotify(input({ key: "review:5" }), f.deps);
  assert.equal(f.rows.find((x) => x.to_address === OWNER.email)!.in_app, false);
});

Deno.test("what cannot be switched off is sent even when the stored choice says off", async () => {
  const f = fake({ prefs: { "access:email": "off" } });
  const r = await runNotify(input({ category: "access", kind: "access_granted", key: "access:1", to: [OWNER] }), f.deps);
  assert.equal(r.sent, 1);
  assert.equal(r.off, 0);
});

Deno.test("quiet hours hold an email until 08:00 and the job then sends it once", async () => {
  const f = fake({ now: "2026-11-10T21:30:00Z" }); // 23:30 in Beirut
  const r = await runNotify(input({ key: "review:6", category: "review_high_risk", to: [OWNER] }), f.deps);
  assert.equal(r.held, 1);
  assert.equal(f.sent.length, 0);
  assert.equal(f.rows[0]!.email_due_at, "2026-11-11T06:00:00.000Z");
  assert.deepEqual(await releaseDue(f.deps), { held: 0, digests: 0, digestItems: 0, failed: 0 }); // not yet 08:00
  f.setNow("2026-11-11T06:05:00Z");
  assert.deepEqual(await releaseDue(f.deps), { held: 1, digests: 0, digestItems: 0, failed: 0 });
  assert.equal(f.sent.length, 1);
  assert.equal(f.rows[0]!.email_state, "sent");
  assert.equal(f.rows[0]!.email_content, null); // the content (review text, links) is not kept after sending
  assert.deepEqual(await releaseDue(f.deps), { held: 0, digests: 0, digestItems: 0, failed: 0 }); // and never twice
});

Deno.test("an urgent profile change is sent at 03:00", async () => {
  const f = fake({ now: "2026-11-10T01:00:00Z" });
  const r = await runNotify(input({ key: "shield:1", category: "profile_urgent", kind: "shield_alert", to: [OWNER] }), f.deps);
  assert.equal(r.sent, 1);
});

Deno.test("the digest puts everything that came due for a person in one email, grouped", async () => {
  const f = fake();
  const mk = (category: NotifyInput["category"], key: string, title: string) => input({
    category, key, kind: category, to: [OWNER], inApp: { title, link: "/app" },
    content: content(title, category === "review_new" ? { digest: { html: `<p>FRAGMENT ${title}</p>`, text: `FRAGMENT ${title}` } } : {}),
  });
  await runNotify(mk("approval_needed", "post:1", "A post is ready"), f.deps);
  await runNotify(mk("profile_issue", "change:1", "Website changed"), f.deps);
  await runNotify(mk("approval_needed", "photo:1", "Photos are ready"), f.deps);
  assert.equal(f.sent.length, 0);
  assert.deepEqual(f.rows.map((r) => r.email_state), ["digest", "digest", "digest"]);
  f.setNow("2026-11-10T17:05:00Z"); // 19:05 in Beirut
  const r = await releaseDue(f.deps);
  assert.deepEqual(r, { held: 0, digests: 1, digestItems: 3, failed: 0 });
  assert.equal(f.sent.length, 1);
  const mail = f.sent[0]!;
  assert.equal(mail.subject, "Yawmiyati: 1 profile change and 2 posts and photos to approve");
  assert.equal(mail.kind, "digest");
  assert.match(mail.html, /Website changed/);
  assert.match(mail.html, /A post is ready/);
  assert.match(mail.html, /Photos are ready/);
  assert.equal((mail.html.match(/background:#FFD60A/g) ?? []).length, 1); // one yellow button
  assert.deepEqual(f.rows.map((r) => r.email_state), ["sent", "sent", "sent"]);
  assert.deepEqual(await releaseDue(f.deps), { held: 0, digests: 0, digestItems: 0, failed: 0 });
});

Deno.test("a normal review outside opening hours waits for the digest and uses its own fragment there", async () => {
  const f = fake({ now: "2026-11-10T17:30:00Z", hours: "Mon to Sat 09:00 to 18:00" }); // Tuesday 19:30, closed
  await runNotify(input({ key: "review:7", to: [OWNER], content: content("New review", { digest: { html: "<p>FRAGMENT review</p>", text: "FRAGMENT review" } }) }), f.deps);
  assert.equal(f.rows[0]!.email_state, "digest");
  f.setNow("2026-11-11T17:05:00Z");
  await releaseDue(f.deps);
  assert.match(f.sent[0]!.html, /FRAGMENT review/);
  assert.equal(f.sent[0]!.subject, "Yawmiyati: 1 new review");
});

Deno.test("paused emails skip the email for what can be switched off, not for what cannot", async () => {
  const f = fake({ paused: "2026-11-17T00:00:00Z" });
  const a = await runNotify(input({ key: "review:8", to: [OWNER] }), f.deps);
  assert.equal(a.skipped, 1);
  assert.equal(f.rows[0]!.in_app, true);
  const b = await runNotify(input({ key: "billing:1", category: "billing", kind: "trial_d7", to: [OWNER] }), f.deps);
  assert.equal(b.sent, 1);
});

Deno.test("a send that failed is tried again by the next call, once", async () => {
  const f = fake({ failFirstSend: true });
  await assert.rejects(runNotify(input({ key: "review:9", to: [OWNER] }), f.deps), /resend 500/);
  assert.equal(f.rows[0]!.email_state, "failed");
  const again = await runNotify(input({ key: "review:9", to: [OWNER] }), f.deps);
  assert.equal(again.sent, 1);
  assert.equal(f.rows[0]!.email_state, "sent");
  const third = await runNotify(input({ key: "review:9", to: [OWNER] }), f.deps);
  assert.equal(third.sent, 0);
  assert.equal(f.sent.length, 1);
});

Deno.test("one person's failed send does not stop the others", async () => {
  const f = fake({ failFirstSend: true });
  await assert.rejects(runNotify(input({ key: "review:10" }), f.deps));
  assert.equal(f.sent.length, 2);
});

Deno.test("system mail goes straight to the outbox with its own dedupe key and no bell", async () => {
  const f = fake();
  const r = await runNotify({
    category: "direct", kind: "profile_check", key: "profile_check:abc", to: [{ email: "visitor@example.test", userId: null }],
    content: content("Your Google Profile Check"),
  }, f.deps);
  assert.equal(r.sent, 1);
  assert.equal(f.rows.length, 0);
  assert.equal(f.sent[0]!.dedupeKey, "profile_check:abc:visitor@example.test");
  assert.equal(f.sent[0]!.unsubscribe, false);
});

Deno.test("an unknown category is refused", async () => {
  await assert.rejects(runNotify(input({ key: "x", category: "made_up" as never }), fake().deps), /unknown category/);
});

Deno.test("only mail the owner can switch off carries an unsubscribe", async () => {
  const f = fake();
  await runNotify(input({ key: "r:1", to: [OWNER] }), f.deps);
  await runNotify(input({ key: "a:1", category: "access", kind: "access_granted", to: [OWNER] }), f.deps);
  assert.deepEqual(f.sent.map((s) => [s.category, s.unsubscribe]), [["review_new", true], ["access", false]]);
});
