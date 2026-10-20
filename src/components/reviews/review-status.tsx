import { StatusPill } from "@/components/ui/status-pill";
import { reviewStatus, type StatusInput } from "@/lib/review-status";

/** The status of a review in the owner's words (K-15). */
export function ReviewStatusPill({
  review,
  concierge = false,
}: {
  review: StatusInput;
  concierge?: boolean;
}) {
  const s = reviewStatus(review, concierge);
  return <StatusPill tone={s.tone}>{s.label}</StatusPill>;
}
