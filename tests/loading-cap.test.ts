// Fix 1 (QA 2 L9): a signed-in screen shows its error state within 5 seconds when the database does not answer or
// fails. Fake timers drive the app's own QueryClient defaults and its read timeout, with no network.
import { readFileSync } from "node:fs";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ERROR_WITHIN_MS,
  QUERY_DEFAULTS,
  READ_TIMEOUT,
  isReadTimeout,
} from "../src/lib/query-defaults";
import * as rt from "../src/lib/read-timeout";

const { READ_TIMEOUT_MS, withReadTimeout } = rt;

const BASE = "https://db.example";
const READ = `${BASE}/rest/v1/locations?select=id`;

/** A database that never answers: the request stays open until it is aborted. */
const silent: typeof fetch = (_input, init) =>
  new Promise((_, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal!.reason));
  });

/** What the app's queries do: read through the client's fetch and throw on an error (src/lib/onboarding.ts). */
const readWith = (f: typeof fetch) => async () => {
  const res = await f(READ, { method: "GET" });
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
};

/** Watches one query the way a screen does; answers when it reached the error state, in fake milliseconds. */
async function msUntilError(queryFn: () => Promise<unknown>): Promise<number | null> {
  const client = new QueryClient({ defaultOptions: QUERY_DEFAULTS });
  const observer = new QueryObserver(client, { queryKey: ["screen"], queryFn });
  const start = Date.now();
  let at: number | null = null;
  const off = observer.subscribe((r) => {
    if (r.status === "error" && at === null) at = Date.now() - start;
  });
  await vi.advanceTimersByTimeAsync(ERROR_WITHIN_MS);
  off();
  client.clear();
  return at;
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("the error state within 5 seconds", () => {
  it("a database that never answers: the read stops at the timeout and is not tried again", async () => {
    const calls = vi.fn(silent);
    const at = await msUntilError(readWith(withReadTimeout(calls, BASE)));
    expect(at).not.toBeNull();
    expect(at!).toBeLessThanOrEqual(ERROR_WITHIN_MS);
    expect(at!).toBeGreaterThanOrEqual(READ_TIMEOUT_MS);
    expect(calls).toHaveBeenCalledTimes(1);
  });

  it("a database that fails at once: one more try, then the error state", async () => {
    const calls = vi.fn(async () => new Response("{}", { status: 500 }));
    const at = await msUntilError(readWith(withReadTimeout(calls, BASE)));
    expect(at).not.toBeNull();
    expect(at!).toBeLessThanOrEqual(ERROR_WITHIN_MS);
    expect(calls).toHaveBeenCalledTimes(2);
  });

  it("a quick failure, then no answer: still within 5 seconds", async () => {
    let n = 0;
    const calls: typeof fetch = (input, init) =>
      n++ === 0
        ? new Promise((_, reject) =>
            setTimeout(() => reject(new TypeError("Failed to fetch")), 1000),
          )
        : silent(input, init);
    const at = await msUntilError(readWith(withReadTimeout(calls, BASE)));
    expect(at).not.toBeNull();
    expect(at!).toBeLessThanOrEqual(ERROR_WITHIN_MS);
  });

  it("through supabase-js, which gives the timeout back as a plain object a screen throws as it is: one try, in time", async () => {
    const calls = vi.fn(silent);
    const db = createClient(BASE, "anon-test-key", {
      global: { fetch: withReadTimeout(calls, BASE) },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      db: { retry: false } as never,
    });
    const at = await msUntilError(async () => {
      const { data, error } = await db.from("locations").select("id");
      if (error) throw error;
      return data;
    });
    expect(at).not.toBeNull();
    expect(at!).toBeLessThanOrEqual(ERROR_WITHIN_MS);
    expect(calls).toHaveBeenCalledTimes(1);
  });

  it("a read-only database function (Home's onboarding_status) is timed out too", async () => {
    const calls = vi.fn(silent);
    const f = withReadTimeout(calls, BASE);
    const at = await msUntilError(async () => {
      const res = await f(`${BASE}/rest/v1/rpc/onboarding_status`, { method: "POST", body: "{}" });
      return res.json();
    });
    expect(at).not.toBeNull();
    expect(at!).toBeLessThanOrEqual(ERROR_WITHIN_MS);
  });

  it("a slow failure just under the timeout, then no answer: still within 5 seconds", async () => {
    let n = 0;
    const calls: typeof fetch = (input, init) =>
      n++ === 0
        ? new Promise((_, reject) =>
            setTimeout(() => reject(new TypeError("Failed to fetch")), READ_TIMEOUT_MS - 100),
          )
        : silent(input, init);
    const at = await msUntilError(readWith(withReadTimeout(calls, BASE)));
    expect(at).not.toBeNull();
    expect(at!).toBeLessThanOrEqual(ERROR_WITHIN_MS);
  });

  it("a read that answers in time is not cut off", async () => {
    const slowOk: typeof fetch = () =>
      new Promise((resolve) =>
        setTimeout(() => resolve(new Response("[]")), READ_TIMEOUT_MS - 500),
      );
    const res = withReadTimeout(slowOk, BASE)(READ, { method: "GET" });
    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS);
    expect((await res).ok).toBe(true);
  });

  it("writes and function calls are never timed out (an approval is not cut off half way)", async () => {
    const f = withReadTimeout(silent, BASE);
    let settled = false;
    for (const [url, method] of [
      [`${BASE}/rest/v1/rpc/approve_reply`, "POST"],
      [`${BASE}/rest/v1/reviews?id=eq.1`, "PATCH"],
      [`${BASE}/functions/v1/reply`, "POST"],
    ] as const)
      void f(url, { method }).finally(() => (settled = true));
    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS * 3);
    expect(settled).toBe(false);
  });

  it("a timed out read says so, and supabase-js does not add its own retries", () => {
    const e = new Error("AbortError: Kabsi read timeout after 3000 ms");
    expect(isReadTimeout(e)).toBe(true);
    expect(isReadTimeout(new Error("status 500"))).toBe(false);
    expect(rt.READ_TIMEOUT, "the two modules name the timeout the same way").toBe(READ_TIMEOUT);
    expect(
      isReadTimeout({ message: "AbortError: Kabsi read timeout after 2000 ms", code: "" }),
    ).toBe(true);
    const client = readFileSync("src/lib/supabase.ts", "utf8");
    expect(client).toContain("db: { retry: false }");
    expect(client).toContain("withReadTimeout(sessionFetch, supabaseUrl)");
    expect(readFileSync("src/router.tsx", "utf8")).toContain("defaultOptions: QUERY_DEFAULTS");
  });
});
