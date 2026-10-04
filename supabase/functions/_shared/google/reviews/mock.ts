// Mock of the v4 reviews API, backed by mock_google_reviews (staff add mock reviews from the ops screen).
import { mockDb } from "../client.ts";
import type { ListReviewsResponse, Review, ReviewReply, StarRating } from "../types.ts";

export type MockReviewRow = {
  review_id: string; google_location_id: string; reviewer_name: string; star_rating: number; comment: string | null;
  create_time: string; reply_comment: string | null; reply_update_time: string | null;
};
const STARS: StarRating[] = ["STAR_RATING_UNSPECIFIED", "ONE", "TWO", "THREE", "FOUR", "FIVE"];

// One stored row as Google's Review. The mock's updateTime is the reply time, as before the move.
export function reviewFromRow(account: string, r: MockReviewRow): Review {
  const out: Review = {
    name: `${account}/${r.google_location_id}/reviews/${r.review_id}`, reviewId: r.review_id,
    reviewer: { displayName: r.reviewer_name }, starRating: STARS[r.star_rating] ?? "STAR_RATING_UNSPECIFIED",
    createTime: r.create_time,
  };
  if (r.comment != null) out.comment = r.comment;
  if (r.reply_update_time) out.updateTime = r.reply_update_time;
  if (r.reply_comment != null) out.reviewReply = { comment: r.reply_comment, ...(r.reply_update_time ? { updateTime: r.reply_update_time } : {}) };
  return out;
}

export async function listReviews(account: string, location: string, pageSize = 50, _pageToken = ""): Promise<ListReviewsResponse> {
  const { data, error } = await (await mockDb()).from("mock_google_reviews").select("*")
    .eq("google_location_id", location).order("create_time", { ascending: false }).limit(pageSize);
  if (error) throw error;
  const reviews = ((data ?? []) as MockReviewRow[]).map((r) => reviewFromRow(account, r));
  return { reviews, totalReviewCount: reviews.length };
}

// review is "accounts/{a}/locations/{l}/reviews/{id}".
export async function getReview(review: string): Promise<Review> {
  const p = review.split("/");
  const { data, error } = await (await mockDb()).from("mock_google_reviews").select("*").eq("review_id", p[5]).single();
  if (error) throw error;
  return reviewFromRow(`${p[0]}/${p[1]}`, data as MockReviewRow);
}

export const replyNow = (comment: string): ReviewReply => ({ comment, updateTime: new Date().toISOString() });

export async function updateReply(review: string, comment: string): Promise<ReviewReply> {
  const id = review.split("/").pop()!;
  const { updateTime } = replyNow(comment);
  const { error } = await (await mockDb()).from("mock_google_reviews").update({ reply_comment: comment, reply_update_time: updateTime }).eq("review_id", id);
  if (error) throw error;
  return { comment, updateTime };
}
