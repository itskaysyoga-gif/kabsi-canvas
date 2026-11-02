// QA 2 (2 Nov 2026): the public pages and the free check's states on a live deployment, at five widths, in one browser.
// Reads only: every Places, visibility and Turnstile call of the free check is answered here, so nothing is spent or kept.
// Run: node scripts/qa2/crawl.mjs --browser chromium|webkit [--base https://kabsi.co] [--out qa2-out] [--widths 320,390]
// Writes <out>/<browser>/shots/*.png (first screen and full page) and <out>/<browser>/findings.json. The crawl never fails on a
// finding; it lists them. docs/qa/2026-11-02-qa2.md is the report made from it.
import { chromium, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { covered, measure, words } from "./lib.mjs";

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : dflt;
};
const BROWSER = arg("browser", "chromium");
const BASE = arg("base", "https://kabsi.co").replace(/\/$/, "");
const OUT = join(arg("out", "qa2-out"), BROWSER + (arg("geo", "") ? `-${arg("geo", "")}` : ""));
const WIDTHS = arg("widths", "320,390,768,1280,1440").split(",").map(Number);
const ONLY = arg("only", "");
// Full-page shots only at these widths (CI keeps the artifact small); first screens at every width.
const FULL = arg("full-widths", "").split(",").filter(Boolean).map(Number);
const CONC = Number(arg("concurrency", "4"));
// --geo GB answers /api/geo with that country, so the cookie bar (opt_in countries) shows as it does for a visitor there.
const GEO = arg("geo", "");
mkdirSync(join(OUT, "shots"), { recursive: true });

// The pages: the sitemap, the pages that are public but not indexed, and the 404.
const sitemap = readFileSync(new URL("../../public/sitemap.xml", import.meta.url), "utf8");
const fromSitemap = [...sitemap.matchAll(/<loc>https:\/\/kabsi\.co([^<]*)<\/loc>/g)].map(
  (m) => m[1] || "/",
);
const extra = [
  "/manager-steps",
  "/google-profile-check",
  "/login",
  "/get-started",
  "/setup-call",
  "/unsubscribe",
  "/review/QA2TEST",
  "/scan/QA2TEST",
  "/for/barbershop",
  "/?menu=open",
  "/not-a-page",
];
const PAGES = [...new Set([...fromSitemap, ...extra])].map((path) => ({ id: slug(path), path }));

// The free check's states, each made by answering the Edge Function in the browser.
const SNAPSHOT = {
  place_id: "ChIJqa2AAAAAAAAA",
  name: "Rose Lane Salon",
  address: "12 Harbour Lane, Example Town, NY 10001, USA",
  category: "Hair salon",
  rating: 4.6,
  review_count: 128,
  business_status: "OPERATIONAL",
  open_now: true,
  hours: ["Monday: 9:00 AM to 6:00 PM"],
  phone: "(555) 010-0000",
  website: "https://example.com",
  has_photos: true,
  photo_count: 12,
  flags: [],
  checklist: [],
  cached: false,
};
const PLACE = (i) => ({
  place_id: `ChIJqa2place${i}AAAA`,
  name: ["Rose Lane Salon", "Rose Lane Studio", "Rose & Lane Hair"][i],
  address: [
    "12 Harbour Lane, Example Town, NY 10001, USA",
    "4 Main Street, Example Town, NY 10001, USA",
    "90 Oak Avenue, Example Town, NY 10001, USA",
  ][i],
  category: "Hair salon",
});
const STATES = [
  { id: "scan-searching", search: "hang" },
  { id: "scan-one", search: [PLACE(0)] },
  { id: "scan-several", search: [PLACE(0), PLACE(1), PLACE(2)] },
  { id: "scan-none", search: [] },
  { id: "scan-error", search: "error" },
  { id: "scan-checking", search: [PLACE(0)], pick: true, check: "hang" },
  { id: "scan-result", search: [PLACE(0)], pick: true, check: "ok" },
].map((s) => ({ ...s, path: "/scan?q=Rose%20Lane%20Salon" }));

const ALL = [...PAGES, ...STATES].filter((p) => !ONLY || ONLY.split(",").includes(p.id));

function slug(path) {
  return (path === "/" ? "home" : path.replace(/^\//, "").replace(/[/?=&]+/g, "-")) || "home";
}

async function stubScan(page, s) {
  await page.route("https://challenges.cloudflare.com/**", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `window.turnstile={render:(el,o)=>{setTimeout(()=>o.callback("stub-token"),30);return "w1"},reset:()=>{},remove:()=>{},getResponse:()=>"stub-token"};`,
    }),
  );
  await page.route("**/functions/v1/profile-snapshot", async (route) => {
    const body = route.request().postDataJSON() ?? {};
    const json = (o, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(o),
      });
    if (body.action === "search") {
      if (s.search === "hang") return; // never answered: the searching state stays
      if (s.search === "error")
        return json(
          { error: "unavailable", message: "The check is busy. Please try again in a minute." },
          503,
        );
      return json({ places: s.search });
    }
    if (body.action === "check") {
      if (s.check === "hang") return;
      return json({ snapshot: SNAPSHOT });
    }
    if (body.action === "suggest") return json({ suggestions: [], available: false });
    return json({ error: "bad", message: "no" }, 400);
  });
  await page.route("**/functions/v1/visibility/**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: "{}",
    }),
  );
}

