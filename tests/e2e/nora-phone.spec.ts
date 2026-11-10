// Polish 4 part B (master plan 30.25 item 4): Nora on phones. Her round button shows on every public page from the first
// paint (in the phone bar where it shows, alone at the bottom right where it does not), never covers the consent bar,
// the free check's Start free, a form's submit button or the footer's legal row; her panel on a phone is a bottom sheet
// of at most 75 percent of the screen, over the dimmed page, kept above the keyboard, closed by its button, Escape, a
// tap on the dimmed page or a swipe down, with focus back on her button. Her code loads only when she is opened.
// Runs in the m390 project only; each test sets its own phone size.
import { expect, test, type Page } from "@playwright/test";
import { axeClean, noBanner } from "./helpers/page";

const PAGES = ["/", "/how-it-works", "/pricing", "/scan", "/for/hair-salon", "/faq"];
const SIZES = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
];

async function noraButton(page: Page) {
  return page.evaluate(() => {
    const els = [
      ...document.querySelectorAll<HTMLElement>("[data-nora-launcher], [data-nora-bar]"),
    ];
    const el = els.find(
      (e) =>
        e.getClientRects().length > 0 &&
        !e.closest("[inert]") &&
        Number(getComputedStyle(e).opacity) > 0.5,
    );
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      kind: el.dataset["noraLauncher"] ?? "bar",
      w: r.width,
      h: r.height,
      bottom: r.bottom,
      right: r.right,
    };
  });
}

/** Overlap between Nora's showing button and the things she must never cover. */
async function covers(page: Page) {
  return page.evaluate(() => {
    const els = [...document.querySelectorAll<HTMLElement>("[data-nora-launcher]")].filter(
      (e) =>
        e.getClientRects().length > 0 &&
        !e.closest("[inert]") &&
        Number(getComputedStyle(e).opacity) > 0.5,
    );
    const avoid = [
      ...document.querySelectorAll<HTMLElement>(
        "form button[type=submit], [data-nora-avoid], [data-testid=privacy-banner]",
      ),
    ].filter((e) => e.getClientRects().length > 0);
    const hits: string[] = [];
    for (const b of els) {
      const z = b.getBoundingClientRect();
      for (const a of avoid) {
        const r = a.getBoundingClientRect();
        if (z.left < r.right && z.right > r.left && z.top < r.bottom && z.bottom > r.top)
          hits.push(a.dataset["testid"] ?? a.textContent?.trim().slice(0, 30) ?? a.tagName);
      }
    }
    return hits;
  });
}

/** Her lone button may step aside only where a submit button or the legal row sits under it. */
async function stepAsideReason(page: Page) {
  return page.evaluate(() => {
    const b = document.querySelector<HTMLElement>(
      window.innerWidth < 640 ? "[data-nora-launcher=phone]" : "[data-nora-launcher=wide]",
    );
    if (!b) return "";
    const z = b.getBoundingClientRect();
    const a = [
      ...document.querySelectorAll<HTMLElement>(
        "form button[type=submit], form input[type=submit], [data-nora-avoid]",
      ),
    ].find((e) => {
      const r = e.getBoundingClientRect();
      return (
        r.width > 0 &&
        z.left < r.right + 8 &&
        z.right > r.left - 8 &&
        z.top < r.bottom + 8 &&
        z.bottom > r.top - 8
      );
    });
    return a ? (a.textContent?.trim().slice(0, 30) ?? "?") : "";
  });
}

