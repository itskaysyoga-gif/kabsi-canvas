// Harvey 4A part E: replies, opt-outs (Harvey's English and Spanish cases, ported from kabsi-harvey
// tests/test_compliance_footer.py), bounces, out-of-office replies and complaints, with fictional example.com mail.
import assert from "node:assert/strict";
import { clearYes, looksLikeAutoReply, looksLikeBounce, optOutReason, OurText, stripQuoted } from "./classify.ts";
import { handleInbox, type InboxDeps, type Matched, yesReply } from "./inbox.ts";
import { fetchNew, type ByteIo, Imap, ImapError, ourIds, parseMessage } from "./mail.ts";
import { emailOne, FOOTER, linksOk } from "./rules.ts";

const isOptOut = (body: string) => {
  const own = stripQuoted(body);
  return optOutReason(new OurText([FOOTER]).remove(own), own) !== null;
};

Deno.test("Harvey's opt-outs are honoured wherever they wrote them", () => {
  for (const b of [
    "No thanks.", "no thank you\n\nOn Tue Rashid wrote:\n> A short, plain note.",
    "> Would you be open to a quick call?\nNo. Please remove me from your list.",
    "Hi Rashid,\n\n> Would you be open to a quick call?\n\nNo. Remove me from your list.",
    "On Tue Rashid wrote:\n> Open to a call?\nunsubscribe", "No, thanks.", "STOP", "Stop.", "  unsubscribe  ",
    "STOP\n\nSent from my iPhone", "Stop\n\nGet Outlook for iOS", "I'd ask that you do not\ncontact me again.",
    "No, gracias.", "Not interested, thanks.",
  ]) assert.ok(isOptOut(b), b);
});

Deno.test("Harvey's not-opt-outs: no thanks only as the phrase, and our own quoted footer never counts", () => {
  for (const b of [
    "Do you offer a monthly plan, yes or no\nThanks,\nBob", "Sounds good, call me.\n\nMario Bruno\nThanks for reaching out",
    "Interested. Can we talk next month? No Thanksgiving week though.", "Is it month to month, yes or no, thanks",
    "Do you require a long contract? Hoping the answer is no\nThanks\nBob", "Monday works, Tuesday no\nThanks, Jim",
    "Happy to chat Tuesday, no thanks needed for the note.",
    `Yes please.\n\nOn Tue Rashid wrote:\n> ${FOOTER}`,
    `Yes please.\n\n-----Original Message-----\nFrom: Rashid\n${FOOTER}`,
    `Yes please.\n${FOOTER}`,
  ]) assert.ok(!isOptOut(b), b);
});

Deno.test("Harvey's Spanish opt-outs and their look-alikes", () => {
  for (const r of ["Dejen de escribirme.", "Sáquenme de su lista.", "No quiero recibir más correos.", "Quiero desuscribirme",
    "No me interesa.", "No me interesa, gracias", "No estamos interesados, saludos.", "Les pido que me den de baja.",
    "No me escriban más, ya se lo dije antes.", "No tengo interés", "No, muchas gracias", "Basta de correos", "No no me interesa"]) {
    assert.ok(optOutReason(r, r), r);
  }
  for (const r of ["Sí o no, gracias", "Todavía no, gracias", "No, gracias a usted por escribir",
    "Queremos dar de baja a nuestro proveedor actual, ¿qué ofrecen?", "No me interesa el plan anual, pero sí el mensual.",
    "No me escriba hasta enero.", "Sáquenme de dudas: ¿cuánto cuesta?", "La tendencia es a la baja.",
    "No me interesa ahora, escríbeme en enero."]) {
    assert.equal(optOutReason(r, r), null, r);
  }
});

Deno.test("a clear yes, and only a clear yes", () => {
  for (const y of ["Yes please", "Yes, please.", "Sure", "Go ahead\n\nThanks\nAmy", "yes please run it", "Ok\n\nSent from my iPhone"]) assert.ok(clearYes(y), y);
  for (const n of ["Yes but how much is it?", "Not now", "What is this?", "Sure, if it is free", "Maybe later",
    "Yes please. Also can you call me tomorrow about our website and the other shop we run across town", "No"]) assert.ok(!clearYes(n), n);
});

