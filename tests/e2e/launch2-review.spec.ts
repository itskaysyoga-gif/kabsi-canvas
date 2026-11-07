// Launch 2 part B (master plan 30.36 item 7): the free review link tool tells the truth. Copied only when the copy worked;
// a name the card cannot print asks for the name to print, and the downloads wait for it; a download counts only when the
// file was made; the tool's own busy screen; Test the link. One PNG and one PDF from a typed name are decoded (jsQR, and
// pdftoppm for the PDF). All calls stubbed; nothing reaches Google. Screenshots go to test-results/launch2/ (after-*, not committed).
// Run against a local build: KABSI_BASE_URL=http://localhost:4173 npx playwright test tests/e2e/launch2-review.spec.ts
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";
import { noBanner } from "./helpers/page";

const JSQR = readFileSync("node_modules/jsqr/dist/jsQR.js", "utf8");
const SHOTS = "test-results/launch2";
const PASS = `${Math.floor(Date.now() / 1000) + 900}.stubsignature`;
const AR = "مطعم البيت"; // a business named in Arabic letters, never shown (R-61)
const BUSINESSES = [
  {
    place_id: "ChIJbarberUKAAAAA",
    name: "Fade Room Barbers",
    address: "12 High Street, Example Town, UK",
  },
  { place_id: "ChIJarabicAEAAAAA", name: AR, address: "Al Wasl Road, Dubai, United Arab Emirates" },
];
const LINK = (id: string) => `https://search.google.com/local/writereview?placeid=${id}`;

async function stub(page: Page, opts: { busy?: boolean } = {}) {
  await noBanner(page);
  await page.route("https://challenges.cloudflare.com/**", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `window.turnstile = { render: (el, o) => { setTimeout(() => o.callback("stub-token"), 20); return "w1"; }, reset: () => {}, remove: () => {} };`,
    }),
  );
  const json = (route: Route, b: unknown, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(b),
    });
  await page.route("**/functions/v1/profile-snapshot", (route) => {
    const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
    if (body["action"] === "pass") return json(route, { pass: PASS });
    const q = String(body["query"] ?? "").toLowerCase();
    return json(route, {
      suggestions: BUSINESSES.filter((b) =>
        q.startsWith("al w")
          ? b.place_id.includes("arabic")
          : b.name.toLowerCase().includes(q.slice(0, 3)),
      ),
      available: true,
    });
  });
  await page.route("**/functions/v1/review-link", (route) =>
    opts.busy
      ? json(route, { error: "back_soon", message: "busy" }, 429)
      : json(route, { places: BUSINESSES.map((b) => ({ ...b, review_url: LINK(b.place_id) })) }),
  );
}

