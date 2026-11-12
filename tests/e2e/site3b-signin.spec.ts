// Site 3b, Part 0 item 1 (R-161), in a real browser. The bot check and the sign-in calls are stood in for (the script passes at
// once; auth-whatsapp/start answers a made-up code and is counted). Opening the panel and choosing Google or email must not
// call start; pointing at, focusing or touching "Continue with WhatsApp" calls it once; the ready button shows within a second.
import { expect, test } from "@playwright/test";
import { noBanner } from "./helpers/page";

async function stub(page: import("@playwright/test").Page) {
  const starts: string[] = [];
  await noBanner(page);
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: "window.turnstile={render:function(el,o){setTimeout(function(){o.callback('qa-pass')},50);return 'qa'},reset:function(){},remove:function(){}};",
    }),
  );
  await page.route("**/functions/v1/auth-whatsapp/start", (route) => {
    starts.push(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "00000000-0000-0000-0000-000000000000",
        code: "QA2345",
        expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      }),
    });
  });
  await page.route("**/functions/v1/auth-whatsapp/check", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"state":"waiting"}' }),
  );
  // Google: the redirect never leaves the test.
  await page.route("**/auth/v1/authorize**", (route) => route.abort());
  await page.route("https://accounts.google.com/**", (route) => route.abort());
  return starts;
}

test.describe("WhatsApp sign-in code on intent (R-161)", () => {
  test("opening the panel and choosing email or Google makes no sign-in code", async ({ page }) => {
    const starts = await stub(page);
    await page.goto("/login");
    await page.waitForTimeout(2500);
    expect(starts).toHaveLength(0);
    await page.getByRole("button", { name: "Continue with email" }).click();
    await page.waitForTimeout(800);
    expect(starts).toHaveLength(0);
    await page.getByRole("button", { name: /Back to/ }).click();
    const google = page.getByRole("button", { name: "Continue with Google" });
    if (await google.count()) {
      await google.first().click();
      await page.waitForTimeout(800);
    }
    expect(starts).toHaveLength(0);
  });

  test("a mouse passing over the button makes no code; staying on it does", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "a pointer test");
    const starts = await stub(page);
    await page.goto("/login");
    await page.waitForTimeout(2000);
    const box = (await page.getByRole("button", { name: "Continue with WhatsApp" }).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y - 40);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height + 60);
    await page.waitForTimeout(600);
    expect(starts).toHaveLength(0);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(() => starts.length, { timeout: 2000 }).toBe(1);
  });

  test("the button shows within a second of the tap, and pointing makes one code only", async ({
    page,
    isMobile,
  }) => {
    const starts = await stub(page);
    await page.goto("/login");
    await page.waitForTimeout(2000);
    const choice = page.getByRole("button", { name: "Continue with WhatsApp" });
    const t0 = Date.now();
    if (isMobile) await choice.tap();
    else {
      await choice.hover();
      await choice.click();
    }
    await expect(page.locator("[data-wa-open]")).toBeVisible({ timeout: 1000 });
    expect(Date.now() - t0).toBeLessThan(1500);
    if (!isMobile) await expect(page.locator("[data-wa-qr]")).toBeVisible();
    expect(starts).toHaveLength(1);
  });
});
