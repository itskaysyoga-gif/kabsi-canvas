// The sitemap (Guides 3: a server route, src/routes/sitemap[.]xml.ts, computed on each request). Only the pages that are
// indexed (Web 2, master plan 30.16 section 4 and 30.17 section 2): template industry pages, the hubs without a finished
// page, /manager-steps, free check results and the 404 stay out. The guides are added per request, public ones only.
// tests/sitemap.test.ts keeps this list equal to the routes and the industry content.
import type { GuideMeta } from "@/content/guides/types";
import { SITE_URL } from "@/lib/site";

/** [path, lastmod, changefreq, priority] for every indexed page that is not a guide. */
export const SITEMAP_PAGES: [string, string, string, string][] = [
  ["/", "2026-10-27", "weekly", "1.0"],
  ["/pricing", "2026-10-27", "monthly", "0.9"],
  ["/how-it-works", "2026-10-27", "monthly", "0.8"],
  ["/scan", "2026-10-27", "monthly", "0.9"],
  ["/google-review-link", "2026-10-27", "monthly", "0.8"],
  ["/founding", "2026-11-02", "weekly", "0.7"],
  ["/for", "2026-11-02", "monthly", "0.7"],
  ["/for/beauty-and-wellness", "2026-10-27", "monthly", "0.5"],
  ["/for/food-and-drink", "2026-10-27", "monthly", "0.5"],
  ["/for/health", "2026-10-27", "monthly", "0.5"],
  ["/for/auto", "2026-10-27", "monthly", "0.5"],
  ["/for/fitness-and-sport", "2026-10-27", "monthly", "0.5"],
  ["/for/hair-salon", "2026-11-02", "monthly", "0.7"],
  ["/for/restaurant", "2026-11-02", "monthly", "0.7"],
  ["/for/barbershop", "2026-11-02", "monthly", "0.7"],
  ["/for/nail-salon", "2026-11-02", "monthly", "0.7"],
  ["/for/spa-and-massage", "2026-11-02", "monthly", "0.7"],
  ["/for/medical-and-aesthetic-clinic", "2026-11-02", "monthly", "0.7"],
  ["/for/physiotherapy", "2026-11-02", "monthly", "0.7"],
  ["/for/cafe", "2026-11-02", "monthly", "0.7"],
  ["/for/bakery", "2026-11-02", "monthly", "0.7"],
  ["/for/auto-repair", "2026-11-02", "monthly", "0.7"],
  ["/for/gym-and-fitness", "2026-11-02", "monthly", "0.7"],
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

/** The XML for a list of public guides (newest first is fine; order does not matter to search engines). */
export function sitemapXml(guides: Pick<GuideMeta, "slug" | "updated">[]): string {
  const url = (path: string, lastmod: string, freq: string, pri: string) =>
    `  <url><loc>${SITE_URL}${path === "/" ? "" : path}</loc><lastmod>${lastmod}</lastmod><changefreq>${freq}</changefreq><priority>${pri}</priority></url>`;
  const newest =
    guides
      .map((g) => g.updated)
      .sort()
      .at(-1) ?? "2026-10-27";
  const rows = [
    ...SITEMAP_PAGES.map(([p, l, f, r]) =>
      p === "/guides" ? url(p, newest > l ? newest : l, f, r) : url(p, l, f, r),
    ),
    ...guides.map((g) => url(`/guides/${g.slug}`, g.updated, "monthly", "0.5")),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</urlset>\n`;
}
