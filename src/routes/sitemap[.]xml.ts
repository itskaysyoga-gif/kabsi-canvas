import { createFileRoute } from "@tanstack/react-router";

// Guides 3 (A.2): the sitemap is computed on each request from the server's clock, so a guide appears on its day with no
// deploy. Cached for at most an hour, and never past the moment the next guide becomes public.
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const [{ ALL_GUIDES }, { cacheSeconds, publicGuides }, { sitemapXml }] = await Promise.all([
          import("@/content/guides"),
          import("@/content/guides/schedule"),
          import("@/lib/sitemap"),
        ]);
        const now = new Date();
        const ttl = cacheSeconds(ALL_GUIDES, now);
        return new Response(sitemapXml(publicGuides(ALL_GUIDES, now)), {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": `public, max-age=0, s-maxage=${ttl}`,
          },
        });
      },
    },
  },
});
