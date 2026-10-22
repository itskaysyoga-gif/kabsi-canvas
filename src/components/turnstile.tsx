import { useCallback, useEffect, useRef, useState } from "react";
import { TURNSTILE_SITE_KEY } from "@/lib/site";
import { reportError } from "@/lib/telemetry";

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

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
// No token and no click asked for within this time means the check is not going to finish on its own.
const GIVE_UP_MS = 10_000;
let loading: Promise<void> | null = null;
function load() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SRC;
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

/**
 * Cloudflare Turnstile check (hotfix 20h). Invisible unless Cloudflare needs a click ("interaction-only"); then it sits
 * in a box sized to the form. `onToken` gets a token when passed, and "" when it expires or fails. If the check errors
 * or gives no token within 10 seconds, one plain line offers Try again, and the error code goes to Sentry.
 */
export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | undefined>(undefined);
  const timer = useRef<number | undefined>(undefined);
  const cb = useRef(onToken);
  cb.current = onToken;
  const [interactive, setInteractive] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const fail = useCallback((code: string) => {
    window.clearTimeout(timer.current);
    cb.current("");
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
            ? "w-full overflow-hidden rounded-card border border-kb-hairline bg-kb-sand"
            : failed
              ? "hidden"
              : "w-full"
        }
      />
      {failed ? (
        <p className="text-sm text-kb-stone" role="alert">
          We could not check your browser.{" "}
          <button
            type="button"
            className="min-h-11 font-bold text-kb-ink underline underline-offset-4"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Try again
          </button>
        </p>
      ) : null}
    </div>
  );
}
