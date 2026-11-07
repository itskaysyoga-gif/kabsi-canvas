// R-123 G. Synthetic Playwright evidence only. Never uses the temporary audit password.
// Every Supabase response and identity is made up, and all external providers are blocked.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { answer, SESSION, STORAGE_KEY } from "./app-shots/fixtures.mjs";

const base = process.env["BASE"] ?? "http://127.0.0.1:5173";
const output = "artifacts/audit-proof";
mkdirSync(output, { recursive: true });
const unexpected = [];
const browser = await chromium.launch({ headless: true });

try {
  for (const width of [390, 1440]) {
    let expired = false;
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 900 },
      reducedMotion: "reduce",
      timezoneId: "UTC",
    });
    await context.addInitScript(
      ([key, session]) => {
        // A navigation after sign-out must not resurrect this synthetic identity.
        if (!window.sessionStorage.getItem("kabsi_audit_fixture_seeded")) {
          window.localStorage.setItem(key, JSON.stringify(session));
          window.sessionStorage.setItem("kabsi_audit_fixture_seeded", "1");
        }
        window.localStorage.setItem(
          "kabsi_consent",
          JSON.stringify({
            version: "2026-10-25",
            visitor: "synthetic-audit-proof",
            analytics: false,
            advertising: false,
            at: new Date().toISOString(),
          }),
        );
      },
      [STORAGE_KEY, SESSION],
    );
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.host === new URL(base).host) return route.continue();
      if (url.hostname.endsWith("supabase.co")) {
        if (/\/rest\/v1\/rpc\/audit_login_allowed$/.test(url.pathname) && expired) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            headers: { "access-control-allow-origin": "*" },
            body: "false",
          });
        }
        const result = answer(
          request.method(),
          request.url(),
          request.headers(),
          request.postData(),
          "audit",
        );
        if (result.missing) unexpected.push("Missing fixture: " + result.missing);
        if (
          request.method() !== "GET" &&
          request.method() !== "HEAD" &&
          url.pathname.startsWith("/rest/v1/") &&
          !url.pathname.startsWith("/rest/v1/rpc/")
        ) {
          unexpected.push("Unexpected database write: " + url.pathname);
          return route.abort();
        }
        if (
          url.pathname.startsWith("/rest/v1/rpc/") &&
          !["audit_login_allowed", "audit_staff_overview", "is_staff"].includes(
            url.pathname.split("/").at(-1),
          )
        ) {
          unexpected.push("Unexpected RPC call: " + url.pathname);
          return route.abort();
        }
        return route.fulfill({
          status: result.status ?? 200,
          contentType: "application/json",
          headers: {
            "access-control-allow-origin": "*",
            "access-control-expose-headers": "content-range",
          },
          body: result.body === undefined ? "" : JSON.stringify(result.body),
        });
      }
      if (url.hostname === "challenges.cloudflare.com") {
        return route.fulfill({
          status: 200,
          contentType: "text/javascript",
          body: 'window.turnstile={render:(el,o)=>{o.callback("synthetic");return "w"},reset:()=>{},remove:()=>{},getResponse:()=>"synthetic"};',
        });
      }
      // No external AI, billing, Google, WhatsApp, email, pixels or other services.
      return route.abort();
    });

    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(base + "/audit-overview", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Read-only audit overview" }).waitFor();
    await page.getByText("Hair salon").waitFor({ timeout: 15_000 });
    const body = await page.locator("body").innerText();
    for (const expected of [
      "Businesses",
      "Active businesses",
      "Example businesses",
      "Coffee shop",
      "Hair salon",
    ]) {
      assert.ok(body.includes(expected), width + ": missing " + expected);
    }
    assert.ok(
      !/alice@example|sam person|12 example lane|\+44 7123/i.test(body),
      "synthetic PII must never appear",
    );
    for (const forbidden of [
      "Approve",
      "Publish",
      "Send message",
      "Delete business",
      "Change plan",
    ]) {
      assert.equal(await page.getByRole("button", { name: forbidden, exact: true }).count(), 0);
    }
    assert.equal(await page.getByRole("button", { name: "Sign out" }).count(), 1);
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      width + ": horizontal overflow",
    );
    assert.deepEqual(pageErrors, [], width + ": browser errors");
    await page.screenshot({ path: `${output}/audit-overview-${width}.png`, fullPage: true });

    // Synthetic expiry. A denied server check must invalidate the session,
    // show the ended message and leave no private content visible.
    expired = true;
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("alert").getByText("This access has ended.").waitFor({ timeout: 15_000 });
    assert.ok(
      page.url().includes("/audit-login"),
      width + ": expired session did not leave overview",
    );
    assert.equal(
      await page.getByText("Hair salon").count(),
      0,
      "private overview remains after sign-out",
    );
    assert.deepEqual(pageErrors, [], width + ": browser errors after expiry");
    await page.screenshot({ path: `${output}/audit-ended-${width}.png`, fullPage: true });

    // Test the dedicated password form with invented credentials and a mock
    // Turnstile response. The real auditor's password is never used or logged.
    expired = false;
    await page.getByLabel("Email").fill("synthetic-reviewer@example.invalid");
    await page.getByLabel("Password").fill("fictional-qa-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.getByRole("heading", { name: "Read-only audit overview" }).waitFor({
      timeout: 15_000,
    });
    await page.getByText("Hair salon").waitFor({ timeout: 15_000 });
    assert.deepEqual(pageErrors, [], width + ": browser errors after synthetic password sign-in");
    await page.screenshot({ path: `${output}/audit-sign-in-${width}.png`, fullPage: true });
    await context.close();
    console.log("PASS synthetic masked read, no writes, viewport, expiry at " + width + " px");
  }
  assert.deepEqual(unexpected, [], "all requests must be mock reads or sign-out");
  console.log("PASS R-123 synthetic browser proof, no actual accounts or external provider calls");
} finally {
  await browser.close();
}
