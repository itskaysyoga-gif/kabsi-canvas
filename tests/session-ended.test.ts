// Lane R, 22 Oct 2026: a session Kabsi no longer accepts says "Your session ended. Sign in again." and sends the person
// to sign in; no button stays on screen that sends nothing. The server no longer asks Auth about the public anon key.
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { supabaseUrl } from "../src/lib/supabase-config";
import {
  isUserToken,
  makeSessionFetch,
  resetSessionEnded,
  SESSION_ENDED,
  SESSION_ENDED_EVENT,
  SessionEnded,
  sessionHasEnded,
} from "../src/lib/session-ended";
import { carriesUser } from "../supabase/functions/_shared/jwt-user";

const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, "");
const USER = `${b64({ alg: "HS256" })}.${b64({ sub: "80dc5bb0", role: "authenticated" })}.sig`;
const ANON = `${b64({ alg: "HS256" })}.${b64({ role: "anon" })}.sig`;
const call = (token: string) => ({ headers: { authorization: `Bearer ${token}` } });

function backend(status: number, userCheck = 200) {
  const calls: string[] = [];
  const f = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    return new Response("{}", { status: url.endsWith("/auth/v1/user") ? userCheck : status });
  }) as unknown as typeof fetch;
  return { f, calls };
}

describe("session ended", () => {
  it("reads a person's token and the anon key apart, on both sides", () => {
    expect(isUserToken(USER)).toBe(true);
    expect(isUserToken(ANON)).toBe(false);
    expect(isUserToken("not-a-jwt")).toBe(false);
    expect(carriesUser(USER)).toBe(true);
    expect(carriesUser(ANON)).toBe(false);
    expect(carriesUser("")).toBe(false);
  });

  it("a 401 on a signed-in call ends the session and tells the screen", async () => {
    vi.stubGlobal("window", new EventTarget());
    resetSessionEnded();
    const seen = vi.fn();
    window.addEventListener(SESSION_ENDED_EVENT, seen);
    const { f } = backend(401);
    await expect(
      makeSessionFetch(f, "anon")(`${supabaseUrl}/functions/v1/content`, call(USER)),
    ).rejects.toThrow(SessionEnded);
    expect(sessionHasEnded()).toBe(true);
    expect(seen).toHaveBeenCalledTimes(1);
    expect(new SessionEnded().message).toBe(SESSION_ENDED);
    window.removeEventListener(SESSION_ENDED_EVENT, seen);
    vi.unstubAllGlobals();
  });

  it("a 403 ends the session only when Auth no longer accepts the token", async () => {
    resetSessionEnded();
    const dead = backend(403, 403);
    await expect(
      makeSessionFetch(dead.f, "anon")(`${supabaseUrl}/rest/v1/rpc/list_tasks`, call(USER)),
    ).rejects.toThrow(SessionEnded);
    expect(dead.calls.at(-1)).toBe(`${supabaseUrl}/auth/v1/user`);

    resetSessionEnded();
    const allowed = backend(403, 200); // "Staff can add photos...": a real refusal keeps its own answer
    const res = await makeSessionFetch(allowed.f, "anon")(
      `${supabaseUrl}/functions/v1/content`,
      call(USER),
    );
    expect(res.status).toBe(403);
    expect(sessionHasEnded()).toBe(false);
  });

  it("a signed-out visitor's call, sign-in and sign-out keep their own answers", async () => {
    resetSessionEnded();
    const { f } = backend(401);
    const sf = makeSessionFetch(f, "anon");
    expect((await sf(`${supabaseUrl}/functions/v1/consent`, call(ANON))).status).toBe(401);
    expect(
      (await sf(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, call(USER))).status,
    ).toBe(401);
    expect((await sf(`${supabaseUrl}/auth/v1/logout`, call(USER))).status).toBe(401);
    expect((await sf("https://example.com/x", call(USER))).status).toBe(401);
    expect(sessionHasEnded()).toBe(false);
  });

  it("every signed-in call goes through it, and the screen blocks the app with one button", () => {
    const src = (p: string) => readFileSync(p, "utf8");
    expect(src("src/lib/supabase.ts")).toMatch(/global: \{ fetch: sessionFetch \}/);
    expect(src("src/lib/reviews.ts")).toMatch(
      /if \(!token\) throw endSession\(\);\n {2}return sessionFetch\(/,
    );
    for (const f of ["src/lib/insights.ts", "src/lib/review-graphic.ts", "src/lib/holidays.ts"])
      expect(src(f)).toMatch(/sessionFetch\(`\$\{supabaseUrl\}\/functions\/v1\//);
    const gate = src("src/components/auth/session-ended-gate.tsx");
    expect(gate).toMatch(/fixed inset-0/);
    expect(gate).toMatch(/Sign in again/);
    expect(src("src/components/auth/require-auth.tsx")).toMatch(/<SessionEndedGate \/>/);
  });
});
