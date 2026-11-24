// Web 2: the industry pages and Home's examples (master plan 30.17 section 2; ported from the design studio's
// src/test/design5.test.ts). The similarity test is the quality gate against Google's scaled content rules: no two
// industry pages share more than 40 percent of their text. Content 1 finished the other nine pages in
// src/content/industries; a page that is not finished stays noindex and out of the sitemap (tests/sitemap.test.ts).
import { readFileSync } from "node:fs";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { routeTree } from "../src/routeTree.gen";
import { BLUEPRINT } from "../src/content/industries/blueprint";
import { INDUSTRIES, MOVED, OLD_GROUPS, industry, type Industry } from "../src/content/industries";
import { HOME_EXAMPLES } from "../src/content/home-examples";
import { GUIDE_TITLES } from "../src/lib/guide-titles";
import { LEGACY_INDUSTRY_MOVES } from "../src/lib/industry-redirects";

/* ---------- The similarity check (brief section 16, item 4; master plan 30.17 section 2) ---------- */

// Every line about the trade comes from its content file, so that is what is compared. The trade's own names are
// masked first, so a page made by swapping a trade word into another page's text fails. The shared blocks
// (Founding 25, the scan box, pricing, the template's headings) are the same on every page by rule and are left out.
const SKIP_KEYS = new Set(["slug", "finished", "photos", "focus", "guides", "related"]);

function strings(v: unknown, key = ""): string[] {
  if (SKIP_KEYS.has(key)) return [];
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap((x) => strings(x));
  if (v && typeof v === "object")
    return Object.entries(v).flatMap(([k, x]) => strings(x, k === "example" ? "" : k));
  return [];
}

