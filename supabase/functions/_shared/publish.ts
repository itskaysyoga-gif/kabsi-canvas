// The one publication pipeline (P0.1-13a and P0.1-13b; K-38, K-70, K-116.1, R-05, D202, D266). The ledger, the
// approval, the undo and the claim live in the database (migrations 20261007190000_publication_pipeline.sql and
// 20261007210000_publication_pipeline_content.sql); this file runs the two jobs that touch Google for every kind
// (review replies, posts, photos, special hours, Google Protection put-backs): `publish` sends one approved, claimed
// item, and `reconcile_publication` reads Google for an item whose outcome is not known yet. No database or Google
// import here, so its tests run without credentials; api/jobs.ts gives it the Google calls for each kind.
//
// The rules:
// - Only claim_publication's "claimed" result may call Google, and it is given once per publication.
// - Google answering with a definite refusal (400, 401, 403, 404) ends as rejected and goes back to the owner.
// - Anything else after the write was sent (a timeout, a 5xx, no answer) is ambiguous: the item goes to checking and
//   the reconcile job reads Google. The write is never sent again (D266).
// - Google rate limit or circuit breaker before anything was sent: the claim is released and the job waits.
// - After a write, Google is read: shown as approved is verified; not shown yet is checking, which is what owners
//   see as "Google is checking your reply" (K-116.1); refused after the fact (a post Google rejected) is rejected.
import { RetryLater } from "./jobs.ts";

export type TargetType = "review_reply" | "local_post" | "photo" | "special_hours" | "listing_revert";

// What the publish job gets from claim_publication and the reconcile job from claim_publication_check.
export type Item = {
  publication_id: string; target_type: TargetType; target_id?: string; text: string | null;
  payload: Record<string, unknown>; google_account_id: string | null; google_location_id: string;
  google_review_id: string | null; google_ref?: string | null;
};
export type Claim =
  | ({ result: "claimed" } & Item)
  | { result: "not_due"; publish_after: string }
  | { result: "concierge" | "not_approved" | "stopped" | "missing"; state?: string };

export type CheckClaim =
  | ({ result: "claimed"; checks: number } & Item)
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

// What Google shows for the item now: exactly what was approved; not yet (held for checking, or a change Google has
// not applied yet); nothing at all; something else; or refused.
export type Seen = "shown" | "pending" | "absent" | "other" | "rejected";

export type Sent = { ref: string | null; response: unknown; seen?: Seen };

export type PublishDeps = {
  claim: (id: string) => Promise<Claim>;
  claimCheck: (id: string) => Promise<CheckClaim>;
  record: (id: string, o: Outcome) => Promise<string>;
  // The one write for this item. `seen` when Google's answer already says what it shows (a post's state).
  send: (item: Item) => Promise<Sent>;
  read: (item: Item) => Promise<Seen>;
};

const NOUN: Record<TargetType, string> = {
  review_reply: "reply", local_post: "post", photo: "photo", special_hours: "change to your hours", listing_revert: "change",
};
export const noun = (t: TargetType) => NOUN[t] ?? "change";

// What owners see while Google is checking (K-116.1).
export const checkingReason = (t: TargetType) => `Google is checking your ${noun(t)}`;
export const CHECKING_REASON = checkingReason("review_reply");

// Thrown by a send step that stopped before anything left for Google and cannot work later either (the photo file
// is gone): the item goes back to the owner, nothing was sent.
export class NotSent extends Error {
  override name = "NotSent";
}

// Google's refusal of this one request (the same rule as kabsi.ts isDefiniteGoogleRejection).
export const definiteRejection = (e: unknown) => /^Error: google (400|401|403|404) /.test(String(e));

// The owner-facing reason for a refusal: Google's own message when it gave one, in plain words around it. A reply or
// a post can be edited and approved again; a photo or a profile change was simply not made.
export function rejectionReason(e: unknown, t: TargetType = "review_reply"): string {
  const m = String(e).match(/"message"\s*:\s*"([^"]{1,200})"/);
  const next = t === "review_reply" || t === "local_post" ? "Edit it and approve again." : "Nothing changed on Google.";
  return m ? `Google did not accept this ${noun(t)} (${m[1]}). ${next}` : `Google did not accept this ${noun(t)}. ${next}`;
}

