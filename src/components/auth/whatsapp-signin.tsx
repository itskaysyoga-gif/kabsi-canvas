import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { buttonClass } from "@/components/kabsi/ui";
import { cn } from "@/lib/utils";
import { Turnstile } from "@/components/turnstile";
import { qrSvg } from "@/lib/qr";
import {
  checkWhatsapp,
  forgetStart,
  keptStart,
  startWhatsapp,
  warmGeoToken,
  WA_CONSENT_LINES,
  WA_CONSENT_SHORT,
  WaSigninError,
  type WaStart,
  type WaState,
} from "@/lib/wa-signin";

/** "Continue with WhatsApp", the button on the first step of the sign-in sheet (Signup 1). R-161: pointing at it,
 * focusing it or touching it is the visitor's intent, and only then is the sign-in code made (`onIntent`). */
export function WhatsAppChoice({
  busy,
  onPick,
  onIntent,
  primary = false,
}: {
  busy: boolean;
  onPick: () => void;
  onIntent: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      onPointerEnter={onIntent}
      onFocus={onIntent}
      onTouchStart={onIntent}
      disabled={busy}
      className={
        buttonClass(primary ? "primary" : "secondary", "lg", true) + " disabled:opacity-60"
      }
    >
      <MessageCircle aria-hidden className="size-5" />
      Continue with WhatsApp
    </button>
  );
}

// A code with less than this left is replaced when the owner taps Continue with WhatsApp (time to send it). A code that
// is already shown is never replaced in the background: the owner may be sending it (Fix 5 review finding 1).
const FRESH_MS = 5 * 60_000;

export type WaPrestart = {
  start: WaStart | null;
  error: string;
  /** The invisible bot check. Kept mounted for the panel's life; shown only when Cloudflare asks for a click. */
  widget: (visible: boolean) => ReactNode;
  /** Forget the current code and make a new one (after it ended). */
  again: () => void;
  /** The visitor's intent: points at, focuses or touches "Continue with WhatsApp" (and the tap itself). The code is
   * made now, with the passed bot check; a code with under 5 minutes left is replaced. Opening the panel never does. */
  want: () => void;
};

/** True when a sign-in code may be made: the visitor showed intent, a passed bot check is in hand, no start is on its
 * way, and there is no code yet (or the one there has under 5 minutes left). */
export function shouldMakeCode(o: {
  wanted: boolean;
  token: string;
  busy: boolean;
  start: Pick<WaStart, "expiresAt"> | null;
  now: number;
}): boolean {
  if (!o.wanted || !o.token || o.busy) return false;
  return !o.start || o.start.expiresAt - o.now <= FRESH_MS;
}

/**
 * Fix 5 (R-158 item 2) and Site 3b (R-161 item 1): the bot check starts when the sign-in panel opens, and its token is
 * only held. The sign-in code (a stored row, and one of the visitor's 10 starts an hour) is made when the visitor
 * shows intent on "Continue with WhatsApp", so choosing Google or email stores nothing and spends no start. The held
 * token and the place token are ready by then, so the ready link shows within a second of the tap. A code is asked for
 * only with a passed check (an empty token starts nothing); the server checks the token again. One code per page: it is
 * kept across the panel's steps and never renewed by a timer, only at intent when it has under 5 minutes left, or after
 * it ended.
 */
export function useWaPrestart(on: boolean): WaPrestart {
  const [start, setStart] = useState<WaStart | null>(() =>
    typeof window === "undefined" ? null : keptStart(),
  );
  const [error, setError] = useState("");
  const [round, setRound] = useState(0);
  const [token, setToken] = useState("");
  const [wanted, setWanted] = useState(false);
  const [busy, setBusy] = useState(false);
  const startRef = useRef(start);
  startRef.current = start;

  // A read only, so the place token is ready when the code is made.
  useEffect(() => {
    if (on) warmGeoToken();
  }, [on]);

  useEffect(() => {
    if (!shouldMakeCode({ wanted, token, busy, start, now: Date.now() })) return;
    const t = token;
    setToken("");
    setBusy(true);
    setError("");
    startWhatsapp(t)
      .then((s2) => setStart(s2))
      .catch((e) =>
        setError(
          e instanceof WaSigninError ? e.message : "Something went wrong. Please try again.",
        ),
      )
      .finally(() => setBusy(false));
  }, [wanted, token, busy, start]);

  const again = useCallback(() => {
    forgetStart();
    setStart(null);
    setToken("");
    setError("");
    setRound((n) => n + 1);
  }, []);

  const want = useCallback(() => {
    const s = startRef.current;
    if (s && s.expiresAt - Date.now() < FRESH_MS) again();
    setWanted(true);
  }, [again]);

  // One check per panel; a token is good for one code. The widget shows while there is no code yet.
  const widget = (visible: boolean) =>
    on && !start ? (
      <div className={visible ? "" : "pointer-events-none absolute h-0 w-full overflow-hidden"}>
        <Turnstile key={round} onToken={setToken} />
      </div>
    ) : null;
  return { start, error, widget, again, want };
}

const CHECK_MS = 2000;

