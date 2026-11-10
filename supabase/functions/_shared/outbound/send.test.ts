// Harvey 4A part D: the SMTP conversation, the plain text message and every sending rule, with fakes and fictional
// example.com data. Nothing here opens a connection.
import assert from "node:assert/strict";
import { buildMessage, dataBlock, type Line, quotedPrintable, serverSays, smtpProbe, smtpSend } from "./smtp.ts";
import { type DueMessage, modeRefusal, sendTick, type SendDeps, type SendSettings, testFast } from "./send.ts";
import { localParts, RAMP } from "./rules.ts";

function fakeServer(replies: string[]) {
  const written: string[] = [];
  let closed = false;
  const io: Line = {
    readLine: async () => replies.shift() ?? null,
    write: async (t) => void written.push(t),
    close: () => void (closed = true),
  };
  return { io, written, closed: () => closed };
}

Deno.test("SMTP: EHLO, AUTH PLAIN, MAIL, RCPT, DATA, QUIT, and the connection is closed", async () => {
  const s = fakeServer(["220 smtp.example ESMTP", "250-smtp.example", "250 AUTH PLAIN LOGIN", "235 ok", "250 ok", "250 ok", "354 go", "250 queued", "221 bye"]);
  await smtpSend(s.io, { user: "rashid@getkabsi.com", password: "app-password", from: "rashid@getkabsi.com", to: "inbox@test.example.com", message: "Subject: x\r\n\r\nhi\r\n" });
  assert.equal(s.written[0], "EHLO getkabsi.com\r\n");
  assert.match(s.written[1], /^AUTH PLAIN /);
  assert.equal(s.written[2], "MAIL FROM:<rashid@getkabsi.com>\r\n");
  assert.equal(s.written[3], "RCPT TO:<inbox@test.example.com>\r\n");
  assert.ok(s.written[5].endsWith("\r\n.\r\n"));
  assert.ok(s.closed());
});

Deno.test("SMTP: a refused step throws with the step and code, never the password", async () => {
  const s = fakeServer(["220 hi", "250 ok", "535 bad credentials"]);
  await assert.rejects(smtpSend(s.io, { user: "u", password: "secret-value", from: "a@b.example", to: "c@d.example", message: "x" }),
    (e: Error & { step?: string }) => e.step === "auth" && !e.message.includes("secret-value"));
  assert.ok(s.closed());
});

Deno.test("the message: plain text, UTF-8, a real Message-ID, threading, a mailto List-Unsubscribe, no HTML", () => {
  const m = buildMessage({
    from: { name: "Rashid Abou Hamzy", address: "rashid@getkabsi.com" }, to: "hello@rose.example.com", subject: "Re: Rose Lane Salon's Google profile",
    body: "Hi again.\n.a line with a dot\nkabsi.co", messageId: "<ob.1@getkabsi.com>", date: new Date("2026-11-09T10:00:00Z"),
    inReplyTo: "<ob.0@getkabsi.com>", references: "<ob.0@getkabsi.com>",
  });
  assert.match(m, /^From: Rashid Abou Hamzy <rashid@getkabsi\.com>\r\n/);
  assert.match(m, /\r\nMessage-ID: <ob\.1@getkabsi\.com>\r\n/);
  assert.match(m, /\r\nIn-Reply-To: <ob\.0@getkabsi\.com>\r\nReferences: <ob\.0@getkabsi\.com>\r\n/);
  assert.match(m, /\r\nList-Unsubscribe: <mailto:rashid@getkabsi\.com\?subject=no%20thanks>\r\n/);
  assert.match(m, /\r\nContent-Type: text\/plain; charset=UTF-8\r\n/);
  assert.ok(!/text\/html|<img|List-Unsubscribe-Post|X-Track/i.test(m));
  assert.ok(dataBlock(m).includes("\r\n..a line with a dot\r\n"), "dot-stuffed");
  assert.equal(quotedPrintable("Café = good"), "Caf=C3=A9 =3D good");
  assert.ok(quotedPrintable("x".repeat(200)).split("\r\n").every((l) => l.length <= 76));
});

const OPEN: SendSettings = { sending_open: true, test_mode: true, ...RAMP, started_on: "2026-11-02", stopped_reason: null, next_send_at: null };
const TEST: SendSettings = { ...OPEN, sending_open: false, started_on: null };
const MON_10 = new Date("2026-11-09T10:00:00Z");

function msg(over: Partial<DueMessage> = {}): DueMessage {
  return {
    id: "m1", prospect_id: "p1", parent_id: null, kind: "first", to_address: "hello@rose.example.com", subject: "Rose Lane Salon's Google profile",
    body: "Hi Rose Lane Salon team,\n\nkabsi.co\n\nkabsi.co/privacy", send_after: "2026-11-09T09:00:00Z", in_reply_to: null, references_ids: null,
    prospect: { email: "hello@rose.example.com", email_domain: "rose.example.com", time_zone: "Europe/London", test: false, status: "approved" },
    parent: null, ...over,
  };
}

