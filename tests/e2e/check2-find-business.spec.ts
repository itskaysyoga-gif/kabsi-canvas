// Check 2 (1 Nov 2026): finding the right business in the free check. Every Google call is stubbed: the Edge Function
// (profile-snapshot) and Cloudflare's Turnstile are answered here, so the run makes no Places request and costs nothing.
// Run against a local build or a preview: KABSI_BASE_URL=http://localhost:5173 npx playwright test tests/e2e/check2-find-business.spec.ts
// It runs at 390 px (phone) and 1440 px (desktop), the two projects of playwright.config.ts.
import { expect, test, type Page, type Route } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { noBanner } from "./helpers/page";

const SHOTS = "test-results/check2";
mkdirSync(SHOTS, { recursive: true });

const SUGGESTIONS = [
  ["ChIJsuggestAAAAAA", "Smile Dental Clinic", "12 Harbour Lane, Example Town, USA"],
  ["ChIJsuggestBBBBBB", "Smile Dental Studio", "4 Main Street, Example Town, USA"],
  ["ChIJsuggestCCCCCC", "Smile Design Dentistry", "90 Oak Avenue, Example Town, USA"],
  ["ChIJsuggestDDDDDD", "Smiles Pediatric Dentistry", "7 Pine Road, Example Town, USA"],
  ["ChIJsuggestEEEEEE", "Smile Works Orthodontics", "301 Lake Street, Example Town, USA"],
].map(([place_id, name, address]) => ({ place_id, name, address }));

const SNAPSHOT = {
  place_id: "ChIJsuggestAAAAAA",
  name: "Smile Dental Clinic",
  address: "12 Harbour Lane, Example Town, USA",
  category: "Dentist",
  rating: 4.6,
  review_count: 128,
  business_status: "OPERATIONAL",
  open_now: true,
  hours: ["Monday: 8:00 AM to 6:00 PM"],
  phone: "(555) 010-0000",
  website: "https://example.com",
  has_photos: true,
  photo_count: 12,
  flags: [],
  checklist: [],
  cached: false,
};

type Calls = { action: string; body: Record<string, unknown> }[];
type Opts = {
  /** "off": suggestions are not available (the Autocomplete cap, a limit or a Google error). */
  suggest?: "on" | "off";
  /** What the search action returns. */
  /** Turnstile takes this long to give a token (ms). */
  turnstileMs?: number;
  /** The first call that carries a pass is told the pass ran out (400 challenge_failed). */
  expirePass?: boolean;
  found?: { place_id: string; name: string; address: string; category: string | null }[];
};

/** Answers the Edge Function and Turnstile. Returns the calls the page made, in order. */
async function stub(page: Page, opts: Opts = {}): Promise<Calls> {
  const calls: Calls = [];
  await noBanner(page);
  await page.route("https://challenges.cloudflare.com/**", (route: Route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `window.turnstile = {
        render: (el, o) => { setTimeout(() => o.callback("stub-token"), ${opts.turnstileMs ?? 30}); return "w1"; },
        reset: () => {}, remove: () => {},
      };`,
    }),
  );
  await page.route("**/functions/v1/profile-snapshot", async (route: Route) => {
    const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
    calls.push({ action: String(body["action"]), body });
    const json = (o: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(o),
      });
    if (body["action"] === "suggest") {
      if (opts.expirePass && body["pass"] && !body["turnstile"]) {
        opts.expirePass = false;
        return json(
          { error: "challenge_failed", message: "Please complete the check and try again." },
          400,
        );
      }
      if (opts.suggest === "off") return json({ suggestions: [], available: false });
      const q = String(body["query"]).toLowerCase();
      const hits = SUGGESTIONS.filter((s) => s.name.toLowerCase().includes(q.slice(0, 3)));
      return json({
        suggestions: hits,
        available: true,
        ...(body["pass"] ? {} : { pass: "stub-pass" }),
      });
    }
    if (body["action"] === "search") return json({ places: opts.found ?? [] });
    if (body["action"] === "check") return json({ snapshot: SNAPSHOT });
    return json({ error: "bad", message: "no" }, 400);
  });
  // The nearby check is not part of this task: the page carries on without it.
  await page.route("**/functions/v1/visibility/**", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  );
  return calls;
}

