// What the Reviews screen calls each review and which filter it belongs to (K-15, P0.3-09). Pure functions, tested in
// tests/review-status.test.ts. The words are the owner's: Draft ready, Waiting for you, Published, Google is checking
// your reply, Rejected by Google, You chose not to reply.
import { riskRank } from "@/lib/review-risk";

export type StatusTone = "green" | "amber" | "red" | "grey";
export type StatusKey =
  | "drafting"
  | "draft_ready"
  | "waiting"
  | "on_its_way"
  | "published"
  | "checking"
  | "rejected"
  | "no_reply"
  | "replied_self"
  | "older";

export type StatusInput = {
  state: string;
  reply_state: string | null;
  risk: "low" | "medium" | "high";
  existing_reply: string | null;
  draft: { safety_ok: boolean; body: string } | null;
};
export type ReviewStatus = { key: StatusKey; label: string; tone: StatusTone };

const S = (key: StatusKey, label: string, tone: StatusTone): ReviewStatus => ({ key, label, tone });

/** The one status of a review. `concierge` is early access, where a person on the team posts what the owner approved. */
export function reviewStatus(r: StatusInput, concierge = false): ReviewStatus {
  if (r.reply_state === "rejected") return S("rejected", "Rejected by Google", "red");
  if (r.state === "posted" && r.reply_state === "in_review")
    return S("checking", "Google is checking your reply", "amber");
  // UX 1: "Live on Google" (Web 3, was "On Google") only when Kabsi has read the reply back from Google (existing_reply); a reply Google took but Kabsi
  // has not seen there yet is "Sent to Google" (30.15 section 3.1).
  if (r.state === "posted")
    return r.existing_reply
      ? S("published", "Live on Google", "green")
      : S("on_its_way", "Sent to Google", "grey");
  if (r.state === "publishing")
    return concierge
      ? S("on_its_way", "Approved, our team posts it", "grey")
      : S("on_its_way", "On its way to Google", "grey");
  if (r.state === "skipped") return S("no_reply", "You chose not to reply", "grey");
  if (r.state === "handled_offline") return S("replied_self", "You replied yourself", "grey");
  if (r.state === "archived")
    return r.existing_reply
      ? S("published", "Live on Google", "green")
      : S("older", "Older, not answered", "grey");
  if (r.state === "new") return S("drafting", "Kabsi is drafting", "grey");
  // drafted or blocked: a draft that is ready, or something only the owner can do.
  const ready =
    r.state === "drafted" && r.risk !== "high" && !!r.draft && r.draft.safety_ok && !!r.draft.body;
  return ready
    ? S("draft_ready", "Draft ready", "amber")
    : S("waiting", "Waiting for you", "amber");
}

export type ReviewFilter =
  "needs" | "all" | "replied" | "positive" | "neutral" | "negative" | "high";
export const FILTERS: { key: ReviewFilter; label: string }[] = [
  { key: "needs", label: "Needs reply" },
  { key: "all", label: "All" },
  { key: "replied", label: "Replied" },
  { key: "positive", label: "Positive" },
  { key: "neutral", label: "Neutral" },
  { key: "negative", label: "Negative" },
  { key: "high", label: "High risk" },
];

type FilterInput = StatusInput & { star_rating: number };

export const needsReply = (r: StatusInput) =>
  ["new", "drafted", "blocked"].includes(r.state) || r.reply_state === "rejected";

const REPLIED_STATES = ["posted", "publishing", "handled_offline"];

export function matchesFilter(r: FilterInput, f: ReviewFilter): boolean {
  switch (f) {
    case "needs":
      return needsReply(r);
    case "all":
      return true;
    case "replied":
      return REPLIED_STATES.includes(r.state) || !!r.existing_reply;
    case "positive":
      return r.star_rating >= 4;
    case "neutral":
      return r.star_rating === 3;
    case "negative":
      return r.star_rating <= 2;
    case "high":
      return r.risk === "high";
  }
}

/** Needs reply: high risk first, then medium, then newest (K-13). Everything else: newest first. */
export function sortReviews<T extends StatusInput & { review_created_at: string | null }>(
  rows: T[],
  f: ReviewFilter,
): T[] {
  const newest = (a: T, b: T) =>
    String(b.review_created_at ?? "").localeCompare(String(a.review_created_at ?? ""));
  return [...rows].sort((a, b) =>
    f === "needs" ? riskRank(b.risk) - riskRank(a.risk) || newest(a, b) : newest(a, b),
  );
}

// ── Design 3's three views (master plan 30.17 section 4): Waiting, On Google, All. The old filters above stay as
// addresses: emails, saved links and /app/inbox still send ?f=needs and land on Waiting.
export type ReviewView = "waiting" | "google" | "all";
export const VIEWS: { key: ReviewView; label: string }[] = [
  { key: "waiting", label: "Waiting" },
  { key: "google", label: "Live on Google" },
  { key: "all", label: "All" },
];

/** The view an address asks for, old ?f= values included. Undefined when it asks for none. */
export function viewFor(f: unknown): ReviewView | undefined {
  switch (f) {
    case "waiting":
    case "needs":
      return "waiting";
    case "google":
    case "replied":
      return "google";
    case "all":
    case "positive":
    case "neutral":
    case "negative":
    case "high":
      return "all";
    default:
      return undefined;
  }
}

/**
 * On Google only when Kabsi saw the reply there (its publication is verified, 30.15 section 3.1). A review with no
 * publication through Kabsi (a reply written on Google, or one from before Kabsi) goes by its own state.
 */
export function onGoogle(
  r: StatusInput,
  task?: { owner: string } | null,
  tasksLoaded = true,
): boolean {
  if (task) return task.owner === "confirmed";
  // No publication found: only a reply Kabsi read back from Google counts, and never while the publications did not load.
  return (
    tasksLoaded &&
    !!r.existing_reply &&
    r.reply_state !== "in_review" &&
    r.reply_state !== "rejected"
  );
}

export function matchesView(
  r: StatusInput,
  v: ReviewView,
  task?: { owner: string } | null,
  tasksLoaded = true,
): boolean {
  if (v === "waiting") return needsReply(r);
  if (v === "google") return onGoogle(r, task, tasksLoaded);
  return true;
}
