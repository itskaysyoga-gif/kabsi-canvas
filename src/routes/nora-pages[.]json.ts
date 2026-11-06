import { createFileRoute } from "@tanstack/react-router";

// Guides 4 part B (master plan 30.32 item 6): the public guides and industry pages Nora may link, computed on each request
// from the server's clock, so a guide is known on the day it is published. The assistant function reads it for each answer.
// Public, read only, and the same pages as the sitemap. Cached for at most a minute and never past the next guide's moment.
export const Route = createFileRoute("/nora-pages.json")({
  server: {
    handlers: {
      GET: async () => {
        const [{ ALL_GUIDES }, { cacheSeconds }, { publicPages }, { SITEMAP_PAGES }] =
          await Promise.all([
            import("@/content/guides"),
            import("@/content/guides/schedule"),
            import("@/lib/public-pages"),
            import("@/lib/sitemap"),
          ]);
        const now = new Date();
        const pages = await publicPages(now);
        // Launch 2 part A (30.36 item 3): the sitemap's own pages too, so Nora's filter checks every kabsi.co link.
        const paths = [...SITEMAP_PAGES.map((p) => p.path), ...pages.map((p) => p.path)];
        return new Response(JSON.stringify({ pages, paths }), {
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
