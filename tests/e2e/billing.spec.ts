// QA 1 (30.12 item 4, session 10's script 10.2.12): the Creem TEST-MODE checkout for the QA test account, driven by Playwright with
// Creem's documented test cards: a decline first (4507 9900 0000 0028), then a purchase (4111 1111 1111 1111), then an extra
// location on the same subscription. Only the QA account's organisation is marked billing_test (seed/qa-billing-test.sql); every
// other account still reads "Plans open soon". The webhook and the plan state are read back in the session report
// (billing_events and subscriptions rows); the cancel from WhatsApp runs through the replay harness (scenario billing_cancel).
// Needs KABSI_QA_CODE_OWNER and CREEM_TEST=1 (this spends nothing, but it creates a test subscription); otherwise skipped.
import { expect, test } from "@playwright/test";
import { savedSession, signedIn } from "./helpers/auth";
import { axeClean, keep, MASKS, noBanner, settle } from "./helpers/page";

// The app-wide issues listed in docs/LATER.md (the business switcher label, the tinted badges).
const KNOWN_AXE = ["label-content-name-mismatch", "color-contrast", "aria-prohibited-attr"];

test.describe.configure({ mode: "serial" });

test.describe("Creem test checkout (QA owner)", () => {
  test.skip(
    () => !savedSession("owner") || process.env["CREEM_TEST"] !== "1",
    "needs KABSI_QA_CODE_OWNER and CREEM_TEST=1",
  );
  test.beforeEach(async ({ page, context }) => {
    await noBanner(page);
    await signedIn(context, "owner");
  });

  test("the Plan page offers the paid buttons only to the test account", async ({ page }) => {
    await page.goto("/app/plan");
    await settle(page);
    await expect(page.getByRole("heading", { name: "Your plan" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Choose Pro/ })).toBeEnabled();
    await expect(page.getByText("Plans open soon")).toHaveCount(0);
    await axeClean(page, "/app/plan (before paying)", KNOWN_AXE);
    await page.clock.setFixedTime(new Date("2026-10-25T09:00:00Z"));
    await expect(page).toHaveScreenshot("plan-before-paying.png", {
      ...(await keep(page)),
      mask: MASKS(page),
    });
  });

  /** Creem's hosted test checkout: the details step, then the card step (a payment frame holds the three card fields). */
  async function details(page: import("@playwright/test").Page) {
    await page.waitForURL(/creem\.io\/test\/checkout/, { timeout: 45_000 });
    await page.getByRole("textbox", { name: "Full name" }).fill("Kabsi QA");
    await page.getByRole("textbox", { name: "Address line 1" }).fill("1 Fiction Row");
    await page.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: "California" }).click();
    await page.getByRole("textbox", { name: "City" }).fill("Larkhaven");
    await page.getByRole("textbox", { name: "Postal Code" }).fill("94105");
    await page.getByRole("button", { name: "Continue to payment" }).click();
  }
  async function card(page: import("@playwright/test").Page, number: string) {
    // The card fields live in the payment provider's own frame; it is found by its address.
    const cardFrame = () => page.frames().find((f) => f.url().includes("card-form"));
    await expect.poll(() => !!cardFrame(), { timeout: 30_000 }).toBe(true);
    const inputs = cardFrame()!.locator("input");
    await expect(inputs).toHaveCount(3, { timeout: 30_000 });
    await inputs.nth(0).fill(number);
    await inputs.nth(1).fill("12 / 30");
    await inputs.nth(2).fill("123");
    await page.getByRole("textbox", { name: "Cardholder Name" }).fill("Kabsi QA");
    await page.getByRole("button", { name: /^Pay \$/ }).click();
  }

  test("a declined card does not start a plan, a good card does", async ({ page }) => {
    await page.goto("/app/plan");
    // The QA account holds one test subscription at a time: once it is paid this test has nothing to buy.
    const buy = page.getByRole("button", { name: /^Choose Pro/ });
    await expect(buy.or(page.getByRole("button", { name: "Add a location" }))).toBeVisible();
    test.skip(!(await buy.isVisible()), "the QA account already has its test subscription");
    await page.getByRole("button", { name: /^Choose Pro/ }).click();
    await details(page);
    await card(page, "4507990000000028");
    // The decline is shown on the checkout and nothing is charged; the same checkout then takes the good card.
    await expect(
      page.getByText("Payment declined. Please try another card or payment method."),
    ).toBeVisible({ timeout: 45_000 });
    await expect(page).not.toHaveURL(/kabsi\.co\/billing\/done/);
    // After a decline the payment frame starts again with empty fields: give it a moment.
    await page.waitForTimeout(3000);
    await card(page, "4111111111111111");
    await page.waitForURL(/kabsi\.co\/billing\/done/, { timeout: 90_000 });
    await settle(page);
    await page.clock.setFixedTime(new Date("2026-10-25T09:00:00Z"));
    await expect(page).toHaveScreenshot("billing-done-after-payment.png", {
      ...(await keep(page)),
      mask: MASKS(page),
    });
  });

  test("the plan reads Pro once the webhook has run", async ({ page }) => {
    await page.goto("/app/plan");
    // The webhook queues a job; the page shows the paid plan within a minute or two.
    await expect(async () => {
      await page.reload();
      await expect(page.getByText(/Kabsi Pro/).first()).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 150_000, intervals: [5_000] });
    await settle(page);
    await axeClean(page, "/app/plan (paid)", KNOWN_AXE);
  });

  // Creem answers the "add a location" call with 400 subscription_item_add_unsupported ("Adding new items to a subscription is not
  // supported", 25 Oct 2026): one subscription cannot carry the plan and the extra-location item. The master plan's fallback
  // (10.2.3) is a second subscription for the extra locations on the same customer, which is not built yet (docs/LATER.md). This
  // test states the wanted behaviour and is expected to fail until then; when it passes, Playwright reports it and the annotation goes.
  test("an extra location joins the plan", async ({ page }) => {
    test.fail(
      true,
      "Creem refuses to add an item to a subscription (subscription_item_add_unsupported)",
    );
    await page.goto("/app/plan");
    const add = page.getByRole("button", { name: "Add a location" });
    // After the cancel from WhatsApp the plan is set to end and the page offers "Keep my plan" instead.
    await expect(add.or(page.getByRole("button", { name: "Keep my plan" }))).toBeVisible();
    test.skip(!(await add.isVisible()), "the plan is already set to end");
    await add.click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByText("Something went wrong with the payment service.")).toHaveCount(0, {
      timeout: 20_000,
    });
    await expect(page.getByText(/1 extra location/i)).toBeVisible({ timeout: 20_000 });
  });
});
