// Industries 3 (master plan 30.33): each industry page's own 1200 by 630 share image: the page's wide photo under a charcoal
// overlay, the Kabsi mark and the page's H1 (its marked phrase in yellow text, the rule for a charcoal band, DESIGN.md
// "The highlight bar"). JPEG, because a photo as PNG is about ten times heavier; link previews read JPEG everywhere.
// Run after a page's H1 or wide photo changes: node scripts/industry-og.mjs   (writes public/og/industries/<slug>.jpg)
// Uses the machine's pre-installed Playwright. The H1, the mark and the photo are read from the content files.
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const font = (p) => `data:font/woff2;base64,${readFileSync(p).toString("base64")}`;
const BRIC = font(
  "node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2",
);
const MANR = font(
  "node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
);
const MARK = `<svg width="56" height="56" viewBox="0 0 120 120" style="display:block;border-radius:50%;background:#f5f3ee;padding:3px"><circle cx="60" cy="60" r="58" fill="#000"/><circle cx="60" cy="60" r="42.0036" fill="#FFD60A"/><circle cx="63.5032" cy="64.9996" r="15.9964" fill="#000"/></svg>`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const str = (src, key) => {
  const m = src.match(new RegExp(`\\n\\s+${key}:\\s*\\n?\\s*"((?:[^"\\\\]|\\\\.)*)"`));
  return m ? m[1].replace(/\\"/g, '"') : null;
};

// Photo names (PHOTOS.cafeCounter, MORE_PHOTOS.floristWide) to their 1600 px files.
const files = {};
for (const f of ["src/components/kabsi/photos.tsx", "src/components/kabsi/photos-more.ts"]) {
  const src = readFileSync(f, "utf8");
  const imports = Object.fromEntries(
    [...src.matchAll(/import (\w+)1600 from "@\/assets\/photos\/([a-z0-9-]+)-1600\.webp"/g)].map(
      (m) => [m[1], m[2]],
    ),
  );
  for (const m of src.matchAll(/(\w+): (?:land|port)\(\s*(\w+)1600/g))
    if (imports[m[2]]) files[m[1]] = imports[m[2]];
}

const dir = "src/content/industries";
export const pages = readdirSync(dir)
  .filter((f) => f.endsWith(".ts") && !["index.ts", "types.ts"].includes(f))
  .map((f) => {
    const src = readFileSync(`${dir}/${f}`, "utf8");
    const photo = src.match(/\n {2}photos: \[(?:MORE_)?PHOTOS\.(\w+),/)?.[1];
    return {
      slug: str(src, "slug"),
      h1: str(src, "h1"),
      mark: str(src, "mark"),
      file: files[photo],
    };
  });
for (const p of pages)
  if (!p.slug || !p.h1 || !p.mark || !p.file) throw new Error(`incomplete: ${JSON.stringify(p)}`);

const photo = (n) =>
  `data:image/webp;base64,${readFileSync(`src/assets/photos/${n}-1600.webp`).toString("base64")}`;
const title = (p) => {
  const at = p.h1.indexOf(p.mark);
  return at < 0
    ? esc(p.h1)
    : `${esc(p.h1.slice(0, at))}<em>${esc(p.mark)}</em>${esc(p.h1.slice(at + p.mark.length))}`;
};

const html = (p) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:B;src:url(${BRIC}) format("woff2");font-weight:200 800}
@font-face{font-family:M;src:url(${MANR}) format("woff2");font-weight:200 800}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;position:relative;overflow:hidden;background:#111;color:#f5f3ee;font-family:M}
.ph{position:absolute;inset:0;background:url(${photo(p.file)}) center/cover}
.ov{position:absolute;inset:0;background:linear-gradient(90deg,rgba(17,17,17,.9) 0%,rgba(17,17,17,.78) 55%,rgba(17,17,17,.5) 100%)}
.in{position:absolute;inset:0;padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between}
.top{display:flex;align-items:center;gap:18px;font:700 34px B;letter-spacing:-.02em}
h1{font:700 76px/1.04 B;letter-spacing:-.03em;max-width:900px;text-wrap:balance}
h1 em{font-style:normal;color:#ffd60a}
.foot{font:600 24px M;color:#d6d1c6}
</style></head><body><div class="ph"></div><div class="ov"></div><div class="in">
<div class="top">${MARK}<span>Kabsi</span></div>
<h1>${title(p)}</h1>
<p class="foot">kabsi.co/for/${esc(p.slug)}</p>
</div></body></html>`;

mkdirSync("public/og/industries", { recursive: true });
const browser = await chromium.launch();
const pg = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const p of pages) {
  await pg.setContent(html(p), { waitUntil: "load" });
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: `public/og/industries/${p.slug}.jpg`, type: "jpeg", quality: 82 });
  console.log(`public/og/industries/${p.slug}.jpg`);
}
await browser.close();
