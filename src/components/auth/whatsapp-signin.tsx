import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { buttonClass } from "@/components/kabsi/ui";
import { Turnstile } from "@/components/turnstile";
import { qrSvg } from "@/lib/qr";
import {
  checkWhatsapp,
  forgetStart,
  keptStart,
  startWhatsapp,
  WaSigninError,
  WHATSAPP_SIGNIN_CONSENT,
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

const CHECK_MS = 2000;

/**
 * The WhatsApp step (Signup 1, master plan 30.50 item 3a): Turnstile, then the ready link that opens WhatsApp with
 * "Kabsi sign in CODE" typed in (and on a desktop the same link as a QR code). This tab checks every 2 seconds; after the
 * owner taps "Yes, it's me" on WhatsApp, it signs in and goes on to its next page. Kabsi never sends a code.
 */
export function WhatsAppStep({
  phone,
  onDone,
  onBack,
}: {
  phone: boolean;
  onDone: () => void;
  onBack: () => void;
}) {
  const [start, setStart] = useState<WaStart | null>(() =>
    typeof window === "undefined" ? null : keptStart(),
  );
  const [state, setState] = useState<WaState>("waiting");
  const [error, setError] = useState("");
  const [phoneEnd, setPhoneEnd] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const busy = useRef(false);

  async function begin(token: string) {
    if (busy.current || !token) return;
    busy.current = true;
    setError("");
    try {
      setStart(await startWhatsapp(token));
      setState("waiting");
    } catch (e) {
      setError(e instanceof WaSigninError ? e.message : "Something went wrong. Please try again.");
      setRound((n) => n + 1);
    }
    busy.current = false;
  }

  useEffect(() => {
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
  function again() {
    forgetStart();
    setStart(null);
    setState("waiting");
    setRound((n) => n + 1);
  }

  return (
    <div className="space-y-4">
      {!start ? (
        <>
          <p className="text-body text-text-1">
            Kabsi opens WhatsApp with a short sign-in message. You send it, then tap Yes on
            Kabsi&apos;s answer.
          </p>
          <Turnstile key={round} onToken={(t) => void begin(t)} />
        </>
      ) : ended ? (
        <div className="space-y-3">
          <p className="text-body text-text-1" role="status">
            {state === "failed"
              ? "The sign-in did not finish. Start again."
              : "This sign-in has ended. Start again."}
          </p>
          <button type="button" className={buttonClass("primary", "lg", true)} onClick={again}>
            Start again
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <a
            href={start.href}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass("primary", "lg", true)}
            data-main-cta
          >
            <MessageCircle aria-hidden className="size-5" />
            Open WhatsApp
          </a>
          <p className="text-small text-text-2">{WHATSAPP_SIGNIN_CONSENT}</p>
          {phone ? null : (
            <div className="flex flex-col items-center gap-2 rounded-card border border-line bg-kb-white p-4">
              <div
                className="size-44"
                role="img"
                aria-label="QR code that opens WhatsApp with the sign-in message"
                dangerouslySetInnerHTML={{ __html: qrSvg(start.href, 176) }}
              />
              <p className="text-small text-text-2">Or scan this with your phone&apos;s camera.</p>
            </div>
          )}
          <p className="text-small text-text-2">
            The message says{" "}
            <span className="font-bold text-text-1">Kabsi sign in {start.code}</span>. It works for
            10 minutes.
          </p>
          <p className="text-small font-semibold text-text-1" role="status" aria-live="polite">
            {state === "asked"
              ? phoneEnd
                ? `Kabsi answered the phone ending in ${phoneEnd} on WhatsApp. If that is your phone, tap Yes, it's me there. If not, close this page.`
                : "Kabsi answered on WhatsApp. Tap Yes, it's me there."
              : "Waiting for your message on WhatsApp."}
          </p>
        </div>
      )}
      {error ? (
        <p
          role="alert"
          className="rounded-inner bg-bad-soft px-4 py-3 text-small font-semibold text-bad"
        >
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className={buttonClass("tertiary")}
        onClick={() => {
          forgetStart();
          onBack();
        }}
      >
        Back to the other ways
      </button>
    </div>
  );
}