async function open(page: Page) {
  await page.goto("/google-review-link");
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
}
async function pick(page: Page, typed: string, option: RegExp) {
  const box = page.getByRole("combobox").first();
  await box.click();
  await box.pressSequentially(typed, { delay: 40 });
  await page.getByRole("option", { name: option }).click();
}
async function decodePng(page: Page, png: Buffer): Promise<string | null> {
  await page.addScriptTag({ content: JSQR });
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    // @ts-expect-error jsQR is added to the page above
    const r = window.jsQR(d.data, d.width, d.height);
    return r ? (r.data as string) : null;
  }, png.toString("base64"));
}
async function shot(page: Page, name: string, project: string) {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/after-${name}-${project}.png`, fullPage: true });
}
async function axeClean(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(
    r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id),
  ).toEqual([]);
}
const status = (page: Page, text: string) => page.getByRole("status").filter({ hasText: text });

test.describe("Launch 2: the review link tool tells the truth", () => {
  test("Copied only after the copy worked; Test the link opens the link in a new tab", async ({
    page,
    context,
  }, info) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await stub(page);
    await open(page);
    await pick(page, "Fade", /Fade Room Barbers/);
    const test_ = page.getByRole("link", { name: "Test the link" });
    await expect(test_).toHaveAttribute("href", LINK("ChIJbarberUKAAAAA"));
    await expect(test_).toHaveAttribute("target", "_blank");
    await expect(test_).toHaveAttribute("rel", "noopener noreferrer");
    await expect(
      page.getByText(
        "Check it opens your business. Google may ask customers to sign in before they write a review.",
      ),
    ).toBeVisible();
    await page.getByRole("button", { name: "Copy link" }).first().click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      LINK("ChIJbarberUKAAAAA"),
    );
    await shot(page, "review-result", info.project.name);
    await axeClean(page);
  });

  test("a refused copy keeps the button, selects the link and says how to copy it", async ({
    page,
  }, info) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: () => Promise.reject(new Error("NotAllowedError")) },
        configurable: true,
      });
    });
    await stub(page);
    await open(page);
    await pick(page, "Fade", /Fade Room Barbers/);
    await page.getByRole("button", { name: "Copy link" }).first().click();
    const phone = info.project.name === "m390";
    await expect(
      status(
        page,
        phone ? "Press and hold the link to copy it." : "Press Ctrl+C or Cmd+C to copy it.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Copied" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Copy link" }).first()).toBeVisible();
    expect(await page.evaluate(() => String(window.getSelection()))).toBe(
      LINK("ChIJbarberUKAAAAA"),
    );
    await shot(page, "review-copy-failed", info.project.name);
    await axeClean(page);
  });

  test("a name the card cannot print: one field, no Arabic shown, downloads wait, then PNG and PDF decode", async ({
    page,
  }, info) => {
    await stub(page);
    await open(page);
    await pick(page, "Al W", /Al Wasl Road/);
    const field = page.getByLabel("Name on the card");
    await expect(field).toBeVisible();
    await expect(field).toHaveValue("");
    await expect(
      page.getByText("Type the business name in English letters as you want it printed."),
    ).toBeVisible();
    // R-61: the page never shows the name in its own letters.
    expect(await page.locator("main").innerText()).not.toMatch(/[؀-ۿ]/);
    await expect(page.getByRole("button", { name: "Download the card (PNG)" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Download to print (A6 PDF)" })).toBeDisabled();
    await expect(page.getByTestId("review-card")).toHaveCount(0);
    await shot(page, "review-name-needed", info.project.name);
    await axeClean(page);
    await field.fill("Beit Restaurant");
    const card = page.getByTestId("review-card");
    await expect(card).toContainText("Beit Restaurant");
    expect(await card.innerHTML()).not.toContain("Your business");
    await expect(page.getByText(/Thank you for visiting Beit Restaurant\./)).toBeVisible();
    const [png] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download the card (PNG)" }).click(),
    ]);
    expect(png.suggestedFilename()).toBe("review-card-beit-restaurant.png");
    expect(await decodePng(page, readFileSync((await png.path())!))).toBe(
      LINK("ChIJarabicAEAAAAA"),
    );
    const [pdf] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download to print (A6 PDF)" }).click(),
    ]);
    const pdfBytes = readFileSync((await pdf.path())!);
    expect(pdfBytes.toString("latin1")).toContain("(Beit Restaurant) Tj");
    if (existsSync("/usr/bin/pdftoppm")) {
      const dir = mkdtempSync(join(tmpdir(), "card-"));
      const f = join(dir, "card.pdf");
      writeFileSync(f, pdfBytes);
      execFileSync("/usr/bin/pdftoppm", ["-png", "-r", "200", f, join(dir, "page")]);
      const out = readdirSync(dir).find((x) => x.endsWith(".png"))!;
      expect(await decodePng(page, readFileSync(join(dir, out)))).toBe(LINK("ChIJarabicAEAAAAA"));
    }
    await shot(page, "review-name-typed", info.project.name);
  });

  test("a card the device cannot draw says so and is not counted", async ({ page }, info) => {
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback) {
        cb(null);
      };
    });
    await stub(page);
    await open(page);
    await pick(page, "Fade", /Fade Room Barbers/);
    let downloaded = false;
    page.on("download", () => (downloaded = true));
    await page.getByRole("button", { name: "Download the card (PNG)" }).click();
    await expect(
      status(page, "The card could not be made on this device. Try the PDF, or another browser."),
    ).toBeVisible();
    expect(downloaded).toBe(false);
    await shot(page, "review-card-failed", info.project.name);
    await axeClean(page);
  });

  test("the busy screen speaks about the review link tool and keeps its button", async ({
    page,
  }, info) => {
    await stub(page, { busy: true });
    await open(page);
    const box = page.getByRole("combobox").first();
    await box.click();
    await box.fill("Nowhere Cafe");
    await box.press("Escape");
    await page.getByRole("button", { name: "Get my link" }).click();
    await expect(
      page.getByRole("heading", { name: "The review link tool is busy right now." }),
    ).toBeVisible();
    await expect(page.getByText("Try again in a few minutes.")).toBeVisible();
    await expect(page.getByText("Today's free checks are used up.")).toHaveCount(0);
    await expect(
      page.getByRole("main").getByRole("link", { name: /trial/i }).first(),
    ).toBeVisible();
    await shot(page, "review-busy", info.project.name);
    await axeClean(page);
  });
});
