// App 4: a signed-in browser with every Supabase call mocked, for the cases that need a session but no real account
// (the website's Dashboard link, Log out, the time-away rules, the log in page). No real token and no secret: the
// session is a made-up one that supabase-js reads from storage, and every call to Supabase answers from here.
import type { Page, Route } from "@playwright/test";

export const SUPABASE = "https://ynjdqjlmdwjgbfezevxy.supabase.co";
export const STORAGE_KEY = "sb-ynjdqjlmdwjgbfezevxy-auth-token";

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");

/** A session supabase-js accepts without asking Auth: a token that names a person and lasts a day. */
export function fakeSession(sub = "00000000-0000-4000-8000-0000000000a4") {
  const exp = Math.floor(Date.now() / 1000) + 86_400;
  const token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub, exp, role: "authenticated", email: "qa-app4@test.local" })}.c2ln`;
  return {
    access_token: token,
    token_type: "bearer",
    expires_in: 86_400,
    expires_at: exp,
    refresh_token: "qa-app4-refresh",
    user: {
      id: sub,
      aud: "authenticated",
      role: "authenticated",
      email: "qa-app4@test.local",
      app_metadata: { provider: "email" },
      user_metadata: {},
      created_at: "2026-11-01T00:00:00Z",
    },
  };
}

export type FakeAuth = {
  staff?: boolean;
  /** Answers for /rest/v1/<table or rpc/name>, by path suffix. */
  rest?: Record<string, unknown>;
  /** Extra local storage entries set before the page loads. */
  storage?: Record<string, string>;
};

/** Puts the made-up session in storage before the page loads and answers every Supabase call. */
export async function signInFake(page: Page, opts: FakeAuth = {}) {
  const entries: Record<string, string> = {
    [STORAGE_KEY]: JSON.stringify(fakeSession()),
    ...(opts.storage ?? {}),
  };
  await page.addInitScript((e) => {
    try {
      if (window.sessionStorage.getItem("qa-fake-seeded")) return;
      window.sessionStorage.setItem("qa-fake-seeded", "1");
      for (const [k, v] of Object.entries(e)) window.localStorage.setItem(k, v);
    } catch {
      /* blocked */
    }
  }, entries);
  await mockSupabase(page, opts);
}

export async function mockSupabase(page: Page, opts: FakeAuth = {}) {
  await page.route(`${SUPABASE}/**`, async (route: Route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.startsWith("/auth/v1/logout")) return route.fulfill({ status: 204, body: "" });
    if (path.startsWith("/auth/v1/user")) return route.fulfill({ json: fakeSession().user });
    if (path.endsWith("/rpc/is_staff")) return route.fulfill({ json: opts.staff === true });
    for (const [suffix, body] of Object.entries(opts.rest ?? {}))
      if (path.endsWith(suffix)) return route.fulfill({ json: body });
    if (path.startsWith("/rest/v1/rpc/")) return route.fulfill({ json: null });
    if (path.startsWith("/rest/v1/")) return route.fulfill({ json: [] });
    return route.fulfill({ json: {} });
  });
}

/** Opens the phone menu once the page is interactive (a tap before hydration does nothing on a slow first load). */
export async function openMenu(page: Page) {
  const toggle = page.getByRole("button", { name: /Open menu|Close menu/ });
  for (let i = 0; i < 20; i++) {
    if ((await toggle.getAttribute("aria-expanded")) === "true") return;
    await toggle.click();
    await page.waitForTimeout(400);
  }
  throw new Error("the phone menu did not open");
}
