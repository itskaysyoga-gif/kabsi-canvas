// Vercel Routing Middleware (Speed 2 part C). It runs only on the pages Vercel's edge keeps a copy of (the list below is
// the same as CACHED_PATHS in src/lib/edge-cache.ts; tests/ad-click.test.ts holds them equal) and does one thing: a
// request whose query holds only tracking parameters (an ad click) is rewritten, on the server, to the page's clean
// address, so it is answered from the cached copy. The browser's address is not changed. Anything else passes through.
// No body, cookie or header is read or stored.
import { adClickRewrite } from "./src/lib/ad-click";

export const config = {
  runtime: "edge",
  matcher: [
    "/",
    "/pricing",
    "/how-it-works",
    "/scan",
    "/google-review-link",
    "/founding",
    "/for",
    "/about",
    "/security",
    "/faq",
    "/partners",
    "/partners/terms",
    "/setup-call",
    "/privacy",
    "/terms",
  ],
};

export default function middleware(request: Request): Response | undefined {
  const clean = adClickRewrite(request);
  // The header Vercel's rewrite() helper (@vercel/functions) sets; returning nothing lets the request continue as it is.
  return clean ? new Response(null, { headers: { "x-middleware-rewrite": clean.toString() } }) : undefined;
}
