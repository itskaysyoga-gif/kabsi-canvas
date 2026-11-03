// Polish 2 (3 Nov 2026): before and after screenshots of the pages lane R reviews, at 320, 390, 768, 1280 and 1440 px.
// Nothing is sent: the founding counts, the bot check and the free check are stood in for in the browser.
//   node scripts/polish2-shots.mjs <base url> <out dir>
// Writes <out dir>/<page>-<width>.jpg and prints each page's height at each width.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "docs/polish2/after";
mkdirSync(out, { recursive: true });

const WIDTHS = [320, 390, 768, 1280, 1440];
const PAGES = [
  ["home", "/"],
  ["scan", "/scan"],
  ["scan-result", "/scan?q=Hollis%20Hair"],
  ["pricing", "/pricing"],
  ["how-it-works", "/how-it-works"],
  ["for-hair-salon", "/for/hair-salon"],
  ["for-barbershop", "/for/barbershop"],
  ["for-nail-salon", "/for/nail-salon"],
  ["for-restaurant", "/for/restaurant"],
  ["about", "/about"],
];
const only = process.env.PAGES?.split(",");

const SNAPSHOT = {
  place_id: "ChIJexample00000000001",
  name: "Hollis Hair",
  address: "14 Gloucester Road, Bristol BS7 8AE, UK",
  category: "Hair salon",
  rating: 4.8,
  review_count: 38,
  business_status: "OPERATIONAL",
  open_now: true,
  hours: [],
  phone: "0117 000 0000",
  website: "https://example.com",
  has_photos: true,
  photo_count: 10,
  flags: [
    {
      tone: "danger",
      fact: "No opening hours are shown on Google.",
      action: "Kabsi asks you for your hours and sends them to Google once you say yes.",
    },
    {
      tone: "neutral",
      fact: "Google does not show the public which reviews have a reply.",
      action:
        "Once you connect, Kabsi counts the reviews with no reply and prepares one for each. You approve every reply.",
    },
    {
      tone: "neutral",
      fact: "Google does not show the public whether holiday hours are set.",
      action:
        "Once you connect, Kabsi asks about each holiday and prepares special hours for you to approve.",
    },
  ],
  checklist: [],
  cached: false,
};

const json = (body, status = 200) => ({
  status,
  contentType: "application/json",
  headers: { "access-control-allow-origin": "*" },
  body: JSON.stringify(body),
});

const browser = await chromium.launch();
for (const [name, path] of PAGES) {
  if (only && !only.includes(name)) continue;
  const heights = [];
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 768 ? 844 : 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      try {
        localStorage.setItem(
          "kabsi_consent",
          JSON.stringify({
            version: "2026-10-25",
            visitor: "qa",
            analytics: false,
            advertising: false,
            at: "2026-10-25T00:00:00.000Z",
          }),
        );
      } catch {}
    });
    await page.route("https://challenges.cloudflare.com/**", (r) =>
      r.fulfill({
        contentType: "text/javascript",
        body: "window.turnstile={render:function(el,o){setTimeout(function(){o.callback('t')},30);return 'w'},reset:function(){},remove:function(){}};",
      }),
    );
    await page.route("**/functions/v1/programs/founding", (r) =>
      r.fulfill(json({ left: 18, total: 25, groups: [] })),
    );
    await page.route("**/functions/v1/billing-creem/founding", (r) =>
      r.fulfill(json({ left: 27 })),
    );
    await page.route("**/functions/v1/profile-snapshot", (r) => {
      const a = r.request().postDataJSON()?.action;
      if (a === "search")
        return r.fulfill(
          json({
            places: [
              { place_id: SNAPSHOT.place_id, name: SNAPSHOT.name, address: SNAPSHOT.address },
            ],
          }),
        );
      if (a === "check") return r.fulfill(json({ snapshot: SNAPSHOT }));
      return r.fulfill(json({ suggestions: [], available: false }));
    });
    await page.route("**/functions/v1/visibility/**", (r) =>
      r.fulfill(json({ state: "waitlist" })),
    );
    await page.goto(base + path, { waitUntil: "load" });
    if (name === "scan-result") {
      await page.getByRole("button", { name: "This is my business" }).click({ timeout: 30000 });
      await page
        .getByRole("heading", { level: 1, name: "Hollis Hair" })
        .waitFor({ timeout: 30000 });
    }
    await page.waitForTimeout(2500);
    // Let every entrance animation end, then shoot the whole page.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(600);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    heights.push(`${w}:${h}`);
    await page.screenshot({
      path: `${out}/${name}-${w}.jpg`,
      fullPage: true,
      type: "jpeg",
      quality: 55,
    });
    if (w === 390)
      await page.screenshot({
        path: `${out}/${name}-390-first-screen.jpg`,
        type: "jpeg",
        quality: 70,
      });
    await ctx.close();
  }
  console.log(name, heights.join(" "));
}
await browser.close();