function deps(over: Partial<SendDeps> = {}, settings = OPEN, due: DueMessage[] = [msg()]) {
  const log: string[] = [];
  const d: SendDeps = {
    settings: async () => settings, refreshSuppression: async () => void log.push("refresh"),
    due: async (_n, testOnly) => (testOnly ? due.filter((m) => m.prospect.test) : due), failStale: async () => 0,
    reserveSlot: async (gap) => (log.push(`next:${Math.round(gap / 60000)}`), true), claim: async () => true,
    suppressed: async () => false, heardFrom: async () => false, sentOn: async () => 0, sentThisMonth: async () => 0,
    deliver: async (to, _m, accepted) => { log.push(`deliver:${to}`); await accepted(); },
    markSent: async (m, _id, _at, f) => void log.push(`sent:${m.id}:${f ? localParts(f, "Europe/London").date : "none"}`),
    markCancelled: async (ids, why) => void log.push(`cancel:${ids.join(",")}:${why}`),
    markFailed: async (id, why) => void log.push(`failed:${id}:${why}`), founding: async () => null,
    testRecipients: ["inbox@test.example.com"], sender: { name: "Rashid Abou Hamzy", address: "rashid@getkabsi.com" },
    now: MON_10, random: () => 0, ...over,
  };
  return { d, log };
}

Deno.test("open: one message per tick, the follow-up dated day 4 or 5, the next send at least 20 minutes later", async () => {
  const { d, log } = deps();
  assert.equal((await sendTick(d)).state, "sent");
  assert.deepEqual(log.filter((l) => !l.startsWith("refresh")), ["next:20", "deliver:hello@rose.example.com", "sent:m1:2026-11-13"]);
});

Deno.test("locked: nothing is read or sent; a stop wins over everything; spacing holds", async () => {
  for (const s of [{ ...OPEN, sending_open: false, test_mode: false }, { ...OPEN, stopped_reason: "complaint" }, { ...OPEN, next_send_at: "2026-11-09T10:05:00Z" }]) {
    const { d, log } = deps({}, s);
    const r = await sendTick(d);
    assert.notEqual(r.state, "sent");
    assert.ok(!log.some((l) => l.startsWith("deliver")));
  }
});

Deno.test("test mode: only a test business to a test address; a real business waits, approved", async () => {
  const testMsg = msg({ to_address: "inbox@test.example.com", prospect: { ...msg().prospect, test: true } });
  const a = deps({}, TEST, [testMsg]);
  assert.equal((await sendTick(a.d)).state, "sent");
  assert.ok(a.log.includes("deliver:inbox@test.example.com"));
  const b = deps({}, TEST, [msg()]);
  assert.equal((await sendTick(b.d)).sent, 0);
  assert.ok(!b.log.some((l) => l.startsWith("deliver") || l.startsWith("failed")), "a real business is never sent in test mode and stays approved");
  const many = deps({}, TEST, [...Array.from({ length: 25 }, (_, i) => msg({ id: `r${i}` })), { ...testMsg, id: "t1" }]);
  assert.equal((await sendTick(many.d)).sent, 1, "real businesses waiting never block a test message");
  const c = deps({}, TEST, [msg({ to_address: "someone@else.example.com", prospect: { ...msg().prospect, test: true } })]);
  await sendTick(c.d);
  assert.ok(c.log.includes("failed:m1:not_a_test_recipient"));
  assert.equal(modeRefusal(OPEN, msg({ prospect: { ...msg().prospect, test: true } }), []), "test_business_while_open");
  assert.equal(modeRefusal(OPEN, msg({ to_address: "other@rose.example.com" }), []), "not_the_business_address");
});

Deno.test("the window and the caps", async () => {
  const sat = deps({ now: new Date("2026-11-07T11:00:00Z") });
  assert.equal((await sendTick(sat.d)).sent, 0, "Saturday");
  const late = deps({ now: new Date("2026-11-09T17:30:00Z") });
  assert.equal((await sendTick(late.d)).sent, 0, "after 17:00");
  assert.equal((await sendTick(deps({ sentOn: async () => 5 }, { ...OPEN, started_on: "2026-11-08" }).d)).state, "day_full", "week 1: 5 a day");
  assert.equal((await sendTick(deps({ sentOn: async () => 9 }, { ...OPEN, started_on: "2026-11-01" }).d)).state, "sent", "day 9: 10 a day");
  assert.equal((await sendTick(deps({ sentThisMonth: async () => 300 }).d)).state, "month_full");
});

