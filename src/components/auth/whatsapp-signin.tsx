import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { buttonClass } from "@/components/kabsi/ui";
import { Turnstile } from "@/components/turnstile";
import { qrSvg } from "@/lib/qr";
import {
  checkWhatsapp,
  forgetStart,
  keptStart,
  startWhatsapp,
  WA_CONSENT_LINES,
  WA_CONSENT_SHORT,
  WaSigninError,
  type WaStart,
  type WaState,
} from "@/lib/wa-signin";

/** "Continue with WhatsApp", the button on the first step of the sign-in sheet (Signup 1). */
export function WhatsAppChoice({
  busy,
  onPick,
  primary = false,
}: {
  busy: boolean;
  onPick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
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

// A sign-in code with less than this left is replaced before it is shown (the owner needs time to send it).
const FRESH_MS = 2 * 60_000;

export type WaPrestart = {
  start: WaStart | null;
  error: string;
  /** The invisible bot check. Kept mounted for the panel's life; shown only when Cloudflare asks for a click. */
  widget: (visible: boolean) => ReactNode;
  /** Forget the current code and make a new one (after it ended). */
  again: () => void;
};

/**
 * Fix 5 (R-158 item 2): the bot check and the sign-in code start in the background when the sign-in panel opens, so
 * "Continue with WhatsApp" shows the ready link at once. A code is asked for only with a passed check (an empty token
 * is a failed check and starts nothing); the server checks the token again before it makes a code.
 */
export function useWaPrestart(on: boolean): WaPrestart {
  const [start, setStart] = useState<WaStart | null>(() =>
    typeof window === "undefined" ? null : keptStart(),
  );
  const [error, setError] = useState("");
  const [round, setRound] = useState(0);
  const busy = useRef(false);
  const startRef = useRef(start);
  startRef.current = start;

  const onToken = useCallback((token: string) => {
    if (!token || busy.current) return;
    const s = startRef.current;
    if (s && s.expiresAt - Date.now() > FRESH_MS) return;
    busy.current = true;
    setError("");
    startWhatsapp(token)
      .then((s2) => setStart(s2))
      .catch((e) =>
        setError(
          e instanceof WaSigninError ? e.message : "Something went wrong. Please try again.",
        ),
      )
      .finally(() => {
        busy.current = false;
      });
  }, []);

  const again = useCallback(() => {
    forgetStart();
    setStart(null);
    setError("");
    setRound((n) => n + 1);
  }, []);

  // A code that is about to end while the panel stays open is replaced in the background.
  useEffect(() => {
    if (!start) return;
    const wait = Math.max(0, start.expiresAt - Date.now() - FRESH_MS);
    const t = window.setTimeout(again, wait);
    return () => window.clearTimeout(t);
  }, [start, again]);

  const widget = (visible: boolean) =>
    on && !start ? (
      <div className={visible ? "" : "pointer-events-none absolute h-0 w-full overflow-hidden"}>
        <Turnstile key={round} onToken={onToken} />
      </div>
    ) : null;
  return { start, error, widget, again };
}

const CHECK_MS = 2000;

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
        onDone();
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
  }, [start, onDone]);

  const ended =
    state === "expired" || state === "used" || state === "unknown" || state === "failed";

  const openButton = (label: string) =>
    start ? (
      <a
        href={start.href}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass("primary", "lg", true)}
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
            <div className="grid grid-cols-[1fr_auto] items-center gap-4">
              {openButton("Open WhatsApp on this computer")}
              <div
                className="size-32 rounded-inner border border-line bg-kb-white p-1.5"
                role="img"
                aria-label="QR code that opens WhatsApp on your phone with the sign-in message"
                data-wa-qr
                dangerouslySetInnerHTML={{ __html: qrSvg(start.href, 116) }}
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
              Send the message <span className="font-bold">Kabsi sign in {start.code}</span>. It
              works for 10 minutes.
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
