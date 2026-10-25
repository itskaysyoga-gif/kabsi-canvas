// QA 1 (30.12 item 2, 30.7 item 7): every public page against production, at 390 and 1440 px (the two projects of
// playwright.config.ts). Each page must load, show one h1, have no serious or critical axe issue, and match the approved
// baseline in tests/e2e/baseline. A change that nobody explained fails the run.
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { axeClean, keep, MASKS, noBanner, settle } from "./helpers/page";

const sitemap = readFileSync("public/sitemap.xml", "utf8");
const fromSitemap = [...sitemap.matchAll(/<loc>https:\/\/kabsi\.co([^<]*)<\/loc>/g)].map(
  (m) => m[1] ?? "",
);
// The sitemap holds what search engines may index; the app's own public doors are listed here.
const OTHERS = ["/", "/login", "/get-started", "/billing/done"];
const ROUTES = [...new Set([...OTHERS, ...fromSitemap])].filter(Boolean);

// Issues found by this suite that cannot be fixed in QA 1 (docs/LATER.md lists each). A rule listed here is not failed for that page only;
// every other serious or critical rule still is. Remove the entry when the page is fixed.
const KNOWN_AXE: Record<string, string[]> = {
  "/": ["color-contrast"], // the green tint behind the proof line on the home page
};

test.describe("public pages", () => {
  test.beforeEach(async ({ page }) => {
    await noBanner(page);
  });

  for (const route of ROUTES) {
    test(`${route}`, async ({ page }, info) => {
      const res = await page.goto(route);
      expect(res?.status(), `${route} status`).toBeLessThan(400);
      await settle(page);
      await expect(page.locator("h1").first(), "a page has a heading").toBeVisible();
      // No sideways scroll at 390 px (DESIGN.md, phone first).
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, "horizontal scroll").toBeLessThanOrEqual(0);
      await axeClean(page, route, KNOWN_AXE[route] ?? []);
      const name = (route === "/" ? "home" : route.slice(1).replaceAll("/", "-")) + ".png";
      await expect(page).toHaveScreenshot(name, { ...(await keep(page)), mask: MASKS(page) });
      void info;
    });
  }

  test("an unknown address shows the Kabsi 404 page, not a blank screen", async ({ page }) => {
    await noBanner(page);
    const res = await page.goto("/this-page-does-not-exist");
    expect(res?.status()).toBe(404);
    await settle(page);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page).toHaveScreenshot("not-found.png", await keep(page));
  });

  // COPY.md: while free_scan_daily_cap is 0 the scan box shows the waitlist state ("Save my place"). The visibility scan and its
  // cap are built in V1 and Web 2; until then the page runs the Free Profile Check. This test turns on with that session.
  test.fixme("the scan box shows the waitlist while the daily cap is 0", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Save my place" })).toBeVisible();
  });
});
