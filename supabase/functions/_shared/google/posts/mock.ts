// Mock of the v4 local posts API: a created post comes back LIVE, as Google returns it once accepted.
import type { ListLocalPostsResponse, LocalPost } from "../types.ts";

export function createLocalPost(account: string, location: string, body: LocalPost): Promise<LocalPost> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 19);
  return Promise.resolve({
    ...body, name: `${account}/${location}/localPosts/${id}`, createTime: now, updateTime: now, state: "LIVE",
    searchUrl: "https://kabsi.co",
  });
}
export const listLocalPosts = (_account: string, _location: string): Promise<ListLocalPostsResponse> => Promise.resolve({});
// The mock keeps no posts: a post it created reads back LIVE.
export const getLocalPost = (post: string): Promise<LocalPost> => Promise.resolve({ name: post, state: "LIVE" });
