import { StatusPill, type Tone } from "@/components/kabsi/ui";
import { TaskOutcome, TaskPill, TaskTrack } from "@/components/kabsi/d3-account";
import { ReviewCardTop } from "@/components/reviews/review-card";
import { ReviewGraphic } from "@/components/reviews/review-graphic";
import { ReportReview } from "@/components/reviews/report-review";
import type { ReviewRow } from "@/lib/reviews";
import { reviewStatus, type StatusTone } from "@/lib/review-status";
import type { TaskItem } from "@/lib/task-feed";

const TONE: Record<StatusTone, Tone> = { green: "ok", amber: "warn", red: "bad", grey: "info" };

// A review that waits for nothing: the review, the reply and where it is. When the reply went through Kabsi, its task
// shows approved, sent to Google, on Google with the link, or what failed and what happens next (30.15 section 3.1).
// A reply Kabsi did not send (written on Google, or before Kabsi) keeps the review's own status.
export function ReviewDone({
  review,
  task,
  concierge,
}: {
  review: ReviewRow;
  task: TaskItem | undefined;
  concierge: boolean;
}) {
  const reply = review.my_reply || review.existing_reply;
  const status = reviewStatus(review, concierge);
  // A cancelled (undone) publication says nothing about a later state of the review.
  const shown = task && task.owner !== "undone" ? task : undefined;
  return (
    <article
      aria-label={`Reply to ${review.reviewer_name ?? "a customer"}`}
      className="rounded-card border border-line bg-surface-1 p-4 shadow-rest sm:p-5"
    >
      <ReviewCardTop review={review} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {shown ? (
          <TaskPill state={shown.owner} />
        ) : (
          <StatusPill tone={TONE[status.tone]}>{status.label}</StatusPill>
        )}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4">
        <ReviewGraphic review={review} />
        <ReportReview review={review} />
      </div>
      {review.content_purged_at && !review.comment ? (
        <p className="mt-3 text-small text-text-2">
          Google's rules let Kabsi keep review text for 30 days. Read it on your Google profile.
        </p>
      ) : null}
      {reply ? (
        <div className="mt-4">
          <p className="text-small font-bold text-text-2">Your reply</p>
          <p
            dir="auto"
            className="mt-2 whitespace-pre-wrap rounded-inner bg-surface-2 p-3 text-body text-text-1"
          >
            {reply}
          </p>
        </div>
      ) : null}
      {shown ? (
        <div className="mt-5 border-t border-line pt-4">
          <TaskTrack state={shown.owner} />
          <TaskOutcome task={shown} className="mt-3" />
        </div>
      ) : review.reply_state_reason && review.reply_state === "in_review" ? (
        <p className="mt-3 text-small text-text-2">{review.reply_state_reason}</p>
      ) : null}
    </article>
  );
}
