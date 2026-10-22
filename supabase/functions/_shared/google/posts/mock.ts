// Mock of the v4 local posts API: a created post comes back LIVE, as Google returns it once accepted.
import type { ListLocalPostsResponse, LocalPost } from "../types.ts";

export function createLocalPost(account: string, location: string, body: LocalPost): Promise<LocalPost> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 19);
  // Google answers a post's photo with its own name and googleUrl, not the sourceUrl it was given (real posts, 22 Oct 2026).
  const media = body.media?.map((m, i) => ({ name: `${account}/${location}/media/localPosts/mock${id}${i}`, mediaFormat: m.mediaFormat, googleUrl: "https://kabsi.co/mock-photo" }));
  return Promise.resolve({
    ...body, ...(media ? { media } : {}), name: `${account}/${location}/localPosts/${id}`, createTime: now, updateTime: now, state: "LIVE",
    searchUrl: "https://kabsi.co",
  });
}
export const listLocalPosts = (_account: string, _location: string): Promise<ListLocalPostsResponse> => Promise.resolve({});
// The mock keeps no posts: a post it created reads back LIVE.
export const getLocalPost = (post: string): Promise<LocalPost> => Promise.resolve({ name: post, state: "LIVE" });
