// How long a signed-in screen may wait for the database before it shows its error state (Fix 1, QA 2 L9: QA saw 10 to
// 15 seconds of "Loading" before "Something went wrong on our side."). Budget: the error state within 5 seconds.
//
// - A read from the database (GET or HEAD on /rest/v1/) that has no answer after READ_TIMEOUT_MS is stopped.
// - A screen's data is asked for at most twice: one more try, RETRY_DELAY_MS after a quick failure. A read that timed
//   out is not tried again (that would pass the budget).
// - supabase-js's own retries of reads are off (src/lib/supabase.ts), so the two tries here are the only ones.
// Writes and function calls are never timed out here: a reply being approved must not be cut off half way.
import type { DefaultOptions } from "@tanstack/react-query";

export const ERROR_WITHIN_MS = 5_000;
export const READ_TIMEOUT_MS = 3_000;
export const RETRY_DELAY_MS = 500;
/** In the message of a read that was stopped, so the retry rule can tell it apart. */
export const READ_TIMEOUT = "Kabsi read timeout";

export function isReadTimeout(error: unknown): boolean {
  return error instanceof Error && error.message.includes(READ_TIMEOUT);
}

const readsOf = (url: string, method: string, base: string) =>
  (method === "GET" || method === "HEAD") && url.startsWith(`${base}/rest/v1/`);

/** Wraps fetch so a database read with no answer stops after `ms` with an AbortError naming READ_TIMEOUT. */
export function withReadTimeout(
  fetchImpl: typeof fetch,
  base: string,
  ms = READ_TIMEOUT_MS,
): typeof fetch {
  return (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (
      init?.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    if (!readsOf(url, method, base)) return fetchImpl(input, init);
    const controller = new AbortController();
    const outer = init?.signal;
    if (outer) {
      if (outer.aborted) controller.abort(outer.reason);
      else outer.addEventListener("abort", () => controller.abort(outer.reason), { once: true });
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const e = new Error(`${READ_TIMEOUT} after ${ms} ms`);
        e.name = "AbortError";
        controller.abort(e);
        reject(e);
      }, ms);
    });
    return Promise.race([
      fetchImpl(input, { ...init, signal: controller.signal }),
      timedOut,
    ]).finally(() => clearTimeout(timer));
  };
}

/** The QueryClient's defaults for every screen (src/router.tsx). A query may still set its own retry. */
export const QUERY_DEFAULTS: DefaultOptions = {
  queries: {
    retry: (failures, error) => failures < 1 && !isReadTimeout(error),
    retryDelay: RETRY_DELAY_MS,
  },
};
