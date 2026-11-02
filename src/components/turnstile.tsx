import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { TURNSTILE_SITE_KEY } from "@/lib/site";
import { reportError } from "@/lib/telemetry";
import { loadTurnstileScript as load, startOnFirstTouch } from "@/lib/turnstile-script";

type Api = {
  render: (
    el: HTMLElement,
    o: {
      sitekey: string;
      appearance?: "always" | "execute" | "interaction-only";
      size?: "normal" | "flexible" | "compact";
      callback: (t: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: (code: string) => boolean | void;
      "timeout-callback"?: () => void;
      "before-interactive-callback"?: () => void;
      "after-interactive-callback"?: () => void;
    },
  ) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Api;
  }
}

// No token and no click asked for within this time means the check is not going to finish on its own.
const GIVE_UP_MS = 10_000;
// A form waits this long for a token after its submit before it stops (the widget's own 10 seconds come first).
const TAKE_WAIT_MS = 30_000;

/**
 * Cloudflare Turnstile check (hotfix 20h). Invisible unless Cloudflare needs a click ("interaction-only"); then it sits
 * in a box sized to the form. `onToken` gets a token when passed, and "" when it expires or fails. If the check errors
 * or gives no token within 10 seconds, one plain line offers Try again, and the error code goes to Sentry.
 */
export function Turnstile({
  onToken,
  onFail,
}: {
  onToken: (token: string) => void;
  /** Told when the check failed and shows Try again. */
  onFail?: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | undefined>(undefined);
  const timer = useRef<number | undefined>(undefined);
  const cb = useRef(onToken);
  cb.current = onToken;
  const failCb = useRef(onFail);
  failCb.current = onFail;
  const [interactive, setInteractive] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const fail = useCallback((code: string) => {
    window.clearTimeout(timer.current);
    cb.current("");
    failCb.current?.();
    setFailed(true);
    reportError(new Error(`Turnstile failed: ${code}`), { turnstile_code: code });
  }, []);
  const arm = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => fail("no_token_10s"), GIVE_UP_MS);
  }, [fail]);

  useEffect(() => {
    let dead = false;
    setFailed(false);
    load()
      .then(() => {
        if (dead || !box.current || !window.turnstile) return;
        if (id.current) {
          window.turnstile.reset(id.current);
          arm();
          return;
        }
        arm();
        id.current = window.turnstile.render(box.current, {
          sitekey: TURNSTILE_SITE_KEY,
          appearance: "interaction-only",
          size: "flexible",
          callback: (t) => {
            window.clearTimeout(timer.current);
            setFailed(false);
            setInteractive(false);
            cb.current(t);
          },
          "expired-callback": () => cb.current(""),
          "error-callback": (code) => {
            fail(String(code || "unknown"));
            return true;
          },
          "timeout-callback": () => fail("interactive_timeout"),
          // A person is being asked to click: stop the 10 second clock while the box is on screen.
          "before-interactive-callback": () => {
            window.clearTimeout(timer.current);
            setInteractive(true);
          },
          "after-interactive-callback": () => {
            setInteractive(false);
            arm();
          },
        });
      })
      .catch(() => {
        if (!dead) fail("script_load");
      });
    return () => {
      dead = true;
      window.clearTimeout(timer.current);
    };
  }, [attempt, arm, fail]);

  useEffect(
    () => () => {
      if (id.current && window.turnstile) window.turnstile.remove(id.current);
      id.current = undefined;
    },
    [],
  );

  return (
    <div>
      <div
        ref={box}
        className={
          interactive && !failed
            ? "w-full overflow-hidden rounded-card border border-line bg-surface-2"
            : failed
              ? "hidden"
              : "w-full"
        }
      />
      {failed ? (
        <p className="text-small text-text-2" role="alert">
          We could not check your browser.{" "}
          <button
            type="button"
            className="min-h-11 font-bold text-text-1 underline underline-offset-4"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Try again
          </button>
        </p>
      ) : null}
    </div>
  );
}

/**
 * The bot check for a public form, loaded on the form's first touch (Fix 1, QA 2 H6): `area` goes on the element that
 * holds the form and `widget` inside it. Nothing from Cloudflare loads until a field gets focus, is pressed or typed in.
 * `take()` gives one token for one request: if the visitor submits before the check is ready, it starts the check then
 * and waits for it. It answers "" only when the check failed (the widget then shows Try again), so a form never sends
 * without a token. Each token works once; the widget is replaced after each one so the next request gets a fresh one.
 */
export function useLazyTurnstile(): {
  area: (el: HTMLElement | null) => void;
  widget: ReactNode;
  take: () => Promise<string>;
} {
  const [on, setOn] = useState(false);
  const [round, setRound] = useState(0);
  const token = useRef("");
  const waiters = useRef<((t: string) => void)[]>([]);
  const stop = useRef<(() => void) | undefined>(undefined);
  const area = useCallback((el: HTMLElement | null) => {
    stop.current?.();
    stop.current = el ? startOnFirstTouch(el, () => setOn(true)) : undefined;
  }, []);
  const onToken = useCallback((t: string) => {
    token.current = t;
    if (t && waiters.current.length) {
      const w = waiters.current.shift()!;
      token.current = "";
      setRound((n) => n + 1);
      w(t);
    }
  }, []);
  const onFail = useCallback(() => {
    for (const w of waiters.current.splice(0)) w("");
  }, []);
  const take = useCallback(
    () =>
      new Promise<string>((resolve) => {
        setOn(true);
        if (token.current) {
          const t = token.current;
          token.current = "";
          setRound((n) => n + 1);
          resolve(t);
          return;
        }
        waiters.current.push(resolve);
        window.setTimeout(() => {
          const i = waiters.current.indexOf(resolve);
          if (i >= 0) {
            waiters.current.splice(i, 1);
            resolve("");
          }
        }, TAKE_WAIT_MS);
      }),
    [],
  );
  const widget = on ? <Turnstile key={round} onToken={onToken} onFail={onFail} /> : null;
  return { area, widget, take };
}
