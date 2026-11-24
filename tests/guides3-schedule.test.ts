// Guides 3 (A.2, A.3): a guide whose publishAt is in the future is not shown anywhere: not in the list, related links,
// the sitemap or llms.txt, and its address answers 404. All decided from the clock the server passes; tested here with a
// fake one.
import { describe, expect, it } from "vitest";
import { ALL_GUIDES, EARLIER, ORDER, WEEKLY } from "../src/content/guides";
import {
  FIRST_PUBLISH,
  PUBLISH_ALL_AT,
  WEEK_MS,
  cacheSeconds,
  isPublic,
  publicGuides,
  weeklyAt,
  SITE3_PUBLISH_AT,
} from "../src/content/guides/schedule";
import { sitemapXml } from "../src/lib/sitemap";
import { llmsText } from "../src/lib/llms";
import { readFileSync } from "node:fs";

const at = (iso: string) => new Date(iso);
const FIRST = ORDER[0];
const SECOND = ORDER[1];

describe("the schedule", () => {
  it("guide 1 was public on its merge day, and guides 2 to 20 share the one publishing moment (Guides 4 part A)", () => {
    expect(FIRST_PUBLISH).toBe("2026-11-05T00:00:00Z");
    expect(Date.parse(PUBLISH_ALL_AT)).toBeGreaterThan(Date.parse(FIRST_PUBLISH));
    for (const s of ORDER.slice(1)) {
      const g = ALL_GUIDES.find((x) => x.slug === s);
      expect(g?.publishAt, s).toBe(PUBLISH_ALL_AT);
    }
  });

  it("new guides from 16 Nov 2026 are one a week at 06:00 UTC", () => {
    expect(weeklyAt(0)).toBe("2026-11-16T06:00:00Z");
    expect(weeklyAt(1)).toBe("2026-11-23T06:00:00Z");
    expect(Date.parse(weeklyAt(5)) - Date.parse(weeklyAt(4))).toBe(WEEK_MS);
  });

  it("a guide is public from its exact moment, not a second before", () => {
    const g = { publishAt: "2026-11-07T06:00:00Z" };
    expect(isPublic(g, at("2026-11-07T05:59:59Z"))).toBe(false);
    expect(isPublic(g, at("2026-11-07T06:00:00Z"))).toBe(true);
  });

  it("before the moment only guide 1 and the earlier guides are public; from it all 26 are (the ChatGPT guide is noindex and unlisted), in the Guides 3 order", () => {
    const before = publicGuides(ALL_GUIDES, at("2026-11-05T12:00:00Z")).map((g) => g.slug);
    expect(before).toContain(FIRST);
    expect(before).not.toContain(SECOND);
    expect(before).toHaveLength(7);
    const all = publicGuides(ALL_GUIDES, new Date(PUBLISH_ALL_AT));
    expect(all).toHaveLength(26);
    // SITE-2: a guide about a switched-off feature carries noindex and leaves every list.
    expect(all.map((g) => g.slug)).toEqual(
      [...ORDER, ...EARLIER].filter((s) => s !== "why-chatgpt-describes-your-business-wrongly"),
    );
    expect(sitemapXml(all)).toContain(`/guides/${SECOND}<`);
    expect(llmsText(all)).toContain(`/guides/${SECOND})`);
  });

  it("a guide scheduled after the moment stays out until its day, then is listed first", () => {
    // The 27 guides public from the one moment; the weekly guides are left out here and checked below.
    const base = ALL_GUIDES.filter((g) => g.publishAt <= PUBLISH_ALL_AT).map((g) => ({
      slug: g.slug,
      publishAt: g.publishAt,
    }));
    const future = [...base, { slug: "later", publishAt: weeklyAt(0) }];
    const during = publicGuides(future, at("2026-11-10T00:00:00Z")).map((g) => g.slug);
    expect(during).not.toContain("later");
    const after = publicGuides(future, at("2026-11-16T06:00:00Z")).map((g) => g.slug);
    expect(after[0]).toBe("later");
    expect(after).toHaveLength(28);
    expect(isPublic({ publishAt: weeklyAt(0) }, at("2026-11-16T05:59:59Z"))).toBe(false);
  });

  it("the weekly guides (8 salon and barber) are one a week from 16 Nov 2026, in the WEEKLY order; the 3 review link guides publish on 24 Nov (SITE-3, R-164 item 5)", () => {
    expect(WEEKLY).toHaveLength(11);
    const SITE3 = WEEKLY.slice(8);
    WEEKLY.slice(0, 8).forEach((s, n) => {
      const g = ALL_GUIDES.find((x) => x.slug === s);
      expect(g?.publishAt, s).toBe(weeklyAt(n));
    });
    for (const s of SITE3)
      expect(ALL_GUIDES.find((x) => x.slug === s)?.publishAt, s).toBe(SITE3_PUBLISH_AT);
    // The holiday guides come before their holidays: UAE National Day on 2 Dec, Christmas on 25 Dec.
    expect(Date.parse(weeklyAt(0))).toBeLessThan(Date.parse("2026-12-02T00:00:00Z"));
    expect(Date.parse(weeklyAt(1))).toBeLessThan(Date.parse("2026-11-30T00:00:00Z"));
    const sunday = publicGuides(ALL_GUIDES, at("2026-11-15T12:00:00Z")).map((g) => g.slug);
    for (const s of WEEKLY) expect(sunday).not.toContain(s);
    expect(sunday).toHaveLength(26);
    const monday = publicGuides(ALL_GUIDES, at("2026-11-16T06:00:00Z")).map((g) => g.slug);
    expect(monday[0]).toBe(WEEKLY[0]);
    expect(monday).toHaveLength(27);
    // From 24 Nov 18:00 UTC the three SITE-3 guides are public.
    const site3 = publicGuides(ALL_GUIDES, new Date(SITE3_PUBLISH_AT)).map((g) => g.slug);
    for (const s of SITE3) expect(site3).toContain(s);
    const all = publicGuides(ALL_GUIDES, new Date(weeklyAt(7))).map((g) => g.slug);
    expect(all.filter((s) => WEEKLY.slice(0, 8).includes(s as never))).toEqual(
      [...WEEKLY.slice(0, 8)].reverse(),
    );
    expect(all).toHaveLength(26 + WEEKLY.length);
  });

  it("before part A merged nothing new was public, and the earlier guides always are", () => {
    const before = publicGuides(ALL_GUIDES, at("2026-11-04T23:59:59Z")).map((g) => g.slug);
    for (const s of ORDER) expect(before).not.toContain(s);
    expect(before).toContain("how-to-reply-to-google-reviews");
  });

  it("caches the sitemap and llms.txt for at most an hour, and never past the next guide's moment", () => {
    const earlier = ALL_GUIDES.filter((g) => g.publishAt <= PUBLISH_ALL_AT);
    const later = [...earlier, { publishAt: weeklyAt(0) }];
    expect(cacheSeconds(later, at("2026-11-16T05:50:00Z"))).toBe(600);
    expect(cacheSeconds(earlier, at("2026-11-16T05:50:00Z"))).toBe(3600);
    // The first weekly guide (UAE National Day and Eid) is the next moment for the real list.
    expect(cacheSeconds(ALL_GUIDES, at("2026-11-16T05:50:00Z"))).toBe(600);
    expect(cacheSeconds([], at("2026-11-05T12:00:00Z"))).toBe(3600);
  });

  it("is decided on the server: the page, list and industry links ask the server functions, the routes use the server's clock", () => {
    const page = readFileSync("src/routes/guides.$slug.tsx", "utf8");
    expect(page).toContain("getGuidePage");
    expect(page).toContain("throw notFound()");
    expect(readFileSync("src/routes/guides.index.tsx", "utf8")).toContain("getGuideList");
    // SITE-2: the industry pages are one template and no longer list guides (blueprint 3.1 section 5).
    const server = readFileSync("src/lib/guides-server.ts", "utf8");
    expect(server).toContain("createServerFn");
    expect(server).toContain("publicGuides(ALL_GUIDES, new Date())");
    for (const r of ["src/routes/sitemap[.]xml.ts", "src/routes/llms[.]txt.ts"])
      expect(readFileSync(r, "utf8")).toContain("publicGuides(ALL_GUIDES, now)");
  });
});
