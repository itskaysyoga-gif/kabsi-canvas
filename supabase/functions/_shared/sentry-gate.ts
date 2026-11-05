// Style 1 part C (master plan 30.33 item 4, R-113): Sentry's errors quota for 31 Oct to 29 Nov ran out on 5 Nov. Two
// gates in front of captureError (kabsi.ts):
//   1. A call from an automated run sends nothing to Sentry: the smoke test's x-kabsi-smoke: 1, the QA header x-kabsi-qa: 1,
//      and the user agents of Playwright, headless Chrome (the nightly check of kabsi.co, scripts/qa2/nightly.mjs),
//      Lighthouse and the nightly check's own name. The error is still logged; only the Sentry event is dropped.
//   2. The same server error (same function, type and message with numbers and ids folded) is sent at most once per
//      10 minutes. An in-memory window per isolate first, then the shared limiter (hit_rate_limit) across isolates.
// Pure apart from AsyncLocalStorage, so the Deno tests run it without a database.
import { AsyncLocalStorage } from "node:async_hooks";

export const QA_HEADER = "x-kabsi-qa";
export const SMOKE_HEADER = "x-kabsi-smoke";
export const REPEAT_WINDOW_MS = 10 * 60 * 1000;

const AUTOMATED_UA = /HeadlessChrome|Playwright|Chrome-Lighthouse|Lighthouse|kabsi-nightly|kabsi-qa/i;

/** True when the request comes from one of Kabsi's own automated runs. A label for reporting only: it never lets a call in. */
export function isAutomated(headers: Headers): boolean {
  if (headers.get(SMOKE_HEADER)?.trim() === "1") return true;
  if (headers.get(QA_HEADER)?.trim() === "1") return true;
  return AUTOMATED_UA.test(headers.get("user-agent") ?? "");
}

type RequestFacts = { automated: boolean };
const store = new AsyncLocalStorage<RequestFacts>();

/** Runs a handler with the facts of its request, so captureError deep inside can see them. */
export function withRequest<T>(req: Request, run: () => T): T {
  return store.run({ automated: isAutomated(req.headers) }, run);
}

/** True while the code runs for a request from an automated run. */
export function inAutomatedRequest(): boolean {
  return store.getStore()?.automated ?? false;
}

/** The fingerprint of an error: function, type and message with numbers, ids and quoted values folded. */
export function fingerprint(fn: string, type: string, message: string): string {
  const m = message
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<id>")
    .replace(/"[^"]*"|'[^']*'/g, "<v>")
    .replace(/\d+/g, "<n>")
    .slice(0, 160);
  return `${fn}|${type}|${m}`;
}

/** A window per fingerprint: allow() answers true for the first error and then false until windowMs has passed. */
export function repeatWindow(windowMs = REPEAT_WINDOW_MS, maxKeys = 500) {
  const last = new Map<string, number>();
  return {
    allow(key: string, now = Date.now()): boolean {
      const at = last.get(key);
      if (at !== undefined && now - at < windowMs) return false;
      if (last.size >= maxKeys) last.clear();
      last.set(key, now);
      return true;
    },
  };
}

/** A short, stable key for the shared limiter (hit_rate_limit keys are text). */
export async function limiterKey(fp: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fp));
  const hex = [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `sentry:${hex}`;
}
