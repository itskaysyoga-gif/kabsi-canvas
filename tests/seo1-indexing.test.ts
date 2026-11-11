// SEO 1 (indexing health, 9 Nov 2026): old addresses answer one 301 to a live page (no chain), robots.txt lets every
// sitemap page through, every sitemap page has one canonical on its own address, and the footer links /setup-call.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MOVED, OLD_GROUPS, industry } from "../src/content/industries";
import { LEGACY_INDUSTRY_MOVES } from "../src/lib/industry-redirects";
import { SITE_URL, pageHead } from "../src/lib/site";
import pages from "../src/content/sitemap-pages.json";

type Redirect = { source: string; destination: string; statusCode?: number; permanent?: boolean };
const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as { redirects: Redirect[] };

/** The redirect that answers a path, for the two source shapes vercel.json uses here: a literal, or /x/:name(a|b|c). */
function answer(path: string): Redirect | undefined {
  return vercel.redirects.find((r) => {
    if (r.source.includes("*") || r.source.includes("(.*)") || /has/.test(JSON.stringify(r)))
      return false;
    const m = /^(.*):[a-z]+\(([^)]*)\)(\/?)$/.exec(r.source);
    if (m) {
      const [, prefix, alts, slash] = m;
      return path.startsWith(prefix!) &&
        path === `${prefix}${path.slice(prefix!.length).replace(/\/$/, "")}${slash}`
        ? alts!.split("|").includes(path.slice(prefix!.length).replace(/\/$/, ""))
        : false;
    }
    return r.source === path;
  });
}

describe("old addresses answer one 301 to a live page", () => {
  const moves: [string, string][] = [
    ...Object.entries({ ...MOVED, ...LEGACY_INDUSTRY_MOVES }).map(
      ([from, to]) => [from, to === "" ? "/for" : `/for/${to}`] as [string, string],
    ),
    ...OLD_GROUPS.map((g) => [g, "/for"] as [string, string]),
  ];

  for (const [from, to] of moves) {
    for (const slash of ["", "/"]) {
      it(`/for/${from}${slash} goes straight to ${to}`, () => {
        const r = answer(`/for/${from}${slash}`);
        expect(r, "no redirect in vercel.json").toBeDefined();
        expect(r!.statusCode).toBe(301);
        expect(r!.destination).toBe(to);
      });
    }
  }

  it("lands on a page that exists, never on another redirect", () => {
    for (const [, to] of moves) {
      if (to !== "/for") expect(industry(to.replace("/for/", "")), to).toBeDefined();
      expect(answer(to), `${to} is itself redirected`).toBeUndefined();
    }
    for (const r of vercel.redirects) {
      if (!r.destination.startsWith("/") || r.destination.includes(":")) continue;
      expect(answer(r.destination), `${r.source} lands on a redirect`).toBeUndefined();
    }
  });

  it("answers /lebanon, /partner/ and the renamed tools with a trailing slash in one hop", () => {
    expect(answer("/lebanon/")?.destination).toBe("/pricing");
    expect(answer("/product/")?.destination).toBe("/pricing");
    // Partners 2 (11 Nov 2026): /partner is the partner home now, so /partner/ answers it.
    expect(answer("/partner/")?.destination).toBe("/partner");
    expect(answer("/google-profile-check/")?.destination).toBe("/scan");
    expect(answer("/get-started/")?.destination).toBe("/scan");
  });
});

describe("robots.txt", () => {
  const robots = readFileSync("public/robots.txt", "utf8");
  // Every group's Disallow lines, read the way Google reads them: a prefix, and $ ends the path.
  const rules = robots
    .split("\n")
    .filter((l) => l.startsWith("Disallow:"))
    .map((l) => l.slice(9).trim())
    .filter(Boolean);
  const blocked = (path: string) =>
    rules.some((r) => (r.endsWith("$") ? path === r.slice(0, -1) : path.startsWith(r)));

  it("names the sitemap on the one host", () => {
    expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });

  it("lets every sitemap page through, and every address linked from public pages", () => {
    for (const p of pages) expect(blocked(p.path), p.path).toBe(false);
    for (const asset of ["/apple-touch-icon.png", "/guides/anything", "/for/hair-salon"])
      expect(blocked(asset), asset).toBe(false);
  });

  it("keeps the app, staff and token pages out", () => {
    for (const p of ["/app", "/app/settings", "/staff", "/login", "/start", "/a/abc", "/scan/ABC"])
      expect(blocked(p), p).toBe(true);
  });
});

describe("head of every sitemap page", () => {
  it("has one canonical on its own address and no noindex", () => {
    for (const p of pages) {
      const head = pageHead({ title: "t", description: "d", path: p.path });
      const canon = head.links.filter((l) => l.rel === "canonical");
      expect(canon, p.path).toHaveLength(1);
      expect(canon[0]!.href, p.path).toBe(`${SITE_URL}${p.path === "/" ? "" : p.path}`);
      const robots = head.meta.find((m) => m.name === "robots")?.content ?? "";
      expect(robots, p.path).not.toContain("noindex");
    }
  });
});

describe("crawl paths", () => {
  it("links /setup-call from the footer, so the sitemap page is reachable from every page", () => {
    expect(readFileSync("src/components/kabsi/site-footer.tsx", "utf8")).toContain(
      'to: "/setup-call"',
    );
  });
});
