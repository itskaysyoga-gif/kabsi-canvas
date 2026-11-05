// Guides 4 part B (master plan 30.32 item 6): the list of public pages Nora may link, built from the same sources as the
// sitemap: the public guides (publicGuides, decided on the server's clock for each request) and the indexed industry pages.
// Served as kabsi.co/nora-pages.json (src/routes/nora-pages[.]json.ts). The assistant function reads it for each answer.
import type { GuideDoc } from "@/content/guides/types";
import { publicGuides } from "@/content/guides/schedule";
import type { Industry } from "@/content/industries";

export type NoraPage = {
  kind: "guide" | "industry";
  title: string;
  path: string;
  summary: string;
  question: string;
};

/** The guides public at `now` and the industry pages in search, each with its title, address, one line and main question. */
export function publicPagesOf(
  guides: Pick<GuideDoc, "slug" | "title" | "summary" | "description" | "publishAt">[],
  industries: Pick<Industry, "slug" | "plural" | "name" | "lead">[],
  now: Date,
): NoraPage[] {
  const g = publicGuides(guides, now).map((x): NoraPage => ({
    kind: "guide",
    title: x.title,
    path: `/guides/${x.slug}`,
    summary: x.summary,
    // A guide's title is the owner's question; a title that is not a question falls back to its description.
    question: x.title.trim().endsWith("?") ? x.title : x.description,
  }));
  const i = industries.map((x): NoraPage => ({
    kind: "industry",
    title: `Kabsi for ${x.plural.toLowerCase()}`,
    path: `/for/${x.slug}`,
    summary: x.lead,
    question: `What does Kabsi do for a ${x.name}?`,
  }));
  return [...g, ...i];
}

/** The real list, at `now`. Loaded only on the server (dynamic imports), like the sitemap. */
export async function publicPages(now: Date): Promise<NoraPage[]> {
  const [{ ALL_GUIDES }, { INDUSTRIES, industryIndexed }] = await Promise.all([
    import("@/content/guides"),
    import("@/content/industries"),
  ]);
  return publicPagesOf(ALL_GUIDES, INDUSTRIES.filter(industryIndexed), now);
}
