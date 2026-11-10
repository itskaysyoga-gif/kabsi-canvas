// Onboarding 1 (R-145, master plan 30.48): the two optional questions in signed-in onboarding, in About your business, and
// the staff counts. A made-up session (helpers/fake-auth.ts): every Supabase call is answered here, nothing reaches Supabase.
// Run against a local build or a preview:
//   KABSI_BASE_URL=http://localhost:4173 npx playwright test tests/e2e/onboarding1-questions.spec.ts
// Both projects (390 and 1440 px) run every test; the 390 px run is the one that matters first.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { noBanner } from "./helpers/page";
import { signInFake, SUPABASE } from "./helpers/fake-auth";

const LOC = "00000000-0000-4000-8000-0000000000c1";
const LOCATION = {
  id: LOC,
  name: "Rose Lane Salon",
  address: "1 Rose Lane, Example Town",
  country: "GB",
  status: "onboarding",
  onboarding_step: "business",
  consent_at: null,
  access_granted_at: null,
  is_demo: false,
  created_at: "2026-11-10T08:00:00Z",
  request_tracking: null,
  request_tracking_app: null,
  early_access_whatsapp: null,
  onboarding_questions_at: null,
};
const status = (done: boolean) => ({
  location_id: LOC,
  business: LOCATION.name,
  time_zone: "UTC",
  is_demo: false,
  check: null,
  confirmed: true,
  whatsapp: false,
  setup_ok: false,
  keyword: null,
  consent: false,
  accepted: false,
  checked: false,
  trial_ends_at: null,
  first_task_done: false,
  resume_code: null,
  questions_done: done,
});

type Saved = {
  p_location: string;
  p_tracking: string | null;
  p_app: string | null;
  p_early: boolean | null;
};

/** Answers the onboarding reads; the save flips questions_done, as the database does. */
async function mockOnboarding(page: Page) {
  let done = false;
  const saves: Saved[] = [];
  await signInFake(page, { rest: { "/rest/v1/locations": [LOCATION] } });
  await page.route(`${SUPABASE}/rest/v1/rpc/onboarding_status`, (route) =>
    route.fulfill({ json: status(done) }),
  );
  await page.route(`${SUPABASE}/rest/v1/rpc/save_request_answers`, (route) => {
    saves.push(route.request().postDataJSON() as Saved);
    done = true;
    return route.fulfill({ json: {} });
  });
  return saves;
}

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(
    r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id),
  ).toEqual([]);
}
const noSideScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

test.describe("the two questions in onboarding", () => {
  test.beforeEach(async ({ page }) => noBanner(page));

  test("show after the business is chosen, fit the screen, and Skip saves nothing and moves on", async ({
    page,
  }) => {
    const saves = await mockOnboarding(page);
    await page.goto("/start");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Two quick questions", {
      timeout: 20_000,
    });
    await expect(page.getByText("How do you keep track of client requests today?")).toBeVisible();
    await expect(
      page.getByText("Want early access to new WhatsApp tools for your business?"),
    ).toBeVisible();
    for (const label of [
      "A booking app",
      "WhatsApp or Instagram chats",
      "A notebook or diary",
      "Memory",
      "Something else",
      "Yes",
      "No",
    ])
      await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    await expect(page.getByLabel("Name of the app (optional)")).toHaveCount(0);
    await noSideScroll(page);
    await axe(page);
    await page.screenshot({ path: test.info().outputPath("questions.png"), fullPage: true });
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page.getByRole("heading", { level: 1 })).not.toContainText("Two quick questions", {
      timeout: 20_000,
    });
    expect(saves).toEqual([{ p_location: LOC, p_tracking: null, p_app: null, p_early: null }]);
  });

  test("Continue saves the choices, with the app name only for a booking app", async ({ page }) => {
    const saves = await mockOnboarding(page);
    await page.goto("/start");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Two quick questions", {
      timeout: 20_000,
    });
    await page.getByLabel("A booking app", { exact: true }).check();
    await page.getByLabel("Name of the app (optional)").fill("Fresha");
    await page.getByLabel("Yes", { exact: true }).check();
    await noSideScroll(page);
    await page.screenshot({
      path: test.info().outputPath("questions-answered.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { level: 1 })).not.toContainText("Two quick questions", {
      timeout: 20_000,
    });
    expect(saves).toEqual([
      { p_location: LOC, p_tracking: "booking_app", p_app: "Fresha", p_early: true },
    ]);
  });

  test("a business that has been through them is not asked again", async ({ page }) => {
    await signInFake(page, { rest: { "/rest/v1/locations": [LOCATION] } });
    await page.route(`${SUPABASE}/rest/v1/rpc/onboarding_status`, (route) =>
      route.fulfill({ json: status(true) }),
    );
    await page.goto("/start");
    await expect(page.getByRole("heading", { level: 1 })).not.toContainText("Two quick questions", {
      timeout: 20_000,
    });
    await expect(page.getByText("How do you keep track of client requests today?")).toHaveCount(0);
  });
});

