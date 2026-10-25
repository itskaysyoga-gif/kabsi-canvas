// QA 1 (30.12 item 4, session 10's script 10.2.12): the Creem TEST-MODE checkout for the QA test account, driven by Playwright with
// Creem's documented test cards: a decline first (4507 9900 0000 0028), then a purchase (4111 1111 1111 1111), then an extra
// location on the same subscription. Only the QA account's organisation is marked billing_test (seed/qa-billing-test.sql); every
// other account still reads "Plans open soon". The webhook and the plan state are read back in the session report
// (billing_events and subscriptions rows); the cancel from WhatsApp runs through the replay harness (scenario billing_cancel).
// Needs KABSI_QA_CODE_OWNER and CREEM_TEST=1 (this spends nothing, but it creates a test subscription); otherwise skipped.
import { expect, test } from "@playwright/test";
import { savedSession, signedIn } from "./helpers/auth";
import { axeClean, keep, MASKS, noBanner, settle } from "./helpers/page";

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
    await axeClean(page, "/app/plan (before paying)");
    await page.clock.setFixedTime(new Date("2026-10-25T09:00:00Z"));
    await expect(page).toHaveScreenshot("plan-before-paying.png", {
      ...(await keep(page)),
      mask: MASKS(page),
    });
  });

  async function payOn(page: import("@playwright/test").Page, card: string) {
    // Creem's hosted checkout (test mode). The fields are found by their visible labels, in the page or in a payment frame.
    await page.waitForURL(/creem\.io/, { timeout: 45_000 });
    await page.waitForLoadState("domcontentloaded");
    const where = async (label: RegExp) => {
      for (const f of page.frames()) {
        const el = f.getByLabel(label).first();
        if (await el.count()) return el;
      }
      return page.getByLabel(label).first();
    };
    await (await where(/card number/i)).fill(card);
    await (await where(/expir|mm ?\/ ?yy/i)).fill("12 / 30");
    await (await where(/cvc|cvv|security code/i)).fill("123");
    const name = await where(/name on card|cardholder|full name/i);
    if (await name.count()) await name.fill("Kabsi QA");
    await page
      .getByRole("button", { name: /pay|subscribe|complete/i })
      .first()
      .click();
  }

  test("a declined card does not start a plan, a good card does", async ({ page }) => {
    await page.goto("/app/plan");
    await page.getByRole("button", { name: /^Choose Pro/ }).click();
    await payOn(page, "4507 9900 0000 0028");
    await expect(page.getByText(/declin|could not|failed|try another/i).first()).toBeVisible({
      timeout: 30_000,
    });
    for (const f of page.frames())
      await f
        .getByLabel(/card number/i)
        .first()
        .fill("")
        .catch(() => {});
    await payOn(page, "4111 1111 1111 1111").catch(async () => {
      // The decline may leave the same form open; fill again in place.
    });
    await page.waitForURL(/kabsi\.co\/billing\/done/, { timeout: 60_000 });
    await settle(page);
    await expect(page).toHaveScreenshot("billing-done-after-payment.png", {
      ...(await keep(page)),
      mask: MASKS(page),
    });
  });

  test("the plan reads Pro once the webhook has run, and an extra location joins the same subscription", async ({
    page,
  }) => {
    await page.goto("/app/plan");
    // The webhook queues a job; the page shows the paid plan within a minute or two.
    await expect(async () => {
      await page.reload();
      await expect(page.getByText(/Kabsi Pro/).first()).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 150_000, intervals: [5_000] });
    await page.getByRole("button", { name: "Add a location" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByText(/extra location/i).first()).toBeVisible({ timeout: 45_000 });
    await settle(page);
    await axeClean(page, "/app/plan (paid)");
  });
});