Deno.test("the test run's setting (30.39 item 12): window and spacing shortened only while locked, in test mode, before its end", async () => {
  const testMsg = msg({ to_address: "inbox@test.example.com", prospect: { ...msg().prospect, test: true } });
  const FRI_20 = new Date("2026-11-06T20:00:00Z");
  const live = { ...TEST, test_fast_until: "2026-11-06T22:00:00Z" };
  assert.ok(testFast(live, FRI_20));
  const fast = deps({ now: FRI_20 }, live, [testMsg]);
  assert.equal((await sendTick(fast.d)).state, "sent", "outside 9:00 to 17:00 while live");
  assert.ok(fast.log.includes("next:1"), "1 minute apart while live");
  assert.equal((await sendTick(deps({ now: FRI_20, sentOn: async () => 5 }, live, [testMsg]).d)).state, "day_full", "the day's cap still holds");
  const ended = deps({ now: new Date("2026-11-06T22:00:01Z") }, live, [testMsg]);
  assert.equal((await sendTick(ended.d)).sent, 0, "ended: the window holds again");
  for (const s of [{ ...live, sending_open: true }, { ...live, test_mode: false }, { ...TEST, test_fast_until: null }]) {
    assert.ok(!testFast(s, FRI_20), JSON.stringify(s));
  }
  const open = deps({}, { ...OPEN, test_fast_until: "2026-11-09T12:00:00Z" });
  assert.equal((await sendTick(open.d)).state, "sent");
  assert.ok(open.log.includes("next:20"), "never shortened once sending is open");
  const real = deps({ now: FRI_20 }, live);
  assert.equal((await sendTick(real.d)).sent, 0, "a real business never goes in test mode");
});

Deno.test("test mode: the test inbox is a Kabsi user and on the list, so suppression reads the test business's own address", async () => {
  const testMsg = msg({ to_address: "inbox@test.example.com", prospect: { ...msg().prospect, test: true } });
  const inboxListed = deps({ suppressed: async (a) => a === "inbox@test.example.com" }, TEST, [testMsg]);
  assert.equal((await sendTick(inboxListed.d)).state, "sent", "the test inbox being a Kabsi user does not cancel a test email");
  const bizListed = deps({ suppressed: async (a) => a.endsWith("@rose.example.com") }, TEST, [testMsg]);
  assert.equal((await sendTick(bizListed.d)).cancelled, 1, "a test business that said no is still never written to");
  const open = deps({ suppressed: async (a) => a === "other@elsewhere.example.com" }, OPEN, [msg({ kind: "reply", to_address: "other@elsewhere.example.com" })]);
  assert.equal((await sendTick(open.d)).cancelled, 1, "open: the address written to is checked too");
});

Deno.test("suppression is checked again right before sending", async () => {
  const { d, log } = deps({ suppressed: async (a) => a.endsWith("@rose.example.com") });
  assert.equal((await sendTick(d)).cancelled, 1);
  assert.ok(log.includes("cancel:m1:suppressed"));
  assert.ok(!log.some((l) => l.startsWith("deliver")));
});

Deno.test("the follow-up: same thread, only after Email 1 is sent, cancelled by any word from the business", async () => {
  const f = msg({ id: "m2", kind: "follow_up", parent_id: "m1", subject: "Re: Rose Lane Salon's Google profile",
    parent: { status: "sent", message_id: "<ob.0@getkabsi.com>", sent_at: "2026-11-05T10:00:00Z" } });
  let sentMessage = "";
  const a = deps({ deliver: async (_t, m, ok) => { sentMessage = m; await ok(); } }, OPEN, [f]);
  assert.equal((await sendTick(a.d)).state, "sent");
  assert.match(sentMessage, /\r\nIn-Reply-To: <ob\.0@getkabsi\.com>\r\n/);
  assert.ok(a.log.includes("sent:m2:none"));
  const b = deps({ heardFrom: async () => true }, OPEN, [f]);
  await sendTick(b.d);
  assert.ok(b.log.includes("cancel:m2:heard_from_business"));
  const c = deps({}, OPEN, [{ ...f, parent: { status: "approved", message_id: null, sent_at: null } }]);
  assert.equal((await sendTick(c.d)).sent, 0, "never before Email 1");
});

