// Sec 2 (the staff operations view): every refused webhook call (wrong or missing signature or token, body too large)
// is counted per source, reason and hour in public.webhook_rejections. Counts only: no payload, no address, no header.
// Counting never changes the answer and never throws.
import { admin } from "./kabsi.ts";

export type WebhookSource = "creem" | "whatsapp" | "google_events" | "resend";
/** The answers that mean "refused": a bad or missing signature or token, or a body over the cap. */
export const REFUSED = new Set([401, 403, 413]);

export async function counted(source: WebhookSource, res: Response,
  record: (source: WebhookSource, reason: string) => Promise<unknown> = async (s, r) => await admin().rpc("record_webhook_rejection", { p_source: s, p_reason: r })): Promise<Response> {
  if (REFUSED.has(res.status)) {
    await Promise.resolve().then(() => record(source, `status_${res.status}`)).catch(() => {});
  }
  return res;
}
