// App 6 (master plan 30.34 item 5): Settings' "Where your routine messages go", the four switches and "Choose how each one
// reaches you". A made-up owner (scripts/app-shots/fixtures.mjs answers every Supabase call; nothing reaches Supabase)
// at 390 and 1440 px. The choice must show at once while the save is still on its way, stay after a reload, go back with
// one plain line when the save fails, and say why WhatsApp cannot be chosen when it cannot. axe on each state.
// Run it against a local build: KABSI_BASE_URL=http://localhost:4173 npx playwright test tests/e2e/app6-settings.spec.ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { noBanner } from "./helpers/page";
import { SUPABASE, fakeSession, STORAGE_KEY } from "./helpers/fake-auth";
// The invented business and the answer function the screenshots and the audit use (a plain .mjs, not type-checked).
import { answer, LOCATION_ID } from "../../scripts/app-shots/fixtures.mjs";

type Pref = { category: string; channel: string; frequency: string };
type Server = {
  status: { state: string; review_alerts: boolean; digest_optin: boolean; phone_last4: string };
  stored: "email" | "whatsapp" | null;
  prefs: Pref[];
  failSaves: boolean;
  delayMs: number;
  /** Launch 1: whatsapp_owners_on. */
  ownersOn: boolean;
  calls: string[];
};

const newServer = (over: Partial<Server> = {}): Server => ({
  status: { state: "active", review_alerts: false, digest_optin: false, phone_last4: "0101" },
  stored: "email",
  prefs: [],
  failSaves: false,
  delayMs: 0,
  ownersOn: true,
  calls: [],
  ...over,
});

const json = (body: unknown, status = 200) => ({
  status,
  contentType: "application/json",
  headers: { "access-control-allow-origin": "*", "access-control-expose-headers": "content-range" },
  body: JSON.stringify(body),
});

/** A signed-in made-up owner whose WhatsApp choices live in `srv`, a small stand-in for the database. */
async function open(page: Page, srv: Server) {
  await noBanner(page);
  await page.addInitScript(
    ([k, v]) => {
      try {
        if (!window.sessionStorage.getItem("seeded")) {
          window.sessionStorage.setItem("seeded", "1");
          window.localStorage.setItem(k as string, v as string);
        }
      } catch {
        /* blocked */
      }
    },
    [STORAGE_KEY, JSON.stringify(fakeSession("00000000-0000-4000-8000-000000000001"))],
  );
  await page.route(`${SUPABASE}/**`, async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS")
      return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
    const path = new URL(req.url()).pathname;
    const body = req.postData() ? JSON.parse(req.postData()!) : {};
    if (path.endsWith("/rpc/whatsapp_status")) return route.fulfill(json(srv.status));
    if (path.endsWith("/rpc/whatsapp_owners_on")) return route.fulfill(json(srv.ownersOn));
    if (path.endsWith("/rpc/whatsapp_set_prefs")) {
      srv.calls.push(`wa:${body.p_review_alerts}:${body.p_digest}`);
      await new Promise((r) => setTimeout(r, srv.delayMs));
      if (srv.failSaves) return route.fulfill(json({ message: "boom" }, 500));
      srv.status = {
        ...srv.status,
        ...(body.p_review_alerts == null ? {} : { review_alerts: body.p_review_alerts }),
        ...(body.p_digest == null ? {} : { digest_optin: body.p_digest }),
      };
      return route.fulfill(json(srv.status));
    }
    if (path.endsWith("/rpc/my_notification_prefs")) return route.fulfill(json(srv.prefs));
    if (path.endsWith("/rest/v1/routine_channels"))
      return route.fulfill(
        json(srv.stored ? { channel: srv.stored } : null, srv.stored ? 200 : 406),
      );
    if (path.endsWith("/rpc/set_routine_delivery")) {
      srv.calls.push(`delivery:${body.p_channel}`);
      await new Promise((r) => setTimeout(r, srv.delayMs));
      if (srv.failSaves) return route.fulfill(json({ message: "boom" }, 500));
      srv.stored = body.p_channel;
      const wa = body.p_channel === "whatsapp";
      srv.status = { ...srv.status, review_alerts: wa, digest_optin: wa };
      return route.fulfill(json({ channel: srv.stored }));
    }
    if (path.endsWith("/rpc/set_notification_pref")) {
      srv.calls.push(`pref:${body.p_category}:${body.p_frequency}`);
      await new Promise((r) => setTimeout(r, srv.delayMs));
      if (srv.failSaves) return route.fulfill(json({ message: "boom" }, 500));
      srv.prefs = [
        ...srv.prefs.filter(
          (p) => !(p.category === body.p_category && p.channel === body.p_channel),
        ),
        { category: body.p_category, channel: body.p_channel, frequency: body.p_frequency },
      ];
      return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
    }
    const res = answer(req.method(), req.url(), req.headers(), req.postData(), "");
    return route.fulfill({
      status: res.status ?? 200,
      contentType: "application/json",
      headers: {
        "access-control-allow-origin": "*",
        "access-control-expose-headers": "content-range",
        ...(res.headers ?? {}),
      },
      body: res.body === undefined ? "" : JSON.stringify(res.body),
    });
  });
  await page.goto("/app/settings");
  await expect(
    page.getByRole("radiogroup", { name: "Where your routine messages go" }),
  ).toBeVisible({
    timeout: 20_000,
  });
}

