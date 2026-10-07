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

// The reply goes through mock_google_reply (P0.1-13a), which counts every call and plays the test modes set on the
// row: pending (Google holds it for checking), timeout (stored, but no answer), reject (a 400 like Google's).
export async function updateReply(review: string, comment: string): Promise<ReviewReply> {
  const { data, error } = await (await mockDb()).rpc("mock_google_reply", { p_review_id: review.split("/").pop()!, p_comment: comment });
  if (error) throw error;
  return mockReplyOutcome(review, comment, String(data));
}

// Turns the mock's outcome into what the live layer would return or throw (the same error text as client.ts gbp).
export function mockReplyOutcome(review: string, comment: string, outcome: string): ReviewReply {
  if (outcome === "not_found") throw new Error(`google 404 mock/${review}/reply: {"error":{"code":404,"status":"NOT_FOUND"}}`);
  if (outcome === "reject") {
    throw new Error(`google 400 mock/${review}/reply: {"error":{"code":400,"message":"Mock: the reply was not accepted.","status":"INVALID_ARGUMENT"}}`);
  }
  if (outcome === "timeout") throw new Error("mock timeout: Google did not answer");
  return replyNow(comment);
}