Deno.test("bounces and out-of-office replies are recognised", () => {
  assert.ok(looksLikeBounce("MAILER-DAEMON@mx.example.com", "Undelivered Mail Returned to Sender", ""));
  assert.ok(looksLikeBounce("someone@example.com", "x", 'multipart/report; report-type=delivery-status; boundary="b"'));
  assert.ok(!looksLikeBounce("amy@rose.example.com", "Re: Rose Lane Salon's Google profile", "text/plain"));
  assert.ok(looksLikeAutoReply({ "auto-submitted": "auto-replied" }, "Re: x", "hi"));
  assert.ok(looksLikeAutoReply({}, "Out of Office: Re: x", "hi"));
  assert.ok(looksLikeAutoReply({ "x-autoreply": "yes" }, "Re: x", "hi"));
  assert.ok(!looksLikeAutoReply({}, "Re: x", "I'm away till Monday but yes please"), "wording alone is a person");
  assert.ok(!looksLikeAutoReply({ "auto-submitted": "no" }, "Re: x", "Yes please"));
});

Deno.test("MIME: headers unfolded and decoded, the text part found, our ids found", () => {
  const raw = [
    "From: Amy <amy@rose.example.com>", "Subject: =?UTF-8?B?UmU6IFJvc2UgTGFuZQ==?=", "Message-ID: <in1@rose.example.com>",
    "In-Reply-To: <ob.11111111-1111-4111-8111-111111111111@getkabsi.com>", "References: <x@y>\n <ob.11111111-1111-4111-8111-111111111111@getkabsi.com>",
    'Content-Type: multipart/alternative; boundary="zz"', "", "--zz", "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: quoted-printable", "", "Yes please, caf=C3=A9 owner here", "--zz", "Content-Type: text/html", "", "<p>Yes</p>", "--zz--", "",
  ].join("\r\n");
  const m = parseMessage(raw);
  assert.equal(m.from, "amy@rose.example.com");
  assert.equal(m.subject, "Re: Rose Lane");
  assert.equal(m.text.trim(), "Yes please, café owner here");
  assert.deepEqual(ourIds(`${m.inReplyTo} ${m.references}`), ["<ob.11111111-1111-4111-8111-111111111111@getkabsi.com>"]);
});

Deno.test("IMAP: read only (EXAMINE and BODY.PEEK), from the last UID, literal bodies read by size", async () => {
  const body = "Subject: hi\r\n\r\nYes\r\n";
  const script: Record<string, string> = {
    LOGIN: "a1 OK logged in\r\n",
    EXAMINE: "* OK [UIDVALIDITY 7] ok\r\na2 OK [READ-ONLY] done\r\n",
    SEARCH: "* SEARCH 41 42\r\na3 OK done\r\n",
    FETCH42: `* 2 FETCH (UID 42 BODY[]<0> {${new TextEncoder().encode(body).length}}\r\n${body})\r\na4 OK done\r\n`,
    LOGOUT: "* BYE\r\na5 OK bye\r\n",
  };
  const sent: string[] = [];
  let pending = "* OK [CAPABILITY IMAP4rev1] ready\r\n";
  const io: ByteIo = {
    read: async () => {
      if (!pending) return null;
      const out = new TextEncoder().encode(pending);
      pending = "";
      return out;
    },
    write: async (t) => {
      sent.push(t);
      const k = /LOGIN/.test(t) ? "LOGIN" : /EXAMINE/.test(t) ? "EXAMINE" : /SEARCH/.test(t) ? "SEARCH" : /FETCH 42/.test(t) ? "FETCH42" : "LOGOUT";
      pending = script[k];
    },
    close: () => {},
  };
  const r = await fetchNew(io, { user: "rashid@getkabsi.com", password: "pw", lastUid: 41, validity: "7", since: new Date() });
  assert.deepEqual(r.messages.map((m) => m.uid), [42]);
  assert.equal(r.messages[0].raw, body);
  assert.equal(r.lastUid, 42);
  assert.ok(sent.some((s) => /EXAMINE INBOX/.test(s)) && !sent.some((s) => /SELECT|STORE|\\Seen|EXPUNGE/i.test(s)));
  assert.ok(sent.some((s) => /UID SEARCH UID 42:\*/.test(s)) && sent.some((s) => /BODY\.PEEK\[\]/.test(s)));
});

