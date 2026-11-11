// Signup 1 (30.50 item 3): the sign-in seam inside the real agent, on the fake world (world.test-helpers.ts), and the new
// sign-in notice with its "Sign me out everywhere" tap. The seam sits after STOP and before every other route; the rest of
// the WhatsApp suite runs unchanged (the World gives no signin deps unless a case adds them).
import assert from "node:assert/strict";
import { receive } from "./agent.ts";
import { type NoticeRow, noticeEmail, sendSigninNotices, type SigninDb } from "./signin.ts";
import { SIGNIN_SAY } from "../wa-signin.ts";
import type { SendState } from "./policy.ts";
import { msg, PHONES, World } from "./world.test-helpers.ts";

const SIGNIN_ID = "11111111-2222-4333-8444-555555555555";
const NOTICE_ID = "66666666-7777-4888-8999-aaaaaaaaaaaa";

/** A small fake of the database side: one live code, the phone that claimed it, and one notice sent to the owner's phone. */
function fakeSignin(log: string[]): SigninDb {
  let claimedBy: string | null = null;
  let confirmed = false;
  let signedOut = false;
  return {
    allow: async () => true,
    claim: async (code, phone) => {
      log.push(`claim:${code}`);
      if (code !== "AB23CD" || (claimedBy && claimedBy !== phone) || confirmed) return { result: "unknown" };
      claimedBy = phone;
      return { result: "asked", id: SIGNIN_ID, device: { browser: "Chrome", os: "Windows" }, city: "London" };
    },
    confirm: async (id, phone) => {
      if (id !== SIGNIN_ID || phone !== claimedBy || confirmed) return { result: "unknown" };
      confirmed = true;
      return { result: "confirmed" };
    },
    signOut: async (id, phone) => {
      if (id !== NOTICE_ID || phone !== PHONES.owner) return { result: "unknown" };
      signedOut = true;
      log.push("signed_out");
      return { result: "done" };
    },
  };
}
const run = (w: World, log: string[], from: string, o: Parameters<typeof msg>[2]) => receive({ ...w.deps(), signin: fakeSignin(log) }, msg(w, from, o));

Deno.test("signup1 agent: the code, the question with the device and city, the tap", async () => {
  const w = new World();
  const log: string[] = [];
  const deps = { ...w.deps(), signin: fakeSignin(log) };
  assert.equal(await receive(deps, msg(w, PHONES.unknown, { text: "Kabsi sign in ab23cd" })), "signin_asked");
  const q = w.repliesTo(PHONES.unknown).at(-1)!;
  assert.equal(q.body, "❓ *Sign in on Chrome, Windows, near London?*\n\nOnly tap if you started this on kabsi.co just now.");
  assert.deepEqual(q.buttons, ["Yes, it's me"]);
  assert.equal(w.aiCalls, 0, "no model call");
  assert.equal(await receive(deps, msg(w, PHONES.unknown, { button: `si:y:${SIGNIN_ID}` })), "signin_confirmed");
  assert.equal(w.repliesTo(PHONES.unknown).at(-1)!.body, SIGNIN_SAY.signedIn);
  // The same tap again, or from another phone: refused.
  assert.equal(await receive(deps, msg(w, PHONES.unknown, { button: `si:y:${SIGNIN_ID}` })), "signin_tap_refused");
  assert.equal(await receive(deps, msg(w, PHONES.unknown2, { button: `si:y:${SIGNIN_ID}` })), "signin_tap_refused");
  assert.equal(w.repliesTo(PHONES.unknown2).at(-1)!.body, SIGNIN_SAY.ended);
});

Deno.test("signup1 agent: STOP still comes first; the sign-in comes before every other route", async () => {
  const w = new World();
  const log: string[] = [];
  assert.equal(await run(w, log, PHONES.owner, { text: "STOP" }), "stopped");
  // A stopped phone can still sign in: sending the code is the person's own opt-in, as a connect code is.
  assert.equal(await run(w, log, PHONES.owner, { text: "Kabsi sign in AB23CD" }), "signin_asked");
  // A bound owner with things waiting: the sign-in message is never read as a yes, a tool or free text for the model.
  const w2 = new World();
  assert.equal(await run(w2, log, PHONES.owner, { text: "Kabsi sign in AB23CD" }), "signin_asked");
  assert.equal(w2.aiCalls, 0);
});

// Voice 2: the words of a voice note are never the person's own sign-in code either.
Deno.test("signup1 agent: a spoken sign-in is ignored", async () => {
  const w = new World();
  const log: string[] = [];
  const r = await receive({ ...w.deps(), signin: fakeSignin(log) }, { ...msg(w, PHONES.unknown, { text: "Kabsi sign in AB23CD" }), fromVoice: true });
  assert.equal(r, "signin_forwarded");
  assert.deepEqual(log, [], "nothing claimed");
});

