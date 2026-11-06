// Launch 3 part C (master plan 30.36 item 8): the part C journeys of Launch 2 (one door to sign-up) with the real QA owner,
// against production. The session is the QA owner's real one (made from an admin-made code, see onboarding.spec.ts) and every
// Supabase call is the real one, so the /login and /start redirects follow the real account. Only the free check's paid calls
// (the business search, the profile read, the nearby and AI check) are stood in for by fixtures, so no Google Places or
// DataForSEO call is spent. The QA owner already has a business, so Pricing's Start free goes to the dashboard for it
// (src/lib/start-free.ts); the visitor's door and /start are walked from the signed-out side and by opening /start.
// Run by hand, never in CI (it needs the saved session of the QA owner, tests/e2e/.auth/owner.json):
//   KABSI_QA_CODE_OWNER=<admin-made code> npx playwright test tests/e2e/launch3-start-real.spec.ts
import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";
import { savedSession, signedIn } from "./helpers/auth";
import { axeClean, noBanner } from "./helpers/page";

const DONE = JSON.parse(
  readFileSync("tests/fixtures/scan3/free-check-done.json", "utf8"),
) as Record<string, unknown>;
const PASS = `${Math.floor(Date.now() / 1000) + 900}.stubsignature`;
const PLACE = {
  place_id: "ChIJharbourAAAAAA",
  name: "Harbour Burgers",
  address: "1 Quay Street, Example Town, UK",
};

const json = (route: Route, b: unknown) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify(b),
  });

async function stubCheck(page: Page) {
  await page.route("https://challenges.cloudflare.com/**", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `window.turnstile = { render: (el, o) => { setTimeout(() => o.callback("stub-token"), 20); return "w1"; }, reset: () => {}, remove: () => {} };`,
    }),
  );
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
  await page.route("**/functions/v1/programs/founding", (route) =>
    json(route, { total: 25, left: 12 }),
  );
}

test.describe("one door to sign-up, with the real QA owner", () => {
  test.skip(
    () => !savedSession("owner"),
    "no saved session for the QA owner (KABSI_QA_CODE_OWNER)",
  );

  test("Pricing: a visitor's Start free goes to Log in with next=/start, and the QA owner signed in lands on /start", async ({
    page,
    context,
  }) => {
    await noBanner(page);
    await page.goto("/pricing");
    const start = page.getByRole("link", { name: "Start free" }).first();
    await expect(start).toHaveAttribute("href", /\/login\?next=(%2F|\/)start$/);
    await start.click();
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)start$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Log in to Kabsi");
    await axeClean(page, "launch3-login-next-start");
    // The real session arrives (as if the code was just entered) and the real redirect follows next=/start.
    await signedIn(context, "owner");
    await page.reload();
    await expect(page).toHaveURL(/\/start(\?|$)/, { timeout: 30_000 });
    await expect(page.getByRole("navigation", { name: "Setup" })).toBeVisible({ timeout: 20_000 });
    await axeClean(page, "launch3-start", ["label-content-name-mismatch"]);
  });

  test("the QA owner already has a business: Pricing's Start free goes to the dashboard", async ({
    page,
    context,
  }) => {
    await noBanner(page);
    await signedIn(context, "owner");
    await page.goto("/pricing");
    const start = page.getByRole("link", { name: "Start free" }).first();
    await expect(start).toHaveAttribute("href", "/app");
    await start.click();
    await expect(page).toHaveURL(/\/app(\/|\?|$)/, { timeout: 30_000 });
  });

  test("a saved free check: the trial button goes to Log in with next=/start, and /start opens for the signed-in owner", async ({
    page,
    context,
  }) => {
    await noBanner(page);
    await stubCheck(page);
    await page.goto(`/scan?q=${encodeURIComponent("Harbour Burgers Example Town")}`);
    await page.getByRole("button", { name: "This is my business" }).first().click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Harbour Burgers");
    await page.getByRole("button", { name: "Start your 14-day free trial" }).click();
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)start$/);
    await signedIn(context, "owner");
    await page.reload();
    await expect(page).toHaveURL(/\/start(\?|$)/, { timeout: 30_000 });
    await expect(page.getByRole("navigation", { name: "Setup" })).toBeVisible({ timeout: 20_000 });
    await axeClean(page, "launch3-start-from-check", ["label-content-name-mismatch"]);
  });
});
