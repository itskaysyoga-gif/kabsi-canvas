// Email 1 (master plan 30.18 section 3; was QA 1's light and dark baseline): every email Kabsi sends (docs/email-previews,
// which tests/email-previews.test.ts keeps equal to what the Edge Functions render) and the four Supabase Auth templates
// (emails/auth), at 390 and 600 px, light and dark, with images off, in Chromium and WebKit. For each one: no sideways
// scroll, the size budget (under 100 KB of HTML), every link absolute and on kabsi.co (the social links, Google's
// third-party page and mailto aside), a plain-text part, readable with images off (the mark's alt text), and no em dash,
// en dash or exclamation mark in what a reader sees. Chromium at 390 px keeps a screenshot baseline for light and dark
// (tests/e2e/baseline). WebKit is skipped where the machine has no WebKit browser (cloud sessions have Chromium only).
// The caniemail check for Gmail, Outlook and Apple Mail is tests/email-clients.test.ts (vitest, in CI).
import { expect, test, type Browser } from "@playwright/test";
import { chromium, webkit } from "playwright";
import { existsSync, readdirSync, readFileSync } from "node:fs";

const previews = readdirSync("docs/email-previews")
  .filter((f) => f.endsWith(".html") && f !== "index.html")
  .map((f) => ["docs/email-previews", f] as const);
const auth = readdirSync("emails/auth")
  .filter((f) => f.endsWith(".html"))
  .map((f) => ["emails/auth", f] as const);
const ALLOWED_LINK =
  /^(https:\/\/kabsi\.co(\/|$)|https:\/\/www\.facebook\.com\/profile\.php\?id=|https:\/\/www\.instagram\.com\/kabsi\.co$|https:\/\/support\.google\.com\/business\/answer\/7163406$|mailto:)/;

const engines = { chromium, webkit } as const;
const open: Partial<Record<keyof typeof engines, Browser | null>> = {};
async function browser(name: keyof typeof engines): Promise<Browser | null> {
  if (!(name in open)) open[name] = await engines[name].launch().catch(() => null);
  return open[name] ?? null;
}
test.afterAll(async () => {
  for (const b of Object.values(open)) await b?.close();
});

for (const [dir, file] of [...previews, ...auth]) {
  const name = `${dir.endsWith("auth") ? "auth/" : ""}${file}`;
  test.describe(name, () => {
    test.beforeEach(({}, info) => {
      test.skip(
        info.project.name !== "m390",
        "emails are checked once per run; the widths are set below",
      );
    });

    test("size, links and the plain-text part", () => {
      const html = readFileSync(`${dir}/${file}`, "utf8");
      expect(Buffer.byteLength(html), "under 100 KB of HTML").toBeLessThan(100_000);
      for (const m of html.matchAll(/href="([^"]+)"/g)) {
        expect(m[1]!.replace(/&amp;/g, "&"), "absolute links on kabsi.co only").toMatch(
          ALLOWED_LINK,
        );
      }
      for (const m of html.matchAll(/<img [^>]*src="([^"]+)"/g))
        expect(m[1]).toMatch(/^https:\/\/kabsi\.co\//);
      expect(html).toMatch(/<img [^>]*alt="Kabsi"/);
      expect(html).not.toContain("cid:");
      // The auth templates are Supabase's: it sends them without a text part. Every Kabsi email has one.
      if (!dir.endsWith("auth")) {
        const txt = `${dir}/${file.replace(/\.html$/, ".txt")}`;
        expect(existsSync(txt), "a plain-text part").toBe(true);
        expect(readFileSync(txt, "utf8").trim().length).toBeGreaterThan(80);
      }
    });

    for (const engine of ["chromium", "webkit"] as const) {
      for (const width of [390, 600]) {
        for (const scheme of ["light", "dark"] as const) {
          test(`${engine} ${width} px ${scheme}, images off`, async () => {
            const b = await browser(engine);
            test.skip(!b, `${engine} is not installed on this machine`);
            const ctx = await b!.newContext({
              viewport: { width, height: 900 },
              colorScheme: scheme,
              javaScriptEnabled: false,
            });
            const page = await ctx.newPage();
            // Images off and nothing fetched: the mark shows its alt text, the heading falls back to the system face.
            await page.route(/^https?:/, (route) => route.abort());
            await page.setContent(readFileSync(`${dir}/${file}`, "utf8"), { waitUntil: "load" });
            const overflow = await page.evaluate(
              () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
            );
            expect(overflow, "horizontal scroll").toBeLessThanOrEqual(0);
            const text = await page.locator("body").innerText();
            expect(text, "dashes and exclamation marks").not.toMatch(/[–—!]/);
            expect(text, "readable with images off").toMatch(/Kabsi/);
            const h1 = page.locator("h1");
            await expect(h1).toBeVisible();
            // The heading reads in both schemes: its colour differs from the card behind it.
            const [fg, bg] = await h1.evaluate((el) => [
              getComputedStyle(el).color,
              getComputedStyle(el.closest("td")!).backgroundColor,
            ]);
            expect(fg).not.toBe(bg);
            if (engine === "chromium" && width === 390) {
              await expect(page).toHaveScreenshot(
                `${scheme}-${dir.endsWith("auth") ? "auth-" : ""}${file.replace(/\.html$/, "")}.png`,
                { fullPage: true },
              );
            }
            await ctx.close();
          });
        }
      }
    }
  });
}
