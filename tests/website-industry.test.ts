// Web 2: the industry pages and Home's examples (master plan 30.17 section 2; ported from the design studio's
// src/test/design5.test.ts). The similarity test is the quality gate against Google's scaled content rules: no two
// industry pages share more than 40 percent of their text. Content 1 finishes the other nine pages in
// src/content/industries; a page that is not finished stays noindex and out of the sitemap (tests/sitemap.test.ts).
import { readFileSync } from "node:fs";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { routeTree } from "../src/routeTree.gen";
import { HUBS, INDUSTRIES, MOVED, hub, industry, type Industry } from "../src/content/industries";
import { HOME_EXAMPLES } from "../src/content/home-examples";
import { GUIDE_TITLES } from "../src/lib/guide-titles";
import { LEGACY_INDUSTRY_MOVES } from "../src/lib/industry-redirects";

/* ---------- The similarity check (brief section 16, item 4; master plan 30.17 section 2) ---------- */

// Every line about the trade comes from its content file, so that is what is compared. The trade's own names are
// masked first, so a page made by swapping a trade word into another page's text fails. The shared blocks
// (Founding 25, the scan box, pricing, the template's headings) are the same on every page by rule and are left out.
const SKIP_KEYS = new Set(["slug", "hub", "finished", "photos", "focus", "guides"]);

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

  it("wave 1 has twelve industries; three are finished and indexed", () => {
    expect(INDUSTRIES).toHaveLength(12);
    expect(new Set(INDUSTRIES.map((i) => i.slug)).size).toBe(12);
    expect(INDUSTRIES.filter((i) => i.finished).map((i) => i.slug)).toEqual([
      "hair-salon",
      "dental-clinic",
      "restaurant",
    ]);
  });

  it("every page has its searches, five tasks, its own example and photos with alt text", () => {
    const businesses = new Set<string>();
    for (const i of INDUSTRIES) {
      expect(i.searches.length, i.slug).toBeGreaterThanOrEqual(6);
      expect(i.tasks).toHaveLength(5);
      expect(i.keyword, i.slug).toBeTruthy();
      expect(hub(i.hub), i.slug).toBeDefined();
      for (const p of i.photos) expect(p.alt, i.slug).toBeTruthy();
      businesses.add(i.example.business);
    }
    expect(businesses.size).toBe(INDUSTRIES.length);
  });

  it("finished pages carry every section, and at least 600 words of their own", () => {
    for (const i of INDUSTRIES.filter((x) => x.finished)) {
      expect(i.categories, i.slug).toBeDefined();
      expect(i.reviewThemes?.length, i.slug).toBeGreaterThanOrEqual(4);
      expect(i.story?.lines.length, i.slug).toBeGreaterThanOrEqual(4);
      expect(i.posts?.length, i.slug).toBeGreaterThanOrEqual(4);
      expect(i.photoTips?.length, i.slug).toBeGreaterThanOrEqual(3);
      expect(i.holidays?.length, i.slug).toBeGreaterThanOrEqual(3);
      expect(i.faqs?.length, i.slug).toBeGreaterThanOrEqual(4);
      // At least one of its two guides exists on kabsi.co; the page links only those (never a dead link).
      expect(
        (i.guides ?? []).some((g) => GUIDE_TITLES[g]),
        i.slug,
      ).toBe(true);
      expect(pageText(i).length, i.slug).toBeGreaterThanOrEqual(600);
    }
  });

  it("nine hubs, and every page, hub, old address and Home choice resolves", () => {
    expect(HUBS).toHaveLength(9);
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const paths = [
      "/for",
      "/founding",
      ...HUBS.map((h) => `/for/${h.id}`),
      ...INDUSTRIES.map((i) => `/for/${i.slug}`),
      ...HOME_EXAMPLES.map((e) => e.to),
    ];
    for (const p of paths) expect(router.matchRoutes(p).at(-1)?.routeId, p).not.toBe(rootRouteId);
    for (const [from, to] of Object.entries({ ...MOVED, ...LEGACY_INDUSTRY_MOVES })) {
      expect(industry(to) ?? hub(to), from).toBeDefined();
      expect(industry(from) ?? hub(from), from).toBeUndefined();
    }
    for (const e of HOME_EXAMPLES) {
      const slug = e.to.replace("/for/", "");
      expect(industry(slug) ?? hub(slug), e.id).toBeDefined();
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
  it("are the guides that exist, with their titles", () => {
    const guides = readFileSync("src/lib/guides.tsx", "utf8");
    for (const [slug, title] of Object.entries(GUIDE_TITLES)) {
      expect(guides, slug).toContain(`slug: "${slug}"`);
      expect(guides, slug).toContain(`title: "${title}"`);
    }
  });
});
