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
// Web 2 (27 Oct 2026) rebuilt the home page; its green tint is gone, so the list is empty.
const KNOWN_AXE: Record<string, string[]> = {};

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

  // UX 1 (waiting list) and QA 2: while the nearby check is closed, /scan shows the public profile facts and "Save my place".
  // Nothing paid or sent: Turnstile, the Places-backed profile-snapshot, visibility/check and visibility/waitlist are stood in for.
  test("the free check shows the waiting list while the nearby check is closed, and saves a place", async ({
    page,
  }) => {
    await noBanner(page);
    const json = (body: unknown) => ({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
    const place = {
      place_id: "ChIJqa000000000000001",
      name: "Rose Lane Salon",
      address: "12 Al Wasl Road, Dubai, United Arab Emirates",
    };
    let saved: Record<string, unknown> | null = null;
    await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js*", (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body: "window.turnstile={render:function(el,o){setTimeout(function(){o.callback('qa-pass')},50);return 'qa'},reset:function(){},remove:function(){}};",
      }),
    );
    await page.route("**/functions/v1/profile-snapshot", (route) => {
      const action = route.request().postDataJSON()?.action;
      return route.fulfill(
        json(
          action === "search"
            ? { places: [place] }
            : {
                snapshot: {
                  ...place,
                  category: "Hair salon",
                  rating: 4.6,
                  review_count: 38,
                  business_status: "OPERATIONAL",
                  open_now: true,
                  hours: ["Monday: 10:00 to 21:00"],
                  phone: "+971 4 000 0000",
                  website: null,
                  has_photos: true,
                  photo_count: 12,
                  flags: [],
                  checklist: [],
                  cached: false,
                },
              },
        ),
      );
    });
    await page.route("**/functions/v1/visibility/check", (route) =>
      route.fulfill(json({ state: "waitlist" })),
    );
    await page.route("**/functions/v1/visibility/waitlist", (route) => {
      saved = route.request().postDataJSON();
      return route.fulfill(json({ ok: true }));
    });
    await page.goto("/scan?q=Rose%20Lane%20Salon");
    const save = page.getByRole("button", { name: "Save my place" });
    await expect(save).toBeVisible({ timeout: 30_000 });
    const form = page.locator("form", { has: save });
    await form.getByLabel("Email").fill("qa-waiting@test.local");
    await save.click();
    await expect(page.getByText("Saved. You are on the list.")).toBeVisible();
    expect(saved).toMatchObject({
      business: "Rose Lane Salon",
      email: "qa-waiting@test.local",
      page: "/scan",
    });
  });
});
