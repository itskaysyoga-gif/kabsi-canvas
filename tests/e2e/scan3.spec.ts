// Scan 3 (master plan 30.34 item 2): the free check result, progressive, in Kabsi's look. Every Google and provider call
// is stubbed (no Places, no DataForSEO, no AI): the five businesses of the task, the order of the result, the details on
// request, one primary button, the report by email and by WhatsApp, changing the business, every action's path and axe.
// The live case (SEVEN Burgers & Beyond, saved check CFE4RMDN, reused with no new spend) runs only against kabsi.co.
import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

const SHOTS = "docs/scan3";
const DONE = JSON.parse(readFileSync("tests/fixtures/scan3/free-check-done.json", "utf8")) as Record<
  string,
  unknown
>;
const PASS = `${Math.floor(Date.now() / 1000) + 900}.stubsignature`;

type Flag = { tone: "danger" | "warning" | "neutral"; fact: string; action: string };
const N: Flag[] = [
  {
    tone: "neutral",
    fact: "Google does not show the public which reviews have a reply.",
    action:
      "Once you connect, Kabsi counts the reviews with no reply and prepares one for each. You approve every reply.",
  },
];
const snap = (o: Record<string, unknown>) => ({
  place_id: "ChIJscan3AAAAAAAA",
  name: "Example",
  address: "1 High Street, Example Town, UK",
  category: "Barber shop",
  rating: 4.7,
  review_count: 40,
  business_status: "OPERATIONAL",
  open_now: true,
  hours: ["Monday: 9:00 to 18:00"],
  phone: "+44 20 7946 0000",
  website: "https://example.com",
  has_photos: true,
  photo_count: 10,
  flags: N,
  checklist: [],
  cached: false,
  area: "Example Town",
  ...o,
});

/** The five businesses of the task, with the main finding each should lead with. */
const BUSINESSES = {
  ukBarber: {
    q: "Fade Room Example Town",
    snapshot: snap({
      name: "Fade Room",
      category: "Barber shop",
      review_count: 4,
      flags: [
        {
          tone: "warning",
          fact: "There are 4 reviews so far.",
          action:
            "Kabsi gives you a review link and QR code that make it easy for every customer to leave one.",
        },
        ...N,
      ],
    }),
    finding: "There are 4 reviews so far.",
  },
  uaeSalon: {
    q: "Pearl Beauty Salon Dubai",
    snapshot: snap({
      name: "Pearl Beauty Salon",
      address: "Al Wasl Road, Dubai, United Arab Emirates",
      area: "Dubai",
      category: "Beauty salon",
      has_photos: false,
      photo_count: 0,
      flags: [
        {
          tone: "warning",
          fact: "Google shows no photos for this business.",
          action: "Kabsi asks for photos from your phone and prepares them for you to approve.",
        },
        ...N,
      ],
    }),
    finding: "Google shows no photos for this business.",
  },
  restaurant: {
    q: "Harbour Burgers Example Town",
    snapshot: snap({ name: "Harbour Burgers", category: "Fast food restaurant" }),
    finding: "Google shows the basics of your profile.",
  },
  clinic: {
    q: "Example Dental Clinic",
    snapshot: snap({
      name: "Example Dental Clinic",
      category: "Dental clinic",
      phone: null,
      flags: [
        {
          tone: "warning",
          fact: "No phone number is shown on Google.",
          action:
            "Add your phone number on your Google profile. Once you connect, Kabsi checks it every day with your other details.",
        },
        ...N,
      ],
    }),
    finding: "No phone number is shown on Google.",
  },
  missing: {
    q: "Quiet Corner Cafe",
    snapshot: snap({
      name: "Quiet Corner Cafe",
      category: null,
      hours: [],
      phone: null,
      website: null,
      has_photos: false,
      photo_count: 0,
      flags: [
        {
          tone: "danger",
          fact: "No opening hours are shown on Google.",
          action: "Kabsi asks you for your hours and sends them to Google once you say yes.",
        },
        {
          tone: "warning",
          fact: "No phone number is shown on Google.",
          action: "Add your phone number on your Google profile.",
        },
        ...N,
      ],
    }),
    finding: "No opening hours are shown on Google.",
  },
} as const;
type Key = keyof typeof BUSINESSES;

