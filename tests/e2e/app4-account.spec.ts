// App 4 part A (master plan 30.31 item 1): moving between the website and the dashboard. Every Supabase call is mocked
// (helpers/fake-auth.ts), so these run against any deployment without an account.
import { expect, test } from "@playwright/test";
import { noBanner } from "./helpers/page";
import { signInFake } from "./helpers/fake-auth";

const wide = (w: number) => w >= 1024;

test.describe("website and dashboard", () => {
  test("signed out: the header says Log in, and it goes to /login", async ({ page }) => {
    await noBanner(page);
    await page.goto("/");
    const w = page.viewportSize()!.width;
    if (!wide(w)) await page.getByRole("button", { name: "Open menu" }).click();
    const link = page.getByRole("link", { name: "Log in", exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/login");
    await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
  });

  test("signed in: the header says Dashboard in the same space, and it goes to /app", async ({
    page,
  }) => {
    await noBanner(page);
    await signInFake(page);
    await page.goto("/pricing");
    const w = page.viewportSize()!.width;
    if (!wide(w)) await page.getByRole("button", { name: "Open menu" }).click();
    const link = page.getByRole("link", { name: "Dashboard", exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/app");
    await expect(page.getByRole("link", { name: "Log in", exact: true })).toHaveCount(0);
    // Pricing's Start free opens the dashboard for someone signed in.
    if (!wide(w)) await page.getByRole("button", { name: "Close menu" }).click();
    const starts = page.getByRole("link", { name: "Start free" });
    await expect(starts.first()).toHaveAttribute("href", "/app");
  });

  test("staff: Dashboard goes to /staff", async ({ page }) => {
    await noBanner(page);
    await signInFake(page, { staff: true });
    await page.goto("/");
    const w = page.viewportSize()!.width;
    if (!wide(w)) await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toHaveAttribute(
      "href",
      "/staff",
    );
  });

  test("the header does not move when the browser finds the session", async ({ page }) => {
    test.skip(
      !wide(page.viewportSize()!.width),
      "the account link shows in the header from 1024 px",
    );
    await noBanner(page);
    await page.goto("/");
    const out = await page.getByRole("link", { name: "Log in", exact: true }).boundingBox();
    await signInFake(page);
    await page.goto("/");
    const inn = await page.getByRole("link", { name: "Dashboard", exact: true }).boundingBox();
    expect(Math.round(inn!.x)).toBe(Math.round(out!.x));
    expect(Math.round(inn!.width)).toBe(Math.round(out!.width));
  });

  test("the dashboard logo goes to the website's Home", async ({ page }) => {
    await noBanner(page);
    await signInFake(page);
    await page.goto("/app");
    const logo = page.getByRole("link", { name: "Kabsi website" }).locator("visible=true");
    await expect(logo).toHaveCount(1);
    await expect(logo).toHaveAttribute("href", "/");
    await logo.click();
    await expect(page).toHaveURL(/\/$/);
    const w = page.viewportSize()!.width;
    if (!wide(w)) await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
  });

  test("Log out goes to Home with 'You are signed out.', and the header says Log in at once", async ({
    page,
  }) => {
    await noBanner(page);
    await signInFake(page);
    await page.goto("/app");
    const w = page.viewportSize()!.width;
    if (wide(w)) await page.getByRole("button", { name: "Log out" }).first().click();
    else {
      await page.getByRole("button", { name: "Your account and help" }).click();
      await page.getByRole("menuitem", { name: "Log out" }).click();
    }
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("status").filter({ hasText: "You are signed out." })).toBeVisible();
    if (!wide(w)) await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("link", { name: "Log in", exact: true })).toBeVisible();
  });

  test("signing out in one tab signs out the other", async ({ context, page }) => {
    await noBanner(page);
    await signInFake(page);
    await page.goto("/app");
    const other = await context.newPage();
    await other.goto("/app");
    await expect(
      other.getByRole("link", { name: "Kabsi website" }).locator("visible=true"),
    ).toBeVisible();
    // Tab one logs out.
    const w = page.viewportSize()!.width;
    if (wide(w)) await page.getByRole("button", { name: "Log out" }).first().click();
    else {
      await page.getByRole("button", { name: "Your account and help" }).click();
      await page.getByRole("menuitem", { name: "Log out" }).click();
    }
    await expect(page).toHaveURL(/\/$/);
    // Tab two follows: signed-out Home, with the line.
    await expect(other).toHaveURL(/\/$/, { timeout: 15_000 });
    await expect(
      other.getByRole("status").filter({ hasText: "You are signed out." }),
    ).toBeVisible();
  });

  test("the session-ended screen still leads to the log in page, with no Log out line", async ({
    page,
  }) => {
    await noBanner(page);
    await signInFake(page);
    await page.route("**/rest/v1/locations*", (route) =>
      route.fulfill({ status: 401, json: { message: "JWT expired" } }),
    );
    await page.goto("/app");
    await expect(page.getByRole("alertdialog")).toContainText("Your session ended. Sign in again.");
    await page.getByRole("button", { name: "Sign in again" }).click();
    await expect(page).toHaveURL(/\/login\?next=%2Fapp/);
    await expect(page.getByText("You are signed out.")).toHaveCount(0);
    // App 4 part C (case 7): the log in page says why.
    await expect(page.getByText("Your session ended. Log in again.")).toBeVisible();
  });

  test("an unfinished Google sign-in does not show Dashboard", async ({ page }) => {
    await noBanner(page);
    await page.addInitScript(() => {
      try {
        localStorage.setItem("sb-ynjdqjlmdwjgbfezevxy-auth-token-code-verifier", '"qa"');
      } catch {
        /* blocked */
      }
    });
    await page.goto("/");
    if (page.viewportSize()!.width < 1024)
      await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("link", { name: "Log in", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toHaveCount(0);
  });
});
