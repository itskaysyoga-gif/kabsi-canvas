// The one publication pipeline (P0.1-13a; K-38, K-70, K-116.1, R-05, D202, D266). The ledger, the approval, the undo
// and the claim live in the database (migration 20261007190000_publication_pipeline.sql); this file runs the two
// jobs that touch Google: `publish` sends one approved, claimed item, and `reconcile_publication` reads Google for an
// item whose outcome is not known yet. No database or Google import here, so its tests run without credentials.
//
// The rules:
// - Only claim_publication's "claimed" result may call Google, and it is given once per publication.
// - Google answering with a definite refusal (400, 401, 403, 404) ends as rejected and goes back to the owner.
// - Anything else after the write was sent (a timeout, a 5xx, no answer) is ambiguous: the item goes to checking and
//   the reconcile job reads Google. The write is never sent again (D266).
// - Google rate limit or circuit breaker before anything was sent: the claim is released and the job waits.
// - After a write, the reply is read back: shown with the same text is verified; not shown yet is checking, which is
//   what owners see as "Google is checking your reply" (K-116.1).
import { RetryLater } from "./jobs.ts";

export type Claim =
  | { result: "claimed"; publication_id: string; target_type: string; text: string; google_account_id: string | null; google_location_id: string; google_review_id: string }
  | { result: "not_due"; publish_after: string }
  | { result: "concierge" | "not_approved" | "stopped" | "missing"; state?: string };

export type CheckClaim =
  | { result: "claimed"; publication_id: string; target_type: string; text: string; checks: number; google_account_id: string | null; google_location_id: string; google_review_id: string }
  | { result: "not_due"; next_check_at: string }
  | { result: "not_checking" };

export type Outcome = {
  state: "approved" | "published" | "checking" | "rejected" | "verified" | "failed";
  reason?: string;
  error?: string;
  googleRef?: string;
  moderation?: "pending" | "unknown";
  response?: unknown;
};

export type PublishDeps = {
  claim: (id: string) => Promise<Claim>;
  claimCheck: (id: string) => Promise<CheckClaim>;
  record: (id: string, o: Outcome) => Promise<string>;
  sendReply: (account: string, location: string, review: string, text: string) => Promise<{ ref: string; response: unknown }>;
  readReply: (account: string, location: string, review: string) => Promise<string | null>;
};

export const CHECKING_REASON = "Google is checking your reply";

// Google's refusal of this one request (the same rule as kabsi.ts isDefiniteGoogleRejection).
export const definiteRejection = (e: unknown) => /^Error: google (400|401|403|404) /.test(String(e));

// The owner-facing reason for a refusal: Google's own message when it gave one, in plain words around it.
export function rejectionReason(e: unknown): string {
  const m = String(e).match(/"message"\s*:\s*"([^"]{1,200})"/);
  return m ? `Google did not accept this reply (${m[1]}). Edit it and approve again.` : "Google did not accept this reply. Edit it and approve again.";
}

const same = (a: string | null, b: string) => a !== null && a.trim() === b.trim();

// The publish job: one publication, at most one write to Google.
export async function publishOne(id: string, deps: PublishDeps): Promise<string> {
  const c = await deps.claim(id);
  if (c.result === "not_due") throw new RetryLater("publish: inside the undo window", new Date(c.publish_after));
  if (c.result !== "claimed") return c.result; // concierge task made, undone, already sent, or stopped
  if (c.target_type !== "review_reply") throw new Error(`publish: ${c.target_type} is not on the pipeline yet`);
  const account = c.google_account_id ?? "";

  let sent: { ref: string; response: unknown };
  try {
    sent = await deps.sendReply(account, c.google_location_id, c.google_review_id, c.text);
  } catch (e) {
    if (e instanceof RetryLater) {
      // The rate limiter or the circuit breaker stopped the request before it left: nothing reached Google.
      await deps.record(id, { state: "approved", error: String(e).slice(0, 500) });
      throw e;
    }
    if (definiteRejection(e)) {
      return await deps.record(id, { state: "rejected", reason: rejectionReason(e), error: String(e).slice(0, 500) });
    }
    // Ambiguous: Google may have the reply. Read it later, never send it again.
    return await deps.record(id, { state: "checking", moderation: "unknown", error: String(e).slice(0, 500) });
  }

  await deps.record(id, { state: "published", googleRef: sent.ref, response: sent.response });
  let shown: string | null;
  try {
    shown = await deps.readReply(account, c.google_location_id, c.google_review_id);
  } catch (e) {
    return await deps.record(id, { state: "checking", moderation: "unknown", error: String(e).slice(0, 500) });
  }
  if (same(shown, c.text)) return await deps.record(id, { state: "verified" });
  return await deps.record(id, { state: "checking", moderation: "pending", reason: CHECKING_REASON });
}

// The reconcile job: read Google for one item in checking. Verified when Google shows the approved text; still
// checking (on a widening schedule) when it shows nothing; failed when it shows a different reply (someone replied on
// Google directly), so the owner sees it.
export async function reconcileOne(id: string, deps: PublishDeps): Promise<string> {
  const c = await deps.claimCheck(id);
  if (c.result === "not_due") throw new RetryLater("reconcile: next check later", new Date(c.next_check_at));
  if (c.result !== "claimed") return c.result;
  let shown: string | null;
  try {
    shown = await deps.readReply(c.google_account_id ?? "", c.google_location_id, c.google_review_id);
  } catch (e) {
    // Google busy or not answering: the next check, on the same widening schedule.
    return await deps.record(id, { state: "checking", error: String(e).slice(0, 500) });
  }
  if (same(shown, c.text)) return await deps.record(id, { state: "verified" });
  if (shown === null) return await deps.record(id, { state: "checking", reason: CHECKING_REASON });
  return await deps.record(id, {
    state: "failed", error: "google_shows_other_reply",
    reason: "Google shows a different reply for this review. Kabsi did not post again.",
  });
}
