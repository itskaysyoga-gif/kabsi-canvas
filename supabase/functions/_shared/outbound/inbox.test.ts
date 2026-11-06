// Harvey 4A part E: replies, opt-outs (Harvey's English and Spanish cases, ported from kabsi-harvey
// tests/test_compliance_footer.py), bounces, out-of-office replies and complaints, with fictional example.com mail.
import assert from "node:assert/strict";
import { clearYes, looksLikeAutoReply, looksLikeBounce, optOutReason, OurText, stripQuoted } from "./classify.ts";
import { handleInbox, type InboxDeps, type Matched, yesReply } from "./inbox.ts";
import { fetchNew, type ByteIo, ourIds, parseMessage } from "./mail.ts";
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
  assert.ok(looksLikeAutoReply({}, "Re: x", "I am currently out of the office until Monday."));
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
  let pending = "* OK ready\r\n";
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

const PROSPECT: Matched["prospect"] = { id: "p1", email: "hello@rose.example.com", email_domain: "rose.example.com", business_name: "Rose Lane Salon", industry: "hair salon", city: "Exampleton", country: "GB", test: false };
const SENT = emailOne({ business: "Rose Lane Salon", kind: "hair salons", city: "Exampleton", detail: "Your site lists your opening hours, and keeping Google's hours the same saves wasted trips." }).body;
const OB = "<ob.11111111-1111-4111-8111-111111111111@getkabsi.com>";

function run(raw: string, over: Partial<InboxDeps> = {}, prospect = PROSPECT) {
  const log: string[] = [];
  const deps: InboxDeps = {
    seen: async () => false,
    match: async (ids) => (ids.includes(OB) ? { message: { id: "m1", kind: "first", message_id: OB }, prospect, sentBodies: [SENT] } : null),
    record: async (e) => void log.push(`event:${e.kind}${e.intent ? `:${e.intent}` : ""}`),
    suppress: async (a, why, d) => void log.push(`suppress:${a}:${why}:${d}`),
    cancelQueue: async (_p, only) => void log.push(`cancel:${only ? "follow_up" : "all"}`),
    setStatus: async (_p, s) => void log.push(`status:${s}`),
    checkStops: async (why) => void log.push(`stops:${why}`),
    alert: async () => void log.push("alert"),
    freeCheck: async () => "ABC123",
    draftReply: async (d) => void log.push(`draft:${d.to_address}:${linksOk(d.body, "reply")}`),
    harveyHashes: async (h) => void log.push(`harvey:${h.length}`),
    ...over,
  };
  return handleInbox(deps, [{ uid: 1, parsed: parseMessage(raw), validity: "7" }]).then((r) => ({ r, log }));
}
const reply = (body: string, extra = "") =>
  `From: Amy <amy@rose.example.com>\r\nSubject: Re: Rose Lane Salon's Google profile\r\nMessage-ID: <in1@rose.example.com>\r\nIn-Reply-To: ${OB}\r\n${extra}\r\n${body}\r\n`;

Deno.test("a person's yes: follow-up cancelled, needs Rashid, alert, the free check, a drafted reply; nothing is sent", async () => {
  const { r, log } = await run(reply(`Yes please\n\nOn Mon Rashid wrote:\n> ${SENT.split("\n\n")[0]}`));
  assert.equal(r.yes, 1);
  assert.deepEqual(log, ["event:reply:yes", "cancel:follow_up", "status:needs_you", "alert", "draft:amy@rose.example.com:true"]);
  const body = yesReply("Rose Lane Salon", "ABC123");
  assert.match(body, /kabsi\.co\/scan\/ABC123/);
  assert.match(body, /Drafted with Nora, Kabsi's AI assistant\./);
  assert.match(body, /Facebook: www\.facebook\.com\/profile\.php\?id=\d+\nInstagram: www\.instagram\.com\/kabsi\.co$/);
  assert.ok(!/[–—!]/.test(body));
});

Deno.test("a person's other reply: needs Rashid, alert, no draft; the free check is not run", async () => {
  let checked = false;
  const { log } = await run(reply("What does it cost?"), { freeCheck: async () => { checked = true; return "X1234"; } });
  assert.deepEqual(log, ["event:reply:other", "cancel:follow_up", "status:needs_you", "alert"]);
  assert.equal(checked, false);
});

Deno.test("an opt-out: the address and the business's own domain suppressed, everything cancelled, nothing sent, Harvey told", async () => {
  const { log } = await run(reply("No thanks"));
  assert.deepEqual(log, ["event:opt_out", "suppress:hello@rose.example.com:opt_out:true", "suppress:amy@rose.example.com:opt_out:true",
    "cancel:all", "status:opted_out", "harvey:3"]);
});

Deno.test("an out-of-office: recorded and ignored, the schedule stays", async () => {
  const { log } = await run(reply("I am out of the office until Monday.", "Auto-Submitted: auto-replied\r\n"));
  assert.deepEqual(log, ["event:auto_reply"]);
});

Deno.test("a bounce: matched by the returned headers, suppressed, queue cancelled, stop rules checked", async () => {
  const raw = `From: MAILER-DAEMON@mx.example.com\r\nSubject: Undelivered Mail Returned to Sender\r\nMessage-ID: <b1@mx.example.com>\r\nContent-Type: text/plain\r\n\r\nThe message could not be delivered.\r\nMessage-ID: ${OB}\r\n`;
  const { log } = await run(raw);
  assert.deepEqual(log, ["event:bounce", "suppress:hello@rose.example.com:bounce:false", "cancel:all", "status:bounced", "harvey:1", "stops:bounce"]);
});

Deno.test("a complaint stops sending", async () => {
  const { log } = await run(reply("This is spam. I will report you."));
  assert.ok(log.includes("event:complaint") && log.includes("stops:complaint") && log.includes("cancel:all"));
});

Deno.test("mail that is not about an Outbound email, or already handled, is left alone", async () => {
  const a = await run("From: news@shop.example.com\r\nSubject: Our newsletter\r\nMessage-ID: <n1@shop.example.com>\r\n\r\nHello\r\n");
  assert.deepEqual(a.log, []);
  const b = await run(reply("Yes please"), { seen: async () => true });
  assert.deepEqual(b.log, []);
});

Deno.test("test mode: the fictional business's address is suppressed, never the test inbox; Harvey is not told", async () => {
  const { log } = await run(reply("unsubscribe"), {}, { ...PROSPECT, email: "hello.1@roselanesalon.example.com", email_domain: "roselanesalon.example.com", test: true });
  assert.deepEqual(log, ["event:opt_out", "suppress:hello.1@roselanesalon.example.com:opt_out:true", "cancel:all", "status:opted_out"]);
});