async function visit(browser, item, width) {
  const isPhone = width <= 768;
  const ctx = await browser.newContext({
    viewport: { width, height: width <= 390 ? 844 : width <= 768 ? 1024 : 900 },
    deviceScaleFactor: isPhone ? 2 : 1,
    hasTouch: isPhone && BROWSER !== "firefox",
    isMobile: isPhone && BROWSER === "chromium",
    locale: "en-US",
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 160)));
  const rec = { id: item.id, path: item.path, width, browser: BROWSER };
  try {
    if (GEO)
      await page.route("**/api/geo", (route) =>
        route.fulfill({ contentType: "application/json", body: JSON.stringify({ country: GEO }) }),
      );
    if (item.search !== undefined) await stubScan(page, item);
    const res = await page.goto(BASE + item.path, { waitUntil: "load", timeout: 45000 });
    rec.status = res?.status() ?? null;
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(item.search !== undefined ? 1500 : 700);
    if (item.pick) {
      await page
        .getByRole("button", { name: "This is my business" })
        .first()
        .click({ timeout: 10000 });
      await page.waitForTimeout(item.check === "ok" ? 2500 : 1200);
    }
    const base = `${item.id}-${width}`;
    // First screen as a first-time visitor sees it: the cookie bar and every fixed bar included.
    await page.screenshot({ path: join(OUT, "shots", `${base}-first.png`) });
    rec.coveredFirst = await covered(page);
    const m = await measure(page, width);
    // Then the whole page, after the cookie choice (the bar would otherwise sit over the footer of every shot).
    const btn = page
      .getByRole("button", {
        name: /^(Only necessary|Necessary only|Reject|Decline|No thanks|Accept)/i,
      })
      .first();
    rec.cookieBar = await btn.isVisible().catch(() => false);
    if (rec.cookieBar) await btn.click().catch(() => {});
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
    });
    await page.waitForTimeout(400);
    rec.coveredBottom = await covered(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    const m2 = await measure(page, width);
    rec.height = await page.evaluate(() => document.documentElement.scrollHeight);
    if (!FULL.length || FULL.includes(width))
      await page
        .screenshot({ path: join(OUT, "shots", `${base}-full.png`), fullPage: true })
        .catch((e) => (rec.shotError = String(e).slice(0, 120)));
    Object.assign(rec, {
      sideways: m.sideways || m2.sideways,
      scrollWidth: Math.max(m.scrollWidth, m2.scrollWidth),
      wide: m2.wide.length ? m2.wide : m.wide,
      images: m2.images,
      small: m2.small,
      fixed: m.fixed,
    });
    if (width === 390 || width === 1440) {
      Object.assign(rec, {
        title: m.title,
        description: m.description,
        canonical: m.canonical,
        robots: m.robots,
        h1: m.h1,
        h1All: m.h1All,
        jsonld: m.jsonld,
        links: m.links,
      });
      rec.words = words(m2.text);
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze()
        .catch((e) => ({
          violations: [
            { id: "axe-error", impact: "n/a", help: String(e).slice(0, 100), nodes: [] },
          ],
        }));
      rec.axe = axe.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        n: v.nodes.length,
        first: v.nodes[0]?.target?.join(" "),
      }));
    }
  } catch (e) {
    rec.error = String(e.message ?? e).slice(0, 200);
  }
  rec.pageErrors = errors;
  await ctx.close();
  return rec;
}

const browser = await (BROWSER === "webkit" ? webkit : chromium).launch();
const jobs = [];
for (const item of ALL) for (const w of WIDTHS) jobs.push([item, w]);
const results = [];
let next = 0;
await Promise.all(
  Array.from({ length: CONC }, async () => {
    while (next < jobs.length) {
      const [item, w] = jobs[next++];
      const r = await visit(browser, item, w);
      results.push(r);
      process.stdout.write(`${r.error ? "E" : r.sideways ? "S" : "."}`);
    }
  }),
);
await browser.close();
results.sort((a, b) => a.id.localeCompare(b.id) || a.width - b.width);
writeFileSync(join(OUT, "findings.json"), JSON.stringify(results, null, 1));
console.log(
  `\n${results.length} visits, ${results.filter((r) => r.error).length} errors, ${results.filter((r) => r.sideways).length} sideways`,
);
