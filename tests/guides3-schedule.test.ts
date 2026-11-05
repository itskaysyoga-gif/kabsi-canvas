// Guides 3 (A.2, A.3): a guide whose publishAt is in the future is not shown anywhere: not in the list, related links,
// the sitemap or llms.txt, and its address answers 404. All decided from the clock the server passes; tested here with a
// fake one.
import { describe, expect, it } from "vitest";
import { ALL_GUIDES, ORDER } from "../src/content/guides";
import {
  EVERY_MS,
  cacheSeconds,
  isPublic,
  publicGuides,
  scheduledAt,
} from "../src/content/guides/schedule";
import { sitemapXml } from "../src/lib/sitemap";
import { llmsText } from "../src/lib/llms";
import { readFileSync } from "node:fs";

const at = (iso: string) => new Date(iso);
const FIRST = ORDER[0];
const SECOND = ORDER[1];

describe("the schedule", () => {
  it("the first new guide is public on the merge day, then one every 2 days at 06:00 UTC", () => {
    expect(scheduledAt(0)).toBe("2026-11-05T00:00:00Z");
    expect(scheduledAt(1)).toBe("2026-11-07T06:00:00Z");
    expect(scheduledAt(2)).toBe("2026-11-09T06:00:00Z");
    expect(scheduledAt(19)).toBe("2026-12-13T06:00:00Z");
    for (let i = 2; i < 20; i++)
      expect(Date.parse(scheduledAt(i)) - Date.parse(scheduledAt(i - 1))).toBe(EVERY_MS);
  });

  it("a guide is public from its exact moment, not a second before", () => {
    const g = { publishAt: "2026-11-07T06:00:00Z" };
    expect(isPublic(g, at("2026-11-07T05:59:59Z"))).toBe(false);
    expect(isPublic(g, at("2026-11-07T06:00:00Z"))).toBe(true);
  });

  it("the list, the sitemap and llms.txt hold guide 1 and not guide 2 on 5 Nov, and both on 7 Nov from 06:00", () => {
    const nov5 = publicGuides(ALL_GUIDES, at("2026-11-05T12:00:00Z"));
    expect(nov5.map((g) => g.slug)).toContain(FIRST);
    expect(nov5.map((g) => g.slug)).not.toContain(SECOND);
    expect(sitemapXml(nov5)).toContain(`/guides/${FIRST}<`);
    expect(sitemapXml(nov5)).not.toContain(`/guides/${SECOND}<`);
    expect(llmsText(nov5)).toContain(`/guides/${FIRST})`);
    expect(llmsText(nov5)).not.toContain(`/guides/${SECOND})`);
    const nov7 = publicGuides(ALL_GUIDES, at("2026-11-07T06:00:00Z"));
    const has2 = ALL_GUIDES.some((g) => g.slug === SECOND);
    expect(nov7.map((g) => g.slug).includes(SECOND)).toBe(has2);
  });

  it("before part A merged nothing new was public, and the earlier guides always are", () => {
    const before = publicGuides(ALL_GUIDES, at("2026-11-04T23:59:59Z")).map((g) => g.slug);
    for (const s of ORDER) expect(before).not.toContain(s);
    expect(before).toContain("how-to-reply-to-google-reviews");
  });

  it("caches the sitemap and llms.txt for at most an hour, and never past the next guide's moment", () => {
    expect(cacheSeconds(ALL_GUIDES, at("2026-11-05T12:00:00Z"))).toBeLessThanOrEqual(3600);
    if (ALL_GUIDES.some((g) => g.slug === SECOND))
      expect(cacheSeconds(ALL_GUIDES, at("2026-11-07T05:50:00Z"))).toBe(600);
    expect(cacheSeconds([], at("2026-11-05T12:00:00Z"))).toBe(3600);
  });

  it("is decided on the server: the page, list and industry links ask the server functions, the routes use the server's clock", () => {
    const page = readFileSync("src/routes/guides.$slug.tsx", "utf8");
    expect(page).toContain("getGuidePage");
    expect(page).toContain("throw notFound()");
    expect(readFileSync("src/routes/guides.index.tsx", "utf8")).toContain("getGuideList");
    expect(readFileSync("src/routes/for.$trade.tsx", "utf8")).toContain("getIndustryGuides");
    const server = readFileSync("src/lib/guides-server.ts", "utf8");
    expect(server).toContain("createServerFn");
    expect(server).toContain("publicGuides(ALL_GUIDES, new Date())");
    for (const r of ["src/routes/sitemap[.]xml.ts", "src/routes/llms[.]txt.ts"])
      expect(readFileSync(r, "utf8")).toContain("publicGuides(ALL_GUIDES, now)");
  });
});