/** A scripted IMAP server: each write gets the next reply. */
function scripted(replies: string[], first = "* OK ready\r\n") {
  const sent: string[] = [];
  let pending = first;
  const io: ByteIo = {
    read: async () => {
      if (!pending) return null;
      const out = new TextEncoder().encode(pending);
      pending = "";
      return out;
    },
    write: async (t) => {
      sent.push(t);
      pending = replies.shift() ?? "";
    },
    close: () => {},
  };
  return { io, sent };
}

const SPECIAL = 'p"a\\ss wörd{3}';

Deno.test("Inbox login: AUTHENTICATE PLAIN when offered, so no character of the password needs quoting", async () => {
  const s = scripted(["+ \r\n", "a1 OK [CAPABILITY IMAP4rev1] Success\r\n"]);
  const c = new Imap(s.io);
  assert.equal(await c.login("rashid@getkabsi.com", SPECIAL, await c.greet().then(() => "IMAP4rev1 AUTH=PLAIN AUTH=XOAUTH2")), "plain");
  assert.equal(s.sent[0], "a1 AUTHENTICATE PLAIN\r\n");
  const bytes = new TextEncoder().encode(`\u0000rashid@getkabsi.com\u0000${SPECIAL}`);
  assert.equal(s.sent[1], `${btoa(String.fromCharCode(...bytes))}\r\n`);
  assert.ok(!s.sent.some((x) => x.includes(SPECIAL)), "the password never travels as text");
});

Deno.test("Inbox login: LOGIN with quoted strings when PLAIN is not offered; capabilities asked when the greeting has none", async () => {
  const s = scripted(["* CAPABILITY IMAP4rev1 IDLE\r\na1 OK done\r\n", "a2 OK logged in\r\n"]);
  const c = new Imap(s.io);
  assert.equal(await c.login("rashid@getkabsi.com", 'p"a\\ss', await c.greet()), "login");
  assert.equal(s.sent[0], "a1 CAPABILITY\r\n");
  assert.equal(s.sent[1], 'a2 LOGIN "rashid@getkabsi.com" "p\\"a\\\\ss"\r\n');
});

Deno.test("Inbox login refused: the error carries Zoho's own words and never the password", async () => {
  const pw = "abcd1234efgh";
  const s = scripted(["+ \r\n", `a1 NO [AUTHENTICATIONFAILED] Invalid credentials ${pw}\r\n`]);
  const c = new Imap(s.io);
  await c.greet();
  await assert.rejects(c.login("rashid@getkabsi.com", pw, "IMAP4rev1 AUTH=PLAIN"), (e: unknown) => {
    assert.ok(e instanceof ImapError);
    assert.equal(e.step, "AUTHENTICATE");
    assert.equal(e.serverText, "NO [AUTHENTICATIONFAILED] Invalid credentials [redacted]");
    assert.ok(!e.message.includes(pw));
    return true;
  });
});

const PROSPECT: Matched["prospect"] = { id: "p1", email: "hello@rose.example.com", email_domain: "rose.example.com", business_name: "Rose Lane Salon", industry: "hair salon", city: "Exampleton", country: "GB", test: false };
const SENT = emailOne({ business: "Rose Lane Salon", kind: "hair salons", city: "Exampleton", detail: "Your site lists your opening hours, and keeping Google's hours the same saves wasted trips." }).body;
const OB = "<ob.11111111-1111-4111-8111-111111111111@getkabsi.com>";

function run(raw: string | string[], over: Partial<InboxDeps> = {}, prospect = PROSPECT) {
  const log: string[] = [];
  const deps: InboxDeps = {
    seen: async () => false,
    match: async (ids) => (ids.includes(OB) ? { message: { id: "m1", kind: "first", message_id: OB }, prospect, sentBodies: [SENT] } : null),
    matchBySender: async () => null, self: "rashid@getkabsi.com",
    record: async (e) => void log.push(`event:${e.kind}${e.intent ? `:${e.intent}` : ""}`),
    suppress: async (a, why, d) => void log.push(`suppress:${a}:${why}:${d}`),
    cancelQueue: async (_p, only) => void log.push(`cancel:${only ? "follow_up" : "all"}`),
    setStatus: async (_p, s) => void log.push(`status:${s}`),
    checkStops: async (why) => void log.push(`stops:${why}`),
    alert: async (key) => void log.push(`alert${/^[0-9a-f]{64}$/.test(key) ? "" : ":badkey"}`),
    freeCheck: async () => "ABC123",
    draftReply: async (d) => void log.push(`draft:${d.to_address}:${linksOk(d.body, "reply")}`),
    harveyHashes: async (h) => void log.push(`harvey:${h.length}`),
    ...over,
  };
  const raws = Array.isArray(raw) ? raw : [raw];
  return handleInbox(deps, raws.map((x, i) => ({ uid: i + 1, parsed: parseMessage(x), validity: "7" }))).then((r) => ({ r, log }));
}
const reply = (body: string, extra = "") =>
  `From: Amy <amy@rose.example.com>\r\nSubject: Re: Rose Lane Salon's Google profile\r\nMessage-ID: <in1@rose.example.com>\r\nIn-Reply-To: ${OB}\r\n${extra}\r\n${body}\r\n`;

