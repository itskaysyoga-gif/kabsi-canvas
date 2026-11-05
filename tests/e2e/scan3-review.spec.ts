// Scan 3 (master plan 30.34 item 3): the review link tool. The same suggestions as the free check, a confirm card with
// "Change business", Google's own review link, the branded card as PNG and A6 PDF, copy and share. Every QR code made
// here is decoded (jsQR) and must read back as the link; the card's colours are checked for contrast. All calls stubbed.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

const SHOTS = "docs/scan3";
const PASS = `${Math.floor(Date.now() / 1000) + 900}.stubsignature`;
const JSQR = readFileSync("node_modules/jsqr/dist/jsQR.js", "utf8");
const BUSINESSES = [
  {
    place_id: "ChIJbarberUKAAAAA",
    name: "Fade Room Barbers",
    address: "12 High Street, Example Town, UK",
  },
  {
    place_id: "ChIJsalonAEAAAAAA",
    name: "Pearl Beauty Salon",
    address: "Al Wasl Road, Dubai, United Arab Emirates",
  },
  {
    place_id: "ChIJclinicAAAAAAA",
    name: "Example Dental & Smile Clinic (Main Street)",
    address: "4 Main Street, Example Town, USA",
  },
];
const LINK = (id: string) => `https://search.google.com/local/writereview?placeid=${id}`;

async function stub(page: Page) {
  const calls: { fn: string; body: Record<string, unknown> }[] = [];
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
    calls.push({ fn: `snapshot:${String(body["action"])}`, body });
    if (body["action"] === "pass") return json(route, { pass: PASS });
    const q = String(body["query"] ?? "").toLowerCase();
    return json(route, {
      suggestions: BUSINESSES.filter((b) => b.name.toLowerCase().includes(q.slice(0, 3))),
      available: true,
    });
  });
  await page.route("**/functions/v1/review-link", (route) => {
    const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
    calls.push({ fn: "review-link", body });
    const q = String(body["query"]).toLowerCase();
    return json(route, {
      places: BUSINESSES.filter((b) => b.name.toLowerCase().includes(q.slice(0, 4))).map((b) => ({
        ...b,
        review_url: LINK(b.place_id),
      })),
    });
  });
  return calls;
}

/** Typing before the page has hydrated is lost (a slower production page): wait for the scripts to settle first. */
async function open(page: Page) {
  await page.goto("/google-review-link");
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
}

/** Decodes a PNG (as bytes) in the page with jsQR. */
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

