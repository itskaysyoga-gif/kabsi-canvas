// Every task closes, on the Kabsi website (master plan 30.15 section 3.1, V4's supabase/functions/_shared/task-close.ts).
// The owner sees one of four states for anything Kabsi sends to Google: approved, sent to Google, on Google (with a link),
// or did not go through with what happens next. "Live on Google" only after Kabsi has read it back on Google (verified).
// The same words as WhatsApp: tests/task-state.test.ts checks this file against task-close.ts for every state and kind.

export type PubState =
  | "approved"
  | "publishing"
  | "published"
  | "checking"
  | "verifying"
  | "verified"
  | "rejected"
  | "failed"
  | "cancelled";
export type OwnerState = "approved" | "sent" | "confirmed" | "failed" | "undone";
export type TaskKind =
  | "review_reply"
  | "local_post"
  | "local_post_removal"
  | "photo"
  | "special_hours"
  | "listing_revert"
  | "listing_edit";

export const OWNER_LABEL: Record<OwnerState, string> = {
  approved: "Approved",
  sent: "Sent to Google",
  confirmed: "Live on Google",
  failed: "Did not go through",
  undone: "Undone",
};

export function ownerState(s: string): OwnerState {
  switch (s) {
    case "approved":
      return "approved";
    case "publishing":
    case "published":
    case "checking":
    case "verifying":
      return "sent";
    case "verified":
      return "confirmed";
    case "cancelled":
      return "undone";
    default:
      return "failed";
  }
}

const NOUN: Record<TaskKind, string> = {
  review_reply: "reply",
  local_post: "post",
  local_post_removal: "post removal",
  photo: "photo",
  special_hours: "change to your hours",
  listing_revert: "change",
  listing_edit: "change to your profile",
};
export const taskNoun = (t: string) => NOUN[t as TaskKind] ?? "change";

/** Where the owner can see it on Google: a post's own Google link, the reviews page for a reply, else the business on Maps. */
export function googleLink(o: {
  target_type: string;
  place_id: string | null;
  response?: unknown;
}): string | null {
  if (o.target_type === "local_post") {
    const url = (o.response as { searchUrl?: unknown } | null)?.searchUrl;
    if (typeof url === "string" && /^https:\/\/(www\.|local\.|posts\.)?google\.[a-z.]+\//.test(url))
      return url;
  }
  if (!o.place_id || !/^[A-Za-z0-9_-]{10,300}$/.test(o.place_id)) return null;
  const id = encodeURIComponent(o.place_id);
  if (o.target_type === "review_reply")
    return `https://search.google.com/local/reviews?placeid=${id}`;
  return `https://www.google.com/maps/place/?q=place_id:${id}`;
}

/** What failed and what happens next, from the state and the kind only (never the pipeline's own error text). */
export function failedNext(t: string, s: string): string {
  const what = taskNoun(t);
  const editable = t === "review_reply" || t === "local_post";
  const first =
    s === "rejected"
      ? `Google did not accept this ${what}.`
      : `Google does not show this ${what}, and Kabsi did not send it again.`;
  return `${first} ${editable ? "You can edit it in Kabsi and approve it again." : "Nothing changed on Google."}`;
}

/** Design 3's lines under the track (COPY.md 19, task states). */
export const SENT_LINE =
  "Your yes is saved. Kabsi has not seen it on Google yet. Nothing else is needed from you. Kabsi tells you on WhatsApp when it shows.";
export const CONFIRMED_LINE = "Kabsi saw it on Google. Done.";
export const UNDONE_LINE = "Undone. Nothing reached Google.";
export const approvedLine = (seconds: number) =>
  `Approved. It goes to Google in ${seconds} ${seconds === 1 ? "second" : "seconds"}.`;
