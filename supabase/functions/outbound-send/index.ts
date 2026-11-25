// outbound-send (Harvey 4A part D, master plan 30.39; OUTBOUND-3): pg_cron calls it every 10 minutes with x-cron-secret.
// It sends at most one approved, due message through Zoho SMTP on port 465 as Rashid Abou Hamzy <rashid@getkabsi.com>,
// only when sending is open, or in test mode only to OUTBOUND_TEST_RECIPIENTS; never without the postal address
// (OUTBOUND_POSTAL_ADDRESS) or before SPF, DKIM and DMARC read correctly. Logs carry counts only.
//
// Two internal actions for the mail-tester.com check (test mode only, never a real business):
//   {"action": "mail_tester", "address": "<id>@srvN.mail-tester.com"} sends the fictional US Email 1 there;
//   {"action": "mail_tester_score"} reads the score of the last address sent to and records it.
// One more, read only: {"action": "preview"} renders the same fictional Email 1 in test mode and returns its subject and
// body, so the footer can be read. It opens no SMTP connection and writes nothing.
import { captureError, isInternal, json, log, serve } from "../_shared/kabsi.ts";
import * as db from "../_shared/outbound/db.ts";
import { checkDns } from "../_shared/outbound/dns.ts";
import { mailTesterAddressOk, mailTesterEmail, reportUrl, scoreOf } from "../_shared/outbound/mail-tester.ts";
import { houseStyleOk, linksOk } from "../_shared/outbound/rules.ts";
import { sendTick } from "../_shared/outbound/send.ts";
import { buildMessage, newMessageId, smtpSend, zohoConnect } from "../_shared/outbound/smtp.ts";

const fn = "outbound-send";

function password(): string {
  const p = (Deno.env.get("ZOHO_SMTP_PASSWORD") ?? "").trim();
  if (!p) throw Object.assign(new Error("ZOHO_SMTP_PASSWORD is not set"), { step: "no_password" });
  return p;
}

async function mailTester(address: unknown) {
  const s = await db.settings();
  if (s.sending_open || !s.test_mode) return json({ state: "test_mode_only" }, 409);
  if (s.stopped_reason) return json({ state: "stopped" }, 409);
  if (!mailTesterAddressOk(address)) return json({ state: "bad_address" }, 400);
  const postal = db.postal();
  if (!postal) return json({ state: "no_postal_address" }, 409);
  const dns = await checkDns();
  await db.saveDns(dns);
  if (!dns.ok) return json({ state: "dns_not_ready", problem: dns.problem }, 409);
  const now = new Date();
  const mail = mailTesterEmail(postal, now);
  if (!houseStyleOk(mail.body) || !linksOk(mail.body, "first")) return json({ state: "house_style_or_links" }, 500);
  const to = address.trim().toLowerCase();
  const message = buildMessage({ from: db.SENDER, to, subject: mail.subject, body: mail.body, messageId: newMessageId(), date: now });
  let accepted = false;
  await smtpSend(await zohoConnect(), {
    user: db.SENDER.address, password: password(), from: db.SENDER.address, to, message,
    onAccepted: async () => { accepted = true; },
  });
  if (!accepted) return json({ state: "not_accepted" }, 502);
  await db.saveMailTester({ mail_tester_address: to, mail_tester_sent_at: now.toISOString(), mail_tester_score: null, mail_tester_at: null });
  return json({ state: "sent" });
}

/** Test mode only: the fictional US Email 1 as it would be sent, never sent. */
async function preview() {
  const s = await db.settings();
  if (s.sending_open || !s.test_mode) return json({ state: "test_mode_only" }, 409);
  const postal = db.postal();
  if (!postal) return json({ state: "no_postal_address" }, 409);
  const mail = mailTesterEmail(postal, new Date());
  return json({ state: "preview", subject: mail.subject, body: mail.body, house_style_ok: houseStyleOk(mail.body), links_ok: linksOk(mail.body, "first") });
}

async function mailTesterScore() {
  const s = await db.settings() as Awaited<ReturnType<typeof db.settings>> & { mail_tester_address?: string | null };
  if (!s.mail_tester_address || !mailTesterAddressOk(s.mail_tester_address)) return json({ state: "nothing_sent" }, 409);
  const res = await fetch(reportUrl(s.mail_tester_address), { headers: { accept: "application/json" } });
  if (!res.ok) return json({ state: "report_unreadable", status: res.status }, 502);
  const score = scoreOf(await res.json().catch(() => null));
  if (score === null) return json({ state: "no_score_yet" }, 409);
  await db.saveMailTester({ mail_tester_score: score, mail_tester_at: new Date().toISOString() });
  return json({ state: "recorded", score });
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!(await isInternal(req))) return json({ error: "forbidden" }, 403);
  const body = await req.json().catch(() => ({})) as { action?: string; address?: unknown };
  try {
    if (body.action === "mail_tester") {
      const r = await mailTester(body.address);
      log(fn, { action: "mail_tester", status: r.status });
      return r;
    }
    if (body.action === "preview") {
      const r = await preview();
      log(fn, { action: "preview", status: r.status });
      return r;
    }
    if (body.action === "mail_tester_score") {
      const r = await mailTesterScore();
      log(fn, { action: "mail_tester_score", status: r.status });
      return r;
    }
    const r = await sendTick({
      settings: db.settings, refreshSuppression: db.refreshSuppression, due: db.due, failStale: db.failStale,
      reserveSlot: db.reserveSlot, claim: db.claim, suppressed: db.suppressed,
      heardFrom: db.heardFrom, sentOn: db.sentOn, sentThisMonth: () => db.sentThisMonth(),
      deliver: async (to, message, onAccepted) => {
        await smtpSend(await zohoConnect(), { user: db.SENDER.address, password: password(), from: db.SENDER.address, to, message, onAccepted });
      },
      markSent: db.markSent, markCancelled: db.markCancelled, markFailed: db.markFailed, founding: db.foundingInvite,
      testRecipients: db.testRecipients(), sender: db.SENDER, postal: db.postal(), dns: () => checkDns(), saveDns: db.saveDns,
      killGate: db.killGate, now: new Date(),
    });
    log(fn, { action: "send", ...r });
    return json(r);
  } catch (e) {
    await captureError(fn, e);
    return json({ error: "failed" }, 500);
  }
});
