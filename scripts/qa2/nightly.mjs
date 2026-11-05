// Fix 3 part D: the nightly check of kabsi.co (qa2-live.yml, 03:45 UTC). The public pages from the live sitemap at 390 and
// 1440 px in Chromium: console errors, failed requests, broken internal links, exactly one H1, axe serious or critical,
// and the free check page loading. Reads only: statistics, error reports and the cookie choice are never sent, and any call
// that could spend (the free check's Places search and check, the nearby check) is stopped in the browser and counted as a
// failure, because a page load must never make one.
// Run: node scripts/qa2/nightly.mjs [--base https://kabsi.co] [--out nightly-out] [--only /,/scan]
// Writes <out>/nightly.json and <out>/summary.txt ("<page> at <width> px: <first error>"). Exit 1 when anything failed.
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : dflt;
};
const BASE = arg("base", "https://kabsi.co").replace(/\/$/, "");
const OUT = arg("out", "nightly-out");
const ONLY = arg("only", "");
const WIDTHS = [390, 1440];
const HOST = new URL(BASE).host;
mkdirSync(OUT, { recursive: true });

// Calls a page load must never make: they spend (Places, DataForSEO) or keep data.
const PAID = /\/functions\/v1\/(profile-snapshot|visibility)\b/;
// Sent by the browser on every page but not part of the check: statistics, error reports, the Meta pixel, the cookie choice.
const QUIET =
  /\/ingest\/|sentry\.io|sentry-cdn\.com|connect\.facebook\.net|facebook\.com\/tr|\/functions\/v1\/consent/;
// Console lines that are the browser telling about a blocked third party (a visitor's extension or the content security
// policy refusing one), not Kabsi's own code failing.
const NOISE = [
  /Content Security Policy/i,
  /net::ERR_BLOCKED_BY_CLIENT/i,
  /net::ERR_ABORTED/i,
  /Failed to load resource: net::ERR_FAILED/i,
];

async function pages() {
  const xml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const paths = [...xml.matchAll(/<loc>https?:\/\/[^/<]+([^<]*)<\/loc>/g)].map((m) => m[1] || "/");
  const all = [...new Set(paths.length ? paths : ["/"])];
  return ONLY ? all.filter((p) => ONLY.split(",").includes(p)) : all;
}

async function visit(browser, path, width, links) {
  const ctx = await browser.newContext({
    viewport: { width, height: width <= 390 ? 844 : 900 },
    isMobile: width <= 390,
    hasTouch: width <= 390,
    locale: "en-US",
    reducedMotion: "reduce",
    userAgent: undefined,
  });
  const page = await ctx.newPage();
  const errors = [];
  const add = (kind, text) =>
    errors.push(`${kind}: ${String(text).replace(/\s+/g, " ").slice(0, 200)}`);
  page.on("pageerror", (e) => add("page error", e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !NOISE.some((r) => r.test(m.text())))
      add("console error", m.text());
  });
  page.on("requestfailed", (r) => {
    const u = r.url();
    if (QUIET.test(u) || PAID.test(u)) return;
    const why = r.failure()?.errorText ?? "";
    if (/ERR_ABORTED|ERR_BLOCKED_BY_CLIENT/.test(why)) return; // a navigation away or a prefetch cancelled
    if (new URL(u).host === HOST) add("failed request", `${u} ${why}`);
  });
  page.on("response", (r) => {
    const u = r.url();
    if (r.status() >= 400 && new URL(u).host === HOST && !QUIET.test(u))
      add("failed request", `${r.status()} ${u}`);
  });
  await page.route(QUIET, (route) =>
    /consent/.test(route.request().url())
      ? route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: "{}",
        })
      : route.abort(),
  );
  await page.route(PAID, (route) => {
    add(
      "paid call",
      `${route.request().method()} ${route.request().url()} (a page load must not spend)`,
    );
    return route.abort();
  });
  const rec = { path, width, errors };
  try {
    const res = await page.goto(BASE + path, { waitUntil: "load", timeout: 45000 });
    if (!res || res.status() >= 400) add("page status", res?.status() ?? "no answer");
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);
    const h1 = await page.locator("h1").count();
    if (h1 !== 1) add("h1", `${h1} H1 on the page, want 1`);
    if (path === "/scan") {
      // The free check page: its search box is there and can be typed in. Nothing is searched (that would spend).
      const box = page
        .getByRole("combobox")
        .or(page.locator('input[type="text"], input[type="search"]'))
        .first();
      if (!(await box.isVisible().catch(() => false)))
        add("free check", "the search box is not shown");
    }
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    for (const v of axe.violations.filter(
      (x) => x.impact === "serious" || x.impact === "critical",
    )) {
      add(`axe ${v.impact}`, `${v.id} (${v.nodes.length}): ${v.help}`);
    }
    for (const href of await page.$$eval("a[href]", (as) =>
      as.map((a) => a.getAttribute("href") ?? ""),
    )) {
      try {
        const u = new URL(href, BASE + path);
        if (u.host === HOST && /^https?:$/.test(u.protocol)) links.add(u.origin + u.pathname);
      } catch {
        /* not a link */
      }
    }
  } catch (e) {
    add("visit", e.message);
  } finally {
    await ctx.close();
  }
  return rec;
}

const list = await pages();
const browser = await chromium.launch();
const results = [];
const links = new Set();
for (const path of list)
  for (const width of WIDTHS) results.push(await visit(browser, path, width, links));
await browser.close();

// Internal links: each one once, without the browser. A 404 or a 5xx is a broken link.
const broken = [];
for (const href of [...links].sort()) {
  const r = await fetch(href, { redirect: "follow" }).catch((e) => ({
    status: 0,
    statusText: String(e),
  }));
  if (r.status === 0 || r.status >= 400) broken.push({ href, status: r.status });
}

const failed = results.filter((r) => r.errors.length);
const lines = [
  ...failed.map(
    (r) =>
      `${r.path} at ${r.width} px: ${r.errors[0]}${r.errors.length > 1 ? ` (and ${r.errors.length - 1} more)` : ""}`,
  ),
  ...broken.map((b) => `broken link ${b.href.replace(BASE, "") || "/"}: ${b.status}`),
];
writeFileSync(
  join(OUT, "nightly.json"),
  JSON.stringify(
    { base: BASE, pages: list.length, widths: WIDTHS, links: links.size, results, broken },
    null,
    2,
  ),
);
writeFileSync(join(OUT, "summary.txt"), lines.join("\n") + (lines.length ? "\n" : ""));
console.log(
  `${list.length} pages at ${WIDTHS.join(" and ")} px, ${links.size} internal links: ${lines.length ? `${lines.length} problems` : "all clear"}`,
);
for (const l of lines) console.log(`  ${l}`);
process.exit(lines.length ? 1 : 0);
