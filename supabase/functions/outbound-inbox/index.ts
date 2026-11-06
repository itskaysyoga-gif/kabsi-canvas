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
    // Read whatever the lock says: after a stop, opt-outs, bounces and replies still have to be handled.
    const password = Deno.env.get("ZOHO_SMTP_PASSWORD");
    if (!password) return json({ state: "no_password" });
    const st = await db.inboxState();
    const got = await fetchNew(await zohoImap(), {
      user: db.SENDER.address, password, lastUid: st.inbox_last_uid, validity: st.inbox_uid_validity,
      since: new Date(Date.now() - 2 * 86_400_000),
    });
    const r = await handleInbox({
      seen: db.seen, match: db.match, matchBySender: db.matchBySender, self: db.SENDER.address, record: db.record, suppress: db.suppress, cancelQueue: db.cancelQueue, setStatus: db.setStatus,
      checkStops: db.checkStops, alert: db.alert, freeCheck: db.freeCheck, draftReply: db.draftReply, harveyHashes: db.harveyHashes,
    }, got.messages.map((m) => ({ uid: m.uid, parsed: parseMessage(m.raw), validity: got.validity })));
    // Only as far as the last message fully handled: one that failed is read again next time, with those after it.
    const upto = r.failed ? r.handled_to_uid ?? (got.validity === st.inbox_uid_validity ? st.inbox_last_uid : null) : got.lastUid ?? null;
    await db.saveInboxState(upto, got.validity);
    let harvey = 0;
    try {
      harvey = await db.flushHarvey();
    } catch (e) {
      await captureError(fn, e, { step: "harvey_suppression" }); // the queue waits for the next run
    }
    log(fn, { action: "inbox", ...r, harvey_added: harvey });
    return json(r);
  } catch (e) {
    await captureError(fn, e);
    return json({ error: "failed" }, 500);
  }
});