type Call = { action: string; body: Record<string, unknown> };

async function stub(page: Page, o: { business: Key; nearby?: "done" | "unavailable" }) {
  const calls: Call[] = [];
  let current: Key = o.business;
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
  await page.route("**/functions/v1/profile-snapshot", async (route) => {
    const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
    calls.push({ action: String(body["action"]), body });
    const a = body["action"];
    if (a === "pass") return json(route, { pass: PASS });
    if (a === "suggest") {
      const q = String(body["query"]).toLowerCase();
      const hits = (Object.keys(BUSINESSES) as Key[])
        .filter((k) => BUSINESSES[k].snapshot.name.toLowerCase().includes(q.slice(0, 3)))
        .map((k) => ({ place_id: `ChIJ${k}AAAAAAAA`, name: BUSINESSES[k].snapshot.name, address: "Example Town" }));
      return json(route, { suggestions: hits, available: true });
    }
    if (a === "search") {
      const k = (Object.keys(BUSINESSES) as Key[]).find((x) => BUSINESSES[x].q === body["query"]);
      return json(route, {
        places: k
          ? [{ place_id: `ChIJ${k}AAAAAAAA`, name: BUSINESSES[k].snapshot.name, address: "Example Town", category: "x" }]
          : [],
      });
    }
    if (a === "check") {
      const id = String(body["place_id"]);
      const k = (Object.keys(BUSINESSES) as Key[]).find((x) => id === `ChIJ${x}AAAAAAAA`) ?? current;
      current = k;
      return json(route, { snapshot: { ...BUSINESSES[k].snapshot, place_id: id } });
    }
    if (a === "email" || a === "whatsapp") return json(route, { ok: true });
    return json(route, { error: "bad", message: "no" }, 400);
  });
  await page.route("**/functions/v1/visibility/check", (route) =>
    o.nearby === "unavailable"
      ? json(route, { state: "unavailable" })
      : json(route, { ...DONE, business: BUSINESSES[current].snapshot.name }),
  );
  await page.route("**/functions/v1/visibility/check/result", (route) => json(route, DONE));
  await page.route("**/functions/v1/programs/founding", (route) =>
    json(route, { total: 25, left: 12 }),
  );
  return calls;
}

