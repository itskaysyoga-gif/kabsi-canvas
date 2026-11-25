// Harvey 4A part D: the SMTP conversation, the plain text message and every sending rule, with fakes and fictional
// example.com data. Nothing here opens a connection.
import assert from "node:assert/strict";
import { buildMessage, dataBlock, type Line, quotedPrintable, serverSays, smtpProbe, smtpSend } from "./smtp.ts";
import { type DueMessage, modeRefusal, sendTick, type SendDeps, type SendSettings, testFast } from "./send.ts";
import { emailOne, followUp, localParts, RAMP } from "./rules.ts";
import { checkDns, dkimBits, dmarcOk, spfOk, txtText } from "./dns.ts";
import { mailTesterAddressOk, mailTesterEmail, reportUrl, scoreOf } from "./mail-tester.ts";

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

/** An invented postal address, for the tests only. */
const POSTAL = "100 Example Street, Exampleville, TX 75001";
const DNS_OK = { ok: true, spf: true, dkim: true, dmarc: true, dkim_bits: 2048, problem: null };
const OPEN: SendSettings = { sending_open: true, test_mode: true, ...RAMP, started_on: "2026-11-02", stopped_reason: null, next_send_at: null };
const TEST: SendSettings = { ...OPEN, sending_open: false, started_on: null };
const MON_10 = new Date("2026-11-09T10:00:00Z");

function msg(over: Partial<DueMessage> = {}): DueMessage {
  return {
    id: "m1", prospect_id: "p1", parent_id: null, kind: "first", to_address: "hello@rose.example.com", subject: "Rose Lane Salon's Google profile",
    body: "Hi Rose Lane Salon team,\n\nkabsi.co\n\nkabsi.co/privacy", send_after: "2026-11-09T09:00:00Z", in_reply_to: null, references_ids: null,
    prospect: { email: "hello@rose.example.com", email_domain: "rose.example.com", time_zone: "Europe/London", test: false, status: "approved", country: "GB" },
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
    postal: POSTAL, dns: async () => (log.push("dns"), DNS_OK), saveDns: async () => void log.push("dns_saved"),
    killGate: async () => "open", now: MON_10, random: () => 0, ...over,
  };
  return { d, log };
}

Deno.test("open: one message per tick, the follow-up dated day 4 or 5, the next send at least 20 minutes later", async () => {
  const { d, log } = deps();
  assert.equal((await sendTick(d)).state, "sent");
  assert.deepEqual(log.filter((l) => !l.startsWith("refresh") && !l.startsWith("dns")), ["next:20", "deliver:hello@rose.example.com", "sent:m1:2026-11-13"]);
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
  const body = `Hi again. Happy to run that free check.\n\nI also have a few founding places: Kabsi for 19 US dollars a month for your first 12 months, then 29. Details: kabsi.co/founding/${slug}\n\nRashid Abou Hamzy, founder of Kabsi\nkabsi.co\n\nkabsi.co/privacy`;
  const follow = msg({ id: "f1", kind: "follow_up", parent_id: "m0", parent: first, body });
  for (const [founding, keeps] of [[{ slug, left: 4 }, true], [{ slug, left: 0 }, false], [null, false], [{ slug: "Other000000000000000Slug", left: 4 }, false]] as const) {
    let sent = "";
    const t = deps({ founding: async () => founding, deliver: async (_to, m, ok) => { sent = m; await ok(); } }, OPEN, [follow]);
    assert.equal((await sendTick(t.d)).state, "sent", JSON.stringify(founding));
    assert.equal(sent.includes("a few founding places"), keeps, JSON.stringify(founding));
    assert.ok(sent.includes("Rashid Abou Hamzy, founder of Kabsi"));
    assert.ok(sent.includes("Hi again. Happy to run that free check."), "the first line always goes");
  }
  const bare = msg({ id: "f2", kind: "follow_up", parent_id: "m0", parent: first, body: `Details: kabsi.co/founding/${slug}\n\nkabsi.co` });
  const t = deps({ founding: async () => null }, OPEN, [bare]);
  await sendTick(t.d);
  assert.ok(t.log.includes("failed:f2:invite_line_left_too_little"), "too little left: a person looks at it, nothing is sent");
});

