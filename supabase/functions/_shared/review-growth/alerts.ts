// The WhatsApp alert for a sensitive review (30.15 section 3.7, V3), sent through the one sender (deliver.ts, which queues it in
// the agent's outbox and follows its rules). No draft, no Approve button, none of the review's words, and a button to a person.
import { deliver, type Ctx } from "../whatsapp/deliver.ts";
import { ref } from "../whatsapp/templates.ts";
import { SENSITIVE_BUTTONS, sensitiveAlertBody } from "./sensitive.ts";
import type { Industry } from "../ai/risk.ts";

export type SensitiveReview = { reviewId: string; locationId: string; business: string; stars: number; reviewer: string | null; regulated: Industry | null };

/** One message to each opted-in owner or manager. Returns what happened for each. */
export async function sendSensitiveAlert(ctx: Ctx, userIds: string[], r: SensitiveReview): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const body = sensitiveAlertBody({ business: r.business, stars: r.stars, reviewer: r.reviewer, appUrl: ctx.appUrl, regulated: r.regulated });
  for (const userId of userIds) {
    out[userId] = await deliver(ctx, {
      userId, locationId: r.locationId, kind: "review_alert", dedupe: `review_alert:${r.reviewId}:${userId}`, body, alert: "review", urgent: false,
      buttons: [...SENSITIVE_BUTTONS],
      template: ref("review_waiting", { business: r.business, stars: String(r.stars) }),
    });
    // Not remembered (no `remember`): "make it shorter" or "reply: ..." on WhatsApp must never make a draft with an Approve button for
    // a sensitive review. The owner reads it and replies in Kabsi.
  }
  return out;
}
