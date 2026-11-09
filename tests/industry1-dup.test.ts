// Industry 1 (R-144): SEO 1's duplicate measure on the 21 industry pages, as the server renders them. Each page is
// rendered with the same component the route uses (IndustryPage inside <main>, with its six related businesses and its
// three guides), then measured by scripts/lib/page-dup.mjs, the same code scripts/industry-dup.mjs runs on a built or
// live site: the text of <main>, split at every tag and into sentences, lower case, once per page. A pair's share is its
// identical sentences over the shorter page (35 percent at most); a page's own text is its sentences found on fewer than
// half of the industry pages (70 percent at least). The public e2e suite runs the same measure on the built pages.
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { INDUSTRIES, industry, industryIndexed } from "../src/content/industries";
import { IndustryPage } from "../src/components/kabsi/d9-industry";
import { ALL_GUIDES } from "../src/content/guides";
import { pickIndustryGuides } from "../src/lib/guides-server";
import { OWN_MIN, PAIR_MAX, failures, measure, pct, sentences } from "../scripts/lib/page-dup.mjs";

const pages = INDUSTRIES.filter(industryIndexed);
const meta = ALL_GUIDES.map((g) => ({ ...g }));

async function render(slug: string) {
  const i = industry(slug)!;
  const related = i.page.related.map((s) => industry(s)!).filter(industryIndexed);
  const guides = pickIndustryGuides(meta, i.guides, i.slug);
  const root = createRootRoute({
    component: () =>
      createElement(
        "main",
        { id: "main" },
        createElement(IndustryPage, { industry: i, related, guides }),
      ),
  });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await router.load();
  return renderToString(createElement(RouterProvider, { router }));
}

describe("Industry 1: each industry page is mostly its own text (R-144)", async () => {
  const html: Record<string, string> = {};
  for (const i of pages) html[i.slug] = await render(i.slug);
  const m = measure(Object.fromEntries(Object.entries(html).map(([k, v]) => [k, sentences(v)])));

  it("renders all 21 pages, each with one H1", () => {
    expect(pages).toHaveLength(21);
    for (const [slug, h] of Object.entries(html))
      expect(h.match(/<h1[\s>]/g)?.length ?? 0, slug).toBe(1);
  });

  it("gives every page at least 70 percent of its own text", () => {
    const low = m.own
      .filter((o) => o.share < OWN_MIN)
      .map((o) => `${o.page}: ${o.own} of ${o.total}, ${pct(o.share)}`);
    expect(low).toEqual([]);
  });

  it("has no pair of pages above 35 percent identical sentences", () => {
    const high = m.pairs
      .filter((p) => p.share > PAIR_MAX)
      .map((p) => `${p.a} / ${p.b}: ${p.same} of ${p.shorter}, ${pct(p.share)}`);
    expect(high).toEqual([]);
  });

  it("keeps the shared template small: fewer than 45 sentences on every page", () => {
    expect(m.onEvery).toBeLessThan(45);
  });

  it("catches a page made by copying another page's trade lines", () => {
    // A fake 22nd page: the hair salon page with the barber's name swapped in, so only the trade words differ.
    const copy = sentences(html["hair-salon"]!.split("hair salon").join("barber shop"));
    const fake = measure({
      ...Object.fromEntries(Object.entries(html).map(([k, v]) => [k, sentences(v)])),
      "copied-page": copy,
    });
    expect(failures(fake).pairs.some((p) => p.a === "copied-page" || p.b === "copied-page")).toBe(
      true,
    );
  });
});
