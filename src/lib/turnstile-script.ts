// Loading Cloudflare Turnstile's script (about 1.4 MB with its frame). Pages that hold a public form load it only when
// the visitor first touches the form (Fix 1, lane R 2 Nov 2026; QA 2 H6), never at page start. Framework free, so a test
// can prove the script is not asked for before the first touch.

export const TURNSTILE_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let loading: Promise<void> | null = null;

/** Adds the script once; a failed load can be tried again. */
export function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") return Promise.resolve();
  if ((window as { turnstile?: unknown }).turnstile) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = TURNSTILE_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      s.remove();
      reject(new Error("turnstile"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/** What counts as touching a form: a field or button gets focus, a press, or typing. All three bubble up. */
export const FIRST_TOUCH_EVENTS = ["focusin", "pointerdown", "input"] as const;

/**
 * Calls `start` once, the first time the visitor touches something inside `target`. Returns a function that stops
 * listening (for when the form goes away before it is touched).
 */
export function startOnFirstTouch(target: EventTarget, start: () => void): () => void {
  let done = false;
  const stop = () => {
    for (const e of FIRST_TOUCH_EVENTS) target.removeEventListener(e, fire);
  };
  function fire() {
    if (done) return;
    done = true;
    stop();
    start();
  }
  for (const e of FIRST_TOUCH_EVENTS) target.addEventListener(e, fire);
  return stop;
}

/** For tests only: forget a load in progress. */
export function resetTurnstileScriptForTest() {
  loading = null;
}