const group = (page: Page) =>
  page.getByRole("radiogroup", { name: "Where your routine messages go" });
const checked = (page: Page) => group(page).locator("[aria-checked=true]");

async function axeClean(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(
    r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id),
  ).toEqual([]);
}

test.describe("Settings: where routine messages go", () => {
  test("WhatsApp shows at once while the save is slow, then stays after a reload", async ({
    page,
  }) => {
    const srv = newServer({ delayMs: 1500 });
    await open(page, srv);
    await expect(checked(page)).toHaveText("Email");
    const t = Date.now();
    await group(page).getByRole("radio", { name: "WhatsApp" }).click();
    // The save is still 1.5 seconds away; the choice is already on screen.
    await expect(checked(page)).toHaveText("WhatsApp", { timeout: 500 });
    expect(Date.now() - t).toBeLessThan(1400);
    await expect.poll(() => srv.stored, { timeout: 8000 }).toBe("whatsapp");
    await page.reload();
    await expect(checked(page)).toHaveText("WhatsApp");
    expect(srv.calls).toEqual(["delivery:whatsapp"]);
    await axeClean(page);
  });

  test("Email comes back at once too, in one call, and stays after a reload", async ({ page }) => {
    const srv = newServer({
      stored: "whatsapp",
      status: { state: "active", review_alerts: true, digest_optin: true, phone_last4: "0101" },
      delayMs: 1200,
    });
    await open(page, srv);
    await expect(checked(page)).toHaveText("WhatsApp");
    await group(page).getByRole("radio", { name: "Email" }).click();
    await expect(checked(page)).toHaveText("Email", { timeout: 500 });
    await expect.poll(() => srv.stored, { timeout: 8000 }).toBe("email");
    await page.reload();
    await expect(checked(page)).toHaveText("Email");
    expect(srv.calls).toEqual(["delivery:email"]);
  });

  test("a failed save goes back and says so in one plain line", async ({ page }) => {
    const srv = newServer({ failSaves: true, delayMs: 300 });
    await open(page, srv);
    await group(page).getByRole("radio", { name: "WhatsApp" }).click();
    await expect(checked(page)).toHaveText("WhatsApp", { timeout: 250 });
    await expect(page.getByRole("alert").filter({ hasText: "Couldn't save that." })).toHaveText(
      "Couldn't save that. Your messages still go by email. Try again.",
    );
    await expect(checked(page)).toHaveText("Email");
    expect(srv.stored).toBe("email");
    await axeClean(page);
    // Trying again after the fault is gone works and clears the line.
    srv.failSaves = false;
    await group(page).getByRole("radio", { name: "WhatsApp" }).click();
    await expect.poll(() => srv.stored, { timeout: 8000 }).toBe("whatsapp");
    await expect(page.getByText("Couldn't save that.")).toHaveCount(0);
  });

  test("two quick taps are saved one after the other and the last one wins", async ({ page }) => {
    const srv = newServer({ delayMs: 400 });
    await open(page, srv);
    await group(page).getByRole("radio", { name: "WhatsApp" }).click();
    await group(page).getByRole("radio", { name: "Email" }).click();
    await expect(checked(page)).toHaveText("Email");
    await expect.poll(() => srv.calls.length, { timeout: 8000 }).toBe(2);
    await page.waitForTimeout(800);
    expect(srv.calls).toEqual(["delivery:whatsapp", "delivery:email"]);
    expect(srv.stored).toBe("email");
    await expect(checked(page)).toHaveText("Email");
  });

  test("two quick taps that both fail go back to what was saved, with one true line", async ({
    page,
  }) => {
    const srv = newServer({ failSaves: true, delayMs: 500 });
    await open(page, srv);
    await group(page).getByRole("radio", { name: "WhatsApp" }).click();
    await group(page).getByRole("radio", { name: "Email" }).click();
    await expect(
      page.getByText("Couldn't save that. Your messages still go by email. Try again."),
    ).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1200);
    await expect(checked(page)).toHaveText("Email");
    await expect(page.getByText("still go by WhatsApp")).toHaveCount(0);
    expect(srv.stored).toBe("email");
  });

  for (const [state, line] of [
    ["none", "WhatsApp is not connected yet. Connect it below, then choose it here."],
    ["pending", "WhatsApp is not connected yet. Connect it below, then choose it here."],
    ["stopped", "WhatsApp is stopped. Connect it again below, then choose it here."],
  ] as const)
    test(`WhatsApp ${state}: it says why and how to fix it, and changes nothing`, async ({
      page,
    }) => {
      const srv = newServer({
        stored: state === "stopped" ? "whatsapp" : null,
        status: { state, review_alerts: false, digest_optin: false, phone_last4: "" },
      });
      await open(page, srv);
      const radio = group(page).getByRole("radio", { name: "WhatsApp" });
      await expect(radio).toHaveAttribute("aria-disabled", "true");
      await expect(page.getByRole("link", { name: line })).toHaveAttribute("href", "#whatsapp");
      await expect(group(page)).toHaveAttribute("aria-describedby", "routine-why");
      await expect(checked(page)).toHaveText("Email");
      // Playwright treats aria-disabled as not clickable; a finger can still tap it, so force it.
      await radio.click({ force: true });
      await expect(checked(page)).toHaveText("Email");
      expect(srv.calls).toEqual([]);
      await axeClean(page);
    });
});