/** "It works for 9 more minutes." The code lives 10 minutes from when it was made. */
export function minutesLeft(expiresAt: number, now: number): string {
  const m = Math.max(1, Math.ceil((expiresAt - now) / 60_000));
  return m >= 10
    ? "It works for 10 minutes."
    : `It works for ${m} more ${m === 1 ? "minute" : "minutes"}.`;
}

/** One numbered step, at most two lines. */
function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3 text-small text-text-1">
      <span
        aria-hidden
        className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-small font-bold"
      >
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}

/**
 * The WhatsApp step (Signup 1, master plan 30.50 item 3a; Fix 5): the ready link that opens WhatsApp with
 * "Kabsi sign in CODE" typed in. On a computer the button "Open WhatsApp on this computer" and the QR code of the same
 * link sit side by side; on a phone, one button. This tab checks every 2 seconds; after the owner taps "Yes, it's me"
 * on WhatsApp, it signs in and goes on to its next page. Kabsi never sends a code.
 */
export function WhatsAppStep({
  phone,
  pre,
  onDone,
  onBack,
}: {
  phone: boolean;
  pre: WaPrestart;
  onDone: () => void;
  onBack: () => void;
}) {
  const { start, error } = pre;
  const [state, setState] = useState<WaState>("waiting");
  const [phoneEnd, setPhoneEnd] = useState<string | null>(null);
  // The parent may pass a new onDone on each render; the checks keep running without a restart (review finding 4).
  const done = useRef(onDone);
  done.current = onDone;
  // The minutes the code has left, read again every 30 seconds.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    setState("waiting");
    if (!start) return;
    let stop = false;
    const tick = async () => {
      if (stop || document.visibilityState === "hidden") return;
      if (Date.now() > start.expiresAt + 2 * 60_000) return setState("expired");
      const s = await checkWhatsapp(start, setPhoneEnd);
      if (stop) return;
      setState(s);
      if (s === "signed_in") {
        stop = true;
        done.current();
      }
    };
    void tick();
    const timer = window.setInterval(() => void tick(), CHECK_MS);
    const onVisible = () => void tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [start]);

  const ended =
    state === "expired" || state === "used" || state === "unknown" || state === "failed";

  const openButton = (label: string) =>
    start ? (
      <a
        href={start.href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          buttonClass("primary", "lg", true),
          "h-auto min-h-13 whitespace-normal py-2 text-center",
        )}
        data-main-cta
        data-wa-open
      >
        <MessageCircle aria-hidden className="size-5" />
        {label}
      </a>
    ) : null;

  return (
    <div className="space-y-4">
      {!start ? (
        error ? null : (
          <p className="text-small text-text-2" role="status" aria-live="polite">
            Getting your sign-in ready.
          </p>
        )
      ) : ended ? (
        <div className="space-y-3">
          <p className="text-body text-text-1" role="status">
            {state === "failed"
              ? "The sign-in did not finish. Start again."
              : "This sign-in has ended. Start again."}
          </p>
          <button type="button" className={buttonClass("primary", "lg", true)} onClick={pre.again}>
            Start again
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {phone ? (
            openButton("Open WhatsApp")
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              {openButton("Open WhatsApp on this computer")}
              <div
                className="size-28 rounded-inner border border-line bg-kb-white p-1"
                role="img"
                aria-label="QR code that opens WhatsApp on your phone with the sign-in message"
                data-wa-qr
                dangerouslySetInnerHTML={{ __html: qrSvg(start.href, 104) }}
              />
            </div>
          )}
          <ol className="space-y-2.5">
            <Step n={1}>
              {phone
                ? "Tap Open WhatsApp."
                : "Scan the code with your phone, or open WhatsApp on this computer."}
            </Step>
            <Step n={2}>
              Send the message <span className="font-bold">Kabsi sign in {start.code}</span>.{" "}
              {minutesLeft(start.expiresAt, now)}
            </Step>
            <Step n={3}>Tap Yes, it&apos;s me on Kabsi&apos;s answer.</Step>
          </ol>
          <p className="text-small font-semibold text-text-1" role="status" aria-live="polite">
            {state === "asked"
              ? phoneEnd
                ? `Kabsi answered the phone ending in ${phoneEnd}. Not your phone? Close this page.`
                : "Kabsi answered on WhatsApp. Tap Yes, it's me there."
              : "Waiting for your message on WhatsApp."}
          </p>
          <div className="text-small text-text-2">
            <p>{WA_CONSENT_SHORT}</p>
            <details className="mt-1">
              <summary className="inline-flex min-h-11 cursor-pointer items-center font-bold text-text-1 underline underline-offset-4">
                What Kabsi sends
              </summary>
              <ul className="list-disc space-y-1 pl-5">
                {WA_CONSENT_LINES.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      )}
      {error ? (
        <div className="space-y-3">
          <p
            role="alert"
            className="rounded-inner bg-bad-soft px-4 py-3 text-small font-semibold text-bad"
          >
            {error}
          </p>
          <button
            type="button"
            className={buttonClass("secondary", "lg", true)}
            onClick={pre.again}
          >
            Try again
          </button>
        </div>
      ) : null}
      <button
        type="button"
        className={buttonClass("tertiary")}
        onClick={() => {
          setState("waiting");
          onBack();
        }}
      >
        Back to the other ways
      </button>
    </div>
  );
}
