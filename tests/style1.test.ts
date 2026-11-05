// Style 1 (master plan 30.33 item 2): every guide has a photo from the licensed library in its hero, its card and its
// social image; no photo serves more than two guides; each title has one phrase on the highlight bar; the guides grid
// follows the no-lone-card rule.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ALL_GUIDES } from "../src/content/guides";
import { GUIDE_GROUPS, GUIDE_LOOK } from "../src/content/guides/look";

describe("Style 1 part A: guides with photos", () => {
  it("gives every guide a look, and only guides have one", () => {
    expect(Object.keys(GUIDE_LOOK).sort()).toEqual(ALL_GUIDES.map((g) => g.slug).sort());
  });

  it("uses library photos only, each for at most two guides", () => {
    const uses = new Map<string, number>();
    for (const [slug, l] of Object.entries(GUIDE_LOOK)) {
      expect(existsSync(`src/assets/photos/${l.photo}-1600.webp`), slug).toBe(true);
      expect(existsSync(`src/assets/photos/${l.photo}-800.webp`), slug).toBe(true);
      expect(readFileSync("docs/PHOTOS.md", "utf8"), l.photo).toContain(l.photo);
      uses.set(l.photo, (uses.get(l.photo) ?? 0) + 1);
    }
    for (const [photo, n] of uses) expect(n, photo).toBeLessThanOrEqual(2);
  });

  it("puts one phrase of each title on the bar, and every group is a filter chip", () => {
    for (const g of ALL_GUIDES) {
      const l = GUIDE_LOOK[g.slug]!;
      expect(g.title.split(l.mark).length, g.slug).toBe(2);
      expect(l.mark.length, g.slug).toBeLessThan(g.title.length);
      expect(GUIDE_GROUPS).toContain(l.group);
    }
  });

  it("has a photo social image for every guide, and the head points at it", () => {
    for (const g of ALL_GUIDES)
      expect(existsSync(`public/og/guides/${g.slug}.jpg`), g.slug).toBe(true);
    expect(readFileSync("src/lib/site.ts", "utf8")).toMatch(/startsWith\("guides\/"\) \? "jpg"/);
    expect(readFileSync("src/routes/guides.$slug.tsx", "utf8")).toContain("/og/${image}.jpg");
  });

  it("lists the photo choices in COPY.md section 55", () => {
    const copy = readFileSync("docs/COPY.md", "utf8");
    const s55 = copy.slice(copy.indexOf("## 55."));
    for (const g of ALL_GUIDES) expect(s55, g.slug).toContain(g.slug);
  });

  it("keeps the guides grid free of a lone last card (3, 2, 1 columns, the last row centred)", () => {
    const src = readFileSync("src/routes/guides.index.tsx", "utf8");
    expect(src).toContain("flex flex-wrap justify-center");
    expect(src).toContain("md:w-[calc((100%-1rem)/2)] xl:w-[calc((100%-2rem)/3)]");
  });
});
