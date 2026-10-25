// QA 1 (30.12 item 5): every email template rendered in Chromium, light and dark (prefers-color-scheme), with the screenshots kept in
// tests/e2e/baseline. The templates are the ones docs/email-previews holds (tests/email-previews.test.ts keeps them equal to what
// the Edge Functions render) and the four Supabase Auth templates in emails/auth. Gmail, Outlook and Apple Mail rendering
// stay a Web 2 task (docs/LATER.md). Runs in the 390 px project only: an email is one column.
import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";

const previews = readdirSync("docs/email-previews")
  .filter((f) => f.endsWith(".html") && f !== "index.html")
  .map((f) => ["docs/email-previews", f] as const);
const auth = readdirSync("emails/auth")
  .filter((f) => f.endsWith(".html"))
  .map((f) => ["emails/auth", f] as const);

for (const scheme of ["light", "dark"] as const) {
  test.describe(`emails, ${scheme}`, () => {
    test.use({ colorScheme: scheme });
    test.beforeEach(async ({ page }, info) => {
      test.skip(info.project.name !== "m390", "emails are checked once, at phone width");
      // Nothing is fetched from the network: the images that are not inline stay empty, the same every run.
      await page.route(/^https?:/, (route) => route.abort());
    });
    for (const [dir, file] of [...previews, ...auth]) {
      test(`${dir.endsWith("auth") ? "auth/" : ""}${file}`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.setContent(readFileSync(`${dir}/${file}`, "utf8"), { waitUntil: "load" });
        await expect(page.locator("body")).toBeVisible();
        // One column, no sideways scroll at 390 px.
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, "horizontal scroll").toBeLessThanOrEqual(0);
        // The house rules for anything a reader sees: no em dash, en dash or exclamation mark.
        const text = await page.locator("body").innerText();
        expect(text, "dashes and exclamation marks").not.toMatch(/[–—!]/);
        await expect(page).toHaveScreenshot(
          `${scheme}-${dir.endsWith("auth") ? "auth-" : ""}${file.replace(/\.html$/, "")}.png`,
          { fullPage: true },
        );
      });
    }
  });
}
