// App 5 (master plan 30.33 item 3): the staff workspace on production. With the QA staff account (KABSI_QA_CODE_STAFF,
// tests/e2e/seed/qa-login-code.sql; never printed): each staff page at 390 and 1440 px loads with one H1, no page or
// console error, no failed request to Kabsi or Supabase, no sideways scroll and no serious or critical axe finding. Read
// only: nothing that changes anything is pressed. With the QA demo account (not staff): every staff page is the
// not-found page and no staff read is made.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { noBanner } from "./helpers/page";
import { savedSession, signedIn } from "./helpers/auth";

const PAGES = [
  "/staff",
  "/staff/businesses",
  "/staff/conversations",
  "/staff/programs",
  "/staff/system",
  "/staff/costs",
  "/staff/settings",
];

test.describe("the staff workspace, live, as staff", () => {
  test.skip(() => !savedSession("staff"), "no saved QA staff session for this run");
  for (const path of PAGES)
    test(path, async ({ page, context }) => {
      await noBanner(page);
      await signedIn(context, "staff");
      const problems: string[] = [];
      page.on("pageerror", (e) => problems.push(`page error: ${e.message.slice(0, 160)}`));
      page.on("console", (m) => {
        if (m.type() === "error") problems.push(`console: ${m.text().slice(0, 160)}`);
      });
      page.on("response", (r) => {
        const u = r.url();
        if (r.status() >= 400 && (u.includes("kabsi.co") || u.includes("supabase.co")))
          problems.push(`${r.status()} ${u.replace(/\?.*$/, "").slice(0, 120)}`);
      });
      await page.goto(path);
      await expect(page.locator("main h1").first()).toBeVisible({ timeout: 20_000 });
      await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
      await expect(page.locator("main h1")).not.toHaveText("This page is not here.");
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
      ).toBe(false);
      expect(await page.locator("h1:visible").count()).toBe(1);
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const bad = axe.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => `axe ${v.id}`);
      expect([...problems, ...bad]).toEqual([]);
    });
});

test.describe("the staff workspace, live, as an owner who is not staff", () => {
  test.skip(() => !savedSession("demo"), "no saved QA demo session for this run");
  test("every staff page is not found, and no staff read is made", async ({ page, context }) => {
    await noBanner(page);
    await signedIn(context, "demo");
    const staffReads: string[] = [];
    page.on("request", (r) => {
      const u = new URL(r.url());
      if (/\/rest\/v1\/(rpc\/staff_|staff_|provider_spend|ai_visibility_runs)/.test(u.pathname))
        staffReads.push(u.pathname);
    });
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page is not here.", {
        timeout: 20_000,
      });
    }
    expect(staffReads).toEqual([]);
  });
});
