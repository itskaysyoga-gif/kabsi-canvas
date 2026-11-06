// QA 1 (30.12 item 6): the smoke subset, run nightly against production by .github/workflows/smoke.yml and by hand. No sign-in,
// no secret, no write, no screenshot comparison (a runner's fonts differ from the baseline's). It answers one question: is
// the public site up, and do the public doors of the functions still refuse what they must refuse?
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { noBanner, settle } from "./helpers/page";

const FN = "https://ynjdqjlmdwjgbfezevxy.supabase.co/functions/v1";
// The public anon key the browser itself carries: the gateway wants a bearer token on every function call. It is read from the
// website's own config file, never copied into a test.
const ANON =
  /anonJwt =\s*"([^"]+)"/.exec(readFileSync("src/lib/supabase-config.ts", "utf8"))?.[1] ?? "";
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

  // Speed 2 part B: the pages read the count on their own address (no preflight), kept at Vercel's edge.
  test("the founding count answers on the site's own address", async ({ request }) => {
    const r = await request.get("/api/founding-count");
    expect(r.status()).toBe(200);
    expect(typeof (await r.json()).left).toBe("number");
  });

  test("the go.kabsi.co worker reads its store", async ({ request }) => {
    expect((await request.get("https://go.kabsi.co/_check")).status()).toBe(200);
  });

  // Polish 4 (master plan 30.25 item 5): these calls reach production, so they run in one project only (m390, the phone
  // size), and every forged webhook call says it is the smoke test (x-kabsi-smoke: 1). The functions still refuse it the
  // same way; the tag only keeps it out of the staff alert on bad signatures (up to 20 an hour) and counts it as smoke_401.
  test("the doors that must stay shut stay shut", async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== "m390", "runs once per smoke run, in the m390 project");
    const post = (path: string, extra: Record<string, string> = {}) =>
      request.post(`${FN}/${path}`, { headers: { ...headers, ...extra }, data: "{}" });
    const smoke = { "x-kabsi-smoke": "1" };
    expect((await post("billing-creem", smoke)).status(), "Creem webhook without a signature").toBe(
      401,
    );
    expect(
      (await post("billing-creem", { ...smoke, "creem-signature": "deadbeef" })).status(),
      "Creem webhook with a wrong signature",
    ).toBe(401);
    expect((await post("whatsapp", smoke)).status(), "WhatsApp webhook without a signature").toBe(
      401,
    );
    expect(
      (await post("whatsapp", { ...smoke, "x-webhook-signature": "0".repeat(64) })).status(),
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
