// QA 1 (30.12 item 6): the smoke subset, run nightly against production by .github/workflows/smoke.yml and by hand. No sign-in,
// no secret, no write, no screenshot comparison (a runner's fonts differ from the baseline's). It answers one question: is
// the public site up, and do the public doors of the functions still refuse what they must refuse?
import { expect, test } from "@playwright/test";
import { noBanner, settle } from "./helpers/page";

const FN = "https://ynjdqjlmdwjgbfezevxy.supabase.co/functions/v1";
// The public anon key (src/lib/supabase-config.ts): the gateway wants a bearer token on every function call.
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluamRxamxtZHdqZ2JmZXpldnh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMDA5NzAsImV4cCI6MjEwNTg3Njk3MH0.VfPtwbV2h1-HevQMW8PjVYsO48SHBZ6vXnRivEu07vA";
const headers = {
  apikey: ANON,
  authorization: `Bearer ${ANON}`,
  "content-type": "application/json",
};

test.describe("smoke @smoke", () => {
  for (const route of [
    "/",
    "/pricing",
    "/login",
    "/how-it-works",
    "/google-review-link",
    "/google-profile-check",
    "/privacy",
    "/terms",
  ]) {
    test(`page ${route} loads with its heading and no script error`, async ({ page }) => {
      await noBanner(page);
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const res = await page.goto(route);
      expect(res?.status(), `${route} status`).toBeLessThan(400);
      await settle(page);
      await expect(page.locator("h1").first()).toBeVisible();
      expect(errors, "uncaught script errors").toEqual([]);
    });
  }

  test("sitemap and the AI files answer", async ({ request }) => {
    for (const f of ["/sitemap.xml", "/robots.txt", "/llms.txt", "/llms-full.txt"]) {
      const r = await request.get(f);
      expect(r.status(), f).toBe(200);
    }
  });

  test("the queue is healthy", async ({ request }) => {
    const r = await request.get(`${FN}/health/queue`, { headers });
    expect(r.status()).toBe(200);
    expect((await r.json()).status).toBe("ok");
  });

  test("the founding count answers with a number", async ({ request }) => {
    const r = await request.get(`${FN}/billing-creem/founding`, { headers });
    expect(r.status()).toBe(200);
    expect(typeof (await r.json()).left).toBe("number");
  });

  test("the go.kabsi.co worker reads its store", async ({ request }) => {
    expect((await request.get("https://go.kabsi.co/_check")).status()).toBe(200);
  });

  test("the doors that must stay shut stay shut", async ({ request }) => {
    const post = (path: string, extra: Record<string, string> = {}) =>
      request.post(`${FN}/${path}`, { headers: { ...headers, ...extra }, data: "{}" });
    expect((await post("billing-creem")).status(), "Creem webhook without a signature").toBe(401);
    expect(
      (await post("billing-creem", { "creem-signature": "deadbeef" })).status(),
      "Creem webhook with a wrong signature",
    ).toBe(401);
    expect((await post("whatsapp")).status(), "WhatsApp webhook without a signature").toBe(401);
    expect(
      (await post("whatsapp", { "x-webhook-signature": "0".repeat(64) })).status(),
      "WhatsApp webhook with a wrong signature",
    ).toBe(401);
    expect(
      (await post("whatsapp/staff/replay")).status(),
      "replay route without the internal secret",
    ).toBe(403);
    expect((await post("whatsapp/qa/alert")).status(), "smoke alert route without its token").toBe(
      403,
    );
    expect((await post("places-search")).status(), "business search signed out").toBe(401);
  });
});
