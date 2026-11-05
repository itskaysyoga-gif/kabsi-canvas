// Web 2 (master plan 30.16 section 4, 30.17 section 2): the sitemap lists only the pages that are indexed. Every page
// in it has a route, the finished industry pages and the hubs that hold one are in it, the template pages are not,
// and nothing in it is noindex.
import { readFileSync } from "node:fs";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { routeTree } from "../src/routeTree.gen";
import { HUBS, INDUSTRIES, hubIndexed, industryIndexed } from "../src/content/industries";
import { ALL_GUIDES } from "../src/content/guides";
import { publicGuides } from "../src/content/guides/schedule";
import { sitemapXml } from "../src/lib/sitemap";

// Guides 3: the sitemap is a server route now; it is built here as it is on 5 Nov 2026 at noon UTC (the first new guide
// public, the second not yet), with every earlier guide.
const xml = sitemapXml(publicGuides(ALL_GUIDES, new Date("2026-11-05T12:00:00Z")));
const paths = [...xml.matchAll(/<loc>https:\/\/kabsi\.co([^<]*)<\/loc>/g)].map((m) => m[1] || "/");

describe("the sitemap", () => {
  it("has every indexed public page and no page twice", () => {
    for (const p of [
      "/",
      "/pricing",
      "/how-it-works",
      "/about",
      "/security",
      "/faq",
      "/privacy",
      "/terms",
      "/partners",
      "/partners/terms",
      "/founding",
      "/scan",
      "/google-review-link",
      "/for",
      "/setup-call",
    ])
      expect(paths, p).toContain(p);
    expect(new Set(paths).size).toBe(paths.length);
  });
  it("lists the finished industry pages and their hubs, never a template page", () => {
    for (const i of INDUSTRIES)
      expect(paths.includes(`/for/${i.slug}`), i.slug).toBe(industryIndexed(i));
    for (const h of HUBS) expect(paths.includes(`/for/${h.id}`), h.id).toBe(hubIndexed(h.id));
  });
  it("leaves out the dental clinic page until it has a claim sheet (Fix 1), and counts 40 pages on 5 Nov 2026 (Fix 2 added two guides, Go live 1 added /setup-call, Guides 3 its first guide)", () => {
    const dental = INDUSTRIES.find((i) => i.slug === "dental-clinic")!;
    let sheet = true;
    try {
      readFileSync("docs/claims/dental-clinic.md", "utf8");
    } catch {
      sheet = false;
    }
    // When the sheet lands, drop `indexed: false` from dental-clinic.ts and put the page back in the sitemap.
    expect(industryIndexed(dental)).toBe(sheet);
    expect(paths.includes("/for/dental-clinic")).toBe(sheet);
    expect(paths).toHaveLength(sheet ? 41 : 40);
  });
  it("leaves out the pages that are noindex or one visitor's", () => {
    for (const p of paths)
      expect(p).not.toMatch(/^\/(manager-steps|scan\/|google-profile-check|login|start|app|a\/)/);
  });
  it("points every address at a route", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    for (const p of paths) expect(router.matchRoutes(p).at(-1)?.routeId, p).not.toBe(rootRouteId);
  });
  it("is named in robots.txt, which lets the search and answer engines in (30.16 section 4)", () => {
    const robots = readFileSync("public/robots.txt", "utf8");
    expect(robots).toContain("Sitemap: https://kabsi.co/sitemap.xml");
    for (const bot of ["Googlebot", "OAI-SearchBot", "PerplexityBot", "GPTBot"])
      expect(robots).toContain(`User-agent: ${bot}`);
  });
});
