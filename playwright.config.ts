// QA 1 (master plan 30.12, 30.7 item 7): the web journeys and the visual baseline, run against production with Playwright.
// Screenshots at 390 and 1440 px are compared with tests/e2e/baseline (the approved baseline); an unexplained change fails.
// Run: `npx playwright test`; change the baseline on purpose with `npx playwright test --update-snapshots` and say why in the PR.
// KABSI_BASE_URL points the run at another deployment (a Vercel preview). docs/testing.md has the rest.
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env["KABSI_BASE_URL"] ?? "https://kabsi.co";

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: /.*\.spec\.ts$/,
  snapshotPathTemplate: "tests/e2e/baseline/{projectName}/{testFileName}/{arg}{ext}",
  outputDir: "test-results",
  timeout: 90_000,
  expect: {
    timeout: 15_000,
    toHaveScreenshot: { animations: "disabled", caret: "hide", maxDiffPixelRatio: 0.01 },
  },
  globalSetup: "./tests/e2e/global-setup.ts",
  // One worker: the journeys change the same demo data in order, and the screenshots must not race them.
  fullyParallel: false,
  workers: 1,
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "light",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "m390",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "d1440",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      },
    },
  ],
});
