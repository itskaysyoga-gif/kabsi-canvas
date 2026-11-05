import { createFileRoute } from "@tanstack/react-router";

// Guides 4 part B (master plan 30.32 item 6): the public guides and industry pages Nora may link, computed on each request
// from the server's clock, so a guide is known on the day it is published. The assistant function reads it for each answer.
// Public, read only, and the same pages as the sitemap. Cached for at most a minute and never past the next guide's moment.
export const Route = createFileRoute("/nora-pages.json")({
  server: {
    handlers: {
      GET: async () => {
        const [{ ALL_GUIDES }, { cacheSeconds }, { publicPages }] = await Promise.all([
          import("@/content/guides"),
          import("@/content/guides/schedule"),
          import("@/lib/public-pages"),
        ]);
        const now = new Date();
        return new Response(JSON.stringify({ pages: await publicPages(now) }), {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": `public, max-age=0, s-maxage=${cacheSeconds(ALL_GUIDES, now, 60)}`,
            "x-robots-tag": "noindex",
          },
        });
      },
    },
  },
});
