// Guides 4 part C (master plan 30.32 item 4): the sitemap's lastmod is each page's real last change, never a hand-typed date.
// Guides use their content file's `updated` date; every other page uses the day of the last commit that touched its route or
// content, written to src/content/lastmod.json by scripts/write-lastmod.mjs at build.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ALL_GUIDES } from "../src/content/guides";
import { PUBLISH_ALL_AT, publicGuides, weeklyAt } from "../src/content/guides/schedule";
import { LASTMOD, SITEMAP_PAGES, sitemapXml } from "../src/lib/sitemap";

const OPEN = publicGuides(ALL_GUIDES, new Date(PUBLISH_ALL_AT));
const xml = sitemapXml(OPEN);
const lastmodIn = (sitemap: string, path: string) =>
  new RegExp(
    `<loc>https://kabsi\\.co${path === "/" ? "" : path}</loc><lastmod>([0-9-]+)</lastmod>`,
  ).exec(sitemap)?.[1];
const lastmodOf = (path: string) => lastmodIn(xml, path);

describe("the sitemap's lastmod", () => {
  it("has no date typed in the code that builds it", () => {
    expect(readFileSync("src/lib/sitemap.ts", "utf8")).not.toMatch(/\b20\d\d-\d\d-\d\d\b/);
    for (const p of SITEMAP_PAGES)
      expect(Object.keys(p).sort()).toEqual(["changefreq", "path", "priority", "sources"]);
  });
  it("lists for every page the files it is made of, and they exist", () => {
    for (const p of SITEMAP_PAGES) {
      expect(p.sources.length, p.path).toBeGreaterThan(0);
      for (const f of p.sources) expect(existsSync(f), `${p.path}: ${f}`).toBe(true);
    }
  });
  it("has a real date for every page, from the generated file, and none in the future", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(Object.keys(LASTMOD).sort()).toEqual(SITEMAP_PAGES.map((p) => p.path).sort());
    for (const [path, day] of Object.entries(LASTMOD)) {
      expect(day, path).toMatch(/^20\d\d-\d\d-\d\d$/);
      expect(day <= today, path).toBe(true);
      if (path !== "/guides") expect(lastmodOf(path), path).toBe(day);
    }
  });
  it("gives each guide its content file's updated date, and the guides list the newest of them", () => {
    for (const g of OPEN) expect(lastmodOf(`/guides/${g.slug}`), g.slug).toBe(g.updated);
    // A weekly guide is in the sitemap, with its own updated date, only from its day.
    const later = sitemapXml(publicGuides(ALL_GUIDES, new Date(weeklyAt(7))));
    for (const g of ALL_GUIDES) expect(lastmodIn(later, `/guides/${g.slug}`), g.slug).toBe(g.updated);
    const newest = OPEN.map((g) => g.updated)
      .sort()
      .at(-1)!;
    expect(lastmodOf("/guides")! >= newest).toBe(true);
  });
  it("is the day of the last commit that touched the page's files (when the repository has its whole history)", () => {
    const git = (...a: string[]) =>
      execFileSync("git", a, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    let full = false;
    try {
      full = git("rev-parse", "--is-shallow-repository") === "false";
    } catch {
      /* not a git checkout */
    }
    if (!full) return;
    for (const p of SITEMAP_PAGES) {
      const days = p.sources
        .map((f) => git("log", "-1", "--format=%cs", "--", f))
        .filter(Boolean)
        .sort();
      // The generated file is written at build, so it may trail the newest commit by the commit that regenerates it, never lead it.
      expect(LASTMOD[p.path]! <= (days.at(-1) ?? "9"), p.path).toBe(true);
    }
  });
  it("is written by the build, and a short git history keeps the committed file", () => {
    expect(JSON.parse(readFileSync("package.json", "utf8")).scripts.build).toContain(
      "node scripts/write-lastmod.mjs",
    );
    expect(readFileSync("scripts/write-lastmod.mjs", "utf8")).toContain("is-shallow-repository");
  });
});
