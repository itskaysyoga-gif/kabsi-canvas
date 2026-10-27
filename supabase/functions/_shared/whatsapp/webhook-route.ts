// The Kapso webhook, the decision (P0.8-03, Sec 1), out of whatsapp/index.ts so it is tested with stubs. The body is read
// with a size cap; X-Webhook-Signature is checked in constant time before anything is parsed (once more after reading
// the secret again, for a secret rotated by setup); bad JSON is refused with 400. Each inbound message goes to receive():
// another phone number id or a message older than the replay window is dropped, and the message id is stored once
// (whatsapp_inbound_store, on conflict do nothing), so a repeat delivery is answered 200 and does nothing.
import { type Inbound, parseWebhook, type StatusEvent, verifySignature } from "./channel.ts";
import type { AgentDeps } from "./agent.ts";
import { MAX_WEBHOOK_BODY, readCapped } from "../webhook-body.ts";

export type KapsoWebhookDeps = {
  /** The webhook secret (environment or Vault). */
  secret: () => Promise<string>;
  /** Forgets the cached Vault secret and reads it again. */
  rereadSecret: () => Promise<string>;
  /** The WhatsApp context: on or off, and where a delivery receipt is written. */
  ctx: () => Promise<{ on: boolean; statusUpdate: (s: StatusEvent) => Promise<void> }>;
  agentDeps: () => Promise<AgentDeps>;
  receive: (d: AgentDeps, m: Inbound, background: (p: Promise<unknown>) => void) => Promise<string>;
  background: (p: Promise<unknown>) => void;
  captureError: (e: unknown, extra: Record<string, unknown>) => Promise<unknown>;
  json: (body: unknown, status?: number) => Response;
  fail: (code: string, message: string, status?: number) => Response;
};

export async function kapsoWebhook(req: Request, d: KapsoWebhookDeps): Promise<Response> {
  const secret = await d.secret();
  if (!secret) return d.fail("not_configured", "WhatsApp is not set up.", 503);
  const raw = await readCapped(req, MAX_WEBHOOK_BODY);
  if (!raw) return d.fail("too_large", "Too large.", 413);
  const header = req.headers.get("x-webhook-signature");
  if (!(await verifySignature(secret, raw, header))) {
    // A secret rotated by setup: read Vault again once before refusing.
    const again = await d.rereadSecret();
    if (!again || again === secret || !(await verifySignature(again, raw, header))) return d.fail("forbidden", "Bad signature.", 401);
  }
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return d.fail("bad_json", "Bad JSON.", 400);
  }
  const { messages, statuses } = parseWebhook(req.headers.get("x-webhook-event"), body);
  const ctx = await d.ctx();
  for (const s of statuses) {
    try {
      await ctx.statusUpdate(s);
    } catch (e) {
      await d.captureError(e, { step: "status" });
    }
  }
  if (!ctx.on) return d.json({ ok: true, handled: 0, off: true });
  const deps = await d.agentDeps();
  const done: string[] = [];
  for (const m of messages) {
    try {
      done.push(await d.receive(deps, m, d.background));
    } catch (e) {
      // No message content goes to Sentry, only the step (K-113).
      await d.captureError(e, { step: "inbound", type: m.type });
      done.push("error");
    }
  }
  // Always 200 after a valid signature, so Kapso does not retry what was already stored once.
  return d.json({ ok: true, handled: done.length, statuses: statuses.length });
}
