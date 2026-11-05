// App 4 part D (master plan 30.31 item 4): a new page always opens at its top, Back returns to where the visitor was,
// and a #link scrolls to its section under the sticky header. Run with motion on (the default for most visitors): the
// fault only showed then, because html's scroll-behavior: smooth animated the router's jump to the top.
import { expect, test, type Page } from "@playwright/test";
import { noBanner } from "./helpers/page";

test.use({ reducedMotion: "no-preference" });

async function scrollYs(page: Page) {
  const ys: number[] = [];
  for (let i = 0; i < 4; i++) {
    ys.push(await page.evaluate(() => window.scrollY));
    await page.waitForTimeout(150);
  }
  return ys;
}

/** Clicks the link from deep in the page and checks the new page is at its top at once and stays there. */
async function opensAtTop(page: Page, from: string, selector: string) {
  await page.goto(from);
  await page.waitForLoadState("load");
  const link = page.locator(selector).last();
  await link.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  const href = await link.getAttribute("href");
  const h1 = await page.locator("h1").first().innerText();
  await link.click();
  await page.waitForURL((u) => u.pathname === new URL(href!, "https://x").pathname);
  // The address changes before the new page's code has loaded; judge the new page once it is drawn.
  await expect(page.locator("h1").first()).not.toHaveText(h1);
  const ys = await scrollYs(page);
  expect(ys, `${from} to ${href} (from ${before} px)`).toEqual([0, 0, 0, 0]);
}

test.describe("pages open at the top", () => {
  test("/for to an industry page", async ({ page }) => {
    await noBanner(page);
    await opensAtTop(page, "/for", 'main a[href^="/for/"]');
  });

  test("the guides list to a guide", async ({ page }) => {
    await noBanner(page);
    await opensAtTop(page, "/guides", 'main a[href^="/guides/"]');
  });

  test("a footer link", async ({ page }) => {
    await noBanner(page);
    await opensAtTop(page, "/", 'footer a[href="/pricing"]');
  });

  test("a link on Home", async ({ page }) => {
    await noBanner(page);
    await opensAtTop(page, "/", 'main a[href^="/for"]');
  });

  test("Back returns to where the visitor was", async ({ page }) => {
    await noBanner(page);
    await page.goto("/for");
    await page.waitForLoadState("load");
    // The page's own first scroll (to its top, after hydration) comes before the visitor scrolls.
    await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(800);
    const link = page.locator('main a[href^="/for/"]').last();
    await link.scrollIntoViewIfNeeded();
    // A visitor reads before tapping; the router keeps the place it was left at (it saves after a short pause).
    await page.waitForTimeout(600);
    const before = await page.evaluate(() => window.scrollY);
    expect(before).toBeGreaterThan(300);
    const h1 = await page.locator("h1").first().innerText();
    await link.click();
    await page.waitForURL(/\/for\/.+/);
    await expect(page.locator("h1").first()).not.toHaveText(h1);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.goBack();
    await page.waitForURL(/\/for$/);
    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
      .toBeGreaterThan(before - 40);
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(before + 40);
  });

  test("a #link lands its section under the sticky header", async ({ page }) => {
    await noBanner(page);
    await page.goto("/partners");
    await page.waitForLoadState("load");
    const anchor = page.locator('main a[href="#apply"]').first();
    test.skip((await anchor.count()) === 0, "no #apply link on this deployment");
    await anchor.click();
    const target = page.locator("#apply");
    const header = (await page.locator("header").first().boundingBox())!;
    // The smooth scroll ends with the section's top just under the sticky header (scroll-padding-top).
    await expect
      .poll(async () => Math.round((await target.boundingBox())!.y), { timeout: 5000 })
      .toBeLessThan(page.viewportSize()!.height / 2);
    await page.waitForTimeout(400);
    const top = (await target.boundingBox())!.y;
    expect(top).toBeGreaterThanOrEqual(header.height - 1);
    expect(top).toBeLessThan(page.viewportSize()!.height / 2);
  });
});
