// App 4 part B (master plan 30.31 item 2): how long a sign-in lasts, in the browser. The last visit is written into
// storage before the page loads; Supabase is mocked (helpers/fake-auth.ts). The rules themselves are unit-tested with a
// fake clock in tests/app4-sign-in-time.test.ts.
import { expect, test } from "@playwright/test";
import { noBanner } from "./helpers/page";
import { signInFake, STORAGE_KEY } from "./helpers/fake-auth";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const seenAgo = (ms: number) => ({ "kabsi:last-seen": String(Date.now() - ms) });

test.describe("how long a sign-in lasts", () => {
  test("an owner away 31 days is signed out and told why", async ({ page }) => {
    await noBanner(page);
    await signInFake(page, { storage: seenAgo(31 * DAY) });
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByText("You were signed out after 30 days away. Log in again."),
    ).toBeVisible();
    expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)).toBeNull();
  });

  test("an owner away 29 days stays signed in", async ({ page }) => {
    await noBanner(page);
    await signInFake(page, { storage: seenAgo(29 * DAY) });
    await page.goto("/app");
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/app/);
    const seen = Number(await page.evaluate(() => localStorage.getItem("kabsi:last-seen")));
    expect(Date.now() - seen).toBeLessThan(60_000);
  });

  test("staff away 13 hours are signed out of the staff page", async ({ page }) => {
    await noBanner(page);
    await signInFake(page, { staff: true, storage: seenAgo(13 * HOUR) });
    await page.goto("/staff");
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByText("You were signed out after 12 hours away. Log in again."),
    ).toBeVisible();
  });

  test("an owner away 13 hours stays signed in", async ({ page }) => {
    await noBanner(page);
    await signInFake(page, { storage: seenAgo(13 * HOUR) });
    await page.goto("/app");
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/app/);
  });

  test("Settings: Sign out on every device asks first, then signs out everywhere", async ({
    page,
  }) => {
    await noBanner(page);
    await signInFake(page);
    let scope = "";
    await page.route("**/auth/v1/logout*", (route) => {
      scope = new URL(route.request().url()).searchParams.get("scope") ?? "";
      return route.fulfill({ status: 204, body: "" });
    });
    await page.goto("/app/settings");
    await page.getByRole("button", { name: "Sign out on every device" }).click();
    await expect(page.getByRole("alertdialog")).toContainText("Sign out on every device?");
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Sign out on every device" })
      .click();
    await expect(page).toHaveURL(/\/$/);
    expect(scope).toBe("global");
    await expect(page.getByRole("status").filter({ hasText: "You are signed out." })).toBeVisible();
  });

  test("staff away 13 hours who open Home first are still signed out of the staff page", async ({
    page,
  }) => {
    await noBanner(page);
    await signInFake(page, {
      staff: true,
      storage: {
        "kabsi:last-seen": String(Date.now() - 1000),
        "kabsi:last-seen-staff": String(Date.now() - 13 * HOUR),
      },
    });
    await page.goto("/");
    await page.waitForTimeout(1000);
    await page.goto("/staff");
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByText("You were signed out after 12 hours away. Log in again."),
    ).toBeVisible();
  });

  test("time away found on a website page opens the log in page", async ({ page }) => {
    await noBanner(page);
    await signInFake(page, { storage: seenAgo(31 * DAY) });
    await page.goto("/pricing");
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByText("You were signed out after 30 days away. Log in again."),
    ).toBeVisible();
  });
});