test.describe("the same questions in About your business", () => {
  test.beforeEach(async ({ page }) => noBanner(page));

  test("show the saved answers, can be changed or cleared, and Save sends both", async ({
    page,
  }) => {
    const saved = {
      ...LOCATION,
      request_tracking: "booking_app",
      request_tracking_app: "Fresha",
      early_access_whatsapp: true,
      onboarding_questions_at: "2026-11-10T08:30:00Z",
    };
    const saves: Saved[] = [];
    await signInFake(page, { rest: { "/rest/v1/locations": [saved] } });
    // One row asked for as a single object (the answers) comes back as an object, as PostgREST does.
    await page.route(`${SUPABASE}/rest/v1/locations**`, (route) =>
      route.fulfill({
        json: (route.request().headers()["accept"] ?? "").includes("vnd.pgrst.object")
          ? saved
          : [saved],
      }),
    );
    await page.route(`${SUPABASE}/rest/v1/rpc/save_request_answers`, (route) => {
      saves.push(route.request().postDataJSON() as Saved);
      return route.fulfill({ json: {} });
    });
    await page.goto("/app/knowledge");
    const card = page.getByRole("region", { name: "Two questions from setup" });
    await expect(card).toBeVisible({ timeout: 20_000 });
    await expect(card.getByLabel("A booking app", { exact: true })).toBeChecked();
    await expect(card.getByLabel("Name of the app (optional)")).toHaveValue("Fresha");
    await expect(card.getByLabel("Yes", { exact: true })).toBeChecked();
    await expect(card.getByRole("button", { name: "Save answers" })).toBeDisabled();
    await card.getByLabel("Memory", { exact: true }).check();
    await card.getByRole("button", { name: "Clear answer" }).last().click();
    await card.scrollIntoViewIfNeeded();
    await noSideScroll(page);
    await card.screenshot({ path: test.info().outputPath("about-answers.png") });
    await card.getByRole("button", { name: "Save answers" }).click();
    await expect(card.getByText("Saved.")).toBeVisible();
    expect(saves).toEqual([{ p_location: LOC, p_tracking: "memory", p_app: null, p_early: null }]);
  });
});

test.describe("the staff counts", () => {
  test.beforeEach(async ({ page }) => noBanner(page));

  test("Staff, Businesses shows Early answers: counts and the first businesses in order", async ({
    page,
  }) => {
    await signInFake(page, { staff: true });
    await page.route(`${SUPABASE}/rest/v1/rpc/staff_request_answers`, (route) =>
      route.fulfill({
        json: {
          generated_at: "2026-11-10T09:00:00Z",
          businesses: 12,
          answered_any: 11,
          tracking: { answered: 10, booking_app: 1, chats: 5, notebook: 1, memory: 2, other: 1 },
          early_access: { answered: 10, yes: 6, no: 4 },
          gate3: { first_ten_answered: 10, first_ten_qualifying: 3, verdict: "open" },
          qualifying: [
            {
              position: 1,
              business: "Rose Lane Salon",
              answered_on: "2026-10-21",
              keeps_requests: "chats",
              in_first_ten: true,
            },
            {
              position: 4,
              business: "Kings Barbers",
              answered_on: "2026-10-24",
              keeps_requests: "memory",
              in_first_ten: true,
            },
          ],
        },
      }),
    );
    await page.goto("/staff/businesses");
    const panel = page.getByTestId("staff-request-answers");
    await expect(panel).toBeVisible({ timeout: 20_000 });
    await expect(panel.getByRole("heading", { name: "Early answers" })).toBeVisible();
    await expect(panel.getByTestId("gate3-line")).toContainText(
      "3 keep requests in chats, a notebook or memory and said yes",
    );
    await expect(panel.getByText("Rose Lane Salon")).toBeVisible();
    await expect(panel.getByText("Kings Barbers")).toBeVisible();
    await noSideScroll(page);
    await panel.screenshot({ path: test.info().outputPath("staff-early-answers.png") });
  });
});
