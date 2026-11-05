// QA 1 (30.12 item 2, 30.7 item 7): every public page against production, at 390 and 1440 px (the two projects of
// playwright.config.ts). Each page must load, show one h1, have no sideways scroll and no serious or critical axe issue.
// Lean 1 (1 Nov 2026): only five pages keep a picture (PICTURE below), compared with the approved baseline in
// tests/e2e/baseline; the baselines of the other pages made the repository 52 MB heavy and were removed. A change that
// nobody explained to one of the five fails the run.
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { axeClean, keep, MASKS, noBanner, settle } from "./helpers/page";
import { mockFreeCheck } from "./helpers/scan2-mock";

// Guides 3: the sitemap is a server route, and the guides it holds on the day are visited by "every guide in the sitemap"
// below. Its fixed pages are in src/content/sitemap-pages.json since Guides 4 part C (Industries 2: this suite read the old
// list in src/lib/sitemap.ts, which became empty, so it had visited only the four pages below).
const fromSitemap = (
  JSON.parse(readFileSync("src/content/sitemap-pages.json", "utf8")) as { path: string }[]
).map((p) => p.path);
// The sitemap holds what search engines may index; the app's own public doors are listed here.
const OTHERS = ["/", "/login", "/get-started", "/billing/done"];
const ROUTES = [...new Set([...OTHERS, ...fromSitemap])].filter(Boolean);

// Issues found by this suite that cannot be fixed in QA 1 (docs/LATER.md lists each). A rule listed here is not failed for that page only;
// every other serious or critical rule still is. Remove the entry when the page is fixed.
// Web 2 (27 Oct 2026) rebuilt the home page; its green tint is gone, so the list is empty.
const KNOWN_AXE: Record<string, string[]> = {};

// Home, Pricing, the free check (its result with the example business), Founding 25 and one industry page.
const PICTURE = new Set(["/", "/pricing", "/scan", "/founding", "/for/hair-salon"]);

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
      if (PICTURE.has(route)) {
        const name = (route === "/" ? "home" : route.slice(1).replaceAll("/", "-")) + ".png";
        await expect(page).toHaveScreenshot(name, { ...(await keep(page)), mask: MASKS(page) });
      }
      void info;
    });
  }

  test("every guide in the sitemap: one h1, no sideways scroll, no serious axe issue", async ({
    page,
    request,
  }) => {
    test.setTimeout(600_000);
    const xml = await (await request.get("/sitemap.xml")).text();
    const guides = [...xml.matchAll(/<loc>https:\/\/kabsi\.co(\/guides\/[^<]+)<\/loc>/g)].map(
      (m) => m[1]!,
    );
    expect(guides.length, "guides in the sitemap").toBeGreaterThan(0);
    for (const route of guides) {
      const res = await page.goto(route);
      expect(res?.status(), `${route} status`).toBe(200);
      await settle(page);
      await expect(page.locator("h1"), route).toHaveCount(1);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${route} horizontal scroll`).toBeLessThanOrEqual(0);
      await axeClean(page, route, []);
    }
  });

  test("an unknown address shows the Kabsi 404 page, not a blank screen", async ({ page }) => {
    await noBanner(page);
    const res = await page.goto("/this-page-does-not-exist");
    expect(res?.status()).toBe(404);
    await settle(page);
    await expect(page.locator("h1").first()).toBeVisible();
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
    // Check 2 (1 Nov 2026): Kabsi never picks for the visitor, so one match is confirmed first.
    await page.getByRole("button", { name: "This is my business" }).click({ timeout: 30_000 });
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

  // Scan 2 (master plan 30.29): the town goes to the check, the question and date show, at your address is in the open
  // before the card, "How to read it" is under the card, no Arabic, and the report carries the check's code.
  test("the free check result shows the question, at your address and the card with How to read it under it (Scan 2)", async ({
    page,
  }) => {
    await noBanner(page);
    const sent = await mockFreeCheck(page);
    await page.goto("/scan?q=SEVEN%20Burgers");
    await page.getByRole("button", { name: "This is my business" }).click({ timeout: 30_000 });
    await expect(
      page.getByText("We asked ChatGPT: 'best fast food restaurant in Boqaata, Lebanon'"),
    ).toBeVisible({ timeout: 30_000 });
    expect(sent.check?.["city"]).toBe("Boqaata");
    await expect(page.getByText("No sources cited.")).toBeVisible();
    await expect(
      page.getByText(/^Asked on 5 November 2026 through OpenAI's API, with web search\./),
    ).toBeVisible();
    await expect(page.getByText("1 to look at, 5 shown on Google")).toBeVisible();
    const at = page.getByRole("heading", { name: "At your address on Google Maps" });
    await expect(at).toBeVisible();
    await expect(page.getByText("West Diner").first()).toBeVisible();
    // Copy 3 (master plan 30.30 item 2): the count line says where the business usually comes up.
    await expect(page.getByText(/Most places put you \d+(st|nd|rd|th)\./)).toBeVisible();
    const how = page.getByRole("heading", { name: "How to read it" });
    const card = page.getByText("Another business came first.");
    const [a, c, h] = await Promise.all([at.boundingBox(), card.boundingBox(), how.boundingBox()]);
    expect(a!.y).toBeLessThan(c!.y);
    expect(c!.y).toBeLessThan(h!.y);
    expect(await page.locator("main").innerText()).not.toMatch(
      /[\u0600-\u06FF]|already right|McDonald/,
    );
    await page.getByLabel("Email").last().fill("qa-report@test.local");
    await page.getByRole("button", { name: "Send me this report" }).click();
    await expect(page.getByText("Sent.")).toBeVisible();
    expect(sent.report[0]?.["code"]).toBe("SEVEN234");
  });
});