Deno.test("a person's yes: follow-up cancelled, needs Rashid, alert, the free check, a drafted reply; nothing is sent", async () => {
  const { r, log } = await run(reply(`Yes please\n\nOn Mon Rashid wrote:\n> ${SENT.split("\n\n")[0]}`));
  assert.equal(r.yes, 1);
  assert.deepEqual(log, ["cancel:follow_up", "status:needs_you", "draft:amy@rose.example.com:true", "alert", "event:reply:yes"]);
  const body = yesReply("Rose Lane Salon", "ABC123");
  assert.equal(body.replace(/Facebook: .*\nInstagram: .*$/, "Facebook: F\nInstagram: I"), [
    "Hi Rose Lane Salon team,",
    "Thanks. Here is the free check of Rose Lane Salon's Google profile: kabsi.co/scan/ABC123",
    "The first 30 paying businesses pay the founding price and keep it while they stay subscribed: Essentials $19 a month or $190 a year, Pro $39 a month or $390 a year.",
    "Rashid Abou Hamzy, founder of Kabsi\nkabsi.co\nFacebook: F\nInstagram: I",
  ].join("\n\n"), "lane R's words, word for word");
  assert.ok(!/Nora/.test(body), "signed without Nora");
  assert.ok(!/Founding 25|25 founding|three months|kabsi\.co\/founding/.test(body), "the founding price, never Founding 25 (R-142 4a)");
  assert.match(body, /Facebook: www\.facebook\.com\/profile\.php\?id=\d+\nInstagram: www\.instagram\.com\/kabsi\.co$/);
  assert.ok(linksOk(body, "reply"));
  assert.ok(!/[–—!]/.test(body));
});

Deno.test("a person's other reply: needs Rashid, alert, no draft; the free check is not run", async () => {
  let checked = false;
  const { log } = await run(reply("What does it cost?"), { freeCheck: async () => { checked = true; return "X1234"; } });
  assert.deepEqual(log, ["cancel:follow_up", "status:needs_you", "alert", "event:reply:other"]);
  assert.equal(checked, false);
});

Deno.test("an opt-out: the address and the business's own domain suppressed, everything cancelled, nothing sent, Harvey told", async () => {
  const { log } = await run(reply("No thanks"));
  assert.deepEqual(log, ["suppress:hello@rose.example.com:opt_out:true", "suppress:amy@rose.example.com:opt_out:true",
    "cancel:all", "status:opted_out", "event:opt_out", "harvey:3"]);
});

Deno.test("an out-of-office: recorded and ignored, the schedule stays", async () => {
  const { log } = await run(reply("I am out of the office until Monday.", "Auto-Submitted: auto-replied\r\n"));
  assert.deepEqual(log, ["event:auto_reply"]);
});

Deno.test("a bounce: matched by the returned headers, suppressed, queue cancelled, stop rules checked", async () => {
  const raw = `From: MAILER-DAEMON@mx.example.com\r\nSubject: Undelivered Mail Returned to Sender\r\nMessage-ID: <b1@mx.example.com>\r\nContent-Type: text/plain\r\n\r\nThe message could not be delivered.\r\nMessage-ID: ${OB}\r\n`;
  const { log } = await run(raw);
  assert.deepEqual(log, ["suppress:hello@rose.example.com:bounce:false", "cancel:all", "status:bounced", "event:bounce", "stops:bounce", "harvey:1"]);
});

