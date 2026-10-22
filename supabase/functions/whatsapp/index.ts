// whatsapp: the Kapso webhook for the WhatsApp owner channel (P0.8-03, K-129). verify_jwt is off because Kapso calls
// it; every request must carry Kapso's X-Webhook-Signature over the raw body (KAPSO_WEBHOOK_SECRET, Supabase secrets
// only), and a forged one is refused before anything is read. Messages from numbers that did not opt in are ignored,
// a message seen before or older than the replay window does nothing, and nothing is sent while Kabsi has no WhatsApp
// number or while the live switch is off (the mock sender records, Kapso is never called).
import { captureError, fail, json } from "../_shared/kabsi.ts";
import { parseWebhook, verifySignature } from "../_shared/whatsapp/channel.ts";
import { whatsappCtx } from "../_shared/whatsapp/db.ts";
import { handleInbound } from "../_shared/whatsapp/deliver.ts";

const MAX_BODY = 256 * 1024;

Deno.serve(async (req) => {
  if (req.method !== "POST") return fail("method_not_allowed", "Use POST.", 405);
  const secret = Deno.env.get("KAPSO_WEBHOOK_SECRET") ?? "";
  if (!secret) return fail("not_configured", "WhatsApp is not set up.", 503);
  const raw = new Uint8Array(await req.arrayBuffer());
  if (raw.length > MAX_BODY) return fail("too_large", "Too large.", 413);
  if (!(await verifySignature(secret, raw, req.headers.get("x-webhook-signature")))) return fail("forbidden", "Bad signature.", 401);

  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return fail("bad_json", "Bad JSON.", 400);
  }
  const { messages, statuses } = parseWebhook(req.headers.get("x-webhook-event"), body);
  const ctx = await whatsappCtx();
  const done: string[] = [];
  for (const s of statuses) {
    try {
      await ctx.db.statusUpdate(s.messageId, s.status, s.error);
    } catch (e) {
      await captureError("whatsapp", e, { step: "status" });
    }
  }
  for (const m of messages) {
    try {
      done.push(await handleInbound(ctx, m));
    } catch (e) {
      // No message content goes to Sentry, only the step (K-113).
      await captureError("whatsapp", e, { step: "inbound", type: m.type });
      done.push("error");
    }
  }
  // Always 200 after a valid signature, so Kapso does not retry what was already handled once.
  return json({ ok: true, handled: done.length, statuses: statuses.length });
});
