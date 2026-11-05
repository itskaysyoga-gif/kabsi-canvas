// App 4 part C (master plan 30.31 item 3): the log in page, each case with the auth calls mocked (helpers/fake-auth.ts).
// Turnstile is replaced by a script that passes at once and the auth-code call (which would send mail) answers here, so
// nothing is sent. The real email code sign-in is checked once on production with the QA account (login.spec.ts).
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { noBanner } from "./helpers/page";
import { fakeSession, mockSupabase, signInFake, SUPABASE } from "./helpers/fake-auth";

const LOCATION = { id: "00000000-0000-4000-8000-00000000b001", name: "QA Salon", status: "active" };

async function stubTurnstile(page: Page) {
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: "window.turnstile={render:function(el,o){setTimeout(function(){o.callback('qa-pass')},50);return 'qa'},reset:function(){},remove:function(){}};",
    }),
  );
}

/** Signed out, with Supabase mocked: the code request answers 200 and the code check answers `verify`. */
async function signedOutPage(
  page: Page,
  opts: { verify?: { status: number; json: unknown }; locations?: unknown[] } = {},
) {
  await noBanner(page);
  await stubTurnstile(page);
  await mockSupabase(page, { rest: { "/locations": opts.locations ?? [LOCATION] } });
  await page.route(`${SUPABASE}/functions/v1/auth-code`, (route) =>
    route.fulfill({ status: 200, json: {} }),
  );
  await page.route(`${SUPABASE}/auth/v1/verify*`, (route) =>
    route.fulfill(opts.verify ?? { status: 200, json: fakeSession() }),
  );
}

