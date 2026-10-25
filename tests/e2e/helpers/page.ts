// Shared helpers for the web journeys (QA 1). No secret is read here: the QA accounts sign in with a one-time code that the
// session minted in the database (tests/e2e/seed/qa-login-code.sql); the code is passed in the environment and never printed.
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { CONSENT_VERSION } from "../../../src/lib/consent-rules";

/** The privacy banner would sit over the footer in every screenshot; a recorded choice (no statistics, no ads) keeps it away. */
export async function noBanner(page: Page) {
  await page.addInitScript((version) => {
    try {
      window.localStorage.setItem(
        "kabsi_consent",
        JSON.stringify({
          version,
          visitor: "qa",
          analytics: false,
          advertising: false,
          at: "2026-10-25T00:00:00.000Z",
        }),
      );
    } catch {
      /* storage blocked: the banner may show */
    }
  }, CONSENT_VERSION);
}

/** Waits for the page to settle: loaded, fonts ready, images decoded, so a screenshot is the same twice. */
export async function settle(page: Page) {
  await page.waitForLoadState("load");
  // The site keeps a few requests open (statistics, geo); "networkidle" would wait for them. Wait for the network to go
  // quiet for a moment instead, then load the lazy images by scrolling the page once, and wait for fonts and images.
  await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
  await page.evaluate(async () => {
    const step = Math.max(300, window.innerHeight - 100);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await document.fonts.ready;
    const wait = (i: HTMLImageElement) =>
      i.complete
        ? Promise.resolve()
        : Promise.race([i.decode().catch(() => {}), new Promise((r) => setTimeout(r, 4000))]);
    await Promise.all(Array.from(document.images).map(wait));
  });
  await page.waitForTimeout(300);
}

/** axe: no serious or critical issue. Moderate and minor ones are listed in the report, not failed (QA 1, 30.12). */
export async function axeClean(page: Page, label: string) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const bad = result.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    bad.map(
      (v) =>
        `${v.id} (${v.impact}): ${v.nodes.length} element(s), first ${v.nodes[0]?.target.join(" ")}`,
    ),
    `${label}: serious or critical accessibility issues`,
  ).toEqual([]);
}

/** The pages with a number or a date that changes every day are masked in screenshots, never skipped. */
export const MASKS = (page: Page) => [page.locator("[data-qa-mask]"), page.locator("time")];

/**
 * The part of the page a baseline keeps: the whole page up to a height that fits the repository (a long legal page is
 * compared for its first screens; its length is still checked by the overflow test). 3000 px on a phone, 2000 px on a desktop.
 */
export async function keep(page: Page) {
  const size = page.viewportSize() ?? { width: 390, height: 844 };
  const full = await page.evaluate(() => document.documentElement.scrollHeight);
  return {
    fullPage: true,
    clip: { x: 0, y: 0, width: size.width, height: Math.min(full, size.width < 800 ? 3000 : 2000) },
  } as const;
}