/** Typing before the page has hydrated is lost; wait for the scripts to settle first. */
async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
}

const suggestCalls = (c: Calls) => c.filter((x) => x.action === "suggest");

test.describe("Check 2: suggestions while typing", () => {
  test("every free check box suggests: 3 characters, a pause, at most 5, with the attribution", async ({
    page,
  }, info) => {
    const calls = await stub(page);
    await open(page, "/");
    const box = page.getByRole("combobox").first();
    await box.scrollIntoViewIfNeeded();
    await box.click();
    await box.pressSequentially("sm", { delay: 40 });
    await page.waitForTimeout(600);
    expect(suggestCalls(calls), "2 characters ask nothing").toHaveLength(0);
    await box.pressSequentially("i", { delay: 40 });
    // Typing on quickly: the 300 ms pause means one call for the whole word, not one per key.
    await box.pressSequentially("le d", { delay: 60 });
    await expect(page.getByRole("option").first()).toBeVisible();
    const asked = suggestCalls(calls);
    expect(asked.length, "a pause before asking, not a call per key").toBeLessThanOrEqual(2);
    expect(asked.at(-1)!.body["query"]).toBe("smile d");
    expect(await page.getByRole("option").count()).toBeLessThanOrEqual(5);
    await expect(page.getByRole("option").first()).toContainText("Smile Dental Clinic");
    await expect(page.getByRole("option").first()).toContainText("12 Harbour Lane");
    // Google's Places policy: results without a Google map carry the words "Google Maps".
    await expect(page.getByTestId("places-attribution")).toHaveText("Google Maps");
    // The first call carried the bot check, later ones the pass; every call the same session token.
    expect(asked[0]!.body["turnstile"]).toBe("stub-token");
    expect(typeof asked[0]!.body["session_token"]).toBe("string");
    expect(new Set(asked.map((c) => c.body["session_token"])).size).toBe(1);
    for (const c of asked.slice(1)) {
      expect(c.body["pass"]).toBe("stub-pass");
      expect(c.body["turnstile"]).toBeUndefined();
    }
    await page.screenshot({ path: `${SHOTS}/home-suggestions-${info.project.name}.png` });
  });

  test("the combobox follows the keyboard pattern and tells a screen reader", async ({ page }) => {
    const calls = await stub(page);
    await open(page, "/scan");
    const box = page.getByRole("combobox");
    await box.click();
    await box.pressSequentially("smile", { delay: 40 });
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(box).toHaveAttribute("aria-expanded", "true");
    await expect(box).toHaveAttribute("aria-autocomplete", "list");
    const listId = await box.getAttribute("aria-controls");
    expect(await page.getByRole("listbox").getAttribute("id")).toBe(listId);
    await expect(page.getByRole("status")).toContainText("5 suggestions");

    await box.press("ArrowDown");
    const first = page.getByRole("option").nth(0);
    await expect(first).toHaveAttribute("aria-selected", "true");
    expect(await box.getAttribute("aria-activedescendant")).toBe(await first.getAttribute("id"));
    await box.press("ArrowDown");
    await expect(page.getByRole("option").nth(1)).toHaveAttribute("aria-selected", "true");
    await box.press("ArrowUp");
    await expect(first).toHaveAttribute("aria-selected", "true");
    await box.press("ArrowUp");
    await expect(page.getByRole("option").nth(4)).toHaveAttribute("aria-selected", "true");

    await box.press("Escape");
    await expect(box).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(box).toHaveValue("smile");
    await box.press("ArrowDown");
    await expect(box).toHaveAttribute("aria-expanded", "true");

    // Enter on the highlighted suggestion chooses it: straight to the check with the Place ID.
    await box.press("ArrowDown");
    await box.press("Enter");
    await expect(page).toHaveURL(/\/scan\?.*place=ChIJsuggest/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Smile Dental Clinic");
    const check = calls.find((c) => c.action === "check")!;
    expect(check.body["place_id"], "the second suggestion was the one chosen").toBe(
      "ChIJsuggestBBBBBB",
    );
    // Place Details carries the suggestions' session token, which ends the Autocomplete session.
    expect(check.body["session_token"]).toBe(suggestCalls(calls)[0]!.body["session_token"]);
  });

  test("Enter with no suggestion highlighted still searches the typed text", async ({ page }) => {
    const calls = await stub(page, {
      found: [
        {
          place_id: "ChIJsearchAAAAAA",
          name: "Smile Dental Clinic",
          address: "12 Harbour Lane",
          category: "Dentist",
        },
      ],
    });
    await open(page, "/scan");
    const box = page.getByRole("combobox");
    await box.fill("Smile Dental Clinic Example Town");
    await box.press("Enter");
    await expect(page).toHaveURL(/\/scan\?q=Smile/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Is this your business?");
    expect(calls.some((c) => c.action === "search")).toBe(true);
  });

  test("when suggestions are not available the box is a plain search, then pick", async ({
    page,
  }) => {
    const calls = await stub(page, {
      suggest: "off",
      found: [
        {
          place_id: "ChIJsearchAAAAAA",
          name: "Smile Dental Clinic",
          address: "12 Harbour Lane",
          category: "Dentist",
        },
        {
          place_id: "ChIJsearchBBBBBB",
          name: "Smile Dental Studio",
          address: "4 Main Street",
          category: "Dentist",
        },
      ],
    });
    await open(page, "/scan");
    const box = page.getByRole("combobox");
    await box.pressSequentially("smile dental", { delay: 40 });
    await page.waitForTimeout(700);
    await expect(page.getByRole("listbox")).toHaveCount(0);
    const before = suggestCalls(calls).length;
    await box.pressSequentially(" clinic", { delay: 40 });
    await page.waitForTimeout(700);
    expect(suggestCalls(calls).length, "after a refusal the page stops asking").toBe(before);
    await box.press("Enter");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Pick your business");
    await expect(page.getByRole("button", { name: "This is my business" })).toHaveCount(2);
  });

  test("a fast typist with a slow bot check still gets suggestions, and they stay on", async ({
    page,
  }) => {
    const calls = await stub(page, { turnstileMs: 1500 });
    await open(page, "/scan");
    const box = page.getByRole("combobox");
    await box.click();
    // Keys keep coming while the first bot check is still being solved: the older waits must not take the token the newer one needs.
    await box.pressSequentially("smi", { delay: 40 });
    await page.waitForTimeout(450);
    await box.pressSequentially("le", { delay: 40 });
    await page.waitForTimeout(450);
    await box.pressSequentially(" d", { delay: 40 });
    await expect(page.getByRole("option").first()).toBeVisible({ timeout: 8000 });
    await box.pressSequentially("e", { delay: 40 });
    await expect(page.getByRole("listbox")).toBeVisible();
    expect(suggestCalls(calls).every((c) => c.body["turnstile"] || c.body["pass"])).toBe(true);
  });

  test("when the pass has run out the box asks for a fresh bot check and carries on", async ({
    page,
  }) => {
    const calls = await stub(page, { expirePass: true });
    await open(page, "/scan");
    const box = page.getByRole("combobox");
    await box.click();
    await box.pressSequentially("smile", { delay: 40 });
    await expect(page.getByRole("option").first()).toBeVisible();
    await box.pressSequentially(" den", { delay: 40 });
    await expect(page.getByRole("option").first()).toBeVisible();
    await page.waitForTimeout(500);
    const refused = calls.findIndex(
      (c) => c.action === "suggest" && c.body["pass"] && !c.body["turnstile"],
    );
    expect(refused, "the pass was refused once").toBeGreaterThan(0);
    expect(
      calls.slice(refused + 1).some((c) => c.action === "suggest" && c.body["turnstile"]),
      "and a fresh bot check followed",
    ).toBe(true);
  });

  test("the list stays on screen with the phone keyboard open", async ({ page }, info) => {
    test.skip(info.project.name !== "m390", "phone only");
    await stub(page);
    await open(page, "/scan");
    // A short window is what a phone keyboard leaves of the screen.
    await page.setViewportSize({ width: 390, height: 400 });
    const box = page.getByRole("combobox");
    await box.click();
    await box.pressSequentially("smile", { delay: 40 });
    await expect(page.getByRole("option").first()).toBeVisible();
    await page.waitForTimeout(300);
    const r = await page.getByTestId("places-attribution").boundingBox();
    expect(
      r!.y + r!.height,
      "the attribution at the foot of the list is inside the visible window",
    ).toBeLessThanOrEqual(400 + 1);
    expect(r!.width).toBeLessThanOrEqual(390);
    await page.screenshot({ path: `${SHOTS}/scan-keyboard-open-390.png` });
  });
});

test.describe("Check 2: Kabsi never picks for the visitor", () => {
  test("one match is asked about first, with name, address and category", async ({
    page,
  }, info) => {
    const calls = await stub(page, {
      found: [
        {
          place_id: "ChIJsearchAAAAAA",
          name: "Smile Dental Clinic",
          address: "12 Harbour Lane, Example Town, USA",
          category: "Dentist",
        },
      ],
    });
    await page.goto("/scan?q=Smile%20Dental");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Is this your business?");
    await expect(page.getByText("Smile Dental Clinic")).toBeVisible();
    await expect(page.getByText("12 Harbour Lane, Example Town, USA")).toBeVisible();
    await expect(page.getByText("Dentist", { exact: true })).toBeVisible();
    await page.waitForTimeout(800);
    expect(
      calls.some((c) => c.action === "check"),
      "no business is looked up before the visitor says yes",
    ).toBe(false);
    await page.screenshot({ path: `${SHOTS}/pick-one-${info.project.name}.png` });

    await page.getByRole("button", { name: "This is my business" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Smile Dental Clinic");
    expect(calls.filter((c) => c.action === "check")).toHaveLength(1);
    expect(
      calls.find((c) => c.action === "check")!.body["session_token"],
      "a plain search has no suggestion session",
    ).toBeUndefined();
  });

  test("'Not here? Search again' keeps the typed text and looks nothing up", async ({ page }) => {
    const calls = await stub(page, {
      found: [
        {
          place_id: "ChIJsearchAAAAAA",
          name: "Smile Dental Clinic",
          address: "12 Harbour Lane",
          category: "Dentist",
        },
      ],
    });
    await page.goto("/scan?q=Smile%20Dental&keyword=dentist&industry=dentist");
    await page.getByRole("link", { name: "Not here? Search again" }).click();
    await expect(page).toHaveURL(/change=true/);
    await expect(page.getByRole("combobox")).toHaveValue("Smile Dental");
    await expect(page.getByText("Kabsi searches for 'dentist'")).toBeVisible();
    const searches = calls.filter((c) => c.action === "search").length;
    await page.waitForTimeout(500);
    expect(calls.filter((c) => c.action === "search").length).toBe(searches);
  });

  test("every result has 'Not your business? Change it', back to the search with the text kept", async ({
    page,
  }, info) => {
    const calls = await stub(page, {
      found: [
        {
          place_id: "ChIJsearchAAAAAA",
          name: "Smile Dental Clinic",
          address: "12 Harbour Lane, Example Town, USA",
          category: "Dentist",
        },
      ],
    });
    await page.goto("/scan?q=Smile%20Dental");
    await page.getByRole("button", { name: "This is my business" }).click();
    const change = page.getByRole("link", { name: "Not your business? Change it" });
    await expect(change).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/result-${info.project.name}.png` });
    const searches = calls.filter((c) => c.action === "search").length;
    await change.click();
    await expect(page.getByRole("combobox")).toHaveValue("Smile Dental");
    expect(
      calls.filter((c) => c.action === "search").length,
      "changing does not search by itself",
    ).toBe(searches);
  });

  test("a suggestion chosen in the box also leads to a result with the change link", async ({
    page,
  }) => {
    await stub(page);
    await open(page, "/scan");
    const box = page.getByRole("combobox");
    await box.pressSequentially("smile", { delay: 40 });
    await page.getByRole("option").first().click();
    const change = page.getByRole("link", { name: "Not your business? Change it" });
    await expect(change).toBeVisible();
    await change.click();
    // The text the visitor typed is kept, not the name they chose.
    await expect(page.getByRole("combobox")).toHaveValue("smile");
  });
});
