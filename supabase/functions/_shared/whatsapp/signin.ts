// Signup 1 (master plan 30.50 item 3, R-150): the WhatsApp side of Continue with WhatsApp and of the new sign-in notice.
// One seam in agent.ts calls signinSeam after STOP and before every other route. It reads exactly three things and nothing
// else: the message "Kabsi sign in CODE" (the whole message, nothing around it), the "Yes, it's me" button (si:y:<id>) and
// the "Sign me out everywhere" button (so:<id>). Anything else returns null and the agent goes on as before.
//   - A forwarded message is ignored (F-1): it is never the owner's own sign-in.
//   - Kabsi never sends a code. The owner sends it; Kabsi answers with the device that started the sign-in and one button.
//   - Every check that matters (the code's hash, its 10 minutes, one use, the same phone for the tap, the user) is made in
//     the database; the buttons carry only an id, never a user or a business.
import type { Inbound } from "./channel.ts";
import { reply, type Out } from "./outbox.ts";
import { inWindow, type SendState } from "./policy.ts";
import { codeOf, type Device, deviceName, deviceOf, SIGNIN_SAY, SIGNOUT_RE, YES_RE } from "../wa-signin.ts";

export interface SigninDb {
  /** At most a few sign-in messages per phone in 15 minutes (LIMITS.perPhone). */
  allow(phone: string): Promise<boolean>;
  /** The sign-in this code opened, claimed by this phone; unknown when the code is wrong, ran out, was used or another phone claimed it. */
  claim(code: string, phone: string): Promise<{ result: "asked"; id: string; device: Device; city: string | null } | { result: "unknown" }>;
  /** "Yes, it's me" from the phone that claimed it: the phone's own user, or a new one, is attached and the browser may collect. */
  confirm(id: string, phone: string): Promise<{ result: "confirmed" | "unknown" }>;
  /** "Sign me out everywhere" under a notice sent to this phone: every session of that user ends. */
  signOut(noticeId: string, phone: string): Promise<{ result: "done" | "unknown" }>;
}

/** The seam: null when the message is not one of the three; else what was done (for the log and the suite). */
export async function signinSeam(d: { signin?: SigninDb; out: Out }, s: SendState, phone: string, m: Inbound): Promise<string | null> {
  const code = m.buttonId ? null : codeOf(m.text);
  const yes = m.buttonId ? YES_RE.exec(m.buttonId) : null;
  const out = m.buttonId ? SIGNOUT_RE.exec(m.buttonId) : null;
  if (!code && !yes && !out) return null;
  const db = d.signin;
  if (!db) return null;
  // F-1: a forwarded "Kabsi sign in CODE" is someone else's. Nothing is claimed and nothing is said.
  if (m.forwarded) return "signin_forwarded";
  const say = (body: string, buttons?: { id: string; title: string }[]) => reply(d.out, s, phone, body, buttons);

  if (code) {
    if (!(await db.allow(phone))) return (await say(SIGNIN_SAY.tooMany), "signin_limited");
    const c = await db.claim(code, phone);
    if (c.result !== "asked") return (await say(SIGNIN_SAY.ended), "signin_unknown");
    await say(SIGNIN_SAY.confirm(c.device, c.city), [{ id: `si:y:${c.id}`, title: SIGNIN_SAY.yesButton }]);
    return "signin_asked";
  }
  if (yes) {
    const r = await db.confirm(yes[1], phone);
    if (r.result !== "confirmed") return (await say(SIGNIN_SAY.ended), "signin_tap_refused");
    await say(SIGNIN_SAY.signedIn);
    return "signin_confirmed";
  }
  const r = await db.signOut(out![1], phone);
  if (r.result !== "done") return (await say(SIGNIN_SAY.signOutEnded), "signout_refused");
  await say(SIGNIN_SAY.signedOut);
  return "signed_out_everywhere";
}

// ─── The new sign-in notice (30.50 item 3b). After any new web sign-in of an owner with WhatsApp connected: inside the 24 hour
// window a free-form message with one button; outside it no approved Utility template covers a sign-in (every one of them is
// about a business), so the notice goes by email instead and no template is submitted (docs/LATER.md, Signup 1).

export type NoticeRow = { id: string; user_id: string; phone: string | null; user_agent: string | null; email: string | null };
export type NoticeDeps = {
  claim(limit: number): Promise<NoticeRow[]>;
  state(phone: string): Promise<SendState>;
  /** The WhatsApp message through the one sender (urgent: quiet hours and the cap do not hold back a security notice). */
  whatsapp(row: NoticeRow, body: string, buttons: { id: string; title: string }[]): Promise<string>;
  email(row: NoticeRow & { email: string }, device: Device): Promise<void>;
  mark(id: string, state: "sent" | "emailed" | "skipped" | "failed"): Promise<void>;
  now(): Date;
};

export async function sendSigninNotices(d: NoticeDeps, limit = 20): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const count = (k: string) => (out[k] = (out[k] ?? 0) + 1);
  for (const row of await d.claim(limit)) {
    const device = deviceOf(row.user_agent);
    try {
      const s = row.phone ? await d.state(row.phone) : null;
      if (row.phone && s && !s.stopped && inWindow(s, d.now())) {
        const r = await d.whatsapp(row, SIGNIN_SAY.notice(device), [{ id: `so:${row.id}`, title: SIGNIN_SAY.signOutButton }]);
        const ok = r === "sent" || r === "mock_sent" || r === "duplicate";
        await d.mark(row.id, ok ? "sent" : "failed");
        count(ok ? "whatsapp" : `whatsapp_${r}`);
      } else if (row.email) {
        await d.email({ ...row, email: row.email }, device);
        await d.mark(row.id, "emailed");
        count("email");
      } else {
        await d.mark(row.id, "skipped");
        count("skipped");
      }
    } catch {
      await d.mark(row.id, "failed").catch(() => {});
      count("failed");
    }
  }
  return out;
}

/** The email when the window is closed (docs/COPY.md, Signup 1). */
export function noticeEmail(device: Device) {
  const name = deviceName(device);
  const line = `Someone signed in to your Kabsi account on ${name}. If this was you, there is nothing to do.`;
  const help = "If it was not you, reply to this email and Kabsi will sign you out everywhere.";
  return {
    subject: `New sign-in on ${name}`,
    preheader: line,
    title: `New sign-in on ${name}`,
    bodyHtml: `<p>${escape(line)}</p><p>${escape(help)}</p>`,
    text: `${line}\n\n${help}`,
  };
}
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
