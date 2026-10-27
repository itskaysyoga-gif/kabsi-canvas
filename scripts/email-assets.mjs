// Email 1 (master plan 30.18 section 3): the two files every Kabsi email loads from kabsi.co.
//   public/email/kabsi-mark.png   the exact mark with its light ring, 96 by 96 (shown at 32 px), transparent
//   public/fonts/bricolage-grotesque-latin-wght.woff2   the heading face, for the mail apps that load web fonts
// Run: node scripts/email-assets.mjs. Uses the machine's pre-installed Playwright (never install another copy).
import { createRequire } from "node:module";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

mkdirSync("public/email", { recursive: true });
copyFileSync(
  "node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2",
  "public/fonts/bricolage-grotesque-latin-wght.woff2",
);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="96" height="96"><circle cx="60" cy="60" r="60" fill="#f5f3ee"/><circle cx="60" cy="60" r="57" fill="#000"/><circle cx="60" cy="60" r="42.0036" fill="#FFD60A"/><circle cx="63.5032" cy="64.9996" r="15.9964" fill="#000"/></svg>`;
const browser = await chromium.launch();
const pg = await browser.newPage({ viewport: { width: 96, height: 96 } });
await pg.setContent(`<body style="margin:0;width:96px;height:96px">${svg}</body>`);
writeFileSync(
  "public/email/kabsi-mark.png",
  await pg.screenshot({ type: "png", omitBackground: true }),
);
await browser.close();
console.log("public/email/kabsi-mark.png, public/fonts/bricolage-grotesque-latin-wght.woff2");
