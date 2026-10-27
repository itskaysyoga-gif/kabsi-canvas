// QA 1 (30.12 item 2, 30.7 item 7): every screen of the signed-in app for the QA demo owner (an owner of Harbour Lane Coffee,
// a demo business on mock Google, R-17), at 390 and 1440 px, with axe and the approved baseline. The browser clock is fixed so
// "3 days ago" and dates read the same every day; the data is the invented demo workspace plus the two QA rows that
// tests/e2e/seed/qa-reset.sql puts back. Needs KABSI_QA_CODE_DEMO (docs/testing.md); without it these tests are skipped.
import { expect, test } from "@playwright/test";
import { savedSession, signedIn } from "./helpers/auth";
import { axeClean, keep, MASKS, noBanner, settle } from "./helpers/page";

// UX 1 restyled every screen and the Audit 1 run (27 Oct 2026, real demo data) found no serious or critical axe issue, so nothing is
// listed as known. Add a rule here only with a docs/LATER.md row.
const KNOWN_AXE: string[] = [];

const SCREENS = [
  ["/app", "home"],
  ["/app/reviews", "reviews"],
  ["/app/posts", "posts"],
  ["/app/photos", "photos"],
  ["/app/hours", "hours"],
  ["/app/shield", "shield"],
  ["/app/report", "report"],
  ["/app/insights", "insights"],
  ["/app/knowledge", "knowledge"],
  ["/app/team", "team"],
  ["/app/settings", "settings"],
  ["/app/plan", "plan"],
  ["/app/cards", "cards"],
  ["/app/coach", "coach"],
] as const;

test.describe("app screens (QA demo owner)", () => {
  test.skip(() => !savedSession("demo"), "no KABSI_QA_CODE_DEMO for this run");
  test.beforeEach(async ({ page, context }) => {
    await noBanner(page);
    await signedIn(context, "demo");
    await page.clock.setFixedTime(new Date("2026-10-25T09:00:00Z"));
  });

  for (const [route, name] of SCREENS) {
    test(`${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator("h1, h2").first()).toBeVisible();
      await settle(page);
      expect(page.url(), "stayed signed in").toContain("/app");
      await axeClean(page, route, KNOWN_AXE);
      // The QA post is due 20 days after the reset, so the post list is masked; the rest of the screen is compared.
      const masks =
        route === "/app/posts" ? [...MASKS(page), page.locator("ol > li")] : MASKS(page);
      await expect(page).toHaveScreenshot(`${name}.png`, { ...(await keep(page)), mask: masks });
    });
  }
});
