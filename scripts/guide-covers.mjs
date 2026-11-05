// Guides 3: each guide's 1200 by 630 share image, the same typographic cover the guide page draws in code
// (GuideCover in src/components/marketing/guide-article.tsx): the black band, the mark, "Kabsi guide", the topic, the
// question and the yellow bar. The artwork repeats the tokens of src/styles.css as plain values, as scripts/og.mjs does.
// Run after adding or retitling a guide: node scripts/guide-covers.mjs   (writes public/og/guides/<slug>.png)
// Uses the machine's pre-installed Playwright. Titles and topics are read from the content files.
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
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
// The earlier guides still in src/lib/guides.tsx (until Guides 3 part D moves them).
const legacy = readFileSync("src/lib/guide-titles.ts", "utf8");
for (const m of legacy.matchAll(/"([a-z0-9-]+)":\s*\n?\s*"((?:[^"\\]|\\.)*)"/g))
  if (!guides.some((g) => g.slug === m[1]))
    guides.push({ slug: m[1], title: m[2], topic: "Google reviews" });

const html = (g) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:B;src:url(${BRIC}) format("woff2");font-weight:200 800}
@font-face{font-family:M;src:url(${MANR}) format("woff2");font-weight:200 800}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#000;color:#f5f3ee;font-family:M;padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between}
.top{display:flex;align-items:center;gap:18px;font-size:26px;font-weight:700}
.pill{border:2px solid rgba(245,243,238,.35);border-radius:999px;padding:6px 18px;font-size:22px;color:#b8b3a8;font-weight:700}
h1{font-family:B;font-weight:700;font-size:${g.title.length > 48 ? 64 : 74}px;line-height:1.06;letter-spacing:-.02em;max-width:980px}
.bar{display:block;margin-top:34px;width:120px;height:14px;border-radius:999px;background:#ffd60a}
.foot{display:flex;justify-content:space-between;align-items:flex-end;font-size:22px;color:#b8b3a8;margin-top:-8px}
</style></head><body>
<div class="top">${MARK}<span>Kabsi guide</span><span class="pill">${esc(g.topic)}</span></div>
<div><h1>${esc(g.title)}</h1><span class="bar"></span></div>
<div class="foot"><span>kabsi.co/guides</span><span>Checked against Google's help pages</span></div>
</body></html>`;

mkdirSync("public/og/guides", { recursive: true });
const browser = await chromium.launch();
const pg = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const g of guides) {
  await pg.setContent(html(g), { waitUntil: "load" });
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: `public/og/guides/${g.slug}.png` });
  console.log(`public/og/guides/${g.slug}.png`);
}
await browser.close();
if (!guides.length || !existsSync("public/og/guides")) process.exit(1);
