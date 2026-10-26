// Makes the share images (Open Graph, 1200 by 630) for each page type, the favicon and the home screen icons (from
// the design studio's scripts/og.mjs; Web 2 moved the lines to master plan 30.15 and 30.17).
// Run: node --experimental-strip-types scripts/og.mjs
//   (writes public/og/*.png, public/favicon.*, public/apple-touch-icon.png, public/icon-*.png, public/site.webmanifest)
// The artwork repeats the tokens in src/styles.css as plain values, because it is a picture, not a page.
// Uses the machine's pre-installed Playwright (never install another copy) and Kabsi's own QR encoder (src/lib/qr.ts).
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { qrMatrix } = await import("../src/lib/qr.ts");

const font = (p) => `data:font/woff2;base64,${readFileSync(p).toString("base64")}`;
const photo = (n) =>
  `data:image/webp;base64,${readFileSync(`src/assets/photos/${n}-1600.webp`).toString("base64")}`;
const BRIC = font(
  "node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2",
);
const MANR = font(
  "node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
);

const MARK = (size, ring = true) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 120 120" style="display:block;${ring ? "border-radius:50%;background:#f5f3ee;padding:" + Math.max(2, size / 28) + "px;box-sizing:content-box" : ""}"><circle cx="60" cy="60" r="58" fill="#000"/><circle cx="60" cy="60" r="42.0036" fill="#FFD60A"/><circle cx="63.5032" cy="64.9996" r="15.9964" fill="#000"/></svg>`;