// A reply read back from Google: the same text, nothing yet, or someone else's reply.
export const replySeen = (shown: string | null, text: string): Seen =>
  shown === null ? "pending" : shown.trim() === text.trim() ? "shown" : "other";

const toItem = (c: Item): Item => ({
  publication_id: c.publication_id, target_type: c.target_type, target_id: c.target_id, text: c.text ?? null,
  payload: c.payload ?? {}, google_account_id: c.google_account_id ?? null, google_location_id: c.google_location_id,
  google_review_id: c.google_review_id ?? null, google_ref: c.google_ref ?? null,
});

// The publish job: one publication, at most one write to Google.
export async function publishOne(id: string, deps: PublishDeps): Promise<string> {
  const c = await deps.claim(id);
  if (c.result === "not_due") throw new RetryLater("publish: inside the undo window", new Date(c.publish_after));
  if (c.result !== "claimed") return c.result; // concierge task made, undone, already sent, or stopped
  const item = toItem(c);
  if (!(item.target_type in NOUN)) throw new Error(`publish: unknown kind ${item.target_type}`);

  let sent: Sent;
  try {
    sent = await deps.send(item);
  } catch (e) {
    if (e instanceof RetryLater) {
      // The rate limiter or the circuit breaker stopped the request before it left: nothing reached Google.
      await deps.record(id, { state: "approved", error: String(e).slice(0, 500) });
      throw e;
    }
    if (definiteRejection(e)) {
      return await deps.record(id, { state: "rejected", reason: rejectionReason(e, item.target_type), error: String(e).slice(0, 500) });
    }
    if (e instanceof NotSent) {
      return await deps.record(id, { state: "rejected", reason: `Kabsi could not send this ${noun(item.target_type)}. Nothing changed on Google.`, error: String(e).slice(0, 500) });
    }
    // Ambiguous: Google may have it. Read it later, never send it again.
    return await deps.record(id, { state: "checking", moderation: "unknown", error: String(e).slice(0, 500) });
  }

  await deps.record(id, { state: "published", googleRef: sent.ref ?? undefined, response: sent.response });
  let seen: Seen;
  try {
    seen = sent.seen ?? await deps.read({ ...item, google_ref: sent.ref });
  } catch (e) {
    return await deps.record(id, { state: "checking", moderation: "unknown", error: String(e).slice(0, 500) });
  }
  if (seen === "shown") return await deps.record(id, { state: "verified" });
  if (seen === "rejected") {
    return await deps.record(id, { state: "rejected", reason: rejectionReason("", item.target_type), error: "google_rejected_after_create" });
  }
  return await deps.record(id, { state: "checking", moderation: "pending", reason: checkingReason(item.target_type) });
}

// The reconcile job: read Google for one item in checking. Verified when Google shows what was approved; still
// checking (on a widening schedule) while Google holds it; failed when Google shows something else (someone changed
// it on Google directly) or, for anything but a reply, shows nothing at all (the write never landed). Never re-sent.
export async function reconcileOne(id: string, deps: PublishDeps): Promise<string> {
  const c = await deps.claimCheck(id);
  if (c.result === "not_due") throw new RetryLater("reconcile: next check later", new Date(c.next_check_at));
  if (c.result !== "claimed") return c.result;
  const item = toItem(c);
  let seen: Seen;
  try {
    seen = await deps.read(item);
  } catch (e) {
    // Google busy or not answering: the next check, on the same widening schedule.
    return await deps.record(id, { state: "checking", error: String(e).slice(0, 500) });
  }
  if (seen === "shown") return await deps.record(id, { state: "verified" });
  if (seen === "pending") return await deps.record(id, { state: "checking", reason: checkingReason(item.target_type) });
  if (seen === "rejected") {
    return await deps.record(id, { state: "rejected", reason: rejectionReason("", item.target_type), error: "google_rejected" });
  }
  if (seen === "absent") {
    return await deps.record(id, {
      state: "failed", error: "google_shows_nothing",
      reason: `Google does not show this ${noun(item.target_type)}. Kabsi did not send it again.`,
    });
  }
  return await deps.record(id, {
    state: "failed", error: "google_shows_other",
    reason: item.target_type === "review_reply"
      ? "Google shows a different reply for this review. Kabsi did not post again."
      : `Google shows something different. Kabsi did not send this ${noun(item.target_type)} again.`,
  });
}
