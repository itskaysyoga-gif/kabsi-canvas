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
      // App 2 (1 Nov 2026): a visual baseline only for Home and Reviews; every other screen is checked by axe and the
      // journeys below, so a copy change does not need a new picture.
      if (name === "home" || name === "reviews")
        await expect(page).toHaveScreenshot(`${name}.png`, {
          ...(await keep(page)),
          mask: MASKS(page),
        });
    });
  }
});

// App 2 (master plan 30.22 item 5): five places on a computer and the same five in the phone's bottom bar, no More, and
// every older address opens its screen inside the right place.
const PLACES = ["Home", "Reviews", "Posts and photos", "Google profile", "Settings"];
const SHORT = ["Home", "Reviews", "Posts", "Profile", "Settings"];
const OLD: [string, string, string][] = [
  ["/app/inbox", "Reviews", "Reviews"],
  ["/app/cards", "Reviews", "Get reviews"],
  ["/app/insights", "Google profile", "Where you show up"],
  ["/app/coach", "Google profile", "Profile Coach"],
  ["/app/report", "Settings", "Reports"],
  ["/app/knowledge", "Settings", "Business knowledge"],
  ["/app/plan", "Settings", "Plan"],
];

test.describe("app menu (QA demo owner)", () => {
  test.skip(() => !savedSession("demo"), "no KABSI_QA_CODE_DEMO for this run");
  test.beforeEach(async ({ page, context }) => {
    await noBanner(page);
    await signedIn(context, "demo");
  });

  test("five places, no More", async ({ page }, info) => {
    await page.goto("/app");
    const nav = page
      .getByRole("navigation", { name: "Your Kabsi account" })
      .locator("visible=true");
    await expect(nav.getByRole("link")).toHaveCount(5);
    const names = info.project.name === "m390" ? SHORT : PLACES;
    for (const name of names)
      await expect(nav.getByRole("link", { name: new RegExp(name) })).toBeVisible();
    await expect(page.getByRole("button", { name: "More" })).toHaveCount(0);
  });

  for (const [path, place, tab] of OLD) {
    test(`${path} opens ${tab} in ${place}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("h1").first()).toBeVisible();
      const tabs = page.getByRole("navigation", { name: "Pages in this section" });
      if (path !== "/app/inbox")
        await expect(tabs.getByRole("link", { name: tab, exact: true })).toHaveAttribute(
          "aria-current",
          "page",
        );
      await axeClean(page, path, KNOWN_AXE);
    });
  }
});
