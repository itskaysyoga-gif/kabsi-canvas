// Web 2 (master plan 30.16 section 4, 30.17 section 2): the sitemap lists only the pages that are indexed. Every page
// in it has a route, the finished industry pages and the hubs that hold one are in it, the template pages are not,
// and nothing in it is noindex.
import { readFileSync } from "node:fs";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { routeTree } from "../src/routeTree.gen";
import { HUBS, INDUSTRIES, hubIndexed } from "../src/content/industries";

const xml = readFileSync("public/sitemap.xml", "utf8");
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
    ])
      expect(paths, p).toContain(p);
    expect(new Set(paths).size).toBe(paths.length);
  });
  it("lists the finished industry pages and their hubs, never a template page", () => {
    for (const i of INDUSTRIES) expect(paths.includes(`/for/${i.slug}`), i.slug).toBe(i.finished);
    for (const h of HUBS) expect(paths.includes(`/for/${h.id}`), h.id).toBe(hubIndexed(h.id));
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
