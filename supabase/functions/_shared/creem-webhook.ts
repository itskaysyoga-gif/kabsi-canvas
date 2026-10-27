// The Creem webhook's decision (master plan section 10, Sec 1), out of billing-creem/index.ts so it is tested with stubs:
// the body is read with a size cap, the creem-signature is checked in constant time before anything is read, a signed
// body that cannot be read is acknowledged and dropped, and every readable event goes to `store` (storeEvent in
// billing.ts: once per event id, stale events kept but never applied).
import { type CreemEvent, parseEvent, signatureProblem } from "./creem.ts";
import { MAX_WEBHOOK_BODY, readCapped, textOf } from "./webhook-body.ts";

export type CreemWebhookDeps = {
  secret: string;
  /** Stores the event once; answers "stored", "duplicate", "stale" or "other_mode". Throws when nothing was stored. */
  store: (e: CreemEvent) => Promise<string>;
  /** A refused call (logged; repeated refusals alert staff). */
  refused: (problem: "missing" | "wrong") => Promise<void>;
  log: (fields: Record<string, unknown>) => void;
  captureError: (e: unknown, extra: Record<string, unknown>) => Promise<unknown>;
  json: (body: unknown, status?: number) => Response;
};

export async function creemWebhook(req: Request, d: CreemWebhookDeps): Promise<Response> {
  const bytes = await readCapped(req, MAX_WEBHOOK_BODY);
  if (!bytes) return d.json({ error: "too_large" }, 413);
  const raw = textOf(bytes);
  const problem = await signatureProblem(raw, req.headers.get("creem-signature"), d.secret);
  if (problem) {
    await d.refused(problem);
    return d.json({ error: "unauthorized" }, 401);
  }
  const event = parseEvent(raw);
  // A signed body that cannot be read is acknowledged, so Creem does not send it again and again.
  if (!event) return d.json({ ok: true, ignored: "unreadable" });
  try {
    const stored = await d.store(event);
    d.log({ ok: true, event: event.eventType, stored });
    return d.json({ ok: true, [stored]: true }, 200);
  } catch (e) {
    await d.captureError(e, { step: "store", event: event.eventType });
    // 500 so Creem retries: nothing was stored.
    return d.json({ error: "try_again" }, 500);
  }
}
