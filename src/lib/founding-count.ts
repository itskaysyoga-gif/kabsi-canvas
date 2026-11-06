// Speed 2 part B (lane R, 6 Nov 2026): the Founding 25 count through kabsi.co. Home, /founding and Pricing asked the
// programs function on Supabase straight from the browser, which cost a CORS preflight and Supabase's gateway (OPTIONS
// 1,814 ms on Rashid's phone, 6 Nov). The page now asks GET /api/founding-count on its own address: no preflight, and
// Vercel's edge answers from a copy for 60 seconds, then serves that copy while it fetches a new one. Only the server of
// this route talks to Supabase. The count is public (the same JSON programs/founding returns); no visitor data is read.
// A count that cannot be read is answered 503 and never cached, and the page shows no number, as before.
import { anonHeaders, supabaseUrl } from "./supabase-config";

/** Fresh for 60 seconds at Vercel's edge, then served stale for up to 10 minutes while a new copy is fetched. */
export const FOUNDING_COUNT_CDN_CACHE = "max-age=60, stale-while-revalidate=600";

const isCount = (v: unknown): boolean => {
  const o = v as { total?: unknown; left?: unknown } | null;
  return !!o && typeof o.total === "number" && typeof o.left === "number" && o.left >= 0;
};

export async function foundingCountResponse(fetcher: typeof fetch = fetch): Promise<Response> {
  const base = { "content-type": "application/json", "x-robots-tag": "noindex" };
  try {
    const res = await fetcher(`${supabaseUrl}/functions/v1/programs/founding`, {
      headers: anonHeaders,
      signal: AbortSignal.timeout(5000),
    });
    const body = res.ok ? ((await res.json()) as unknown) : null;
    if (isCount(body)) {
      return new Response(JSON.stringify(body), {
        headers: {
          ...base,
          // The browser asks again on each page view and gets the edge's copy; Vercel's own header wins over the
          // no-store that vercel.json puts on /api/* for the browser.
          "cache-control": "public, max-age=0, must-revalidate",
          "vercel-cdn-cache-control": FOUNDING_COUNT_CDN_CACHE,
        },
      });
    }
  } catch {
    /* falls through to the plain answer below */
  }
  return new Response(JSON.stringify({ error: "unavailable" }), {
    status: 503,
    headers: { ...base, "cache-control": "no-store" },
  });
}