test.describe("Settings: the switches and the list", () => {
  test("a switch changes at once, can be changed again while saving, and rolls back with a line when the save fails", async ({
    page,
  }) => {
    const srv = newServer({ delayMs: 1000 });
    await open(page, srv);
    const sw = page.getByRole("switch", { name: "New reviews" });
    await expect(sw).toHaveAttribute("aria-checked", "true");
    await sw.click();
    await expect(sw).toHaveAttribute("aria-checked", "false", { timeout: 400 });
    await expect(sw).toBeEnabled();
    await expect
      .poll(() => srv.prefs.find((p) => p.category === "review_new")?.frequency, { timeout: 8000 })
      .toBe("off");
    await page.reload();
    await expect(page.getByRole("switch", { name: "New reviews" })).toHaveAttribute(
      "aria-checked",
      "false",
    );

    srv.failSaves = true;
    srv.delayMs = 200;
    await page.getByRole("switch", { name: "New reviews" }).click();
    await expect(page.getByRole("switch", { name: "New reviews" })).toHaveAttribute(
      "aria-checked",
      "true",
      { timeout: 150 },
    );
    await expect(
      page.getByText("Couldn't save that. It is back as it was. Try again.").first(),
    ).toBeVisible();
    await expect(page.getByRole("switch", { name: "New reviews" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await axeClean(page);
  });

  test("a timing in Choose how each one reaches you shows at once and rolls back when the save fails", async ({
    page,
  }) => {
    const srv = newServer({ delayMs: 800 });
    await open(page, srv);
    await page.getByText("Choose how each one reaches you").click();
    const atOnce = page.getByRole("radio", { name: "At once", exact: true }).first();
    await page
      .locator("label")
      .filter({ hasText: /^At once$/ })
      .first()
      .click();
    await expect(atOnce).toBeChecked({ timeout: 400 });
    await expect.poll(() => srv.prefs.length, { timeout: 8000 }).toBe(1);
    const saved = srv.prefs[0]!;
    expect(saved.frequency).toBe("instant");

    srv.failSaves = true;
    srv.delayMs = 200;
    const digest = page.getByRole("radio", { name: "In the daily email", exact: true }).first();
    await page
      .locator("label")
      .filter({ hasText: /^In the daily email$/ })
      .first()
      .click();
    await expect(digest).toBeChecked({ timeout: 150 });
    await expect(
      page.getByText("Couldn't save that. It is back as it was. Try again.").last(),
    ).toBeVisible();
    await expect(atOnce).toBeChecked();
    await expect(digest).not.toBeChecked();
    expect(srv.prefs).toEqual([saved]);
    await axeClean(page);
  });
  test("Launch 1: owners' WhatsApp switched off reads as paused, with Email chosen", async ({
    page,
  }) => {
    const srv = newServer({ ownersOn: false, stored: "whatsapp" });
    await open(page, srv);
    await expect(
      page.getByText(
        "WhatsApp messages from Kabsi are paused for now. Your reports and reminders come by email.",
      ),
    ).toBeVisible();
    await expect(checked(page)).toHaveText("Email");
    await axeClean(page);
  });

  test("Launch 1: the WhatsApp panel's switches move at once while the save is slow, and stay after a reload", async ({
    page,
  }) => {
    const srv = newServer({ delayMs: 1500 });
    await open(page, srv);
    const sw = page.getByRole("switch", { name: "Your weekly report on WhatsApp" });
    await expect(sw).toHaveAttribute("aria-checked", "false");
    await sw.click();
    await expect(sw).toHaveAttribute("aria-checked", "true", { timeout: 300 });
    await expect.poll(() => srv.status.digest_optin, { timeout: 8000 }).toBe(true);
    await page.reload();
    await expect(
      page.getByRole("switch", { name: "Your weekly report on WhatsApp" }),
    ).toHaveAttribute("aria-checked", "true");
    // A failed save puts the switch back and says so.
    srv.failSaves = true;
    srv.delayMs = 200;
    const alerts = page.getByRole("switch", { name: "Review alerts with Approve" });
    await alerts.click();
    await expect(alerts).toHaveAttribute("aria-checked", "true", { timeout: 300 });
    await expect(
      page.getByText("Couldn't save that. It is back as it was. Try again."),
    ).toBeVisible();
    await expect(alerts).toHaveAttribute("aria-checked", "false");
  });
});

void LOCATION_ID;
