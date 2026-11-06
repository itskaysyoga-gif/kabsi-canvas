// The read timeout for the Supabase client's fetch (Fix 1, QA 2 L9). Kept apart from query-defaults.ts, which the router
// loads on every page: a module both import is bundled with supabase-js and made Home download it (speed gate, PR 329).
// READ_TIMEOUT must stay equal to the one in query-defaults.ts (tests/loading-cap.test.ts checks it).

export const READ_TIMEOUT_MS = 2_000;
export const READ_TIMEOUT = "Kabsi read timeout";

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
  "whatsapp_owners_on",
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
