// App 5 (master plan 30.33 item 3): the staff workspace. A made-up staff session (helpers/fake-auth.ts, every Supabase
// call answered here, nothing reaches Supabase) goes from Today to each staff page through the menu and back, at 390
// and 1440 px, with axe on each page. A session that is not staff is refused every staff page exactly as App 4 made it:
// the not-found page, and no staff read is asked for.
import { expect, test, type Page } from "@playwright/test";
import { noBanner, axeClean } from "./helpers/page";
import { signInFake } from "./helpers/fake-auth";

const PAGES = [
  {
    label: "Businesses",
    short: "Businesses",
    path: "/staff/businesses",
    h1: "Every business on Kabsi",
  },
  {
    label: "Conversations",
    short: "Chats",
    path: "/staff/conversations",
    h1: "People waiting for an answer",
  },
  {
    label: "Programs",
    short: "Programs",
    path: "/staff/programs",
    h1: "Founding 25 and Kabsi Partners",
  },
  { label: "System", short: "System", path: "/staff/system", h1: "How the system is running" },
  { label: "Costs", short: "Costs", path: "/staff/costs", h1: "What Kabsi spends", more: true },
  {
    label: "Settings",
    short: "Settings",
    path: "/staff/settings",
    h1: "Staff settings",
    more: true,
  },
] as const;

const wide = (page: Page) => page.viewportSize()!.width >= 1024;

async function openFromMenu(
  page: Page,
  p: (typeof PAGES)[number] | { label: string; short: string; more?: boolean },
) {
  if (wide(page)) {
    await page
      .getByRole("navigation", { name: "Staff" })
      .getByRole("link", { name: p.label })
      .click();
  } else if ("more" in p && p.more) {
    await page.getByRole("button", { name: "Staff menu" }).click();
    await page.getByRole("menuitem", { name: p.label }).click();
  } else {
    await page
      .getByRole("navigation", { name: "Staff" })
      .locator("visible=true")
      .getByRole("link", { name: p.short, exact: true })
      .click();
  }
}

test.describe("the staff workspace", () => {
  test("Today, then each page from the menu and back to Today", async ({ page }) => {
    await noBanner(page);
    await signInFake(page, { staff: true });
    await page.goto("/staff");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("What needs a person today");
    await expect(page.locator("h1")).toHaveCount(1);
    // Nothing waits in the made-up data, so Today says all clear.
    await expect(page.getByText("All clear.")).toBeVisible();
    await axeClean(page, "staff today");
    for (const p of PAGES) {
      await openFromMenu(page, p);
      await expect(page).toHaveURL(new RegExp(`${p.path}$`));
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(p.h1);
      await expect(page.locator("h1")).toHaveCount(1);
      await axeClean(page, `staff ${p.label}`);
      await openFromMenu(page, { label: "Today", short: "Today" });
      await expect(page).toHaveURL(/\/staff$/);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("What needs a person today");
    }
  });

  test("a row on Today opens the panel that handles it", async ({ page }) => {
    await noBanner(page);
    await signInFake(page, {
      staff: true,
      rest: {
        "/rest/v1/staff_followups": [
          {
            id: "f1",
            kind: "whatsapp_nudge",
            location_name: "Harbour Smiles Dental",
            detail: "The phone number is in Staff, Contacts.",
            due_at: "2026-11-01T00:00:00Z",
            created_at: "2026-10-30T00:00:00Z",
          },
        ],
      },
    });
    await page.goto("/staff");
    await expect(page.getByText("1 follow-up is due")).toBeVisible();
    await page.getByRole("link", { name: "Open follow-ups" }).click();
    await expect(page).toHaveURL(/\/staff\/conversations\?show=followups$/);
    await expect(page.getByRole("heading", { name: "Follow-ups", level: 2 })).toBeVisible();
    // The chip shows only that panel; All brings every panel back.
    await expect(page.getByRole("heading", { name: "Chats with Nora" })).toHaveCount(0);
    await page.getByText("All", { exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Chats with Nora" })).toBeVisible();
  });

  test("a failed staff check says the page did not load, never that it does not exist", async ({
    page,
  }) => {
    await noBanner(page);
    await signInFake(page, { staff: true });
    // Registered after the session's mock, so it answers first: the is_staff read fails.
    await page.route("**/rest/v1/rpc/is_staff", (route) =>
      route.fulfill({ status: 500, json: { message: "down" } }),
    );
    await page.goto("/staff/system");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page did not load.", {
      timeout: 20_000,
    });
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(page.getByText("This page is not here.")).toHaveCount(0);
  });

  test("a session that is not staff gets the not-found page on every staff page, and no staff read", async ({
    page,
  }) => {
    await noBanner(page);
    await signInFake(page, { staff: false });
    const staffReads: string[] = [];
    page.on("request", (r) => {
      const u = new URL(r.url());
      if (/\/rest\/v1\/(rpc\/staff_|staff_|provider_spend|ai_visibility_runs)/.test(u.pathname))
        staffReads.push(u.pathname);
    });
    for (const path of ["/staff", ...PAGES.map((p) => p.path)]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page is not here.");
    }
    expect(staffReads).toEqual([]);
  });
});
