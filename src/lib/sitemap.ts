// The sitemap (Guides 3: a server route, src/routes/sitemap[.]xml.ts, computed on each request). Only the pages that are
// indexed (Web 2, master plan 30.16 section 4 and 30.17 section 2): template industry pages, the old group pages (gone,
// Industries 2), /manager-steps, free check results and the 404 stay out. The guides are added per request, public ones only.
// tests/sitemap.test.ts keeps this list equal to the routes and the industry content.
import type { GuideMeta } from "@/content/guides/types";
import { SITE_URL } from "@/lib/site";
import pages from "@/content/sitemap-pages.json";
import lastmods from "@/content/lastmod.json";

<<<<<<< HEAD
/** [path, lastmod, changefreq, priority] for every indexed page that is not a guide. */
export const SITEMAP_PAGES: [string, string, string, string][] = [
  ["/", "2026-10-27", "weekly", "1.0"],
  ["/pricing", "2026-10-27", "monthly", "0.9"],
  ["/how-it-works", "2026-10-27", "monthly", "0.8"],
  ["/scan", "2026-10-27", "monthly", "0.9"],
  ["/google-review-link", "2026-10-27", "monthly", "0.8"],
  ["/founding", "2026-11-02", "weekly", "0.7"],
  ["/for", "2026-11-05", "monthly", "0.7"],
  ["/for/hair-salon", "2026-11-05", "monthly", "0.7"],
  ["/for/restaurant", "2026-11-05", "monthly", "0.7"],
  ["/for/barbershop", "2026-11-05", "monthly", "0.7"],
  ["/for/nail-salon", "2026-11-05", "monthly", "0.7"],
  ["/for/spa-and-massage", "2026-11-05", "monthly", "0.7"],
  ["/for/medical-and-aesthetic-clinic", "2026-11-05", "monthly", "0.7"],
  ["/for/physiotherapy", "2026-11-05", "monthly", "0.7"],
  ["/for/cafe", "2026-11-05", "monthly", "0.7"],
  ["/for/bakery", "2026-11-05", "monthly", "0.7"],
  ["/for/auto-repair", "2026-11-05", "monthly", "0.7"],
  ["/for/gym-and-fitness", "2026-11-05", "monthly", "0.7"],
  ["/about", "2026-11-02", "yearly", "0.5"],
  ["/security", "2026-11-02", "yearly", "0.5"],
  ["/faq", "2026-11-02", "monthly", "0.6"],
  ["/partners", "2026-11-02", "monthly", "0.4"],
  ["/partners/terms", "2026-10-27", "yearly", "0.2"],
  ["/setup-call", "2026-11-05", "yearly", "0.3"],
  ["/privacy", "2026-10-27", "yearly", "0.2"],
  ["/terms", "2026-10-27", "yearly", "0.2"],
  ["/guides", "2026-10-27", "monthly", "0.5"],
];
=======
// Guides 4 part C (master plan 30.32 item 4): no date is typed here. The pages and the files each one is made of are in
// src/content/sitemap-pages.json; each page's lastmod is the day of the last commit that touched those files, written to
// src/content/lastmod.json by scripts/write-lastmod.mjs at build. A guide's lastmod is its content file's `updated` date.
export type SitemapPage = { path: string; changefreq: string; priority: string; sources: string[] };
export const SITEMAP_PAGES: SitemapPage[] = pages;
export const LASTMOD: Record<string, string> = lastmods;
>>>>>>> origin/main

/** The XML for a list of public guides (newest first is fine; order does not matter to search engines). */
export function sitemapXml(guides: Pick<GuideMeta, "slug" | "updated">[]): string {
  const url = (path: string, lastmod: string, freq: string, pri: string) =>
    `  <url><loc>${SITE_URL}${path === "/" ? "" : path}</loc><lastmod>${lastmod}</lastmod><changefreq>${freq}</changefreq><priority>${pri}</priority></url>`;
  const newest = guides
    .map((g) => g.updated)
    .sort()
    .at(-1);
  const rows = [
    ...SITEMAP_PAGES.map(({ path, changefreq, priority }) => {
      const own = LASTMOD[path];
      if (!own) throw new Error(`no lastmod for ${path}: run node scripts/write-lastmod.mjs`);
      // The guides list changes when its newest guide does.
      return url(
        path,
        path === "/guides" && newest && newest > own ? newest : own,
        changefreq,
        priority,
      );
    }),
    ...guides.map((g) => url(`/guides/${g.slug}`, g.updated, "monthly", "0.5")),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</urlset>\n`;
}