const qr = (text) => {
  const m = qrMatrix(text);
  const n = m.length;
  let d = "";
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) if (m[r][c]) d += `M${c + 2} ${r + 2}h1v1h-1z`;
  return `<svg viewBox="0 0 ${n + 4} ${n + 4}" width="250" height="250" shape-rendering="crispEdges"><rect width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
};

const EX = `<span class="ex">Example</span>`;
const bubble = (who, text) => `<div class="bub"><b>${who}</b> ${text}</div>`;
const place = (l, name, pos, first, cls) =>
  `<div class="row"><i class="${cls}">${l}</i><span><b>${name}</b><br>${pos}<br><small>${first}</small></span></div>`;
const cards = {
  home: {
    h: "Your business on Google. Taken care of through WhatsApp.",
    p: "You approve each one on WhatsApp before it goes live.",
    art: `<div class="card">${EX}${bubble("Rose Lane Salon:", "new 5-star review from Layla K. Reply ready: 'Thank you, Layla. We will pass this on to Hana.' Reply Yes to publish.")}<div class="yes">Yes</div><p class="cap">Published on your Google profile.</p></div>`,
  },
  scan: {
    h: "Check your business on Google, free.",
    p: "Free check. No Google access needed.",
    art: `<div class="card">${EX}<b class="t">'hair salon' around Rose Lane Salon</b>${place("A", "Near your salon", "You came up 2nd.", "Juniper Hair Studio came first.", "top")}${place("B", "Near the metro station", "You came up 8th.", "Juniper Hair Studio came first.", "mid")}${place("C", "By the park", "You were not in the first 20.", "Lark Salon came first.", "none")}</div>`,
  },
  pricing: {
    h: "Simple plans. Free for 14 days.",
    p: "Every plan runs from WhatsApp.",
    art: `<div class="stack"><div class="plan"><b>Essentials</b><span>$19</span><i>a month</i></div><div class="plan pro"><b>Pro</b><span>$39</span><i>a month</i></div></div>`,
  },
  tool: {
    h: "Get your Google review link and QR code.",
    p: "Free, no sign-up.",
    art: `<div class="card center">${EX}<b class="t">Scan to leave a review</b>${qr("https://search.google.com/local/writereview?placeid=ChIJExample")}<b class="n">Rose Lane Salon</b></div>`,
  },
  guide: {
    h: "Plain guides for your Google profile.",
    p: "Short answers, then the steps.",
    art: `<div class="card"><b class="t">How to reply to Google reviews</b>${["Read the whole review", "Thank them by name", "Say what happens next"].map((s, i) => `<div class="row"><i>${i + 1}</i><span>${s}</span></div>`).join("")}</div>`,
  },
  industry: {
    h: "Your business on Google. Taken care of.",
    p: "For salons, restaurants, clinics and every local business.",
    art: `<div class="ph" style="background-image:url(${photo("salon-wash")})"></div>`,
  },
  partner: {
    h: "Earn 25% of every payment.",
    p: "While the referred subscription stays paid.",
    art: `<div class="big">25%</div>`,
  },
  about: {
    h: "Kabsi is built for the owner at the counter.",
    p: "Your business on Google. Taken care of.",
    art: `<div class="ph" style="background-image:url(${photo("bakery-window")})"></div>`,
  },
  founding: {
    h: "Founding 25: three months of Kabsi Pro, free.",
    p: "For 25 businesses, by application. No card.",
    art: `<div class="big">25</div>`,
  },
};

const page = (c) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:B;src:url(${BRIC});font-weight:200 800}
@font-face{font-family:M;src:url(${MANR});font-weight:200 800}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#0c0c0b;color:#f5f3ee;font-family:M;position:relative;overflow:hidden}
body:before{content:"";position:absolute;right:-200px;top:-220px;width:760px;height:760px;border-radius:50%;background:radial-gradient(circle,rgba(255,214,10,.16),transparent 68%)}
.brand{position:absolute;left:64px;top:56px;display:flex;align-items:center;gap:16px;font:700 38px B;letter-spacing:-.02em}
.txt{position:absolute;left:64px;top:170px;width:640px}
h1{font:700 62px/1.04 B;letter-spacing:-.03em;text-wrap:balance}
.p{margin-top:24px;font:500 28px/1.4 M;color:#b8b3a8}
.foot{position:absolute;left:64px;bottom:52px;font:600 22px M;color:#9a958a}
.art{position:absolute;right:64px;top:0;bottom:0;width:410px;display:flex;align-items:center;justify-content:center}
.card{position:relative;width:410px;background:#fff;color:#111;border-radius:28px;padding:24px;box-shadow:0 40px 80px -30px #000}
.card.center{text-align:center}.card.center svg{margin:14px auto 10px;display:block}
.ex{position:absolute;top:-14px;left:20px;background:#161614;color:#f5f3ee;border:1px solid rgba(245,243,238,.3);font:700 17px M;border-radius:99px;padding:5px 14px}
.map{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;background:#efece4;border-radius:16px;padding:8px}
.d{aspect-ratio:1;border-radius:50%;display:grid;place-items:center;font:800 15px M}
.cap{margin-top:14px;font:600 17px/1.35 M;color:#5e5b55}
.t{display:block;font:700 28px/1.15 B;margin-top:6px}
.n{display:block;font:700 24px B}
.row{display:flex;align-items:center;gap:14px;border-top:1px solid #e4e0d7;padding:14px 0;font:600 20px M}
.row i{font:700 20px B;font-style:normal;width:36px;height:36px;border-radius:50%;border:1px solid #bbb;display:grid;place-items:center}
.cmp .row{display:grid;grid-template-columns:1.3fr 1fr 1fr;font-size:19px}.cmp .h{border:0;font-weight:800}.cmp u{text-decoration:none}.cmp .no{color:#5e5b55}
.stack{display:grid;gap:18px;width:380px}
.plan{border:1px solid rgba(245,243,238,.2);border-radius:28px;padding:26px 30px;background:#161614;display:grid;grid-template-columns:1fr auto;align-items:baseline}
.plan b{font:700 28px B}.plan span{font:700 64px B}.plan i{font-style:normal;color:#b8b3a8;font-size:20px;grid-column:2;text-align:right}
.plan.pro{border:3px solid #f5f3ee}
.big{font:800 190px/1 B;letter-spacing:-.05em;color:#f5f3ee}
.bub{background:#fff;border-radius:8px;padding:14px 16px;font:500 20px/1.4 M;box-shadow:0 1px .5px rgba(11,20,26,.13)}
.card .bub{background:#d9fdd3}
.yes{margin:12px 0 0 auto;width:max-content;background:#d9fdd3;border-radius:8px;padding:8px 18px;font:700 20px M}
.row i.top{background:#146c46;color:#fff;border:0}.row i.mid{background:#6cc497;border:0}.row i.none{background:#0b0b0b;color:#fff;border:0}
.row small{color:#5e5b55;font-size:16px}
.ph{width:410px;height:420px;border-radius:28px;background-size:cover;background-position:center;box-shadow:0 40px 80px -30px #000}
</style></head><body><div class="brand">${MARK(48)}Kabsi</div><div class="txt"><h1>${c.h}</h1><p class="p">${c.p}</p></div><p class="foot">Your business on Google. Taken care of.</p><div class="art">${c.art}</div></body></html>`;

