// App 4 part E (master plan 30.31 item 5): the signed-in site on production with the QA demo account (a real session,
// tests/e2e/seed/qa-login-code.sql, KABSI_QA_CODE_DEMO; never printed). Every route under /app and /start, at 390 and
// 1440 px: no page error, no console error, no failed request to Kabsi, no sideways scroll, one H1, no serious or
// critical axe finding. Read only: no button that changes anything is pressed.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { noBanner } from "./helpers/page";
import { savedSession, signedIn } from "./helpers/auth";

const ROUTES = [
  "/app",
  "/app/reviews",
  "/app/reviews?f=all",
  "/app/inbox",
  "/app/posts",
  "/app/photos",
  "/app/cards",
  "/app/shield",
  "/app/hours",
  "/app/coach",
  "/app/insights",
  "/app/knowledge",
  "/app/settings",
  "/app/team",
  "/app/plan",
  "/app/report",
];

test.describe("the signed-in site, live", () => {
  test.skip(() => !savedSession("demo"), "no saved QA demo session for this run");

  for (const path of ROUTES)
    test(path, async ({ page, context }) => {
      await noBanner(page);
      await signedIn(context, "demo");
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
      expect(page.url()).not.toContain("/login");
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