// ─── OUTBOUND-3: CAN-SPAM, the deliverability gate, the kill gate, mail-tester

const US_MSG = () => {
  const one = emailOne({ business: "Oak Street Auto", kind: "auto repair shops", city: "Exampleville", detail: "Your site lists your hours, and keeping Google's hours the same saves wasted trips.", country: "US", postal: POSTAL });
  return msg({ to_address: "hello@oak.example.com", subject: one.subject, body: one.body,
    prospect: { email: "hello@oak.example.com", email_domain: "oak.example.com", time_zone: "America/Chicago", test: false, status: "approved", country: "US" } });
};
const MON_16_UTC = new Date("2026-11-09T16:00:00Z"); // 10:00 in Chicago

Deno.test("CAN-SPAM: honest From and subject; Email 1 never pretends to be a reply; a working mailto opt-out", async () => {
  let sent = "";
  const t = deps({ now: MON_16_UTC, deliver: async (_to, m, ok) => { sent = m; await ok(); } }, OPEN, [US_MSG()]);
  assert.equal((await sendTick(t.d)).state, "sent");
  assert.match(sent, /^From: Rashid Abou Hamzy <rashid@getkabsi\.com>\r\n/, "the real sender, by name, on Kabsi's own domain");
  assert.ok(!/\r\nReply-To:/i.test(sent), "replies go to the sender");
  assert.match(sent, /\r\nSubject: Oak Street Auto's Google profile\r\n/, "the subject says what the email is about");
  assert.ok(!/\r\nSubject: (Re|Fwd?):/i.test(sent), "Email 1 never says Re: or Fwd:");
  assert.match(sent, /\r\nList-Unsubscribe: <mailto:rashid@getkabsi\.com\?subject=no%20thanks>\r\n/);
  assert.ok(sent.replace(/=\r\n/g, "").includes("Reply 'no thanks' and I will not write again."), "the opt-out is in the body too");
});

Deno.test("CAN-SPAM: the postal address in every US footer; with no address set, nothing sends at all", async () => {
  const one = US_MSG();
  assert.ok(one.body.endsWith(`kabsi.co/privacy\nKabsi, ${POSTAL}`), "Email 1");
  assert.ok(followUp({ business: "Oak Street Auto", country: "US", postal: POSTAL }).body.endsWith(`\nKabsi, ${POSTAL}`), "the follow-up");
  assert.throws(() => emailOne({ business: "Oak Street Auto", kind: "x", city: "y", detail: "z", country: "US", postal: null }), "never built without one");
  assert.ok(!emailOne({ business: "Rose Lane Salon", kind: "x", city: "y", detail: "z", country: "GB" }).body.includes("Kabsi, "), "the UK footer is unchanged");

  const none = deps({ now: MON_16_UTC, postal: null }, OPEN, [US_MSG()]);
  assert.equal((await sendTick(none.d)).state, "no_postal_address");
  assert.ok(!none.log.some((l) => l.startsWith("deliver")));
  const gb = deps({ postal: null });
  assert.equal((await sendTick(gb.d)).state, "no_postal_address", "nothing at all, not even to the UK");

  const stale = deps({ now: MON_16_UTC, postal: "200 Other Road, Exampleville, TX 75002" }, OPEN, [US_MSG()]);
  await sendTick(stale.d);
  assert.ok(stale.log.includes("failed:m1:no_postal_address_in_footer"), "a draft with an old address is held for a person");
  const bare = deps({ now: MON_16_UTC }, OPEN, [{ ...US_MSG(), body: "Hi Oak Street Auto team,\n\nkabsi.co\n\nkabsi.co/privacy" }]);
  await sendTick(bare.d);
  assert.ok(bare.log.includes("failed:m1:no_postal_address_in_footer"));
});

Deno.test("CAN-SPAM: a postal address must be one real line with a number and no link-like text", async () => {
  const { postalAddress } = await import("./rules.ts");
  assert.equal(postalAddress("  100 Example Street,   Exampleville, TX 75001 "), POSTAL);
  assert.equal(postalAddress("PO Box 123, Exampleville, TX 75001"), "PO Box 123, Exampleville, TX 75001");
  for (const bad of ["", "Example Street", "P.O. Box 123, Exampleville", "100 Example St\nExampleville", "100 Example St, kabsi.co", "100 Example St — Suite 4", null]) {
    assert.equal(postalAddress(bad), null, String(bad));
  }
});

Deno.test("deliverability: nothing sends until SPF, DKIM and DMARC read correctly; the reading is recorded", async () => {
  const bad = deps({ dns: async () => ({ ok: false, spf: true, dkim: false, dmarc: true, dkim_bits: 1024, problem: "dkim_too_short" }) });
  assert.equal((await sendTick(bad.d)).state, "dns_not_ready");
  assert.ok(bad.log.includes("dns_saved"));
  assert.ok(!bad.log.some((l) => l.startsWith("deliver") || l.startsWith("next:")), "no slot taken, nothing sent");
  const ok = deps();
  assert.equal((await sendTick(ok.d)).state, "sent");
  assert.ok(ok.log.indexOf("dns") < ok.log.findIndex((l) => l.startsWith("deliver")), "read right before sending");
});

// The live records of getkabsi.com as read on 25 Nov 2026 (public DNS).
const LIVE_DKIM = `"v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApj6NDRTSZZ/6sTaKWNMALfq9PObgHsGpBGqdgc6pA3WRw5cYMkOAWda8JqphNBHScrhu9i2XCmgsF/5G1gPP36xYCFfl7/rehMt0eq95Lr3wY0C99x77tcjX9yZQSAPFPvDqoKAXEH2NMj+MvvqQ4T/4peiprQvBmZ5Xyg74TLV550zMYjRAmAvUfUvA/gw+Z" "yf2FnZzzHv1bmPMuxPQnLm65k9iYoajdQT1d0BYlE+rbh1QgI2zOPtRCEgbGs6TzJTvhUeZ0XG8/T1EDei0Kc208b1pVdHKKpbUSMfsY4mO2IpCEUh43IxsqMY+Cg7F0AcQcKG8zqB2tirPbYHDUQIDAQAB"`;
const LIVE = {
  "getkabsi.com": [`"google-site-verification=x"`, `"v=spf1 include:zoho.com ~all"`, `"zoho-verification=x.zmverify.zoho.com"`],
  "zmail._domainkey.getkabsi.com": [LIVE_DKIM],
  "_dmarc.getkabsi.com": [`"v=DMARC1; p=none; rua=mailto:rashid@getkabsi.com"`],
} as Record<string, string[]>;
const doh = (records: Record<string, string[]>) => async (url: string) => {
  const name = new URL(url).searchParams.get("name")!;
  return new Response(JSON.stringify({ Status: 0, Answer: (records[name] ?? []).map((data) => ({ type: 16, data })) }));
};

Deno.test("deliverability: the three records parsed (SPF with Zoho, DKIM zmail at 2048 bits, DMARC with a policy)", async () => {
  assert.equal(await dkimBits([txtText(LIVE_DKIM)]), 2048, "the two quoted halves joined");
  assert.deepEqual(await checkDns(doh(LIVE)), { ok: true, spf: true, dkim: true, dmarc: true, dkim_bits: 2048, problem: null });
  assert.ok(!spfOk(["v=spf1 include:zoho.com ~all", "v=spf1 -all"]), "two SPF records is a fail");
  assert.ok(!spfOk(["v=spf1 include:_spf.google.com ~all"]), "no Zoho");
  assert.ok(!spfOk(["v=spf1 include:zoho.com +all"]), "+all lets anyone send");
  assert.ok(!dmarcOk(["v=DMARC1; rua=mailto:x@getkabsi.com"]), "no policy");
  assert.ok(spfOk(["v=spf1 include:zohomail.com ~all"]), "Zoho's newer include");
  const noDkim = await checkDns(doh({ ...LIVE, "zmail._domainkey.getkabsi.com": [] }));
  assert.deepEqual([noDkim.ok, noDkim.problem], [false, "dkim_missing"]);
  const noDmarc = await checkDns(doh({ ...LIVE, "_dmarc.getkabsi.com": [] }));
  assert.deepEqual([noDmarc.ok, noDmarc.problem], [false, "dmarc"]);
  const down = await checkDns(async () => new Response("no", { status: 503 }));
  assert.deepEqual([down.ok, down.problem], [false, "dns_unreadable"], "no answer is never a pass");
});

Deno.test("the kill gate: once it ends Outbound, nothing is read or sent", async () => {
  const t = deps({ killGate: async () => "ended" });
  assert.equal((await sendTick(t.d)).state, "stopped");
  assert.ok(!t.log.some((l) => l.startsWith("deliver") || l === "refresh"));
  const w = deps({ killGate: async () => "waiting" });
  assert.equal((await sendTick(w.d)).sent, 0, "while the first 300 are judged, no new Email 1 goes");
  const f = msg({ id: "m2", kind: "follow_up", parent_id: "m1", parent: { status: "sent", message_id: "<ob.0@getkabsi.com>", sent_at: "2026-11-05T10:00:00Z" } });
  assert.equal((await sendTick(deps({ killGate: async () => "waiting" }, OPEN, [f]).d)).state, "sent", "follow-ups of the first 300 still go");
});

Deno.test("mail-tester: the address shape, the fictional US Email 1 with its footer, and the score read from the report", () => {
  assert.ok(mailTesterAddressOk("test-abc123@srv1.mail-tester.com"));
  for (const bad of ["test@example.com", "x@srv1.mail-tester.com.evil.example", "test-abc@mail-tester.com", 5]) assert.ok(!mailTesterAddressOk(bad), String(bad));
  const e = mailTesterEmail(POSTAL, MON_10);
  assert.equal(e.subject, "Oak Street Auto's Google profile");
  assert.ok(e.body.includes("auto repair shops in Exampleville") && e.body.endsWith(`Kabsi, ${POSTAL}`));
  assert.equal(reportUrl("test-abc123@srv1.mail-tester.com"), "https://www.mail-tester.com/test-abc123?format=json");
  assert.equal(scoreOf({ mark: 10 }), 10);
  assert.equal(scoreOf({ mark: 9.46 }), 9.5);
  assert.equal(scoreOf({ displayedMark: "8.2/10" }), 8.2);
  // The real report of 25 Nov 2026: mark is 0, the score is in the displayed text.
  assert.equal(scoreOf({ mark: 0, displayedMark: "10/10", commentedMark: "Your lovely total: 10/10" }), 10);
  assert.equal(scoreOf({ mark: 0, commentedMark: "Your lovely total: 9.5/10" }), 9.5);
  assert.equal(scoreOf({ status: true, mark: 0, displayedMark: "10/10", commentedMark: "Spam 2/10, Your lovely total: 7/10" }), 10);
  assert.equal(scoreOf({ commentedMark: "Spam 2/10, Your lovely total: 7/10" }), 7);
  for (const none of [{ displayedMark: "0/10" }, { status: false, displayedMark: "10/10" }, { displayedMark: "11/10" }, { commentedMark: "Spam 2/10" }, null, {}, { mark: 11 }, { mark: "10" }, { mark: 0 }]) assert.equal(scoreOf(none), null);
});