export function pageText(i: Industry) {
  const e = i.example;
  const names = [
    i.plural,
    i.name,
    i.keyword,
    e.business,
    e.rival,
    e.rival2,
    e.city,
    e.kind,
    ...e.near,
  ]
    .map((n) => n.toLowerCase())
    .sort((a, b) => b.length - a.length);
  let t = strings({ ...i, example: undefined })
    .join(" ")
    .toLowerCase();
  for (const n of names) t = t.split(n).join(" trade ");
  return t
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function shingles(words: string[], n = 3) {
  const s = new Set<string>();
  for (let k = 0; k + n <= words.length; k++) s.add(words.slice(k, k + n).join(" "));
  return s;
}

/** The share of the smaller page's three-word runs that the other page also has. */
export function overlap(a: Industry, b: Industry) {
  const A = shingles(pageText(a));
  const B = shingles(pageText(b));
  let both = 0;
  for (const x of A) if (B.has(x)) both++;
  return both / Math.min(A.size, B.size);
}

describe("industry pages (Design 5, Web 2)", () => {
  it("no two industry pages share more than 40 percent of their text", () => {
    const worst: string[] = [];
    for (let x = 0; x < INDUSTRIES.length; x++)
      for (let y = x + 1; y < INDUSTRIES.length; y++) {
        const o = overlap(INDUSTRIES[x]!, INDUSTRIES[y]!);
        if (o > 0.4)
          worst.push(`${INDUSTRIES[x]!.slug} and ${INDUSTRIES[y]!.slug}: ${Math.round(o * 100)}%`);
      }
    expect(worst).toEqual([]);
  });

  it("the check catches a page made by swapping the trade word", () => {
    const salon = industry("hair-salon")!;
    const swapped: Industry = JSON.parse(
      JSON.stringify(salon)
        .replaceAll("hair salon", "nail salon")
        .replaceAll("Rose Lane Salon", "Polish Room"),
    );
    swapped.name = "nail salon";
    swapped.keyword = "nail salon";
    swapped.example = { ...swapped.example, business: "Polish Room" };
    expect(overlap(salon, swapped)).toBeGreaterThan(0.9);
  });

  it("twenty-two industries, all finished (Content 1, nine more in Industries 2, the cleaner in SITE-2)", () => {
    // Site 2 (master plan 30.34 item 4): Beauty salon is the 21st industry. SITE-2 (blueprint 3.1): the cleaner is the 22nd.
    expect(INDUSTRIES).toHaveLength(22);
    expect(new Set(INDUSTRIES.map((i) => i.slug)).size).toBe(22);
    expect(INDUSTRIES.filter((i) => !i.finished).map((i) => i.slug)).toEqual([]);
  });

  it("every page has its searches, its cards, its own example and photos with alt text", () => {
    const businesses = new Set<string>();
    for (const i of INDUSTRIES) {
      expect(i.searches.length, i.slug).toBeGreaterThanOrEqual(5);
      expect(i.page.jobs, i.slug).toHaveLength(3);
      // SITE-2: the page is one template with no profile cards (blueprint 3.1 section 5); the cards of the old pages stay
      // in their files and tests/industries3.test.ts keeps their limits.
      expect(i.keyword, i.slug).toBeTruthy();
      for (const p of i.photos) expect(p.alt, i.slug).toBeTruthy();
      businesses.add(i.example.business);
    }
    expect(businesses.size).toBe(INDUSTRIES.length);
  });

  // SITE-2 (blueprint 3.1 section 5): the page is one template. A finished industry has the page facts the list, the
  // head and the free check use, and its own example review, reply and Google fact in BLUEPRINT (tests/industries2.test.ts
  // checks the blueprint entry; tests/industry1-dup.test.ts checks that pages differ only in those).
  it("finished pages carry their head, their list card and a blueprint entry", () => {
    for (const i of INDUSTRIES.filter((x) => x.finished)) {
      for (const k of ["title", "description", "h1", "mark", "line", "card", "answer"] as const)
        expect(i.page[k], `${i.slug} ${k}`).toBeTruthy();
      expect(BLUEPRINT[i.slug], i.slug).toBeDefined();
    }
  });

  it("no group pages (Industries 2), and every page, old address and Home choice resolves", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const paths = [
      "/for",
      ...INDUSTRIES.map((i) => `/for/${i.slug}`),
      ...HOME_EXAMPLES.map((e) => e.to),
    ];
    for (const p of paths) expect(router.matchRoutes(p).at(-1)?.routeId, p).not.toBe(rootRouteId);
    // An old address goes to a page, or ("") to /for itself; it is never a page of its own.
    for (const [from, to] of Object.entries({ ...MOVED, ...LEGACY_INDUSTRY_MOVES })) {
      if (to !== "") expect(industry(to), from).toBeDefined();
      expect(industry(from), from).toBeUndefined();
    }
    for (const g of OLD_GROUPS) expect(industry(g), g).toBeUndefined();
    const vercel = readFileSync("vercel.json", "utf8");
    for (const g of OLD_GROUPS) expect(vercel, g).toMatch(new RegExp(`[(|]${g}[|)]`));
    for (const e of HOME_EXAMPLES) {
      if (e.to === "/for") continue;
      expect(industry(e.to.replace("/for/", "")), e.id).toBeDefined();
    }
  });

  it("Home's picker has the twelve choices of the brief (Other is a link to /for)", () => {
    expect(HOME_EXAMPLES.map((e) => e.label)).toEqual([
      "Salon",
      "Barber",
      "Restaurant",
      "Cafe",
      "Clinic",
      "Dentist",
      "Auto repair",
      "Gym",
      "Hotel",
      "Home services",
      "Shop",
    ]);
    expect(new Set(HOME_EXAMPLES.map((e) => e.business)).size).toBe(HOME_EXAMPLES.length);
  });
});

describe("the guide titles the industry pages link", () => {
  it("are the guides that exist, with their titles (Guides 3: one content file each)", () => {
    for (const [slug, title] of Object.entries(GUIDE_TITLES)) {
      const guide = readFileSync(`src/content/guides/${slug}.tsx`, "utf8");
      expect(guide, slug).toContain(`slug: "${slug}"`);
      expect(guide, slug).toContain(`title: "${title}"`);
    }
  });
});

describe("the guides' search titles (Go live 1, B-017)", () => {
  it("are under 60 characters (Guides 3: the brand is added only when it stays under 60)", async () => {
    const { ALL_GUIDES } = await import("../src/content/guides");
    for (const g of ALL_GUIDES) expect(g.title.length, g.slug).toBeLessThan(60);
  });
});

describe("a page that is noindex is not linked (Go live 1, B-013)", () => {
  it("/for and the page's own head use industryIndexed (SITE-2: the page has no related or guide links any more)", () => {
    expect(readFileSync("src/content/industries/index.ts", "utf8")).toContain(
      "INDUSTRIES.filter(industryIndexed)",
    );
    const route = readFileSync("src/routes/for.$trade.tsx", "utf8");
    expect(route).toContain("indexed: industryIndexed(i)");
    expect(route).toContain("noindex: !d.indexed");
    expect(readFileSync("src/components/marketing/business-grid.tsx", "utf8")).toContain(
      "INDUSTRIES.filter(industryIndexed)",
    );
  });
});