async function toCode(page: Page, email = "qa-app4@test.local") {
  await page.getByRole("button", { name: "Continue with email" }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Send me a code" }).click();
  await expect(page.getByText("Enter the 6-digit code we sent to")).toBeVisible();
}

test.describe("the log in page", () => {
  test("1. signed in already: straight to the dashboard, the sheet never shows", async ({
    page,
  }) => {
    await noBanner(page);
    await signInFake(page, { rest: { "/locations": [LOCATION] } });
    await page.goto("/login");
    await page.waitForURL(/\/app$/);
    await page.goto("/login?next=%2Fapp%2Freviews");
    await page.waitForURL(/\/app\/reviews$/);
  });

  test("1. signed in, no business yet: straight to setup", async ({ page }) => {
    await noBanner(page);
    await signInFake(page, { rest: { "/locations": [] } });
    await page.goto("/login");
    await page.waitForURL(/\/start/);
  });

  test("2. Google cancelled: a plain line and the email field ready", async ({ page }) => {
    await signedOutPage(page);
    await page.goto("/login?error=access_denied&error_description=The+user+denied");
    await expect(
      page.getByRole("status").filter({ hasText: "Google sign-in did not finish." }),
    ).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  });

  test("3. in an in-app browser the email code comes first, Google below with a copy link", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.36.88",
      viewport: { width: 390, height: 844 },
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const page = await context.newPage();
    await signedOutPage(page);
    await page.goto("/login");
    const email = page.getByLabel("Email", { exact: true });
    await expect(email).toBeVisible();
    await expect(email).toBeFocused();
    await expect(
      page.getByText(
        "Google sign-in does not work inside this app. Open kabsi.co in your browser to use it.",
      ),
    ).toBeVisible();
    const google = page.getByRole("button", { name: "Continue with Google" });
    expect((await google.boundingBox())!.y).toBeGreaterThan((await email.boundingBox())!.y);
    await page.getByRole("button", { name: "Copy the link" }).click();
    await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
    await context.close();
  });

  test("4. the email field, the typo hint, the code field, the countdown and the spam line", async ({
    page,
  }) => {
    await signedOutPage(page);
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeFocused();
    await page.getByRole("button", { name: "Continue with email" }).click();
    const email = page.getByLabel("Email", { exact: true });
    await expect(email).toBeFocused();
    await expect(email).toHaveAttribute("type", "email");
    await expect(email).toHaveAttribute("autocomplete", "email");
    await email.fill("rana@gmial.com");
    await expect(page.getByText("Did you mean rana@gmail.com?")).toBeVisible();
    await page.getByRole("button", { name: "Use it" }).click();
    await expect(email).toHaveValue("rana@gmail.com");
    await page.getByRole("button", { name: "Send me a code" }).click();
    await expect(page.getByText("Enter the 6-digit code we sent to")).toBeVisible();
    await expect(page.locator('input[autocomplete="one-time-code"]')).toHaveCount(1);
    await expect(page.getByText(/You can ask for a new code in \d+ seconds\./)).toBeVisible();
    await expect(page.getByText("Check your spam folder.", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Use a different email" }).click();
    await expect(email).toBeVisible();
  });

  test("4. paste the whole code: it submits by itself and lands in the dashboard", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await signedOutPage(page);
    await page.goto("/login");
    await toCode(page);
    await page.evaluate(() => navigator.clipboard.writeText("123456"));
    await page.locator('input[autocomplete="one-time-code"]').focus();
    await page.keyboard.press("ControlOrMeta+V");
    await page.waitForURL(/\/app$/);
  });

  test("4. a wrong code, too many tries, offline and Kabsi unreachable, in plain words", async ({
    page,
    context,
  }) => {
    await signedOutPage(page, {
      verify: {
        status: 403,
        json: { code: "otp_expired", msg: "Token has expired or is invalid" },
      },
    });
    await page.goto("/login");
    await toCode(page);
    const field = page.locator('input[autocomplete="one-time-code"]');
    await field.pressSequentially("000000");
    await expect(page.getByRole("alert")).toHaveText(
      "That code did not work. Check it, or send a new one.",
    );
    await page.unroute(`${SUPABASE}/auth/v1/verify*`);
    await page.route(`${SUPABASE}/auth/v1/verify*`, (route) =>
      route.fulfill({
        status: 429,
        json: {
          code: "over_request_rate_limit",
          msg: "For security purposes, you can only request this after 42 seconds.",
        },
      }),
    );
    await field.pressSequentially("111111");
    await expect(page.getByRole("alert")).toHaveText("Wait 42 seconds, then try again.");
    await page.unroute(`${SUPABASE}/auth/v1/verify*`);
    await page.route(`${SUPABASE}/auth/v1/verify*`, (route) => route.abort("connectionrefused"));
    await field.pressSequentially("222222");
    await expect(page.getByRole("alert")).toHaveText(
      "Kabsi can't be reached right now. Try again in a minute.",
    );
    await context.setOffline(true);
    await field.pressSequentially("333333");
    await expect(page.getByRole("alert")).toHaveText(
      "You are offline. Check your connection, then try again.",
    );
    await context.setOffline(false);
  });

  test("4. the code request's own limit is shown as Kabsi says it", async ({ page }) => {
    await signedOutPage(page);
    await page.route(`${SUPABASE}/functions/v1/auth-code`, (route) =>
      route.fulfill({
        status: 429,
        json: {
          error: "rate_limited",
          message: "Please wait a minute before asking for another code.",
        },
      }),
    );
    await page.goto("/login");
    await page.getByRole("button", { name: "Continue with email" }).click();
    await page.getByLabel("Email", { exact: true }).fill("qa-app4@test.local");
    await page.getByRole("button", { name: "Send me a code" }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "Please wait a minute before asking for another code.",
    );
  });

  test("5. a new account goes to setup", async ({ page }) => {
    await signedOutPage(page, { locations: [] });
    await page.goto("/login");
    await toCode(page);
    await page.locator('input[autocomplete="one-time-code"]').pressSequentially("123456");
    await page.waitForURL(/\/start/);
  });

  test("6. a signed-out visit to a dashboard page comes back to it after log in", async ({
    page,
  }) => {
    await signedOutPage(page);
    await page.goto("/app/reviews");
    await page.waitForURL(/\/login\?next=%2Fapp%2Freviews/);
    await toCode(page);
    await page.locator('input[autocomplete="one-time-code"]').pressSequentially("123456");
    await page.waitForURL(/\/app\/reviews$/);
  });

  test("6. a next that points at another site is ignored", async ({ page }) => {
    await signedOutPage(page);
    await page.goto("/login?next=%2F%2Fevil.example%2Fx");
    await toCode(page);
    await page.locator('input[autocomplete="one-time-code"]').pressSequentially("123456");
    await page.waitForURL(/\/app$/);
    expect(new URL(page.url()).host).not.toContain("evil");
  });

  test("8. a session that is not staff sees the not-found page on /staff", async ({ page }) => {
    await noBanner(page);
    await signInFake(page, { staff: false });
    await page.goto("/staff");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page is not here.");
  });

  test("9. no sideways scroll at 360 px, the sheet uncovered, no serious axe finding", async ({
    page,
  }) => {
    await signedOutPage(page);
    const w = page.viewportSize()!.width;
    if (w < 768) await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
    const sheet = page.getByRole("heading", { name: "Log in to Kabsi" });
    const box = (await sheet.boundingBox())!;
    const top = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.closest("h1")?.textContent ?? "",
      [box.x + 10, box.y + 5],
    );
    expect(top).toBe("Log in to Kabsi");
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const bad = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => v.id)).toEqual([]);
    await page.getByRole("button", { name: "Continue with email" }).click();
    const axe2 = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(
      axe2.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => v.id),
    ).toEqual([]);
    // The quiet panel shows beside the sheet from 1024 px only.
    const panel = page.getByRole("complementary", { name: "Why owners trust Kabsi" });
    if (w >= 1024) await expect(panel).toBeVisible();
    else await expect(panel).toBeHidden();
  });
});
