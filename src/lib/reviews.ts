// Reviews data layer: inbox reads go through RLS; every write goes through the `api` Edge Function
// (posting is the only path to Google, D202) or a membership-checked RPC.
import { anonHeaders, sessionFetch, supabase, supabaseUrl } from "@/lib/supabase";
import { endSession } from "@/lib/session-ended";
import { SENT_STATES } from "@/lib/dashboard";

export type ReviewState =
  | "new"
  | "drafted"
  | "blocked"
  | "publishing"
  | "posted"
  | "skipped"
  | "handled_offline"
  | "archived";
export type InboxReview = {
  id: string;
  location_id: string;
  reviewer_name: string | null;
  star_rating: number;
  comment: string | null;
  language: string | null;
  /** K-13 risk level (P0.3-03) and its reason keys (src/lib/review-risk.ts). */
  risk: "low" | "medium" | "high";
  risk_reasons: string[];
  state: ReviewState;
  existing_reply: string | null;
  reply_state: string | null;
  /** Why Google did not take the last approved reply, or that Google is checking it (P0.1-13a). */
  reply_state_reason: string | null;
  review_created_at: string | null;
  is_backlog: boolean;
  /** The latest draft. safety_notes: what the checks flagged when safety_ok is false (shown, never as ready). */
  draft: { body: string; safety_ok: boolean; version: number; safety_notes?: string[] } | null;
};
/** "Save this as a rule?" or "Save this as a fact?" after an edit (P0.3-02, K-120.2). */
export type StyleOffer = { id: string; kind: string; text: string };

type ApiError = { error?: string; message?: string };
async function readJson<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & ApiError;
  if (!res.ok)
    throw new Error(data.message || data.error || "Something went wrong. Please try again.");
  return data;
}

// ── Reviews screen (signed in): every review Kabsi has seen, with its latest draft and the owner's own approved reply.
export type ReviewRow = InboxReview & {
  content_purged_at: string | null;
  /** The reply the owner approved through Kabsi (exact text sent to Google). */
  my_reply: string | null;
};

export async function allReviews(locationId: string): Promise<ReviewRow[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, location_id, reviewer_name, star_rating, comment, language, risk, risk_reasons, state, existing_reply, reply_state, reply_state_reason, review_created_at, is_backlog, content_purged_at, reply_drafts(body, safety_ok, version, safety_notes)",
    )
    .eq("location_id", locationId)
    .order("review_created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  // The owner's own approved replies (their words, kept regardless of Google's 30-day rule).
  const { data: pubs } = await supabase
    .from("publications")
    .select("target_id, payload, created_at")
    .eq("location_id", locationId)
    .eq("target_type", "review_reply")
    .in("state", SENT_STATES)
    .order("created_at", { ascending: false })
    .limit(400);
  const mine = new Map<string, string>();
  for (const p of (pubs ?? []) as { target_id: string; payload: { text?: string } | null }[]) {
    if (!mine.has(p.target_id) && p.payload?.text) mine.set(p.target_id, p.payload.text);
  }
  return (data ?? []).map((row) => {
    const { reply_drafts, ...rest } = row as typeof row & {
      reply_drafts?: InboxReview["draft"][];
    };
    const drafts = (reply_drafts ?? []).filter(Boolean) as NonNullable<InboxReview["draft"]>[];
    const latest = drafts.sort((a, b) => b.version - a.version)[0] ?? null;
    const r = rest as Omit<ReviewRow, "draft" | "my_reply">;
    return { ...r, draft: latest, my_reply: mine.get(r.id) ?? null };
  });
}

