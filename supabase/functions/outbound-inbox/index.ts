// outbound-inbox (Harvey 4A part E, master plan 30.39): pg_cron calls it every 10 minutes with x-cron-secret. It reads
// Rashid's Zoho inbox over IMAP 993 read only (nothing is marked read) and handles what came back to Outbound's emails.
// It never answers a person. Logs carry counts only.
import { captureError, isInternal, json, log, serve } from "../_shared/kabsi.ts";
import * as db from "../_shared/outbound/db.ts";
import { handleInbox } from "../_shared/outbound/inbox.ts";
import { fetchNew, parseMessage, zohoImap } from "../_shared/outbound/mail.ts";

const fn = "outbound-inbox";

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!(await isInternal(req))) return json({ error: "forbidden" }, 403);
  try {
    const s = await db.settings();
    if (!s.sending_open && !s.test_mode) return json({ state: "locked" });
    const password = Deno.env.get("ZOHO_SMTP_PASSWORD");
    if (!password) return json({ state: "no_password" });
    const st = await db.inboxState();
    const got = await fetchNew(await zohoImap(), {
      user: db.SENDER.address, password, lastUid: st.inbox_last_uid, validity: st.inbox_uid_validity,
      since: new Date(Date.now() - 2 * 86_400_000),
    });
    const r = await handleInbox({
      seen: db.seen, match: db.match, record: db.record, suppress: db.suppress, cancelQueue: db.cancelQueue, setStatus: db.setStatus,
      checkStops: db.checkStops, alert: db.alert, freeCheck: db.freeCheck, draftReply: db.draftReply, harveyHashes: db.harveyHashes,
    }, got.messages.map((m) => ({ uid: m.uid, parsed: parseMessage(m.raw), validity: got.validity })));
    await db.saveInboxState(got.lastUid ?? null, got.validity);
    log(fn, { action: "inbox", ...r });
    return json(r);
  } catch (e) {
    await captureError(fn, e);
    return json({ error: "failed" }, 500);
  }
});