test.describe("Nora on phones @polish4", () => {
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "m390", "phone sizes are set per test");
  });

  for (const size of SIZES) {
    for (const path of PAGES) {
      test(`her button shows from the first paint on ${path} at ${size.width}`, async ({
        page,
      }) => {
        await noBanner(page);
        await page.setViewportSize(size);
        // Her code is not loaded until she is opened.
        const noraCode: string[] = [];
        page.on("request", (r) => {
          if (/assistant-widget/.test(r.url())) noraCode.push(r.url());
        });
        await page.goto(path, { waitUntil: "domcontentloaded" });
        const first = await noraButton(page);
        if (!first)
          expect(await stepAsideReason(page), "why no Nora button at the first paint").not.toBe("");
        if (first && size.width < 640) {
          expect(first!.w).toBeGreaterThanOrEqual(48);
          expect(first!.w).toBeLessThanOrEqual(60);
          expect(first!.bottom).toBeLessThanOrEqual(size.height);
          expect(first!.right).toBeLessThanOrEqual(size.width);
        }
        // Once the page is ready (on a slow line the server-drawn button can sit over a submit button for a moment
        // before the page's code runs; docs/LATER.md), down the page and at the bottom: never on top of a submit button
        // or the footer's legal row.
        await page.waitForLoadState("networkidle");
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y <= height; y += Math.round(size.height * 0.6)) {
          await page.evaluate((v) => window.scrollTo(0, v), y);
          await page.waitForTimeout(120);
          expect(await covers(page), `covers something at ${y}px`).toEqual([]);
          if (!(await noraButton(page)))
            expect(await stepAsideReason(page), `why no Nora button at ${y}px`).not.toBe("");
        }
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForTimeout(250);
        expect(await covers(page), "covers something at the bottom").toEqual([]);
        expect(noraCode, "Nora's code before she is opened").toEqual([]);
      });
    }
  }

  test("she never covers the consent bar", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");
    // The consent bar shows only where the visitor's country rule asks for a choice (consent.ts); elsewhere there is
    // nothing to cover.
    const banner = page.getByTestId("privacy-banner");
    if (!(await banner.isVisible().catch(() => false))) {
      await page.waitForTimeout(3000);
      test.skip(
        !(await banner.isVisible().catch(() => false)),
        "no consent bar for this visitor's country",
      );
    }
    await page.waitForTimeout(300);
    expect(await covers(page)).toEqual([]);
    expect(await noraButton(page)).not.toBeNull();
  });

  for (const size of [
    { width: 360, height: 640 },
    { width: 390, height: 844 },
  ]) {
    test(`her panel is a bottom sheet at ${size.width} by ${size.height}, above the keyboard`, async ({
      page,
    }) => {
      // The phone keyboard: Chromium has none, so the visual viewport is made smaller by hand, as a keyboard would.
      await page.addInitScript(() => {
        const listeners = new Set<() => void>();
        const vv = { height: window.innerHeight, offsetTop: 0, width: window.innerWidth };
        const fake = {
          get height() {
            return vv.height;
          },
          get width() {
            return vv.width;
          },
          get offsetTop() {
            return vv.offsetTop;
          },
          offsetLeft: 0,
          pageTop: 0,
          pageLeft: 0,
          scale: 1,
          addEventListener: (_: string, f: () => void) => listeners.add(f),
          removeEventListener: (_: string, f: () => void) => listeners.delete(f),
        };
        Object.defineProperty(window, "visualViewport", { get: () => fake });
        (window as unknown as { __keyboard: (px: number) => void }).__keyboard = (px: number) => {
          vv.height = window.innerHeight - px;
          listeners.forEach((f) => f());
        };
      });
      await noBanner(page);
      await page.setViewportSize(size);
      await page.goto("/how-it-works");
      await page.waitForLoadState("networkidle");
      const opener = page.locator("[data-nora-launcher=phone]");
      await expect(opener).toBeVisible();
      await opener.click();
      const sheet = page.locator("[data-nora-panel]");
      await expect(sheet).toBeVisible({ timeout: 15_000 });
      await expect(page.locator("#kabsi-assistant-title")).toHaveText("Nora, Kabsi's assistant");
      await expect(page.getByRole("button", { name: "Close the chat" })).toBeVisible();
      const box = await sheet.boundingBox();
      expect(box!.height).toBeLessThanOrEqual(size.height * 0.75 + 1);
      expect(Math.round(box!.y + box!.height)).toBe(size.height);
      expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
      await expect(page.locator("[data-nora-scrim]")).toBeVisible();
      await axeClean(page, `nora sheet ${size.width}`);

      // The keyboard opens: the input stays above it.
      const keyboard = Math.round(size.height * 0.42);
      await page.evaluate(
        (px) => (window as unknown as { __keyboard: (n: number) => void }).__keyboard(px),
        keyboard,
      );
      await page.waitForTimeout(100);
      const input = await page.locator("#kabsi-assistant-input").boundingBox();
      expect(input!.y + input!.height).toBeLessThanOrEqual(size.height - keyboard);
      const sheet2 = await sheet.boundingBox();
      expect(sheet2!.y).toBeGreaterThanOrEqual(0);
      await page.evaluate(() =>
        (window as unknown as { __keyboard: (n: number) => void }).__keyboard(0),
      );

      // Escape closes, focus back on her button.
      await page.keyboard.press("Escape");
      await expect(sheet).toBeHidden();
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (document.activeElement as HTMLElement | null)?.dataset["noraLauncher"] ??
              (document.activeElement?.hasAttribute("data-nora-bar") ? "bar" : ""),
          ),
        )
        .not.toBe("");

      // A tap on the dimmed page closes.
      await page.locator("[data-nora-launcher=phone]").click();
      await expect(sheet).toBeVisible();
      await page.mouse.click(size.width / 2, 20);
      await expect(sheet).toBeHidden();

      // The close button closes.
      await page.locator("[data-nora-launcher=phone]").click();
      await expect(sheet).toBeVisible();
      await page.getByRole("button", { name: "Close the chat" }).click();
      await expect(sheet).toBeHidden();

      // A swipe down on the top of the sheet closes.
      await page.locator("[data-nora-launcher=phone]").click();
      await expect(sheet).toBeVisible();
      const top = (await sheet.boundingBox())!;
      const header = page.locator("[data-nora-panel] header");
      await header.dispatchEvent("touchstart", {
        touches: [{ identifier: 1, clientX: size.width / 2, clientY: top.y + 10 }],
      });
      await header.dispatchEvent("touchmove", {
        touches: [{ identifier: 1, clientX: size.width / 2, clientY: top.y + 160 }],
      });
      await header.dispatchEvent("touchend", { touches: [] });
      await expect(sheet).toBeHidden();
    });
  }
});
