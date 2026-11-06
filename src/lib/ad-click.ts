// Speed 2 part C (lane R, 6 Nov 2026): an ad click is served from Vercel's edge cache. Vercel keys its cache on the full
// address, so /founding?fbclid=... was a new entry and was rendered again in Frankfurt on every click. The Routing
// Middleware (middleware.ts at the root) rewrites such a request, on the server only, to the clean address of the same
// page, so it is answered from the copy the clean address already has. The browser's address keeps every parameter (the
// Pixel and PostHog read them there). A query with any other key, or any page outside the edge cached list, is untouched.
import { CACHED_PATHS } from "./edge-cache";

/** Meta's and Google's click ids, TikTok's, every utm_ parameter, and the ad, ad set and campaign ids of Meta's URL tags. */
const TRACKING = new Set(["fbclid", "gclid", "ttclid", "ad_id", "adset_id", "campaign_id"]);

export function isTrackingKey(key: string): boolean {
  return TRACKING.has(key) || /^utm_[a-z0-9_]{1,40}$/.test(key);
}

/** The clean address to serve from the cache, or null when the request is left as it is. */
export function adClickRewrite(request: Request): URL | null {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  if (!url.search || !CACHED_PATHS.has(url.pathname)) return null;
  const keys = [...url.searchParams.keys()];
  if (keys.length === 0 || !keys.every(isTrackingKey)) return null;
  return new URL(url.pathname, url.origin);
}
