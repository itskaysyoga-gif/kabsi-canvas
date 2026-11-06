// Launch 2 part A (master plan 30.36 item 5): Team's controls save at once like the switches in Settings (Launch 1 part
// C). A made-up owner (scripts/app-shots/fixtures.mjs answers every other Supabase call; nothing reaches Supabase) at 390
// and 1440 px. An invitation, a role change and a removal must show at once while the save is still on its way, and go
// back with one plain line when the save fails. axe on each state.
// Run it against a local build: KABSI_BASE_URL=http://localhost:4173 npx playwright test tests/e2e/launch2-team.spec.ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { noBanner } from "./helpers/page";
import { SUPABASE, fakeSession, STORAGE_KEY } from "./helpers/fake-auth";
import { answer } from "../../scripts/app-shots/fixtures.mjs";

const OWNER = "00000000-0000-4000-8000-000000000001";
const MANAGER = "00000000-0000-4000-8000-000000000002";
type Srv = {
  team: {
    members: { user_id: string; email: string; role: string; you: boolean }[];
    invites: { id: string; email: string; role: string; created_at: string; expires_at: string }[];
    policies: Record<string, string>;
  };
  fail: boolean;
  delayMs: number;
  calls: string[];
};
const newSrv = (over: Partial<Srv> = {}): Srv => ({
  team: {
    members: [
      { user_id: OWNER, email: "owner@roselane.example", role: "owner", you: true },
      { user_id: MANAGER, email: "sam@roselane.example", role: "manager", you: false },
    ],
    invites: [],
    policies: {
      review_reply: "owner",
      post: "owner",
      photo: "owner",
      hours: "owner",
      profile_change: "owner",
    },
  },
  fail: false,
  delayMs: 0,
  calls: [],
  ...over,
});
const json = (body: unknown, status = 200) => ({
  status,
  contentType: "application/json",
  headers: { "access-control-allow-origin": "*", "access-control-expose-headers": "content-range" },
  body: JSON.stringify(body),
});

async function open(page: Page, srv: Srv) {
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
    [STORAGE_KEY, JSON.stringify(fakeSession(OWNER))],
  );
  await page.route(`${SUPABASE}/**`, async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS")
      return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
    const path = new URL(req.url()).pathname;
    const body = req.postData() ? JSON.parse(req.postData()!) : {};
    const save = async (name: string, change: () => void) => {
      srv.calls.push(name);
      await new Promise((r) => setTimeout(r, srv.delayMs));
      if (srv.fail) return route.fulfill(json({ message: "boom" }, 500));
      change();
      return route.fulfill(json(null));
    };
    if (path.endsWith("/rpc/list_team")) return route.fulfill(json(srv.team));
    if (path.endsWith("/rpc/set_member_role"))
      return save(`role:${body.p_role}`, () => {
        srv.team.members = srv.team.members.map((m) =>
          m.user_id === body.p_user ? { ...m, role: body.p_role } : m,
        );
      });
    if (path.endsWith("/rpc/remove_member"))
      return save("remove", () => {
        srv.team.members = srv.team.members.filter((m) => m.user_id !== body.p_user);
      });
    if (path.endsWith("/rpc/invite_team_member"))
      return save(`invite:${body.p_email}`, () => {
        srv.team.invites.push({
          id: "11111111-1111-4111-8111-111111111111",
          email: body.p_email,
          role: body.p_role,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        });
      });
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
  await page.goto("/app/team");
  await expect(page.getByText("sam@roselane.example", { exact: true })).toBeVisible({
    timeout: 20_000,
  });
}

async function axeClean(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(
    r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id),
  ).toEqual([]);
}
const roleOf = (page: Page) => page.getByRole("group", { name: "Role of sam@roselane.example" });

test.describe("Team: changes show at once", () => {
  test("a role change shows at once while the save is slow, and stays after a reload", async ({
    page,
  }) => {
    const srv = newSrv({ delayMs: 2500 });
    await open(page, srv);
    await roleOf(page).getByText("Staff", { exact: true }).click();
    await expect(roleOf(page).getByRole("radio", { name: "Staff" })).toBeChecked({ timeout: 1000 });
    await axeClean(page);
    await expect.poll(() => srv.calls).toEqual(["role:staff"]);
    srv.delayMs = 0;
    await page.waitForTimeout(3000);
    await page.reload();
    await expect(roleOf(page).getByRole("radio", { name: "Staff" })).toBeChecked();
  });

  test("an invitation and a removal show at once while the save is slow", async ({ page }) => {
    const srv = newSrv({ delayMs: 2500 });
    await open(page, srv);
    await page.getByLabel("Email").fill("lee@roselane.example");
    await page.getByRole("button", { name: "Send invitation" }).click();
    await expect(page.getByText("lee@roselane.example", { exact: true })).toBeVisible({
      timeout: 1000,
    });
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("sam@roselane.example", { exact: true })).toHaveCount(0, {
      timeout: 1000,
    });
    await expect(page.getByRole("status").filter({ hasText: "was removed" })).toBeVisible({
      timeout: 10_000,
    });
    await axeClean(page);
    expect(srv.calls).toEqual(["invite:lee@roselane.example", "remove"]);
  });

  test("a failed save goes back and says so in one plain line", async ({ page }) => {
    const srv = newSrv({ fail: true });
    await open(page, srv);
    await roleOf(page).getByText("Staff", { exact: true }).click();
    const line = page
      .getByRole("status")
      .filter({ hasText: "Couldn't save that. It is back as it was. Try again." });
    await expect(line).toBeVisible();
    await expect(roleOf(page).getByRole("radio", { name: "Manager" })).toBeChecked();
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(line).toBeVisible();
    await expect(page.getByText("sam@roselane.example", { exact: true })).toBeVisible();
    await page.getByLabel("Email").fill("lee@roselane.example");
    await page.getByRole("button", { name: "Send invitation" }).click();
    await expect(line).toBeVisible();
    await expect(page.getByText("lee@roselane.example", { exact: true })).toHaveCount(0);
    await axeClean(page);
  });

  test("two queued saves that both fail go back to what was saved, with one true line", async ({
    page,
  }) => {
    const srv = newSrv({ fail: true, delayMs: 1200 });
    await open(page, srv);
    await roleOf(page).getByText("Staff", { exact: true }).click();
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("sam@roselane.example", { exact: true })).toHaveCount(0, {
      timeout: 1000,
    });
    await expect.poll(() => srv.calls, { timeout: 10_000 }).toEqual(["role:staff", "remove"]);
    await expect(page.getByText("sam@roselane.example", { exact: true })).toBeVisible();
    await expect(roleOf(page).getByRole("radio", { name: "Manager" })).toBeChecked();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Couldn't save that. It is back as it was. Try again." }),
    ).toBeVisible();
  });
});
