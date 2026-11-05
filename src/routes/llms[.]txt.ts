import { createFileRoute } from "@tanstack/react-router";

// Guides 3 (A.2): llms.txt is the short facts file (knowledge/facts/llms.txt, built by node scripts/build-kb.mjs) with the
// public guides listed on each request, one line each. A guide whose day has not come is not listed. Cached for at most an
// hour, and never past the moment the next guide becomes public.
export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        const [{ ALL_GUIDES }, { cacheSeconds, publicGuides }, { llmsText }] = await Promise.all([
          import("@/content/guides"),
          import("@/content/guides/schedule"),
          import("@/lib/llms"),
        ]);
        const now = new Date();
        return new Response(llmsText(publicGuides(ALL_GUIDES, now)), {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": `public, max-age=0, s-maxage=${cacheSeconds(ALL_GUIDES, now)}`,
          },
        });
      },
    },
  },
});