async function authed(path: string, body: Record<string, unknown>) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  // No session: nothing is sent, and the screen says so (session-ended.ts).
  if (!token) throw endSession();
  return sessionFetch(`${supabaseUrl}/functions/v1/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

// Approves the reply; it goes to Google after a 10 second undo window (P0.1-13a, K-70).
export async function postReply(reviewId: string, text: string) {
  return readJson<{
    ok: true;
    state: string;
    publication?: string;
    publish_after?: string | null;
    offers?: StyleOffer[];
  }>(await authed("api/approve", { review_id: reviewId, do: "post", text }));
}
// Undo inside the 10 seconds (K-70): stops the approval before Google has it.
export async function undoReply(reviewId: string, publicationId: string) {
  return readJson<{ ok: true; state: string }>(
    await authed("api/approve", { review_id: reviewId, do: "undo", publication_id: publicationId }),
  );
}
export async function answerStyleOffer(offerId: string, save: boolean) {
  const { error } = await supabase.rpc("answer_style_offer", { p_offer: offerId, p_save: save });
  if (error) throw new Error(error.message);
}
export async function redraftReply(reviewId: string, instruction: string) {
  return readJson<{ ok: true; draft: string | null; issues: string[] }>(
    await authed("api/approve", { review_id: reviewId, do: "redraft", instruction }),
  );
}
/** K-13: a neutral holding reply for a high-risk review, written only because the owner asked. */
export async function holdingReply(reviewId: string) {
  return readJson<{ ok: true; draft: string | null; issues: string[] }>(
    await authed("api/approve", { review_id: reviewId, do: "holding" }),
  );
}
export async function skipReview(reviewId: string) {
  const { error } = await supabase.rpc("skip_review", { p_review: reviewId });
  if (error) throw new Error(error.message);
}

export async function handleOffline(reviewId: string) {
  const { error } = await supabase.rpc("handle_review_offline", { p_review: reviewId });
  if (error) throw new Error(error.message);
}

// ── Email action links (/a/:token): the token is the credential, no login needed
export type ActionView = {
  status: "ok" | "used" | "expired" | "invalid";
  action?: "post" | "edit" | "skip" | "see_draft" | "handle_myself" | "open" | "revert" | "keep";
  business?: string;
  review?: {
    id: string;
    reviewer: string | null;
    rating: number;
    comment: string | null;
    state: ReviewState;
    risk: "low" | "medium" | "high";
    risk_reasons: string[];
    reply: string | null;
  } | null;
  draft?: string | null;
  /** Early access (D267): a person posts approved replies by hand. */
  concierge?: boolean;
  /** Google mode from the server (P0.1-08: the signed-out page cannot ask google_mode() itself). */
  mode?: "mock" | "live";
  /** Demo workspace (P0.1-06): an invented business; the page shows "Demo data". */
  demo?: boolean;
  change?: { id: string; field: string; before: string; after: string; state: string } | null;
  /** K-17 (P0.2-05): this link changes what customers see, so its recipient must be signed in on the page. */
  sign_in?: boolean;
  /** The recipient is signed in in this browser. */
  signed_in?: boolean;
  /** Another account is signed in in this browser; the page shows nothing of the item. */
  other_account?: boolean;
  /** What the link already did, for a used link. */
  result?: { done: string } | null;
};
export type ActionResult = {
  ok: true;
  done: string;
  state?: string;
  publication?: string;
  publish_after?: string | null;
  repeat?: boolean;
};

// The email page sends the signed-in session when there is one (K-17: profile changes, hours and high-risk reviews need
// the link's recipient signed in); otherwise the anon key (D295), and the link alone is the credential.
async function linkFetch(query: string, body?: Record<string, unknown>) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const auth = token ? { authorization: `Bearer ${token}` } : {};
  return fetch(`${supabaseUrl}/functions/v1/api/action${query}`, {
    ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
    headers: { "content-type": "application/json", ...anonHeaders, ...auth },
  });
}
export async function loadAction(token: string): Promise<ActionView> {
  const res = await linkFetch(`?t=${encodeURIComponent(token)}`);
  if (res.status === 404) return { status: "invalid" };
  return readJson<ActionView>(res);
}
export async function runAction(
  token: string,
  doWhat: "post" | "skip" | "handle_myself" | "revert" | "keep",
  text?: string,
) {
  return readJson<ActionResult>(await linkFetch("", { t: token, do: doWhat, text }));
}
// Undo inside the 10 seconds (K-70), for the publication this link made.
export async function undoAction(token: string, publication: string) {
  return readJson<ActionResult>(await linkFetch("", { t: token, do: "undo", publication }));
}

// ── Staff test tool (mock Google only): adds a review to the simulated Google profile
export async function amStaff() {
  const { data, error } = await supabase.rpc("is_staff");
  return !error && data === true;
}
export async function addTestReview(
  locationId: string,
  rating: number,
  comment: string,
  reviewer: string,
) {
  const { error } = await supabase.rpc("staff_mock_review", {
    p_location: locationId,
    p_rating: rating,
    p_comment: comment,
    p_reviewer: reviewer,
  });
  if (error) throw new Error(error.message);
}

// ── Posts and special hours (content function). Posting sends exactly what the owner sees (D202).
export async function contentCall<T>(body: Record<string, unknown>) {
  return readJson<T>(await authed("content", body));
}

/** Any other signed-in Edge Function that answers JSON (the Profile Coach's actions). */
export async function functionCall<T>(path: string, body: Record<string, unknown>) {
  return readJson<T>(await authed(path, body));
}
