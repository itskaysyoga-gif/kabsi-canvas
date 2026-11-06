// outbound-prepare (Harvey 4A part B, master plan 30.39): pg_cron calls it on weekdays at 05:00 UTC with x-cron-secret.
// It runs only when sending is open or in test mode, reads Harvey's register, checks each candidate and fills Email 1 and
// its follow-up from the approved templates. No AI call, no Places, no DataForSEO. It never sends anything.
import { captureError, isInternal, json, log, serve } from "../_shared/kabsi.ts";
import * as db from "../_shared/outbound/db.ts";
import { prepare, readPage } from "../_shared/outbound/prepare.ts";

const fn = "outbound-prepare";

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!(await isInternal(req))) return json({ error: "forbidden" }, 403);
  const body = await req.json().catch(() => ({})) as { day?: string };
  try {
    const r = await prepare({
      settings: db.settings, refreshSuppression: db.refreshSuppression, register: db.harveyRegister, companyStatus: db.companyStatus,
      page: (u) => readPage(u), eligible: db.eligible, queuedFor: db.queuedFor, sentThisMonth: () => db.sentThisMonth(),
      insert: db.insertDraft, testRecipients: db.testRecipients(), now: new Date(),
    }, { today: body.day === "today" });
    log(fn, { action: "prepare", ...r });
    return json(r);
  } catch (e) {
    await captureError(fn, e);
    return json({ error: "failed" }, 500);
  }
});
