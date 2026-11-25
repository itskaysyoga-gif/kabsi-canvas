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
import { BLUEPRINT } from "../src/content/industries/blueprint";
import { TRADE_WORK } from "../src/content/industries/trade-work";
import { IndustryPage } from "../src/components/kabsi/d9-industry";
import { OWN_MIN, PAIR_MAX, failures, measure, pct, sentences } from "../scripts/lib/page-dup.mjs";

const pages = INDUSTRIES.filter(industryIndexed);

async function render(slug: string) {
  const i = industry(slug)!;
  const root = createRootRoute({
    component: () =>
      createElement("main", { id: "main" }, createElement(IndustryPage, { industry: i })),
  });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await router.load();
  return renderToString(createElement(RouterProvider, { router }));
}

/** The page's HTML with the things that may change per industry taken out (blueprint 3.1 section 5, widened by SITE-5
 * lane R decision 2: the trade's three examples and its three questions). */
function shell(slug: string, html: string) {
  const i = industry(slug)!;
  const b = BLUEPRINT[slug]!;
  const esc = (t: string) =>
    t
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/'/g, "&#x27;")
      .replace(/"/g, "&quot;");
  // Longest first, so a name inside a longer line is not cut first.
  const w = TRADE_WORK[slug]!;
  const vary = [
    ...w.does.flatMap((x) => [x.title, x.text]),
    ...w.faq.flatMap((x) => [x.q, x.a]),
    w.post,
    b.review.text,
    b.reply,
    b.fact.text,
    b.fact.source.title,
    b.fact.source.url,
    `${b.review.name}, ${b.review.stars} stars`,
    i.example.business,
    i.plural,
    i.name,
    i.keyword,
    i.slug,
    i.plural.toLowerCase(),
  ]
    .flatMap((t) => [t, esc(t)])
    .sort((x, y) => y.length - x.length);
  let t = html;
  // Whole words only: a short noun such as "spa" must not cut the "spa" out of a class name.
  for (const v of vary)
    t = t.replace(
      new RegExp(`(?<![\\w-])${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`, "g"),
      "@",
    );
  // Markup that only carries the removed text (a React text separator) is not content.
  // SITE-4 (lane R): each page's hero photo is matched to its trade, so the photo's <img> and the preload React writes
  // for it are taken out too; every word on the page is still compared.
  return t
    .replace(/<link rel="preload" as="image"[^>]*>/g, "")
    .replace(/<img [^>]*>/g, "<img>")
    .replace(/<!-- -->/g, "")
    .replace(/@+/g, "@");
}

describe("SITE-2: the industry pages are one template (blueprint 3.1 section 5)", async () => {
  const html: Record<string, string> = {};
  for (const i of pages) html[i.slug] = await render(i.slug);

  it("renders all 22 pages, each with one H1 that names the industry", () => {
    expect(pages).toHaveLength(22);
    for (const [slug, h] of Object.entries(html)) {
      expect(h.match(/<h1[\s>]/g)?.length ?? 0, slug).toBe(1);
      expect(h, slug).toContain(industry(slug)!.name);
    }
  });

  it("differs between two pages only in the headline noun, the example review and reply, the fact, and the trade's own examples and questions", () => {
    const base = Object.keys(html)[0]!;
    const want = shell(base, html[base]!);
    for (const [slug, h] of Object.entries(html)) expect(shell(slug, h), slug).toBe(want);
  });

  it("shows each page's own example review, reply and fact, with its source link", () => {
    for (const [slug, h] of Object.entries(html)) {
      const b = BLUEPRINT[slug]!;
      expect(h, slug).toContain(b.review.name);
      expect(h, slug).toContain(b.fact.source.url.replace(/&/g, "&amp;"));
    }
  });

  // SITE-5 (lane R decision 2): each trade has three examples and three questions of its own, shown on its page.
  it("shows each trade's own three examples, three questions and its own Google profile screen", () => {
    const titles = new Set<string>();
    for (const [slug, h] of Object.entries(html)) {
      const w = TRADE_WORK[slug];
      expect(w, slug).toBeDefined();
      expect(w!.does).toHaveLength(3);
      expect(w!.faq).toHaveLength(3);
      for (const x of w!.does) {
        expect(h, slug).toContain(x.title.replace(/'/g, "&#x27;"));
        expect(titles.has(x.title), `${slug}: ${x.title} is on another page`).toBe(false);
        titles.add(x.title);
      }
      for (const x of w!.faq) expect(h, slug).toContain(x.q.replace(/'/g, "&#x27;"));
      expect(h, slug).toContain(`/screens/trade-${slug}-560.webp`);
    }
  });

  it("is caught when a page changes anything else (a fake page with one extra sentence)", () => {
    const base = Object.keys(html)[0]!;
    const changed = html[base]!.replace("Send a photo.", "Send a photo and more.");
    expect(shell(base, changed)).not.toBe(shell(base, html[base]!));
  });

  // The measure of scripts/lib/page-dup.mjs (R-144) is kept for the page text that is not shared: the review, the reply
  // and the fact. A copied page (one trade's blueprint lines under another noun) is still caught.
  it("catches a page made by copying another page's trade lines", () => {
    const m = measure(Object.fromEntries(Object.entries(html).map(([k, v]) => [k, sentences(v)])));
    expect(m.pairs.length).toBeGreaterThan(0);
    const copy = sentences(html["hair-salon"]!.split("hair salon").join("barber shop"));
    const fake = measure({
      ...Object.fromEntries(Object.entries(html).map(([k, v]) => [k, sentences(v)])),
      "copied-page": copy,
    });
    expect(failures(fake).pairs.some((p) => p.a === "copied-page" || p.b === "copied-page")).toBe(
      true,
    );
    void OWN_MIN;
    void PAIR_MAX;
    void pct;
  });
});