async function openResult(page: Page, k: Key) {
  await page.goto(`/scan?q=${encodeURIComponent(BUSINESSES[k].q)}`);
  await page.getByRole("button", { name: "This is my business" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(BUSINESSES[k].snapshot.name);
}

const axe = async (page: Page) => {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
};

test.describe("Scan 3: the free check result", () => {
  for (const k of Object.keys(BUSINESSES) as Key[]) {
    test(`${k}: the business, the main finding, what Kabsi would do, details on request, one trial button`, async ({
      page,
    }, info) => {
      await stub(page, { business: k, nearby: k === "clinic" ? "unavailable" : "done" });
      await openResult(page, k);
      const main = page.locator("main");
      await expect(page.getByText("Not your business? Change it")).toBeVisible();
      await expect(page.getByRole("heading", { name: "The main thing we found" })).toBeVisible();
      await expect(page.getByText(BUSINESSES[k].finding, { exact: true })).toBeVisible();
      await expect(page.getByText("Next step:")).toBeVisible();
      await expect(page.getByRole("heading", { name: "What Kabsi would do" })).toBeVisible();
      await expect(page.locator('section[aria-labelledby="day1-h"] li')).toHaveCount(3);
      await expect(
        page.getByText("Kabsi cannot promise more reviews or a higher place on Google Maps."),
      ).toBeVisible();
      // The details are closed until asked for; each shows its one-line answer while closed.
      const details = page.locator("details[data-detail]");
      // The clinic's nearby check is unavailable today, and a profile with no category gives no search term: only the
      // Google part, with no error and no promise (Go live 1, 30.28).
      const googleOnly = k === "clinic" || k === "missing";
      await expect(details).toHaveCount(googleOnly ? 1 : 3);
      for (const d of await details.all()) expect(await d.getAttribute("open")).toBeNull();
      if (!googleOnly) {
        await expect(page.locator('details[data-detail="nearby"] > summary')).toContainText(
          "you appear 2nd in this Google Maps check.",
        );
        await page.locator('details[data-detail="nearby"] > summary').click();
        await expect(page.getByText("Diagram, not a map", { exact: false })).toBeVisible();
        await expect(
          page.getByText(/You appeared in the first three at 5 of 49 points around you\./),
        ).toBeVisible();
        await expect(page.getByText("Who came up most around you")).toBeVisible();
        await expect(page.getByText(/different results depending on where someone searches/)).toBeVisible();
        await page.locator('details[data-detail="ai"] > summary').click();
        await expect(page.getByRole("heading", { name: "Did ChatGPT name your business?" })).toBeVisible();
        await expect(page.getByText("Model: ChatGPT (gpt-4.1-mini)")).toBeVisible();
        await expect(page.getByText(/^Question: 'best fast food restaurant/)).toBeVisible();
      }
      // One primary (yellow) button in the result: the trial.
      await expect(page.getByRole("button", { name: "Start your 14-day free trial" })).toBeVisible();
      await expect(
        page.getByText("The 14 days start when Kabsi's access to your Google profile works."),
      ).toBeVisible();
      await expect(page.getByText("No card. Cancel any time.")).toBeVisible();
      await expect(page.getByText("Why Kabsi asks for Manager access")).toBeVisible();
      await expect(page.getByText("Or apply for Founding 25: three months of Pro, free")).toBeVisible();
      const yellow = await main.evaluate(
        (el) =>
          [...el.querySelectorAll("a, button")].filter(
            (b) => getComputedStyle(b).backgroundColor === "rgb(255, 214, 10)",
          ).length,
      );
      expect(yellow, "one yellow button").toBe(1);
      // No text under 14 px in the main result (the Google Maps attribution excepted).
      const tiny = await main.evaluate((el) =>
        [...el.querySelectorAll("p, li, span, dd, dt, h2, h3, h4, summary")]
          .filter(
            (x) =>
              x.textContent?.trim() &&
              !x.closest("[data-testid=places-attribution]") &&
              !x.closest("[aria-hidden=true]") &&
              !x.closest("figure") &&
              parseFloat(getComputedStyle(x).fontSize) < 14,
          )
          .map((x) => x.textContent?.trim().slice(0, 40)),
      );
      expect(tiny).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
      await axe(page);
      if (k === "restaurant" || k === "missing")
        await page.screenshot({ path: `${SHOTS}/after-result-${k}-${info.project.name}.png`, fullPage: true });
    });
  }

  test("changing the business clears the old result", async ({ page }) => {
    await stub(page, { business: "ukBarber" });
    await openResult(page, "ukBarber");
    await page.getByRole("link", { name: "Not your business? Change it" }).click();
    await expect(page).toHaveURL(/change=/);
    await expect(page.getByRole("heading", { name: "Find your business again" })).toBeVisible();
    await expect(page.getByText(BUSINESSES.ukBarber.finding, { exact: true })).toHaveCount(0);
    const box = page.getByRole("combobox");
    await box.fill("");
    await box.pressSequentially("Pearl", { delay: 40 });
    await page.getByRole("option").first().click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Pearl Beauty Salon");
    await expect(page.getByText(BUSINESSES.uaeSalon.finding, { exact: true })).toBeVisible();
    await expect(page.getByText("Fade Room")).toHaveCount(0);
  });

  test("the report: one delivery choice at a time, what arrives, email and WhatsApp in mock", async ({
    page,
  }) => {
    const calls = await stub(page, { business: "restaurant" });
    await openResult(page, "restaurant");
    const report = page.locator('section[aria-labelledby="report-h"]');
    await expect(report).toContainText(
      "You get the summary of what Google shows, the nearby check and the ChatGPT answer, and the link to this result.",
    );
    await expect(report.getByRole("textbox", { name: "Email" })).toBeVisible();
    await expect(report.getByRole("textbox", { name: "WhatsApp number" })).toHaveCount(0);
    await report.getByRole("textbox", { name: "Email" }).fill("owner@example.com");
    await report.getByRole("button", { name: "Send me this report" }).click();
    await expect(report.getByText("Sent.")).toBeVisible();
    const email = calls.find((c) => c.action === "email")!;
    expect(email.body["code"]).toBe("TESTSCN3");
    expect(email.body["consent_text"]).toBe("Send me tips on managing my Google profile");

    await page.reload();
    await page.getByRole("button", { name: "This is my business" }).first().click();
    const r2 = page.locator('section[aria-labelledby="report-h"]');
    await r2.getByText("WhatsApp", { exact: true }).click();
    await expect(r2.getByRole("textbox", { name: "Email" })).toHaveCount(0);
    await r2.getByRole("textbox", { name: "WhatsApp number" }).fill("+44 7700 900123");
    await r2.getByRole("button", { name: "Send me this report" }).click();
    await expect(r2.getByText("Tick the box to get the report on WhatsApp.")).toBeVisible();
    await r2.getByRole("checkbox").check();
    await r2.getByRole("button", { name: "Send me this report" }).click();
    await expect(r2.getByText("Sent.")).toBeVisible();
    const wa = calls.find((c) => c.action === "whatsapp")!;
    expect(wa.body["consent_text"]).toBe(
      "Send my Google Profile Check to this WhatsApp number as one message. I understand Kabsi will not message me again unless I ask.",
    );
  });

  test("every action goes where it says", async ({ page }) => {
    await stub(page, { business: "uaeSalon" });
    await openResult(page, "uaeSalon");
    await expect(page.getByRole("link", { name: "See the setup steps" })).toHaveAttribute(
      "href",
      "/guides/add-manager-google-business-profile",
    );
    await expect(
      page.getByRole("link", { name: "Or apply for Founding 25: three months of Pro, free" }),
    ).toHaveAttribute("href", "/founding");
    await page.getByText("The full trial terms").click();
    await expect(page.getByText("When the 14 days start")).toBeVisible();
    await page.getByRole("button", { name: "Start your 14-day free trial" }).click();
    await expect(page).toHaveURL(/\/login\?next=%2Fstart|\/login\?next=\/start/);
  });

  test("the saved result /scan/CODE in the same order, with the free check as its action", async ({
    page,
  }, info) => {
    await stub(page, { business: "restaurant" });
    await page.goto("/scan/TESTSCN3");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Harbour Burgers");
    await expect(page.getByRole("heading", { name: "The main thing we found" })).toBeVisible();
    await expect(page.getByText(/you appear 2nd in this Google Maps check\./).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "What Kabsi would do" })).toBeVisible();
    await expect(page.locator("details[data-detail]")).toHaveCount(2);
    await expect(page.getByRole("combobox")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await axe(page);
    await page.screenshot({ path: `${SHOTS}/after-saved-${info.project.name}.png`, fullPage: true });
  });

  test("the empty /scan page: highlight, numbered checks with a label, a photo", async ({ page }, info) => {
    await page.goto("/scan");
    await expect(page.locator("h1 .d9-mark")).toHaveText("free.");
    await expect(page.getByText("What Kabsi checks")).toBeVisible();
    await expect(page.getByText("About 10 seconds", { exact: true })).toBeVisible();
    await expect(page.locator("figure ol li")).toHaveCount(5);
    await expect(page.getByAltText("A salon owner looking at a tablet in her salon")).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await axe(page);
    await page.screenshot({ path: `${SHOTS}/after-scan-${info.project.name}.png`, fullPage: true });
  });
});

test.describe("Scan 3 live: SEVEN Burgers & Beyond (CFE4RMDN, reused, no new spend)", () => {
  test.skip(!!process.env["KABSI_BASE_URL"] && !process.env["KABSI_BASE_URL"].includes("kabsi.co"), "production only");
  test("the saved result reads in plain words, with no Arabic", async ({ page }) => {
    await page.goto("/scan/CFE4RMDN");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("SEVEN Burgers");
    await expect(page.getByText(/you appear 2nd in this Google Maps check\./).first()).toBeVisible();
    await page.locator('details[data-detail="ai"] > summary').click();
    await expect(page.getByText(/^Question: 'best fast food restaurant in Boqaata, Lebanon'/)).toBeVisible();
    expect(await page.locator("body").innerText()).not.toMatch(/[؀-ۿ]/);
  });
});
