// QA 1 (30.12 item 2): sign-up and every onboarding step for the QA owner (a new account, delivered+kabsi-qa@resend.dev, no inbox).
// The business is a fictional place: the Google Places search is the one thing stood in for (nothing real is looked up and the
// 20-a-day Places cap is not touched), and the business has no Google access, so it stays in Kabsi's own state. The
// screens are the real ones. Run tests/e2e/seed/qa-owner-reset.sql first (it puts the account back to "no business yet").
// Needs KABSI_QA_CODE_OWNER; without it the tests are skipped.
import { expect, test } from "@playwright/test";
import { savedSession, signedIn } from "./helpers/auth";
import { axeClean, keep, MASKS, noBanner, settle } from "./helpers/page";

const PLACE = {
  place_id: "qa-place-kabsi-qa-cafe",
  name: "Kabsi QA Cafe",
  address: "1 Fiction Row, Larkhaven, USA",
  country: "US",
};

test.describe.configure({ mode: "serial" });

test.describe("sign up and onboarding (QA owner)", () => {
  test.skip(() => !savedSession("owner"), "no KABSI_QA_CODE_OWNER for this run");
  test.beforeEach(async ({ page, context }) => {
    await noBanner(page);
    await signedIn(context, "owner");
    await page.route("**/functions/v1/places-search", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ places: [PLACE] }),
      }),
    );
    await page.clock.setFixedTime(new Date("2026-10-25T09:00:00Z"));
  });

  async function shot(page: import("@playwright/test").Page, name: string) {
    await settle(page);
    await axeClean(page, name);
    await expect(page).toHaveScreenshot(`${name}.png`, {
      ...(await keep(page)),
      mask: MASKS(page),
    });
  }

  test("1. find the business", async ({ page }) => {
    await page.goto("/start?new=1");
    await expect(page.getByRole("heading", { name: "Find your business" })).toBeVisible();
    await shot(page, "onboarding-1-find");
    await page.getByLabel("Business name and area").fill("Kabsi QA Cafe Larkhaven");
    await page.getByRole("button", { name: "Search" }).click();
    await page.getByRole("button", { name: /Kabsi QA Cafe/ }).click();
    await page.getByRole("radio", { name: /Yes, I manage it and it's verified/ }).click();
    await page.getByRole("button", { name: "Yes, this is Kabsi QA Cafe" }).click();
    await expect(page.getByRole("heading", { name: "Add Kabsi as a Manager" })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("2. add Kabsi as a Manager", async ({ page }) => {
    await page.goto("/start");
    await expect(page.getByRole("heading", { name: "Add Kabsi as a Manager" })).toBeVisible();
    await page.getByRole("checkbox").first().click();
    await expect(page.getByRole("button", { name: "I've sent the invitation" })).toBeEnabled({
      timeout: 15_000,
    });
    await shot(page, "onboarding-2-manager");
    await page.getByRole("button", { name: "I've sent the invitation" }).click();
    await expect(page.getByRole("heading", { name: "Five quick questions" })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("3. five quick questions", async ({ page }) => {
    await page.goto("/start");
    await expect(page.getByRole("heading", { name: "Five quick questions" })).toBeVisible();
    await shot(page, "onboarding-3-questions");
    await page
      .getByRole("button", { name: /Warm/ })
      .first()
      .click()
      .catch(() => {});
    await page.getByRole("button", { name: /^(Save and continue|Continue)$/ }).click();
    await expect(page.getByRole("heading", { name: "Waiting for your invitation" })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("4. waiting for the invitation, then Home", async ({ page }) => {
    await page.goto("/start");
    await expect(page.getByRole("heading", { name: "Waiting for your invitation" })).toBeVisible();
    await shot(page, "onboarding-4-waiting");
    await page.getByRole("button", { name: "Go to Home" }).click();
    await page.waitForURL(/\/app/, { timeout: 20_000 });
  });
});
