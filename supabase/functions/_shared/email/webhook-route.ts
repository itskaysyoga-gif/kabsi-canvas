// Resend's webhook, the decision (P0.4-08, Sec 1), out of email/index.ts so it is tested with a stub database. The body
// is read with a size cap; the Svix signature and its 5 minute timestamp window are checked before the body is parsed; a
// signed body that is not JSON is refused with 400 (it used to throw and answer 500). Every write is idempotent: a
// repeat of the same delivery, or a delivered event that arrives after the bounce, changes nothing.
import { readEvent, verifySvix } from "./webhook.ts";
import { MAX_WEBHOOK_BODY, readCapped, textOf } from "../webhook-body.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

export type ResendWebhookDeps = {
  secret: string;
  /** The service-role client (admin()); the tests pass one pointed at an in-memory database. */
  db: SupabaseClient;
  nowSeconds?: number;
  log: (fields: Record<string, unknown>) => void;
  json: (body: unknown, status?: number) => Response;
};

export async function resendWebhook(req: Request, d: ResendWebhookDeps): Promise<Response> {
  const bytes = await readCapped(req, MAX_WEBHOOK_BODY);
  if (!bytes) return d.json({ error: "too_large" }, 413);
  const body = textOf(bytes);
  const ok = await verifySvix(d.secret, {
    id: req.headers.get("svix-id"), timestamp: req.headers.get("svix-timestamp"), signature: req.headers.get("svix-signature"),
  }, body, d.nowSeconds);
  if (!ok) return d.json({ error: "bad_signature" }, 401);
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return d.json({ error: "bad_json" }, 400);
  }
  const ev = readEvent(parsed);
  if (ev.kind === "ignored") return d.json({ ok: true, ignored: true });
  if (ev.kind === "delivered") {
    // Only while it is still sent: a delivered event that arrives after the bounce never undoes it.
    await d.db.from("emails").update({ status: "delivered" }).eq("resend_id", ev.resendId).eq("status", "sent");
    return d.json({ ok: true });
  }
  if (ev.kind === "bounced" && !ev.permanent) return d.json({ ok: true, suppressed: false });
  const reason = ev.kind === "complained" ? "complaint" : "bounce";
  await d.db.from("emails").update({ status: "bounced", error: reason }).eq("resend_id", ev.resendId);
  for (const address of ev.addresses) {
    // One row per address and scope (the primary key of email_suppressions); a repeat does nothing.
    const { error } = await d.db.from("email_suppressions").upsert({ address, scope: "*", reason }, { onConflict: "address,scope", ignoreDuplicates: true });
    if (error) throw error;
  }
  d.log({ ok: true, route: "webhook", event: reason, addresses: ev.addresses.length });
  return d.json({ ok: true, suppressed: ev.addresses.length });
}
