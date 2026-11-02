// QA 2 (2 Nov 2026): every signed-in screen for the QA accounts (owner on the demo business, manager, staff, the new QA
// owner), at 390 and 1440 px, on a live deployment. Reads only, except what a person would do by opening a dialog and
// cancelling it. The demo business is on mock Google always (R-17): nothing reaches Google.
// The one-time codes come from tests/e2e/seed/qa-login-code.sql in the environment (QA2_CODE_DEMO, QA2_CODE_OWNER,
// QA2_CODE_MANAGER, QA2_CODE_STAFF) and are never printed or written; the sessions live only in this process.
// Run: node scripts/qa2/signed-in.mjs --out <dir> [--browser chromium|webkit]
import { chromium, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { covered, measure, words } from "./lib.mjs";

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const BROWSER = arg("browser", "chromium");
const BASE = arg("base", "https://kabsi.co");
const OUT = join(arg("out", "qa2-out"), `${BROWSER}-signed-in`);
mkdirSync(join(OUT, "shots"), { recursive: true });

const SUPA = "https://ynjdqjlmdwjgbfezevxy.supabase.co";
const KEY = "sb_publishable_eF-s_uWvQzj1MngyU1to6Q_aJNQZh2R"; // the public key the browser carries
const STORAGE_KEY = "sb-ynjdqjlmdwjgbfezevxy-auth-token";
const ACCOUNTS = {
  demo: { email: "qa-demo@test.local", env: "QA2_CODE_DEMO" },
  owner: { email: "delivered+kabsi-qa@resend.dev", env: "QA2_CODE_OWNER" },
  manager: { email: "qa-wa-manager@test.local", env: "QA2_CODE_MANAGER" },
  staff: { email: "qa-wa-staff@test.local", env: "QA2_CODE_STAFF" },
};
const APP = [
  "/app",
  "/app/reviews",
  "/app/posts",
  "/app/photos",
  "/app/hours",
  "/app/knowledge",
  "/app/insights",
  "/app/report",
  "/app/shield",
  "/app/cards",
  "/app/coach",
  "/app/inbox",
  "/app/team",
  "/app/plan",
  "/app/settings",
  "/staff",
];
const ROUTES = {
  demo: [...APP, "/app?qa2=error", "/app/reviews?qa2=error", "/app/settings#disconnect-dialog"],
  manager: APP,
  staff: APP,
  owner: ["/start", "/app"],
};

async function session(who) {
  const a = ACCOUNTS[who];
  const token = process.env[a.env];
  // The QA 1 journeys keep their sessions in tests/e2e/.auth (not committed); reuse them while they last.
  if (!token) {
    try {
      return JSON.parse(readFileSync(`tests/e2e/.auth/${who}.json`, "utf8"));
    } catch {
      return null;
    }
  }
  const res = await fetch(`${SUPA}/auth/v1/verify`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: KEY },
    body: JSON.stringify({ type: "email", email: a.email, token }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || typeof body.access_token !== "string") {
    console.log(`${who}: sign-in failed (${res.status})`);
    return null;
  }
  return { ...body, expires_at: Math.floor(Date.now() / 1000) + Number(body.expires_in ?? 3600) };
}

const browser = await (BROWSER === "webkit" ? webkit : chromium).launch();
const results = [];
for (const who of Object.keys(ACCOUNTS)) {
  const s = await session(who);
  if (!s) {
    results.push({ who, error: "no code or sign-in failed" });
    continue;
  }
  for (const width of [390, 1440]) {
    const ctx = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 900 },
      deviceScaleFactor: width === 390 ? 2 : 1,
      isMobile: width === 390 && BROWSER === "chromium",
      hasTouch: width === 390,
      locale: "en-US",
      reducedMotion: "reduce",
    });
    await ctx.addInitScript(
      ([k, v]) => {
        try {
          localStorage.setItem(k, v);
          localStorage.setItem(
            "kabsi_consent",
            JSON.stringify({
              version: "x",
              visitor: "qa",
              analytics: false,
              advertising: false,
              at: new Date().toISOString(),
            }),
          );
        } catch {}
      },
      [STORAGE_KEY, JSON.stringify(s)],
    );
    for (const route of ROUTES[who]) {
      const page = await ctx.newPage();
      const errors = [],
        failed = [];
      page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 160)));
      page.on("response", (r) => {
        if (r.status() >= 500 && !route.includes("qa2=error"))
          failed.push(`${r.status()} ${r.url().replace(SUPA, "").slice(0, 90)}`);
      });
      // The error state: every Kabsi function answers 500, as when the backend is down.
      if (route.includes("qa2=error"))
        await page.route("**/functions/v1/**", (r) =>
          r.fulfill({
            status: 500,
            contentType: "application/json",
            headers: { "access-control-allow-origin": "*" },
            body: '{"error":"qa2"}',
          }),
        );
      const rec = { who, route, width, browser: BROWSER };
      try {
        await page.goto(BASE + route.replace("#disconnect-dialog", ""), {
          waitUntil: "load",
          timeout: 45000,
        });
        await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
        await page.waitForTimeout(1500);
        rec.url = page.url().replace(BASE, "");
        if (route.endsWith("#disconnect-dialog")) {
          const b = page.getByRole("button", { name: "Disconnect", exact: true }).first();
          await b.scrollIntoViewIfNeeded().catch(() => {});
          await b.click({ timeout: 8000 });
          await page.waitForTimeout(600);
        }
        const name = `${who}-${route.replace(/[/?#=&]+/g, "-").replace(/^-/, "")}-${width}`;
        await page.screenshot({ path: join(OUT, "shots", `${name}-first.png`) });
        rec.coveredFirst = await covered(page);
        const m = await measure(page, width);
        await page
          .screenshot({ path: join(OUT, "shots", `${name}-full.png`), fullPage: true })
          .catch(() => {});
        if (route.endsWith("#disconnect-dialog")) {
          await page
            .getByRole("button", { name: "Cancel" })
            .click({ timeout: 5000 })
            .catch(() => (rec.cancel = "Cancel not found"));
        }
        Object.assign(rec, {
          sideways: m.sideways,
          wide: m.wide,
          small: m.small,
          images: m.images,
          h1: m.h1,
          title: m.title,
          words: words(m.text),
          textStart: m.text.slice(0, 300).replace(/\s+/g, " "),
        });
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze()
          .catch(() => ({ violations: [] }));
        rec.axe = axe.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          n: v.nodes.length,
          first: v.nodes[0]?.target?.join(" "),
        }));
      } catch (e) {
        rec.error = String(e.message ?? e).slice(0, 200);
      }
      rec.pageErrors = errors;
      rec.failed = failed;
      results.push(rec);
      process.stdout.write(rec.error ? "E" : ".");
      await page.close();
    }
    await ctx.close();
  }
}
await browser.close();
writeFileSync(join(OUT, "findings.json"), JSON.stringify(results, null, 1));
console.log(`\n${results.length} screens`);
