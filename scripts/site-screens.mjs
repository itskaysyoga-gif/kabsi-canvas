// SITE-5: Kabsi's own screens for the public pages (public/screens), drawn from the scripts/app-shots fixtures with no
// real account and no call to Supabase. One example business everywhere: Maple Street Salon. Each industry page shows
// its own trade's screen: the Google profile screen at that trade's Example business.
// Start the site first (npx vite dev --port 5173 --host 127.0.0.1), then:
//   node scripts/site-screens.mjs            report, cards and the weekly email, for Maple Street Salon
//   node scripts/site-screens.mjs --trades   one Google profile screen per industry page (public/screens/trade-<slug>-560.webp)
//   node scripts/site-screens.mjs --maple    the Reviews screen of Maple Street Salon with Home's hero review
// Each screen is the first screen of a 390 px phone, written as a 560 by 1212 WebP (quality 80).
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const BASE = process.env.BASE ?? "http://127.0.0.1:5173";
const OUT = "public/screens";
mkdirSync(OUT, { recursive: true });

if (process.argv.includes("--maple")) {
  // Home's hero review and reply (src/components/marketing/v31-data.ts HERO_SCENES), on Kabsi's own Reviews screen.
  const r = spawnSync(process.execPath, ["scripts/site-screens.mjs", "--one", "maple"], {
    stdio: "inherit",
    env: {
      ...process.env,
      SHOT_TRADE: JSON.stringify({
        business: "Maple Street Salon",
        review: {
          name: "Jess",
          stars: 5,
          text: "Lovely cut and a warm welcome. Sam took real care.",
        },
        reply: "Thank you, Jess. We are glad Sam took care of you. See you next time.",
      }),
    },
  });
  process.exit(r.status ?? 1);
}

if (process.argv.includes("--trades")) {
  // The blueprint is TypeScript with no imports: Node strips the types. The Example business is read from each
  // trade's content file.
  const { BLUEPRINT } = await import("../src/content/industries/blueprint.ts");
  const files = readdirSync("src/content/industries").filter(
    (f) =>
      f.endsWith(".ts") && !["index.ts", "types.ts", "blueprint.ts", "trade-work.ts"].includes(f),
  );
  for (const f of files) {
    const text = readFileSync(`src/content/industries/${f}`, "utf8");
    const slug = text.match(/slug: "([^"]+)"/)?.[1];
    const business = text.match(/example: \{\s*business: "([^"]+)"/)?.[1];
    const b = slug && BLUEPRINT[slug];
    if (!slug || !business || !b) {
      console.error(`skipped ${f}: no slug, example business or blueprint`);
      continue;
    }
    const r = spawnSync(process.execPath, ["scripts/site-screens.mjs", "--one", slug], {
      stdio: "inherit",
      env: {
        ...process.env,
        SHOT_TRADE: JSON.stringify({ business, review: b.review, reply: b.reply }),
      },
    });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
  process.exit(0);
}

const { answer, SESSION, STORAGE_KEY } = await import("./app-shots/fixtures.mjs");
const browser = await chromium
  .launch()
  .catch(() => chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }));

async function context() {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 560 / 390,
    reducedMotion: "reduce",
  });
  await ctx.addInitScript(
    ([k, v]) => {
      window.localStorage.setItem(k, v);
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
    },
    [STORAGE_KEY, JSON.stringify(SESSION)],
  );
  await ctx.route(/supabase\.co\//, async (route) => {
    const req = route.request();
    const res = answer(req.method(), req.url(), req.headers(), req.postData(), undefined);
    if (res.file)
      return route.fulfill({
        status: 200,
        path: res.file,
        headers: { "access-control-allow-origin": "*" },
      });
    return route.fulfill({
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
  await ctx.route(/posthog|sentry|googletagmanager|facebook|challenges\.cloudflare/, (route) =>
    route.fulfill({ status: 204, body: "" }),
  );
  return ctx;
}

/** The page's first phone screen as WebP, encoded by the browser itself (no image library needed). */
async function save(page, name) {
  const png = (await page.screenshot({ type: "png" })).toString("base64");
  const webp = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = 560;
    c.height = 1212;
    c.getContext("2d").drawImage(img, 0, 0, 560, 1212);
    return c.toDataURL("image/webp", 0.8).split(",")[1];
  }, png);
  writeFileSync(`${OUT}/${name}-560.webp`, Buffer.from(webp, "base64"));
  console.log(`${OUT}/${name}-560.webp`);
}

async function app(path, name) {
  const ctx = await context();
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: "load" });
  await page.waitForSelector("main h1, h1", { timeout: 20_000 });
  await page.waitForTimeout(1500);
  await save(page, name);
  await ctx.close();
}

const one = process.argv.indexOf("--one");
if (one > 0) {
  // An industry page's screen, or (--one maple) the Reviews screen of the site's own example business.
  const slug = process.argv[one + 1];
  // An industry page shows its trade's Google profile screen (a change caught on Google), so its phone never repeats
  // the review card in its hero.
  if (slug === "maple") await app("/app/reviews", "app-reviews");
  else await app("/app/shield", `trade-${slug}`);
} else {
  await app("/app/report", "app-report");
  await app("/app/cards", "app-cards");
  // How it works shows a screen Home does not: Google Protection.
  await app("/app/shield", "app-shield");
  // The weekly report email: its preview (docs/email-previews), with the example business of the site.
  const ctx = await context();
  const page = await ctx.newPage();
  // The app's waiting reply is to Maya R., so the email's is too.
  const html = readFileSync("docs/email-previews/weekly_report.html", "utf8")
    .replaceAll("Rose Lane Salon", "Maple Street Salon")
    .replaceAll("Maya K.", "Maya R.");
  await page.setContent(html, { waitUntil: "load" });
  await page.waitForTimeout(500);
  await save(page, "email-weekly");
  await ctx.close();
}
await browser.close();