Deno.test("a complaint stops sending", async () => {
  const { log } = await run(reply("This is spam. I will report you."));
  assert.equal(log[0], "stops:complaint", "the stop comes first");
  assert.ok(log.includes("event:complaint") && log.includes("cancel:all"));
});

Deno.test("mail that is not about an Outbound email, or already handled, is left alone", async () => {
  const a = await run("From: news@shop.example.com\r\nSubject: Our newsletter\r\nMessage-ID: <n1@shop.example.com>\r\n\r\nHello\r\n");
  assert.deepEqual(a.log, []);
  const b = await run(reply("Yes please"), { seen: async () => true });
  assert.deepEqual(b.log, []);
});

Deno.test("test mode: the fictional business's address is suppressed, never the test inbox; Harvey is not told", async () => {
  const { log } = await run(reply("unsubscribe"), {}, { ...PROSPECT, email: "hello.1@roselanesalon.example.com", email_domain: "roselanesalon.example.com", test: true });
  assert.deepEqual(log, ["suppress:hello.1@roselanesalon.example.com:opt_out:true", "cancel:all", "status:opted_out", "event:opt_out"]);
});

Deno.test("review: the mailto unsubscribe (no thread headers) is matched by its sender and honoured", async () => {
  const raw = "From: amy@rose.example.com\r\nSubject: no thanks\r\nMessage-ID: <u1@rose.example.com>\r\n\r\n\r\n";
  const { log } = await run(raw, { matchBySender: async (a) => (a === "amy@rose.example.com" ? { message: { id: "m1", kind: "first", message_id: OB }, prospect: PROSPECT, sentBodies: [SENT] } : null) });
  assert.ok(log.includes("event:opt_out") && log.includes("cancel:all"));
});

Deno.test("review: a failure leaves the message and those after it for the next run", async () => {
  let n = 0;
  const { r, log } = await run([reply("Yes please"), reply("Another").replace("<in1@", "<in2@")], {
    cancelQueue: async () => { if (n++ === 0) throw new Error("db down"); },
  });
  assert.equal(r.failed, 1);
  assert.equal(r.handled_to_uid, null);
  assert.ok(!log.some((l) => l.startsWith("event:")), "nothing is marked done, so the run repeats it all");
});

Deno.test("review: delays and success reports are not bounces; ordinary words are not complaints; own mail is skipped", async () => {
  assert.ok(!looksLikeBounce("MAILER-DAEMON@mx.example.com", "Delivery Status Notification (Delay)", "", "Action: delayed\n"));
  assert.ok(looksLikeBounce("MAILER-DAEMON@mx.example.com", "Delivery Status Notification (Failure)", "", "Action: failed\n"));
  for (const t of ["Please check your spam folder", "We get customer complaints about Google", "Smith & Co Solicitors\nYes please"]) {
    const { log } = await run(reply(t));
    assert.ok(!log.includes("event:complaint"), t);
  }
  const own = await run(`From: rashid@getkabsi.com\r\nSubject: Re: x\r\nMessage-ID: <ob.22222222-2222-4222-8222-222222222222@getkabsi.com>\r\nIn-Reply-To: ${OB}\r\n\r\nHi again.\r\n`);
  assert.deepEqual(own.log, []);
});

Deno.test("review: Message-ID headers are read as tokens, never decoded, so no line break reaches a draft", () => {
  const m = parseMessage("From: a@b.example.com\r\nMessage-ID: =?UTF-8?B?PHhAeT4NCkJjYzogYw==?=\r\nReferences: <r1@x.example> junk\r\n\r\nhi\r\n");
  assert.equal(m.messageId, "");
  assert.equal(m.references, "<r1@x.example>");
});

Deno.test("the reply to a yes uses the possessive: Harbor Barbers', Moss', Maple Nails' and an apostrophe already there", () => {
  for (const [name, own] of [["Harbor Barbers", "Harbor Barbers'"], ["Moss", "Moss'"], ["Maple Nails'", "Maple Nails'"], ["Rose Lane Salon", "Rose Lane Salon's"]]) {
    const body = yesReply(name, "ABC123");
    assert.ok(body.includes(`Thanks. Here is the free check of ${own} Google profile: kabsi.co/scan/ABC123`));
    assert.ok(body.startsWith(`Hi ${name} team,`));
    assert.ok(!/s's |''/.test(body));
    assert.ok(!/[–—!]/.test(body));
  }
});
