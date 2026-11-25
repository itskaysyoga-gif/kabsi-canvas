// SITE-4: the photos and Kabsi's own screens on the public site. Every file a page names exists in public/, is under
// 200 KB, has its credit, and no redirect in vercel.json answers its path (the first deploy put the screens under
// /product, which vercel.json sends to /pricing, so the images broke on kabsi.co).
import { existsSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PUB, TRADE_TILES, pubSrc, type PubPhoto } from "../src/components/marketing/public-photos";
import { TRADE_SECOND, TRADE_WIDE } from "../src/components/marketing/industry-photos";
import { SCREENS } from "../src/components/marketing/life";

const photos: PubPhoto[] = [
  ...Object.values(PUB),
  ...TRADE_TILES.map((t) => t.photo),
  ...Object.values(TRADE_WIDE),
  ...Object.values(TRADE_SECOND),
];
const files = [
  ...photos.flatMap((p) => p.widths.map((w) => pubSrc(p, w))),
  ...Object.values(SCREENS).map((s) => s.src),
];
const redirects: { source: string }[] =
  JSON.parse(readFileSync("vercel.json", "utf8")).redirects ?? [];
const credits = readFileSync("public/photos/CREDITS.md", "utf8");

describe("SITE-4: photos and screens", () => {
  it("serves every file from public/, each under 200 KB", () => {
    for (const f of files) {
      expect(existsSync(`public${f}`), f).toBe(true);
      expect(statSync(`public${f}`).size, f).toBeLessThan(200_000);
    }
  });
  it("credits every photo in public/photos/CREDITS.md", () => {
    for (const p of photos) {
      const name = p.stem.replace(/-(tile|wide|tall)$/, "");
      expect(credits, name).toMatch(new RegExp(`^\\| ${name} \\|`, "m"));
    }
  });
  it("has no redirect in vercel.json on the folder of any file", () => {
    for (const f of files) {
      const top = `/${f.split("/")[1]}`;
      const hit = redirects.find(
        (r) => r.source === top || r.source.startsWith(`${top}/`) || r.source === f,
      );
      expect(hit?.source, f).toBeUndefined();
    }
  });
  it("gives every informative photo its alt text, width and height", () => {
    for (const p of [...Object.values(PUB), ...Object.values(TRADE_WIDE)]) {
      expect(p.alt.length, p.stem).toBeGreaterThan(10);
      expect(p.w * p.h, p.stem).toBeGreaterThan(0);
    }
  });
});
