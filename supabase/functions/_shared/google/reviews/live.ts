// Business Profile API v4: reviews and replies.
// https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews
import { gbp, V4 } from "../client.ts";
import type { ListReviewsResponse, Review, ReviewReply } from "../types.ts";

export const listReviews = (account: string, location: string, pageSize = 50, pageToken = ""): Promise<ListReviewsResponse> =>
  gbp(`${V4}/${account}/${location}/reviews?pageSize=${pageSize}&orderBy=updateTime%20desc${pageToken ? `&pageToken=${pageToken}` : ""}`);
export const getReview = (review: string): Promise<Review> => gbp(`${V4}/${review}`);
export const updateReply = (review: string, comment: string): Promise<ReviewReply> =>
  gbp(`${V4}/${review}/reply`, { method: "PUT", body: JSON.stringify({ comment }) });
