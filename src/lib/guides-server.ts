// Guides 3 (A.2): which guides are public is decided on the server, on each request, from the server's clock. The guide
// pages, the guides list and the industry pages ask through these server functions; the browser never decides. The
// guide texts stay on the server here (dynamic imports inside the handlers), and only titles and dates travel.
import { createServerFn } from "@tanstack/react-start";
import type { GuideMeta } from "@/content/guides/types";

export type GuideListData = { guides: GuideMeta[]; publicSlugs: string[] };
export type GuidePageData = {
  guide: GuideMeta;
  related: GuideMeta[];
  industries: { slug: string; name: string }[];
  publicSlugs: string[];
};

async function publicNow() {
  const [{ ALL_GUIDES }, { metaOf, publicGuides }, { guideText, wordCount }] = await Promise.all([
    import("@/content/guides"),
    import("@/content/guides/schedule"),
    import("@/content/guides/text"),
  ]);
  const open = publicGuides(ALL_GUIDES, new Date());
  return open.map((g) => metaOf(g, wordCount(guideText(g)) || 600));
}

/** The public guides, newest first. */
export const getGuideList = createServerFn({ method: "GET" }).handler(
  async (): Promise<GuideListData> => {
    const guides = await publicNow();
    return { guides, publicSlugs: guides.map((g) => g.slug) };
  },
);

/** One public guide with its related guides and industry pages, or null when it is not public (the page answers 404). */
export const getGuidePage = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => {
    if (typeof slug !== "string" || !/^[a-z0-9-]{1,120}$/.test(slug)) throw new Error("bad slug");
    return slug;
  })
  .handler(async ({ data: slug }): Promise<GuidePageData | null> => {
    const guides = await publicNow();
    const guide = guides.find((g) => g.slug === slug);
    if (!guide) return null;
    const { industry: industryBySlug, industryIndexed } = await import("@/content/industries");
    const bySlug = new Map(guides.map((g) => [g.slug, g]));
    const related = guide.related
      .map((s) => bySlug.get(s))
      .filter((g): g is GuideMeta => Boolean(g));
    // Fill to three with the newest other public guides, so every guide ends with somewhere to go.
    for (const g of guides) {
      if (related.length >= 3) break;
      if (g.slug !== slug && !related.includes(g)) related.push(g);
    }
    const industries = guide.industries
      .map((s) => industryBySlug(s))
      .filter((i) => i && industryIndexed(i))
      .map((i) => ({ slug: i!.slug, name: i!.name }));
    return { guide, related, industries, publicSlugs: guides.map((g) => g.slug) };
  });

/** The public guides that name an industry page, for that page's "Guides for you" links (links both ways). */
export const getIndustryGuides = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => {
    if (typeof slug !== "string" || !/^[a-z0-9-]{1,80}$/.test(slug)) throw new Error("bad slug");
    return slug;
  })
  .handler(async ({ data: slug }) => {
    const guides = await publicNow();
    return guides
      .filter((g) => g.industries.includes(slug))
      .map((g) => ({ slug: g.slug, title: g.title }));
  });
