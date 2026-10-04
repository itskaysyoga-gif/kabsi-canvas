import { supabase } from "@/lib/supabase";

// Concierge mode (Q07, D267): staff RPCs. Each one checks is_staff() on the server; the browser only calls them.

export type ConciergeReview = {
  id: string;
  stars: number;
  reviewer: string | null;
  date: string | null;
  text: string | null;
};
export type ConciergeTask = {
  id: string;
  kind: "invite" | "post_reply";
  created_at: string;
  location_id: string;
  business: string;
  address: string | null;
  consented: boolean;
  claimed_by: string | null;
  claimed_at: string | null;
  review: ConciergeReview | null;
  reply_text: string | null;
  approved_at: string | null;
};
export type ConciergeBusiness = {
  id: string;
  name: string;
  status: string;
  access: boolean;
  first_post_at: string | null;
  checked_today: boolean;
};
export type ConciergeQueue = {
  count: number;
  cap: number;
  tasks: ConciergeTask[];
  businesses: ConciergeBusiness[];
};

async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(friendly(error.message));
  return data as T;
}

const MESSAGES: Record<string, string> = {
  concierge_full: "Early access is full (20 businesses).",
  has_google_access: "This business already has real Google access.",
  open_reply_tasks: "Post or cancel the waiting replies first.",
  already_done: "Someone already did this one.",
  claimed_by_other: "A teammate is already on this one.",
  duplicate_review: "That review was already entered.",
  no_consent: "The owner has not given consent yet.",
  not_live: "Google is not connected yet, so a business cannot be converted.",
  not_concierge_ready: "Turn concierge on and accept the invitation first.",
  bad_date: "The review date cannot be in the future.",
  bad_rating: "Choose 1 to 5 stars.",
  text_redacted:
    "The reply text was removed after 30 days. Cancel this task and ask the owner to approve again.",
  forbidden: "This is for the Kabsi team only.",
};
function friendly(message: string) {
  const key = Object.keys(MESSAGES).find((k) => message.includes(k));
  return key ? MESSAGES[key]! : message;
}

export const loadConciergeQueue = () => call<ConciergeQueue>("staff_concierge_queue");
export const setConcierge = (locationId: string, on: boolean) =>
  call<string>("staff_set_concierge", { p_location: locationId, p_on: on });
export const convertConcierge = (locationId: string) =>
  call<string>("staff_concierge_convert", { p_location: locationId });
export const finishTask = (taskId: string, note?: string) =>
  call<string>("staff_concierge_task_done", { p_task: taskId, p_note: note ?? null });
export const claimTask = (taskId: string) =>
  call<void>("staff_concierge_claim_task", { p_task: taskId });
export const markPosted = (taskId: string) =>
  call<{ ok: boolean; first_post: boolean }>("staff_concierge_mark_posted", { p_task: taskId });
export const cancelTask = (
  taskId: string,
  outcome: "redo" | "gone" | "access_lost",
  reason?: string,
) =>
  call<void>("staff_concierge_cancel_task", {
    p_task: taskId,
    p_outcome: outcome,
    p_reason: reason ?? null,
  });
export const addReview = (o: {
  locationId: string;
  rating: number;
  comment: string;
  reviewer: string;
  date: string;
  backlog: boolean;
}) =>
  call<string>("staff_concierge_add_review", {
    p_location: o.locationId,
    p_rating: o.rating,
    p_comment: o.comment,
    p_reviewer: o.reviewer,
    p_review_date: o.date,
    p_backlog: o.backlog,
  });
