// Screenshots and accessibility for every public page in scripts/routes.json, at 390, 768 and 1440 px (Web 2, from the
// design studio's scripts/shots.mjs). Start the site first (npx vite dev --port 5173 --host 127.0.0.1), then:
//   BASE=http://127.0.0.1:5173 node scripts/shots.mjs            all routes
//   BASE=... ONLY=/pricing node scripts/shots.mjs                one route
// Writes shots/<route>-<width>.png (gitignored) and fails when axe finds a serious or critical issue.
// Uses the machine's pre-installed Playwright (never install another copy) and axe-core (from @axe-core/playwright).
import { createRequire } from "node:module";
import { mkdirSync, readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const axePath = require.resolve("axe-core/axe.min.js");

const BASE = process.env.BASE ?? "http://127.0.0.1:5173";
//   SLICE=0:40 node scripts/shots.mjs                            routes 0 to 39 (run several slices side by side)
const [from, to] = (process.env.SLICE ?? "0:9999").split(":").map(Number);
const routes = JSON.parse(readFileSync("scripts/routes.json", "utf8"))
  .filter((r) => !process.env.ONLY || r.path === process.env.ONLY)
  .slice(from, to);
const widths = [390, 768, 1440];
mkdirSync("shots", { recursive: true });
const browser = await chromium
  .launch()
  .catch(() => chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }));
let problems = 0;
for (const r of routes) {
  for (const w of widths) {
    for (const motion of w === 390 ? ["no-preference", "reduce"] : ["no-preference"]) {
      const page = await browser.newPage({
        viewport: { width: w, height: w === 390 ? 844 : 900 },
        reducedMotion: motion,
      });
      // "load", not "networkidle": Turnstile and the live counts keep a connection open on the real pages.
      await page.goto(BASE + r.path, { waitUntil: "load" });
      await page.waitForTimeout(1200);
      // Scroll once through the page so on-view parts (the scene, the map, counters) play, then let them finish.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(motion === "reduce" ? 300 : (r.wait ?? 6500)); // the hero scene needs 6.5 s; a route can say "wait": 800
      const name =
        (r.path === "/"
          ? "home"
          : r.path
              .replace(/^\/\?/, "home?")
              .replace(/\//g, "_")
              .replace(/^_/, "")
              .replace(/%2C|%20/gi, "")
              .replace(/[?=&]/g, "-")) + `-${w}${motion === "reduce" ? "-reduced" : ""}`;
      await page.screenshot({ path: `shots/${name}.png`, fullPage: true });
      const sideways = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      if (sideways) {
        problems++;
        console.log(`${r.path} @${w}: sideways scroll`);
      }
      if (motion === "no-preference") {
        await page.addScriptTag({ path: axePath });
        const res = await page.evaluate(
          async () => await window.axe.run(document, { resultTypes: ["violations"] }),
        );
        for (const v of res.violations.filter((v) => ["serious", "critical"].includes(v.impact))) {
          problems++;
          console.log(`${r.path} @${w}: ${v.impact} ${v.id} (${v.nodes.length}) ${v.help}`);
        }
      }
      await page.close();
    }
  }
  console.log(`done ${r.path}`);
}
await browser.close();
console.log(problems ? `${problems} problem(s).` : "All pages clean.");
process.exit(problems ? 1 : 0);
