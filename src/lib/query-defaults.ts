// How long a signed-in screen may wait for the database before it shows its error state (Fix 1, QA 2 L9: QA saw 10 to
// 15 seconds of "Loading" before "Something went wrong on our side."). Budget: the error state within 5 seconds.
//
// - A read from the database (GET or HEAD on /rest/v1/, or a read-only function in READ_RPCS) that has no answer after
//   READ_TIMEOUT_MS is stopped.
// - A screen's data is asked for at most twice: one more try, RETRY_DELAY_MS after a quick failure. A read that timed
//   out is not tried again (that would pass the budget).
// - supabase-js's own retries of reads are off (src/lib/supabase.ts), so the two tries here are the only ones.
// Writes and function calls are never timed out here: a reply being approved must not be cut off half way.
import type { DefaultOptions } from "@tanstack/react-query";

export const ERROR_WITHIN_MS = 5_000;
// 2 s per read (review of PR WEBFORMS): a slow first failure (just under 2 s), the 0.5 s pause and a second read
// stopped at 2 s still show the error within 4.5 s.
export const READ_TIMEOUT_MS = 2_000;
export const RETRY_DELAY_MS = 500;
/** In the message of a read that was stopped, so the retry rule can tell it apart. */
export const READ_TIMEOUT = "Kabsi read timeout";

// supabase-js gives a stopped read back as a plain { message, details, hint, code } object, which screens throw as it
// is (`if (error) throw error`), so the message is read whatever the error's shape (review of PR WEBFORMS).
export function isReadTimeout(error: unknown): boolean {
  const message = (error as { message?: unknown } | null | undefined)?.message;
  return typeof message === "string" && message.includes(READ_TIMEOUT);
}

/** Database functions that only read (POST through /rest/v1/rpc/), timed out like any read. Never one that writes. */
export const READ_RPCS = new Set([
  "onboarding_status",
  "activity_feed",
  "list_tasks",
  "list_review_reports",
  "list_my_notifications",
  "plan_summary",
  "entitlements",
  "feature_access",
  "coach_checklist",
  "holiday_calendar",
  "whatsapp_status",
  "photo_link_status",
  "my_notification_prefs",
  "google_mode",
  "is_staff",
  "staff_system_health",
  "staff_job_health",
  "staff_chat_stats",
]);

const readsOf = (url: string, method: string, base: string) => {
  if (!url.startsWith(`${base}/rest/v1/`)) return false;
  if (method === "GET" || method === "HEAD") return true;
  const rpc = url.slice(`${base}/rest/v1/rpc/`.length).split(/[?#]/)[0] ?? "";
  return method === "POST" && url.startsWith(`${base}/rest/v1/rpc/`) && READ_RPCS.has(rpc);
};

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
