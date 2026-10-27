// Screenshots and accessibility for the signed-in website and the onboarding (UX 1), at 390, 768 and 1440 px, with no
// real account: a made-up session sits in the browser and every Supabase call is answered from
// scripts/app-shots/fixtures.mjs and the area files next to it (an invented business, Rose Lane Salon). Nothing reaches Supabase.
// Start the site first (npx vite dev --port 5173 --host 127.0.0.1), then:
//   BASE=http://127.0.0.1:5173 node scripts/app-shots.mjs              every route in scripts/app-shots/routes/*.json
//   ONLY=/app/reviews node scripts/app-shots.mjs                        one route (every state of it)
//   WIDTHS=390 node scripts/app-shots.mjs                               one width
// A route can name a fixture "state" (read by the area fixture files) to draw the same screen in another state.
// Writes shots/app/<name>-<width>.png (gitignored), lists unanswered calls, and fails on sideways scroll or a serious
// or critical axe issue.
import { createRequire } from "node:module";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { answer, SESSION, STORAGE_KEY } from "./app-shots/fixtures.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const axePath = require.resolve("axe-core/axe.min.js");

const BASE = process.env.BASE ?? "http://127.0.0.1:5173";
// Every file in scripts/app-shots/routes (one per area), in name order.
const routes = readdirSync("scripts/app-shots/routes")
  .filter((f) => f.endsWith(".json"))
  .sort()
  .flatMap((f) => JSON.parse(readFileSync(`scripts/app-shots/routes/${f}`, "utf8")))
  .filter((r) => !process.env.ONLY || r.path.split("?")[0] === process.env.ONLY);
const widths = (process.env.WIDTHS ?? "390,768,1440").split(",").map(Number);
mkdirSync("shots/app", { recursive: true });
const browser = await chromium
  .launch()
  .catch(() => chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }));
let problems = 0;
const missing = new Set();

for (const r of routes) {
  for (const w of widths) {
    const context = await browser.newContext({
      viewport: { width: w, height: w === 390 ? 844 : 900 },
      reducedMotion: "reduce",
    });
    await context.addInitScript(
      ([k, v]) => {
        try {
          window.localStorage.setItem(k, v);
          // A saved "Only necessary" choice, so the consent bar does not cover the screen.
          window.localStorage.setItem(
            "kabsi_consent",
            JSON.stringify({
              version: "2026-10-25",
              visitor: "shots",
              analytics: false,
              advertising: false,
              at: new Date().toISOString(),
            }),
          );
        } catch {
          /* blocked */
        }
      },
      [STORAGE_KEY, JSON.stringify(SESSION)],
    );
    await context.route(/supabase\.co\//, async (route) => {
      const req = route.request();
      const res = answer(req.method(), req.url(), req.headers(), req.postData(), r.state);
      if (res.missing) missing.add(res.missing);
      await route.fulfill({
        status: res.status ?? 200,
        contentType: "application/json",
        headers: {
          "access-control-allow-origin": "*",
          "access-control-expose-headers": "content-range",
          ...(res.headers ?? {}),
        },
        body: res.body === undefined ? "" : JSON.stringify(res.body),
      });
    });
    // Turnstile, analytics and fonts from elsewhere never load in a shot.
    // Turnstile is stood in for by a stub that hands out a token at once, so forms behave as they do after the check.
    await context.route(/challenges\.cloudflare\.com\/turnstile/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/javascript",
        body: `window.turnstile = { render: (el, o) => { setTimeout(() => o.callback("shots"), 30); return "w" + Math.random(); },
          reset: () => {}, remove: () => {}, getResponse: () => "shots" };`,
      }),
    );
    // Analytics and pixels never load in a shot.
    await context.route(/posthog|sentry|googletagmanager|facebook/, (route) =>
      route.fulfill({ status: 204, body: "" }),
    );
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(BASE + r.path, { waitUntil: "load" });
    // The dev server compiles a page the first time it is asked for: wait for the H1, then let the queries settle.
    await page.waitForSelector("main h1, h1", { timeout: 20_000 }).catch(() => undefined);
    await page.waitForTimeout(r.wait ?? 1200);
    const name =
      r.name ??
      r.path.replace(/^\//, "").replace(/\//g, "_").replace(/[?=&]/g, "-") +
        (r.state ? `-${r.state}` : "");
    await page.screenshot({ path: `shots/app/${name}-${w}.png`, fullPage: true });
    const sideways = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    if (sideways) {
      problems++;
      console.log(`${r.path} ${r.state ?? ""} @${w}: sideways scroll`);
    }
    if (errors.length) {
      problems++;
      console.log(`${r.path} ${r.state ?? ""} @${w}: page error: ${errors[0]}`);
    }
    if (w === widths[0]) {
      await page.addScriptTag({ path: axePath });
      const found = await page.evaluate(async () => {
        const res = await window.axe.run(document, { resultTypes: ["violations"] });
        return res.violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => `${v.id}: ${v.nodes.length} (${v.nodes[0]?.target?.join(" ")})`);
      });
      if (found.length) {
        problems++;
        console.log(`${r.path} ${r.state ?? ""}: axe ${found.join("; ")}`);
      }
    }
    await context.close();
  }
  console.log(`done ${r.path}${r.state ? ` (${r.state})` : ""}`);
}
await browser.close();
if (missing.size)
  console.log(`Calls with no fixture (answered empty):\n  ${[...missing].sort().join("\n  ")}`);
console.log(problems ? `${problems} problem(s)` : "No problems.");
process.exit(problems ? 1 : 0);
