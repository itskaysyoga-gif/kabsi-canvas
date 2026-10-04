// Business Profile API v4: local posts.
// https://developers.google.com/my-business/reference/rest/v4/accounts.locations.localPosts
import { gbp, V4 } from "../client.ts";
import type { ListLocalPostsResponse, LocalPost } from "../types.ts";

export const createLocalPost = (account: string, location: string, body: LocalPost): Promise<LocalPost> =>
  gbp(`${V4}/${account}/${location}/localPosts`, { method: "POST", body: JSON.stringify(body) });
export const listLocalPosts = (account: string, location: string): Promise<ListLocalPostsResponse> =>
  gbp(`${V4}/${account}/${location}/localPosts?pageSize=100`);
