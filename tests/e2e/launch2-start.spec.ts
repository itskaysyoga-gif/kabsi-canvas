// Launch 2 part C (master plan 30.36 item 8): one door to sign-up. From Pricing, Start free goes to Log in and then to
// /start; from a finished free check, the trial button goes the same way and /start opens with that business picked.
// Signing in is a made-up session (helpers/fake-auth.ts; every Supabase call answered here, a new owner with no
// business), so it runs against a local build or a preview. The same journeys with the real QA owner need
// KABSI_QA_CODE_OWNER and run by hand (onboarding.spec.ts).
// Run: KABSI_BASE_URL=http://localhost:4173 npx playwright test tests/e2e/launch2-start.spec.ts
import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";
import { noBanner } from "./helpers/page";
import { fakeSession, mockSupabase, STORAGE_KEY } from "./helpers/fake-auth";

const DONE = JSON.parse(
  readFileSync("tests/fixtures/scan3/free-check-done.json", "utf8"),
) as Record<string, unknown>;
const PASS = `${Math.floor(Date.now() / 1000) + 900}.stubsignature`;
const PLACE = {
  place_id: "ChIJharbourAAAAAA",
  name: "Harbour Burgers",
  address: "1 Quay Street, Example Town, UK",
};

async function stubCheck(page: Page) {
  await page.route("https://challenges.cloudflare.com/**", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `window.turnstile = { render: (el, o) => { setTimeout(() => o.callback("stub-token"), 20); return "w1"; }, reset: () => {}, remove: () => {} };`,
    }),
  );
  const json = (route: Route, b: unknown) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(b),
    });
  await page.route("**/functions/v1/profile-snapshot", (route) => {
    const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
    const a = body["action"];
    if (a === "pass") return json(route, { pass: PASS });
    if (a === "suggest") return json(route, { suggestions: [PLACE], available: true });
    if (a === "search") return json(route, { places: [{ ...PLACE, category: "Restaurant" }] });
    return json(route, {
      snapshot: {
        ...PLACE,
        category: "Restaurant",
        rating: 4.4,
        review_count: 120,
        business_status: "OPERATIONAL",
        open_now: true,
        hours: ["Monday: 9:00 to 18:00"],
        phone: null,
        website: "https://example.com",
        has_photos: true,
        photo_count: 10,
        flags: [
          {
            tone: "warning",
            fact: "No phone number is shown on Google.",
            action: "Add your phone number.",
          },
        ],
        checklist: [],
        cached: false,
        area: "Example Town",
      },
    });
  });
  await page.route("**/functions/v1/visibility/check", (route) =>
    json(route, { ...DONE, code: "HARB2345", business: PLACE.name }),
  );
  await page.route("**/functions/v1/visibility/check/result", (route) => json(route, DONE));
}

/** Signs the made-up new owner in (no business yet) and opens the log in page with next=/start, as the link left it. */
async function signInAndContinue(page: Page) {
  await page.evaluate(
    ([k, v]) => window.localStorage.setItem(k as string, v as string),
    [STORAGE_KEY, JSON.stringify(fakeSession())],
  );
  await page.reload();
  await expect(page).toHaveURL(/\/start(\?|$)/, { timeout: 20_000 });
}

test.describe("one door to sign-up", () => {
  test.beforeEach(async ({ page }) => {
    await noBanner(page);
    await mockSupabase(page, {
      rest: { "/rest/v1/locations": [], "/rest/v1/location_members": [] },
    });
  });

  test("Pricing: Start free goes to Log in, then to /start", async ({ page }) => {
    await page.goto("/pricing");
    const start = page.getByRole("link", { name: "Start free" }).first();
    await expect(start).toHaveAttribute("href", /\/login\?next=(%2F|\/)start$/);
    await start.click();
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)start$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Log in to Kabsi");
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(
      r.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => v.id),
    ).toEqual([]);
    await signInAndContinue(page);
    await expect(page.getByRole("heading", { name: "Find your business" })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("a guide's Start free goes the same way", async ({ page }) => {
    await page.goto("/guides/google-review-link-and-qr-code");
    await expect(page.getByRole("link", { name: "Start free" })).toHaveAttribute(
      "href",
      /\/login\?next=(%2F|\/)start$/,
    );
  });

  test("a free check: the trial button goes to Log in, then /start opens with that business picked", async ({
    page,
  }) => {
    await stubCheck(page);
    await page.goto(`/scan?q=${encodeURIComponent("Harbour Burgers Example Town")}`);
    await page.getByRole("button", { name: "This is my business" }).first().click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Harbour Burgers");
    await page.getByRole("button", { name: "Start your 14-day free trial" }).click();
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)start$/);
    await signInAndContinue(page);
    await expect(page.getByText("Harbour Burgers").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("1 Quay Street, Example Town, UK").first()).toBeVisible();
  });
});
