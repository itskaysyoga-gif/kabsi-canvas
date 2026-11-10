// Lean 1 (speed): what each public page ships. Opens every page in Chromium on a phone-sized screen, lists each script,
// stylesheet, font and image it fetches with its compressed size, and says whether it came before the load event
// (the "first load") or after it. Report only; the Lighthouse budgets are the check (docs/progress/archive/2026-11-01-lean1.md).
//   node scripts/bundle-report.mjs [baseUrl] [path ...]      default: http://localhost:4173 and the five measured pages
// Sizes are gzip of the body as served (a build served by Node is not compressed, so they are measured here, not read from headers).
import { chromium } from "@playwright/test";
import { gzipSync } from "node:zlib";

const base = (process.argv[2] ?? "http://localhost:4173").replace(/\/$/, "");
const paths =
  process.argv.length > 3 ? process.argv.slice(3) : ["/", "/pricing", "/scan", "/for/hair-salon"];
const kb = (n) => (n / 1024).toFixed(1);
const browser = await chromium.launch({ args: ["--no-sandbox"] });
for (const path of paths) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "en-US",
  });
  const page = await ctx.newPage();
  const rows = [];
  let loaded = false;
  page.on("load", () => {
    loaded = true;
  });
  page.on("response", async (res) => {
    const type = res.request().resourceType();
    if (!["script", "stylesheet", "font", "image", "document", "fetch", "xhr"].includes(type))
      return;
    let body;
    try {
      body = await res.body();
    } catch {
      return;
    }
    const enc = res.headers()["content-encoding"];
    const gz = enc ? Number(res.headers()["content-length"] ?? body.length) : gzipSync(body).length;
    rows.push({
      type,
      url: res.url(),
      gz,
      raw: body.length,
      phase: loaded ? "after load" : "first load",
    });
  });
  await page.goto(base + path, { waitUntil: "load" });
  await page.waitForTimeout(7000);
  const sum = (f) => rows.filter(f).reduce((a, r) => a + r.gz, 0);
  const own = (r) => r.url.startsWith(base);
  console.log(`\n=== ${path}`);
  console.log(
    `script first load: ${kb(sum((r) => r.type === "script" && r.phase === "first load"))} KB gzip` +
      ` (own ${kb(sum((r) => r.type === "script" && r.phase === "first load" && own(r)))}),` +
      ` after load: ${kb(sum((r) => r.type === "script" && r.phase === "after load"))} KB,` +
      ` all script: ${kb(sum((r) => r.type === "script"))} KB, css ${kb(sum((r) => r.type === "stylesheet"))} KB,` +
      ` font ${kb(sum((r) => r.type === "font"))} KB, image ${kb(sum((r) => r.type === "image"))} KB`,
  );
  for (const r of rows
    .filter((r) => r.type === "script")
    .sort((a, b) => b.gz - a.gz)
    .slice(0, 40))
    console.log(
      `  ${kb(r.gz).padStart(7)} KB gz ${kb(r.raw).padStart(7)} raw  ${r.phase.padEnd(10)} ${r.url.replace(base, "").slice(0, 90)}`,
    );
  await ctx.close();
}
await browser.close();
