// Sign up and onboarding for the QA owner (a new account, delivered+kabsi-qa@resend.dev, no inbox), walking today's
// /start: four stages (UX 1 and V4; src/lib/onboarding-flow.ts): 1. Your free check, 2. Sign in (find the business and
// say who looks after its Google profile), 3. Connect WhatsApp, 4. Add Kabsi on Google. Rewritten in Fix 1 (QA 2 H8):
// the old six steps (Add Kabsi as a Manager, Five quick questions, Waiting for your invitation) are gone.
//
// The business is a fictional place: the Google Places search is the one thing stood in for (nothing real is looked up
// and the 20-a-day Places cap is not touched), and the business has no Google access, so it stays in Kabsi's own state
// and stage 4 ends at "Waiting for your invite." (only Kabsi accepting a real invite moves it on). The screens are the
// real ones. Stage 1 shows only for an owner who came from a free check; this account starts at stage 2.
//
// Run by hand, never in CI: run tests/e2e/seed/qa-owner-reset.sql first (it puts the account back to "business found,
// nothing confirmed, no agreement"), then with KABSI_QA_CODE_OWNER set:
//   npx playwright test tests/e2e/onboarding.spec.ts --update-snapshots   (the first run after Fix 1 writes the baselines)
// Without the code the tests are skipped. Launch 2 (30.36 item 5): today's screens. Kabsi's WhatsApp number is set, so
// stage 3 is the Connect WhatsApp step with Open WhatsApp, and it is skipped for an owner whose WhatsApp is already
// connected (the QA owner is); the waiting state offers "Send on WhatsApp" and "Send by email" (no "Your setup link").
import { expect, test, type Page } from "@playwright/test";
import { savedSession, signedIn } from "./helpers/auth";
import { axeClean, keep, MASKS, noBanner, settle } from "./helpers/page";

const PLACE = {
  place_id: "qa-place-kabsi-qa-cafe",
  name: "Kabsi QA Cafe",
  address: "1 Fiction Row, Larkhaven, USA",
  country: "US",
};

test.describe.configure({ mode: "serial" });

test.describe("sign up and onboarding, four stages (QA owner)", () => {
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

  async function shot(page: Page, name: string) {
    await settle(page);
    // Known since QA 1 (docs/LATER.md): the Manager guide's "Previous step" button has an aria-label that does not
    // contain its visible text.
    await axeClean(page, name, ["label-content-name-mismatch"]);
    await expect(page).toHaveScreenshot(`${name}.png`, {
      ...(await keep(page)),
      mask: MASKS(page),
    });
  }
  /** The stage the strip at the top marks as now. */
  const stageNow = (page: Page) =>
    page.getByRole("navigation", { name: "Setup" }).locator('[aria-current="step"]');

  test("1. stage 2, Sign in: find the business and say who looks after it", async ({ page }) => {
    await page.goto("/start?new=1");
    await expect(page.getByRole("heading", { name: "Find your business" })).toBeVisible();
    await expect(stageNow(page)).toContainText("Sign in");
    await shot(page, "onboarding-1-find");
    await page.getByLabel("Business name and city").fill("Kabsi QA Cafe Larkhaven");
    await page.getByRole("button", { name: "Search" }).click();
    await page.getByRole("button", { name: /Kabsi QA Cafe/ }).click();
    await page.getByRole("radio", { name: "I do. I am the owner or I can add people." }).check();
    await page.getByRole("button", { name: "Yes, this is my business" }).click();
    // Next is Connect WhatsApp, or, for an owner whose WhatsApp is connected already, Add Kabsi on Google.
    await expect(
      page
        .getByRole("heading", { name: "Connect WhatsApp" })
        .or(page.getByRole("heading", { name: "Add Kabsi as a Manager on Google." })),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("2. stage 3, Connect WhatsApp: skipped when WhatsApp is connected, otherwise Open WhatsApp", async ({
    page,
  }) => {
    await page.goto("/start");
    const manager = page.getByRole("heading", { name: "Add Kabsi as a Manager on Google." });
    const whatsapp = page.getByRole("heading", { name: "Connect WhatsApp" });
    await expect(manager.or(whatsapp)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("whatsapp-coming-soon")).toHaveCount(0);
    if (await whatsapp.isVisible()) {
      await expect(stageNow(page)).toContainText("Connect WhatsApp");
      await expect(page.getByText("Open WhatsApp").first()).toBeVisible();
      await shot(page, "onboarding-2-whatsapp");
      await page.getByRole("button", { name: "Next: add Kabsi on Google" }).click();
      await expect(manager).toBeVisible({ timeout: 20_000 });
    } else {
      // Skipped: the strip moves straight to Add Kabsi on Google.
      await expect(stageNow(page)).toContainText("Add Kabsi on Google");
    }
  });

  test("3. stage 4, Add Kabsi on Google: the agreement, then waiting for the invite", async ({
    page,
  }) => {
    await page.goto("/start");
    // Stage 3 is not kept by the server; for an owner without WhatsApp, /start opens on it again. Move past it.
    const next = page.getByRole("button", { name: "Next: add Kabsi on Google" });
    if (await next.isVisible().catch(() => false)) await next.click();
    await expect(
      page.getByRole("heading", { name: "Add Kabsi as a Manager on Google." }),
    ).toBeVisible();
    await expect(stageNow(page)).toContainText("Add Kabsi on Google");
    await shot(page, "onboarding-3-manager");
    const agree = page.getByRole("checkbox").first();
    // A run that stopped half way finds the agreement already given (it cannot be taken back here).
    if (await agree.isVisible().catch(() => false)) {
      if (!(await agree.isChecked())) await agree.check();
    }
    await expect(page.getByTestId("access-pill")).toContainText("Waiting for your invite.", {
      timeout: 20_000,
    });
  });

  test("4. after the agreement: /start opens on the waiting state, with Send on WhatsApp and Send by email", async ({
    page,
  }) => {
    await page.goto("/start");
    await expect(
      page.getByRole("heading", { name: "Add Kabsi as a Manager on Google." }),
    ).toBeVisible();
    await expect(page.getByTestId("access-pill")).toContainText("Waiting for your invite.");
    await expect(page.getByText("Send on WhatsApp", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Send by email", { exact: true }).first()).toBeVisible();
    await shot(page, "onboarding-4-waiting");
  });
});