Deno.test("signup1 agent: a forwarded sign-in is ignored; other words go on as before", async () => {
  const w = new World();
  const log: string[] = [];
  assert.equal(await run(w, log, PHONES.unknown, { text: "Kabsi sign in AB23CD", forwarded: true }), "signin_forwarded");
  assert.deepEqual(log, [], "nothing claimed");
  assert.equal(w.repliesTo(PHONES.unknown).length, 0, "nothing said");
  // Not the exact pattern: the seam does not read it.
  const r = await run(w, log, PHONES.owner, { text: "help" });
  assert.notEqual(r.startsWith("signin"), true);
  assert.deepEqual(log, []);
});

Deno.test("signup1 agent: Sign me out everywhere, only from the phone the notice went to", async () => {
  const w = new World();
  const log: string[] = [];
  assert.equal(await run(w, log, PHONES.manager, { button: `so:${NOTICE_ID}` }), "signout_refused");
  assert.equal(w.repliesTo(PHONES.manager).at(-1)!.body, SIGNIN_SAY.signOutEnded);
  assert.equal(await run(w, log, PHONES.owner, { button: `so:${NOTICE_ID}` }), "signed_out_everywhere");
  assert.equal(w.repliesTo(PHONES.owner).at(-1)!.body, "✅ *Signed out everywhere*\n\nLog in again on kabsi.co when you need to.");
  assert.deepEqual(log, ["signed_out"]);
});

const NOW = new Date(Date.UTC(2026, 10, 10, 12, 0, 0));
const st = (open: boolean, stopped = false): SendState => ({ time_zone: "Europe/London", sent_today: 0, last_sent_at: null, live_ok: true, digest_only: false,
  stopped, window_expires_at: open ? new Date(NOW.getTime() + 3600_000).toISOString() : new Date(NOW.getTime() - 1).toISOString() });
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

Deno.test("signup1 notice: inside the window on WhatsApp with one button, outside it by email, else skipped", async () => {
  const rows: NoticeRow[] = [
    { id: "n1", user_id: "u1", phone: "+447700900001", user_agent: UA, email: "owner@shop.com" },
    { id: "n2", user_id: "u2", phone: "+447700900002", user_agent: UA, email: "two@shop.com" },
    { id: "n3", user_id: "u3", phone: "+447700900003", user_agent: null, email: null },
    { id: "n4", user_id: "u4", phone: "+447700900004", user_agent: UA, email: "four@shop.com" },
  ];
  const open: Record<string, SendState> = { "+447700900001": st(true), "+447700900002": st(false), "+447700900003": st(false), "+447700900004": st(true, true) };
  const wa: { phone: string; body: string; buttons: string[] }[] = [];
  const mails: { to: string; subject: string }[] = [];
  const marks: string[] = [];
  const r = await sendSigninNotices({
    claim: async () => rows, state: async (p) => open[p], now: () => NOW,
    whatsapp: async (row, body, buttons) => (wa.push({ phone: row.phone!, body, buttons: buttons.map((b) => `${b.id}|${b.title}`) }), "sent"),
    email: async (row, device) => void mails.push({ to: row.email, subject: noticeEmail(device).subject }),
    mark: async (id, s) => void marks.push(`${id}:${s}`),
  });
  assert.deepEqual(r, { whatsapp: 1, email: 2, skipped: 1 });
  assert.deepEqual(wa, [{ phone: "+447700900001", body: "❓ *New sign-in on Chrome, Windows*\n\nIf this was not you, tap below. Every Kabsi sign-in on the web ends at once.",
    buttons: ["so:n1|Sign me out everywhere"] }]);
  assert.deepEqual(mails, [{ to: "two@shop.com", subject: "New sign-in on Chrome, Windows" }, { to: "four@shop.com", subject: "New sign-in on Chrome, Windows" }]);
  assert.deepEqual(marks, ["n1:sent", "n2:emailed", "n3:skipped", "n4:emailed"]);
  for (const t of [wa[0].body, noticeEmail({ browser: "Chrome", os: "Windows" }).text]) assert.doesNotMatch(t, /[‒-―!]/);
});

Deno.test("signup1 notice: a failed send is marked failed and the rest still go", async () => {
  const marks: string[] = [];
  const r = await sendSigninNotices({
    claim: async () => [{ id: "a", user_id: "u", phone: "+447700900001", user_agent: UA, email: null }, { id: "b", user_id: "u", phone: null, user_agent: UA, email: "x@y.co" }],
    state: async () => st(true), now: () => NOW,
    whatsapp: async () => { throw new Error("kapso down"); },
    email: async () => {}, mark: async (id, s) => void marks.push(`${id}:${s}`),
  });
  assert.deepEqual(marks, ["a:failed", "b:emailed"]);
  assert.equal(r.failed, 1);
});
