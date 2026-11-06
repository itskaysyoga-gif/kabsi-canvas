// Launch 4 (R-118 item 3, the live speed gate): the public pages' HTML is the same for every visitor (the owner's data,
// the founding count and the consent bar all load in the browser), yet each visit rendered it again in Frankfurt, 300 to
// 600 ms before the first byte. These pages now let Vercel's edge keep a copy: 10 minutes fresh, then served while a new
// copy is made in the background. A deploy starts a new cache, so a merge shows at once. Only the fixed pages of the
// sitemap are cached; the guides and the industry pages (which list guides published on a schedule), a saved check
// (/scan/<code>), the app and every link page are rendered on each visit as before.
import SITEMAP_PAGES from "@/content/sitemap-pages.json";

const NEVER = new Set(["/guides"]);
const CACHED = new Set(
  (SITEMAP_PAGES as { path: string }[])
    .map((p) => p.path)
    .filter((p) => !NEVER.has(p) && !p.startsWith("/for/")),
);

export const EDGE_CACHE_CONTROL = "public, max-age=0, s-maxage=600, stale-while-revalidate=86400";

/** True for a successful GET of one of the sitemap's fixed public pages that sets no cookie. */
export function wantsEdgeCache(request: Request, response: Response): boolean {
  if (request.method !== "GET" || response.status !== 200) return false;
  if (!(response.headers.get("content-type") ?? "").includes("text/html")) return false;
  if (response.headers.has("set-cookie")) return false;
  return CACHED.has(new URL(request.url).pathname);
}

/** The same response with the edge cache header. */
export function withEdgeCache(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("cache-control", EDGE_CACHE_CONTROL);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
