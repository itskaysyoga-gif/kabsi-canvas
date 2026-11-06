// outbound-send (Harvey 4A part D, master plan 30.39): pg_cron calls it every 10 minutes with x-cron-secret. It sends at
// most one approved, due message through Zoho SMTP on port 465 as Rashid Abou Hamzy <rashid@getkabsi.com>, only when
// sending is open, or in test mode only to OUTBOUND_TEST_RECIPIENTS. Logs carry counts only.
import { captureError, isInternal, json, log, serve } from "../_shared/kabsi.ts";
import * as db from "../_shared/outbound/db.ts";
import { sendTick } from "../_shared/outbound/send.ts";
import { smtpSend, zohoConnect } from "../_shared/outbound/smtp.ts";

const fn = "outbound-send";

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!(await isInternal(req))) return json({ error: "forbidden" }, 403);
  try {
    const r = await sendTick({
      settings: db.settings, refreshSuppression: db.refreshSuppression, due: db.due, suppressed: db.suppressed,
      heardFrom: db.heardFrom, sentOn: db.sentOn, sentThisMonth: () => db.sentThisMonth(),
      deliver: async (to, message) => {
        const password = Deno.env.get("ZOHO_SMTP_PASSWORD");
        if (!password) throw Object.assign(new Error("ZOHO_SMTP_PASSWORD is not set"), { step: "no_password" });
        await smtpSend(await zohoConnect(), { user: db.SENDER.address, password, from: db.SENDER.address, to, message });
      },
      markSent: db.markSent, markCancelled: db.markCancelled, markFailed: db.markFailed, setNextSendAt: db.setNextSendAt,
      testRecipients: db.testRecipients(), sender: db.SENDER, now: new Date(),
    });
    log(fn, { action: "send", ...r });
    return json(r);
  } catch (e) {
    await captureError(fn, e);
    return json({ error: "failed" }, 500);
  }
});
