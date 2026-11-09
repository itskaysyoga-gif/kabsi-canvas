// Industries 3 (master plan 30.33 item 2): the industry pages short and scannable. No reading block on a public page: a
// paragraph has at most 25 words and a list item (a card's one line) at most 15. Every page shows six related businesses
// and three guides, and no grid leaves one card alone in its last row. The public e2e suite counts the same on the
// rendered pages (tests/e2e/public.spec.ts).
import { describe, expect, it } from "vitest";
import { INDUSTRIES, industry, industryIndexed, type Card } from "../src/content/industries";
import { ALL_GUIDES } from "../src/content/guides";
import { pickIndustryGuides } from "../src/lib/guides-server";
import { guideLook } from "../src/content/guides/look";

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const pages = INDUSTRIES.filter(industryIndexed);
const PARA = 25;
const ITEM = 15;

function cards(i: (typeof pages)[number]): [string, Card[] | undefined][] {
  return [
    ["profile", i.profile],
    ["reviews", i.reviews],
    ["holidays", i.holidays],
    ["photoCards", i.photoCards],
    ["jobs", i.page.jobs],
  ];
}

describe("Industries 3: short, scannable industry pages (30.33 item 2)", () => {
  it("has no paragraph over 25 words", () => {
    const long: string[] = [];
    for (const i of pages) {
      const paras = [
        i.page.line,
        i.page.answer,
        i.page.watch.line,
        i.page.ai.answer,
        i.categories?.line,
        ...(i.faqs ?? []).map((f) => f.a),
      ].filter((x): x is string => Boolean(x));
      for (const p of paras) if (words(p) > PARA) long.push(`${i.slug} (${words(p)}): ${p}`);
    }
    expect(long).toEqual([]);
  });

  it("has no list item over 15 words, and card titles of at most 6", () => {
    const long: string[] = [];
    for (const i of pages)
      for (const [group, list] of cards(i))
        for (const c of list ?? []) {
          if (words(c.text) > ITEM) long.push(`${i.slug} ${group} (${words(c.text)}): ${c.text}`);
          // One named exception: lane R's own wording of R-142 item 2 (Sync 2a), seven words.
          if (words(c.title) > 6 && c.title !== "House rules in your description, kept right")
            long.push(`${i.slug} ${group} title: ${c.title}`);
        }
    expect(long).toEqual([]);
  });

  it("gives Your Google profile two to four cards and every other group two or three, never one alone", () => {
    for (const i of pages) {
      expect(i.profile.length, i.slug).toBeGreaterThanOrEqual(2);
      expect(i.profile.length, i.slug).toBeLessThanOrEqual(4);
      for (const [group, list] of cards(i).slice(1, 4)) {
        if (!list) continue;
        expect(list.length, `${i.slug} ${group}`).toBeGreaterThanOrEqual(2);
        expect(list.length, `${i.slug} ${group}`).toBeLessThanOrEqual(3);
      }
      for (const [group, list] of cards(i))
        expect(new Set((list ?? []).map((c) => c.title)).size, `${i.slug} ${group}`).toBe(
          list?.length ?? 0,
        );
    }
  });

  it("keeps the no-draft rule on the health or injury review card", () => {
    for (const i of pages.filter((x) => x.reviews))
      expect(
        i.reviews!.some((c) => /no draft/i.test(c.text)),
        i.slug,
      ).toBe(true);
  });

  it("uses the main query in the first answer", () => {
    for (const i of pages)
      expect(i.page.answer.toLowerCase(), i.slug).toContain(i.page.query.toLowerCase());
  });

  it("names six related businesses, never itself, each in search", () => {
    for (const i of pages) {
      const r = i.page.related;
      expect(r, i.slug).toHaveLength(6);
      expect(new Set(r).size, i.slug).toBe(6);
      expect(r, i.slug).not.toContain(i.slug);
      for (const s of r) {
        const x = industry(s);
        expect(x && industryIndexed(x), `${i.slug} related ${s}`).toBe(true);
      }
    }
  });

  it("picks three guides by the page's jobs, each a real guide, and the server fills to three", () => {
    const slugs = new Set(ALL_GUIDES.map((g) => g.slug));
    for (const i of pages) {
      expect(new Set(i.guides).size, i.slug).toBe(3);
      for (const g of i.guides) expect(slugs.has(g), `${i.slug} guide ${g}`).toBe(true);
      // Three guide cards, three different photos (Style 1 lets one photo serve two guides).
      expect(new Set(i.guides.map((g) => guideLook(g).photo)).size, `${i.slug} photos`).toBe(3);
    }
    const meta = ALL_GUIDES.map((g) => ({ ...g }));
    const cafe = industry("cafe")!;
    expect(pickIndustryGuides(meta, cafe.guides, "cafe").map((g) => g.slug)).toEqual(cafe.guides);
    // A pick that is not public is replaced by a public guide that names the page, then by any public guide.
    const without = meta.filter((g) => g.slug !== cafe.guides[0]);
    const three = pickIndustryGuides(without, cafe.guides, "cafe");
    expect(three).toHaveLength(3);
    expect(three.map((g) => g.slug)).not.toContain(cafe.guides[0]);
    expect(three.every((g) => g.title && g.topic)).toBe(true);
  });
});

describe("Industries 3: each industry page's own share image", () => {
  it("exists for every page in search, and the page's head points og:image and twitter:image to it", async () => {
    const { existsSync, readFileSync } = await import("node:fs");
    for (const i of pages)
      expect(existsSync(`public/og/industries/${i.slug}.jpg`), i.slug).toBe(true);
    expect(readFileSync("src/routes/for.$trade.tsx", "utf8")).toContain(
      "image: `industries/${i.slug}`",
    );
    const { pageHead } = await import("../src/lib/site");
    const head = pageHead({
      title: "t",
      description: "d",
      path: "/for/cafe",
      image: "industries/cafe",
      imageAlt: "Kabsi. Your cafe on Google, open on time.",
    });
    const get = (k: string) =>
      head.meta.find((m) => ("property" in m ? m.property : "name" in m ? m.name : "") === k);
    expect(get("og:image")).toMatchObject({ content: "https://kabsi.co/og/industries/cafe.jpg" });
    expect(get("twitter:image")).toMatchObject({
      content: "https://kabsi.co/og/industries/cafe.jpg",
    });
    expect(get("og:image:type")).toMatchObject({ content: "image/jpeg" });
  });
});