/** WCAG contrast of two hex colours. */
function contrast(a: string, b: string) {
  const l = (hex: string) => {
    const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const [r, g, bb] = v.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bb!;
  };
  const [x, y] = [l(a), l(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

test.describe("Scan 3: the review link tool", () => {
  test("suggestions as you type, a confirm card, the link, the card as PNG and A6 PDF, every code decodes", async ({
    page,
  }, info) => {
    const calls = await stub(page);
    await open(page);
    await expect(page.locator("h1 .d9-mark")).toHaveText("review link and QR code.");
    await expect(page.getByAltText("A cafe owner at the counter")).toBeVisible();
    const box = page.getByRole("combobox").first();
    await box.click();
    await box.pressSequentially("Fade", { delay: 40 });
    await page.getByRole("option", { name: /Fade Room Barbers/ }).click();
    // The confirm card: name, address, Change business. No server search was needed for a suggestion.
    await expect(page.getByText("Your business on Google", { exact: true })).toBeVisible();
    await expect(page.getByText("12 High Street, Example Town, UK")).toBeVisible();
    await expect(page.getByRole("button", { name: "Change business" })).toBeVisible();
    expect(calls.filter((c) => c.fn === "review-link")).toHaveLength(0);
    // Google's own review link format.
    await expect(page.getByText(LINK("ChIJbarberUKAAAAA"), { exact: true })).toBeVisible();
    // The card on the page: name, the line, kabsi.co; no stars and nothing that asks for a rating.
    const card = page.getByTestId("review-card");
    await expect(card).toContainText("Fade Room Barbers");
    await expect(card).toContainText("Scan to review us on Google");
    await expect(card).toContainText("kabsi.co");
    expect(await card.innerHTML()).not.toMatch(/star|rating|★|5\/5|google\.com\/images|logo/i);
    // Colours: charcoal code on white inside the yellow frame, text on white.
    const fills = await card.evaluate((el) => [
      ...new Set([...el.querySelectorAll("[fill]")].map((x) => x.getAttribute("fill"))),
    ]);
    expect(fills.sort()).toEqual(["#111111", "#4a4740", "#ffd60a", "#ffffff"].sort());
    expect(contrast("#111111", "#ffffff")).toBeGreaterThan(15);
    expect(contrast("#4a4740", "#ffffff")).toBeGreaterThan(4.5);
    expect(contrast("#111111", "#ffd60a")).toBeGreaterThan(7);
    // The card on the page decodes.
    const shot = await card.screenshot();
    expect(await decodePng(page, shot)).toBe(LINK("ChIJbarberUKAAAAA"));
    // The PNG download decodes.
    const [png] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download the card (PNG)" }).click(),
    ]);
    expect(png.suggestedFilename()).toBe("review-card-fade-room-barbers.png");
    const pngBytes = readFileSync((await png.path())!);
    expect(await decodePng(page, pngBytes)).toBe(LINK("ChIJbarberUKAAAAA"));
    // The A6 PDF: one page, 105 by 148 mm, and its code decodes once printed to an image (pdftoppm where it exists).
    const [pdf] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download to print (A6 PDF)" }).click(),
    ]);
    expect(pdf.suggestedFilename()).toBe("review-card-fade-room-barbers-a6.pdf");
    const pdfBytes = readFileSync((await pdf.path())!);
    const text = pdfBytes.toString("latin1");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("/MediaBox [0 0 297.64 419.53]");
    expect(text).toContain("(Scan to review us on Google) Tj");
    expect(text).toContain("(kabsi.co) Tj");
    if (existsSync("/usr/bin/pdftoppm")) {
      const dir = mkdtempSync(join(tmpdir(), "card-"));
      const f = join(dir, "card.pdf");
      writeFileSync(f, pdfBytes);
      execFileSync("/usr/bin/pdftoppm", ["-png", "-r", "200", f, join(dir, "page")]);
      const out = readdirSync(dir).find((x) => x.endsWith(".png"))!;
      expect(await decodePng(page, readFileSync(join(dir, out)))).toBe(LINK("ChIJbarberUKAAAAA"));
    }
    await page.screenshot({
      path: `${SHOTS}/after-review-link-${info.project.name}.png`,
      fullPage: true,
    });
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });

  test("a typed search lists the matches and never chooses for the owner; Change business goes back", async ({
    page,
  }) => {
    const calls = await stub(page);
    await open(page);
    const box = page.getByRole("combobox").first();
    await box.click();
    await box.fill("Pearl Beauty Dubai");
    await box.press("Escape");
    await page.getByRole("button", { name: "Get my link" }).click();
    await expect(page.getByRole("heading", { name: "Pick your business" })).toBeVisible();
    expect(calls.filter((c) => c.fn === "review-link")).toHaveLength(1);
    await page.getByRole("button", { name: /Pearl Beauty Salon/ }).click();
    await expect(page.getByTestId("review-card")).toContainText("Pearl Beauty Salon");
    await page.getByRole("button", { name: "Change business" }).click();
    await expect(page.getByRole("combobox").first()).toBeVisible();
    await expect(page.getByText(LINK("ChIJsalonAEAAAAAA"), { exact: true })).toHaveCount(0);
    // A long name with symbols still makes a card that decodes.
    const b2 = page.getByRole("combobox").first();
    await b2.fill("");
    await b2.pressSequentially("Exa", { delay: 40 });
    await page.getByRole("option", { name: /Example Dental/ }).click();
    const card = page.getByTestId("review-card");
    await expect(card).toContainText("Example Dental");
    expect(await decodePng(page, await card.screenshot())).toBe(LINK("ChIJclinicAAAAAAA"));
  });
});