mkdirSync("public/og", { recursive: true });
const browser = await chromium.launch();
const pg = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const [name, c] of Object.entries(cards)) {
  await pg.setContent(page(c));
  await pg.waitForTimeout(200);
  await pg.screenshot({ path: `public/og/${name}.png` });
  console.log("og", name);
}

// Favicon and home screen icons: the exact mark with the light ring, so the black circle stays visible on any tab.
const markSvg = (ring) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">${ring ? '<circle cx="60" cy="60" r="60" fill="#f5f3ee"/>' : ""}<circle cx="60" cy="60" r="${ring ? 57 : 58}" fill="#000"/><circle cx="60" cy="60" r="42.0036" fill="#FFD60A"/><circle cx="63.5032" cy="64.9996" r="15.9964" fill="#000"/></svg>`;
writeFileSync("public/favicon.svg", markSvg(true));
const icon = async (file, size, inner, bg) => {
  await pg.setViewportSize({ width: size, height: size });
  await pg.setContent(
    `<body style="margin:0;width:${size}px;height:${size}px;background:${bg};display:grid;place-items:center"><div style="width:${inner}px;height:${inner}px">${markSvg(true).replace("<svg ", `<svg width="${inner}" height="${inner}" `)}</div></body>`,
  );
  const buf = await pg.screenshot({ type: "png", omitBackground: bg === "transparent" });
  writeFileSync(file, buf);
  return buf;
};
const f32 = await icon("public/favicon-32.png", 32, 32, "transparent");
const f48 = await icon("public/favicon-48.png", 48, 48, "transparent");
await icon("public/apple-touch-icon.png", 180, 124, "#0c0c0b");
await icon("public/icon-192.png", 192, 132, "#0c0c0b");
await icon("public/icon-512.png", 512, 352, "#0c0c0b");
await icon("public/icon-maskable-512.png", 512, 280, "#0c0c0b");
// favicon.ico: two PNG images in an ICO container
const ico = (imgs) => {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(imgs.length, 4);
  let off = 6 + 16 * imgs.length;
  const dir = [];
  for (const [s, b] of imgs) {
    const e = Buffer.alloc(16);
    e[0] = s;
    e[1] = s;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(b.length, 8);
    e.writeUInt32LE(off, 12);
    off += b.length;
    dir.push(e);
  }
  return Buffer.concat([head, ...dir, ...imgs.map((i) => i[1])]);
};
writeFileSync(
  "public/favicon.ico",
  ico([
    [32, f32],
    [48, f48],
  ]),
);
writeFileSync(
  "public/site.webmanifest",
  JSON.stringify(
    {
      name: "Kabsi",
      short_name: "Kabsi",
      description: "Your business on Google. Taken care of.",
      start_url: "/",
      display: "browser",
      background_color: "#0c0c0b",
      theme_color: "#0c0c0b",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    null,
    2,
  ) + "\n",
);
await browser.close();
console.log("icons written");
