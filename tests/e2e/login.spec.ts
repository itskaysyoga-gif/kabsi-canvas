// QA 1 (30.12 item 2): log in with the real sign-in sheet, the email code path. Cloudflare Turnstile and the email send are the
// only two things stood in for: the Turnstile script is replaced by one that passes at once, and the `auth-code` call (which would
// send mail) answers 200. The code itself is the admin-made one (tests/e2e/seed/qa-login-code.sql) and goes through Supabase
// Auth's real verify. Needs KABSI_QA_CODE_UI, a fresh code for qa-demo@test.local; without it the test is skipped.
import { expect, test } from "@playwright/test";
import { noBanner, settle } from "./helpers/page";

test.describe("log in", () => {
  test.skip(() => !process.env["KABSI_QA_CODE_UI"], "no KABSI_QA_CODE_UI for this run");

  test("email code: the sheet asks for the code and lands in the app", async ({ page }) => {
    await noBanner(page);
    await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js*", (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body: "window.turnstile={render:function(el,o){setTimeout(function(){o.callback('qa-pass')},50);return 'qa'},reset:function(){},remove:function(){}};",
      }),
    );
    await page.route("**/functions/v1/auth-code", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
    );
    await page.goto("/login");
    await settle(page);
    await page.getByRole("button", { name: "Continue with email" }).click();
    await page.getByLabel("Email", { exact: true }).fill("qa-demo@test.local");
    await page.getByRole("button", { name: "Send me a code" }).click();
    await expect(page.getByText("Enter the 6-digit code we sent to")).toBeVisible();
    await page
      .getByLabel("6-digit one-time code")
      .first()
      .pressSequentially(process.env["KABSI_QA_CODE_UI"] ?? "");
    await page.waitForURL(/\/app|\/start/, { timeout: 30_000 });
    expect(new URL(page.url()).pathname.startsWith("/app")).toBe(true);
  });

  test("a wrong code is refused in plain words", async ({ page }) => {
    await noBanner(page);
    await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js*", (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body: "window.turnstile={render:function(el,o){setTimeout(function(){o.callback('qa-pass')},50);return 'qa'},reset:function(){},remove:function(){}};",
      }),
    );
    await page.route("**/functions/v1/auth-code", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
    );
    await page.goto("/login");
    await page.getByRole("button", { name: "Continue with email" }).click();
    await page.getByLabel("Email", { exact: true }).fill("qa-demo@test.local");
    await page.getByRole("button", { name: "Send me a code" }).click();
    await page.getByLabel("6-digit one-time code").first().pressSequentially("000000");
    await expect(
      page.getByText("That code did not work. Check it, or send a new one."),
    ).toBeVisible();
  });
});
