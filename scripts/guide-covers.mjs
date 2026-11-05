// Guides 3, Style 1 part A (master plan 30.33 item 2): each guide's 1200 by 630 share image is its photo from the licensed
// library (src/content/guides/look.ts, docs/PHOTOS.md) under a charcoal overlay, with the Kabsi mark, the topic pill
// (charcoal on yellow) and the question. The artwork repeats the tokens of src/styles.css as plain values, as
// scripts/og.mjs does. A JPEG, because a photo as PNG is too heavy for link previews.
// Run after adding or retitling a guide: node scripts/guide-covers.mjs   (writes public/og/guides/<slug>.jpg)
// Uses the machine's pre-installed Playwright. Titles are read from the content files, the photo and group from look.ts.
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
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
  const m = src.match(new RegExp(`\\n  ${key}:\\s*\\n?\\s*"((?:[^"\\\\]|\\\\.)*)"`));
  return m ? m[1].replace(/\\"/g, '"') : null;
};

const dir = "src/content/guides";
const guides = readdirSync(dir)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => {
    const src = readFileSync(`${dir}/${f}`, "utf8");
    return { slug: str(src, "slug"), title: str(src, "title"), topic: str(src, "topic") };
  })
  .filter((g) => g.slug && g.title && g.topic);
// Each guide's photo and group (src/content/guides/look.ts, one entry per line).
const look = readFileSync(`${dir}/look.ts`, "utf8");
for (const g of guides) {
  const m = look.match(new RegExp(`"${g.slug}": \\{ photo: "([a-z0-9-]+)", group: "([^"]+)"`));
  if (!m) throw new Error(`no photo in look.ts for ${g.slug}`);
  g.photo = `src/assets/photos/${m[1]}-1600.webp`;
  g.group = m[2];
  if (!existsSync(g.photo)) throw new Error(`missing ${g.photo}`);
}

const photo = (p) => `data:image/webp;base64,${readFileSync(p).toString("base64")}`;
const html = (g) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:B;src:url(${BRIC}) format("woff2");font-weight:200 800}
@font-face{font-family:M;src:url(${MANR}) format("woff2");font-weight:200 800}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;position:relative;overflow:hidden;background:#000;color:#f5f3ee;font-family:M}
.ph{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ov{position:absolute;inset:0;background:linear-gradient(90deg,rgba(17,17,17,.94) 0%,rgba(17,17,17,.86) 55%,rgba(17,17,17,.55) 100%)}
.in{position:relative;height:100%;padding:60px 72px;display:flex;flex-direction:column;justify-content:space-between}
.top{display:flex;align-items:center;gap:18px;font-size:26px;font-weight:700}
.pill{background:#ffd60a;color:#000;border-radius:999px;padding:7px 20px;font-size:22px;font-weight:800}
h1{font-family:B;font-weight:700;font-size:${g.title.length > 48 ? 64 : 74}px;line-height:1.06;letter-spacing:-.02em;max-width:900px;text-wrap:balance}
.foot{display:flex;justify-content:space-between;align-items:flex-end;font-size:22px;color:#d6d1c6}
</style></head><body>
<img class="ph" src="${photo(g.photo)}" alt="">
<div class="ov"></div>
<div class="in">
<div class="top">${MARK}<span>Kabsi guide</span><span class="pill">${esc(g.group)}</span></div>
<h1>${esc(g.title)}</h1>
<div class="foot"><span>kabsi.co/guides</span><span>Checked against Google's help pages</span></div>
</div>
</body></html>`;

mkdirSync("public/og/guides", { recursive: true });
const browser = await chromium.launch();
const pg = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const g of guides) {
  await pg.setContent(html(g), { waitUntil: "load" });
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: `public/og/guides/${g.slug}.jpg`, type: "jpeg", quality: 82 });
  rmSync(`public/og/guides/${g.slug}.png`, { force: true });
  console.log(`public/og/guides/${g.slug}.jpg`);
}
await browser.close();
if (!guides.length || !existsSync("public/og/guides")) process.exit(1);