Deno.test("a message is claimed before it is sent; the slot is atomic; accepted counts as sent even if the goodbye fails", async () => {
  const taken = deps({ claim: async () => false });
  assert.equal((await sendTick(taken.d)).sent, 0);
  assert.ok(!taken.log.some((l) => l.startsWith("deliver")), "another tick has it");
  const busy = deps({ reserveSlot: async () => false });
  assert.equal((await sendTick(busy.d)).state, "spacing");
  const quit = deps({ deliver: async (_t, _m, ok) => { await ok(); throw Object.assign(new Error("quit"), { step: "timeout" }); } });
  assert.equal((await sendTick(quit.d)).state, "sent");
  assert.ok(!quit.log.some((l) => l.startsWith("failed")));
  const silent = deps({ deliver: async () => { throw Object.assign(new Error("timeout"), { step: "timeout" }); } });
  assert.equal((await sendTick(silent.d)).state, "failed");
  assert.ok(silent.log.includes("failed:m1:smtp_timeout"), "never accepted: failed, never re-sent by itself");
});

Deno.test("no header can carry a line break: Message-IDs are kept as tokens only", () => {
  const m = buildMessage({ from: { name: "Rashid Abou Hamzy", address: "rashid@getkabsi.com" }, to: "a@b.example.com", subject: "Re: x\r\nBcc: c@d.example.com",
    body: "Hi", messageId: "<ob.1@getkabsi.com>", date: new Date(), inReplyTo: "<x@y.example>\r\nContent-Type: text/html", references: "<x@y.example> junk <z@y.example>" });
  assert.ok(!/\r\nBcc:|\r\nContent-Type: text\/html/.test(m));
  assert.match(m, /\r\nIn-Reply-To: <x@y\.example>\r\n/);
  assert.match(m, /\r\nReferences: <x@y\.example> <z@y\.example>\r\n/);
});

Deno.test("links and house style are checked again; a failed delivery is recorded with its step only", async () => {
  const a = deps({}, OPEN, [msg({ body: "Hi team, see https://elsewhere.example.com now" })]);
  await sendTick(a.d);
  assert.ok(a.log.includes("failed:m1:house_style_or_links"));
  const b = deps({ deliver: async () => { throw Object.assign(new Error("smtp auth refused (535)"), { step: "auth" }); } });
  assert.equal((await sendTick(b.d)).state, "failed");
  assert.ok(b.log.includes("failed:m1:smtp_auth"));
});

Deno.test("SMTP probe: logs in and quits, never MAIL, RCPT or DATA, so nothing is sent", async () => {
  const ok = fakeServer(["220 smtp.example ESMTP", "250-smtp.example", "250 AUTH PLAIN LOGIN", "235 Authentication Successful", "221 bye"]);
  const r = await smtpProbe(ok.io, { user: "rashid@getkabsi.com", password: "app-password" });
  assert.deepEqual({ ok: r.ok, code: r.code }, { ok: true, code: 235 });
  assert.ok(!ok.written.some((x) => /^(MAIL|RCPT|DATA)/.test(x)));
  assert.ok(ok.written.some((x) => x.startsWith("QUIT")));
  const no = fakeServer(["220 smtp.example ESMTP", "250 smtp.example", "535 Authentication Failed app-password"]);
  const r2 = await smtpProbe(no.io, { user: "rashid@getkabsi.com", password: "app-password" });
  assert.deepEqual(r2, { ok: false, step: "auth", code: 535, text: "Authentication Failed [redacted]" });
});

Deno.test("serverSays: printable, short, and every secret and its base64 form cut out", () => {
  assert.equal(serverSays("NO bad c2VjcmV0LXZhbHVl and secret-value\r\n\u0007", ["secret-value"]), "NO bad [redacted] and [redacted]");
  assert.equal(serverSays("x".repeat(500)).length, 160);
});

Deno.test("Outbound 2: a follow-up sends its invite line only while the link is current and places remain", async () => {
  const slug = "FakeSlug0000000000Test12"; // invented
  const first = { status: "sent", message_id: "<ob.0@getkabsi.com>", sent_at: "2026-11-04T10:00:00Z" };
  const body = `Hi again. Happy to run that free check.\n\nI also have founding places open: three months of Kabsi Pro free, and you tell me what to make better. Details: kabsi.co/founding/${slug}\n\nRashid Abou Hamzy, founder of Kabsi\nkabsi.co\n\nkabsi.co/privacy`;
  const follow = msg({ id: "f1", kind: "follow_up", parent_id: "m0", parent: first, body });
  for (const [founding, keeps] of [[{ slug, left: 4 }, true], [{ slug, left: 0 }, false], [null, false], [{ slug: "Other000000000000000Slug", left: 4 }, false]] as const) {
    let sent = "";
    const t = deps({ founding: async () => founding, deliver: async (_to, m, ok) => { sent = m; await ok(); } }, OPEN, [follow]);
    assert.equal((await sendTick(t.d)).state, "sent", JSON.stringify(founding));
    assert.equal(sent.includes("founding places open"), keeps, JSON.stringify(founding));
    assert.ok(sent.includes("Rashid Abou Hamzy, founder of Kabsi"));
  }
});
