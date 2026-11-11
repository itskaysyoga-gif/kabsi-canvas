import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Banner, Button, Field, buttonClass } from "@/components/kabsi/ui";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Turnstile } from "@/components/turnstile";
import { supabase } from "@/lib/supabase";
import { continueWithGoogle, requestEmailCode, SignupError } from "@/lib/signup";
import { emailTypoSuggestion } from "@/lib/email-typo";
import { codeErrorWords, GOOGLE_UNAVAILABLE, IN_APP_LINE, OFFLINE } from "@/lib/sign-in-errors";
import { WHATSAPP_ON } from "@/lib/site";
import { drawGoogleButton, loadGis } from "@/lib/google-gis";
import { googleSignInOn, isPhoneNow, waysOrder } from "@/lib/wa-signin";
import { useWaPrestart, WhatsAppChoice, WhatsAppStep } from "@/components/auth/whatsapp-signin";

// The approved line for an email that is not a full address (COPY.md 24, Design 4).
const EMAIL_ERROR = "Check the email. It needs a full address, like name@shop.com.";
const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const RESEND_SECONDS = 60;
const online = () => typeof navigator === "undefined" || navigator.onLine !== false;
function webmailLink(domain: string): { label: string; href: string } | null {
  if (domain === "gmail.com" || domain === "googlemail.com")
    return { label: "Open Gmail", href: "https://mail.google.com/" };
  if (domain === "outlook.com" || domain === "hotmail.com" || domain === "live.com")
    return { label: "Open Outlook", href: "https://outlook.live.com/mail/" };
  return null;
}

/** Fix 5: Google's own button through Google Identity Services, so the chooser names kabsi.co. It loads Google's
 * script only here; until it is drawn (or when it fails to load, or no client ID is set) the redirect button stays. */
function GisGoogle({
  fallback,
  onDone,
  onError,
}: {
  fallback: ReactNode;
  onDone: () => void;
  onError: (message: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;
  const fail = useRef(onError);
  fail.current = onError;
  useEffect(() => {
    let live = true;
    void loadGis().then(async (gis) => {
      if (!live || !gis || !box.current) return;
      try {
        await drawGoogleButton(gis, box.current, {
          width: box.current.parentElement?.clientWidth ?? 360,
          onSigned: () => done.current(),
          onError: () => fail.current(GOOGLE_UNAVAILABLE),
        });
        if (live) setDrawn(true);
      } catch {
        /* the redirect button stays */
      }
    });
    return () => {
      live = false;
    };
  }, []);
  return (
    <div>
      <div ref={box} className={drawn ? "flex min-h-11 justify-center" : "hidden"} data-gis />
      {drawn ? null : fallback}
    </div>
  );
}

/** "Continue with Google", or, inside an in-app browser, the line saying why it does not work there and a copy link. */
function GoogleChoice({
  inApp,
  busy,
  onGoogle,
}: {
  inApp: boolean;
  busy: boolean;
  onGoogle: () => void;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onGoogle}
        disabled={busy || inApp}
        aria-describedby={inApp ? "google-in-app" : undefined}
        className={buttonClass("secondary", "lg", true) + " disabled:opacity-60"}
      >
        <span className="grid size-7 place-items-center rounded-full border border-line bg-kb-white">
          <img src="/brand/google-g.svg" alt="" className="size-[18px]" />
        </span>
        Continue with Google
      </button>
      {inApp ? (
        <div id="google-in-app" className="text-small text-text-2">
          <p>{IN_APP_LINE}</p>
          <button
            type="button"
            onClick={() => void copy()}
            className={buttonClass("tertiary") + " mt-1"}
          >
            {copied ? "Link copied" : "Copy the link"}
          </button>
          <span className="sr-only" role="status">
            {copied ? "Link copied" : ""}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** The sign-up sheet's body, shared by /login and the "Save your snapshot and continue" sheet (P0.4-02, K-91; App 4;
 * Signup 1): three ways. On a phone Continue with WhatsApp, Continue with Google, then the email code; on a desktop Google,
 * WhatsApp, then the email code; in an in-app browser WhatsApp first, then the email code, then Google below it. Google is
 * hidden when the provider is off in Supabase Auth. No passwords. */
export function SignInPanel({
  next,
  onDone,
  start = "choose",
  inApp = false,
  focusFirst = false,
}: {
  next: string;
  onDone: () => void;
  /** "email" opens with the email field ready (after Google was cancelled, and in in-app browsers). */
  start?: "choose" | "email";
  inApp?: boolean;
  /** Moves focus to the first field or button when the sheet appears (the log in page). */
  focusFirst?: boolean;
}) {
  const [step, setStep] = useState<"choose" | "email" | "code" | "whatsapp">(
    inApp ? "email" : start,
  );
  // Signup 1: Google only when Auth says the provider is on; the order by device, read after the first paint.
  const [googleOk, setGoogleOk] = useState(true);
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    setPhone(isPhoneNow());
    let live = true;
    void googleSignInOn().then((on) => live && setGoogleOk(on));
    return () => {
      live = false;
    };
  }, []);
  const waOn = WHATSAPP_ON;
  // Fix 5: the bot check and the WhatsApp sign-in code start in the background as soon as the panel opens.
  const wa = useWaPrestart(waOn);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [round, setRound] = useState(0);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const sentAt = useRef<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    if (inApp) setStep((s) => (s === "choose" ? "email" : s));
  }, [inApp]);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  // Focus: the first field when the log in page opens, then the field of each new step.
  useEffect(() => {
    if (!focusFirst && !moved.current) return;
    const el = root.current?.querySelector<HTMLElement>(
      step === "code" ? "input" : step === "email" ? "input[type=email]" : "button",
    );
    el?.focus({ preventScroll: true });
  }, [focusFirst, step]);

  async function google() {
    setError("");
    if (!online()) return setError(OFFLINE);
    setBusy(true);
    try {
      await continueWithGoogle(next);
    } catch (e) {
      setError(e instanceof SignupError ? e.message : GOOGLE_UNAVAILABLE);
      setStep("email");
      setBusy(false);
    }
  }
  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    setError("");
    setEmailError("");
    const normalized = email.trim().toLowerCase();
    if (!normalized || !looksLikeEmail(normalized)) return setEmailError(EMAIL_ERROR);
    if (!online()) return setError(OFFLINE);
    setBusy(true);
    try {
      await requestEmailCode(normalized, token);
      setEmail(normalized);
      moved.current = true;
      setStep("code");
      setCode("");
      sentAt.current = Date.now();
      setSeconds(RESEND_SECONDS);
    } catch (e) {
      setError(e instanceof SignupError ? e.message : "Something went wrong. Please try again.");
    }
    // A Turnstile pass is good for one request; the next request gets a fresh one.
    setToken("");
    setRound((n) => n + 1);
    setBusy(false);
  }
  async function verifyCode(event?: FormEvent) {
    event?.preventDefault();
    setError("");
    if (code.length !== 6) return setError("Enter the 6-digit code.");
    if (!online()) return setError(OFFLINE);
    setBusy(true);
    let authError: {
      status?: number | undefined;
      message?: string | undefined;
      name?: string | undefined;
    } | null = null;
    try {
      const r = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
      authError = r.error;
    } catch {
      authError = { message: "fetch failed" };
    }
    if (authError) {
      setError(
        codeErrorWords(authError, { online: online(), sentAt: sentAt.current, now: Date.now() }),
      );
      setCode("");
      setBusy(false);
      return;
    }
    onDone();
  }

  const typo = emailTypoSuggestion(email.trim());
  const emailForm = (
    <form onSubmit={sendCode} noValidate>
      <Field
        id="email"
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setEmailError("");
        }}
        placeholder="name@shop.com"
        required
        error={emailError || undefined}
        hint="Kabsi emails you a 6-digit code. There is no password."
      />
      {typo ? (
        <p className="mt-2 text-small text-text-2" role="status">
          Did you mean {typo}?{" "}
          <button
            type="button"
            className="inline-flex min-h-11 items-center font-bold text-text-1 underline underline-offset-4"
            onClick={() => setEmail(typo)}
          >
            Use it
          </button>
        </p>
      ) : null}
      <div className="mt-3">
        <Turnstile key={round} onToken={setToken} />
      </div>
      <div className="mt-3" data-main-cta>
        <Button type="submit" full loading={busy} disabled={!token}>
          Send me a code
        </Button>
      </div>
      {inApp ? null : (
        <button
          type="button"
          className={buttonClass("tertiary") + " mt-3"}
          onClick={() => {
            setError("");
            setEmailError("");
            moved.current = true;
            setStep("choose");
          }}
        >
          {googleOk ? "Back to Continue with Google" : "Back to the other ways"}
        </button>
      )}
    </form>
  );

  return (
    <div ref={root} className="relative">
      {/* One stable place, so the check keeps going when the owner taps Continue with WhatsApp. */}
      {wa.widget(step === "whatsapp")}
      {step === "choose" ? (
        <div className="space-y-3">
          {waysOrder(phone).map((way) =>
            way === "google" ? (
              googleOk ? (
                <GisGoogle
                  key={way}
                  onDone={onDone}
                  onError={(m) => setError(m)}
                  fallback={
                    <GoogleChoice inApp={false} busy={busy} onGoogle={() => void google()} />
                  }
                />
              ) : null
            ) : way === "whatsapp" ? (
              waOn ? (
                <WhatsAppChoice
                  key={way}
                  busy={busy}
                  onPick={() => {
                    setError("");
                    moved.current = true;
                    setStep("whatsapp");
                  }}
                />
              ) : null
            ) : (
              <Button
                key={way}
                variant="secondary"
                full
                disabled={busy}
                onClick={() => {
                  setError("");
                  moved.current = true;
                  setStep("email");
                }}
              >
                Continue with email
              </Button>
            ),
          )}
          {googleOk ? (
            <p className="pt-1 text-small text-text-2">
              Google sign-in shares only your name and email address with Kabsi. It does not give
              Kabsi access to your Business Profile.
            </p>
          ) : null}
        </div>
      ) : step === "whatsapp" ? (
        <WhatsAppStep
          phone={phone}
          pre={wa}
          onDone={onDone}
          onBack={() => {
            moved.current = true;
            setStep(inApp ? "email" : "choose");
          }}
        />
      ) : step === "email" ? (
        <>
          {inApp && waOn ? (
            <div className="mb-6 border-b border-line pb-5">
              <WhatsAppChoice
                busy={busy}
                onPick={() => {
                  setError("");
                  moved.current = true;
                  setStep("whatsapp");
                }}
              />
            </div>
          ) : null}
          {emailForm}
          {inApp && googleOk ? (
            <div className="mt-6 border-t border-line pt-5">
              <GoogleChoice inApp busy={busy} onGoogle={() => void google()} />
            </div>
          ) : null}
        </>
      ) : (
        <form onSubmit={verifyCode}>
          <Banner tone="ok" title="Sent. Check your email.">
            Enter the 6-digit code we sent to <span className="font-bold text-text-1">{email}</span>
            . It works for 10 minutes.
          </Banner>
          <label htmlFor="login-code" className="mt-5 mb-2 block text-small font-bold text-text-1">
            Code
          </label>
          <InputOTP
            id="login-code"
            maxLength={6}
            value={code}
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="^[0-9]*$"
            onChange={(value) => {
              const digits = value.replace(/\D/g, "").slice(0, 6);
              setCode(digits);
              if (digits.length === 6 && !busy)
                window.setTimeout(
                  () =>
                    (document.getElementById("login-submit") as HTMLButtonElement | null)?.click(),
                  0,
                );
            }}
            containerClassName="w-full justify-between"
            aria-label="6-digit one-time code"
          >
            <InputOTPGroup className="w-full justify-between gap-1.5">
              {Array.from({ length: 6 }, (_, index) => (
                <InputOTPSlot
                  key={index}
                  index={index}
                  className="h-13 min-w-0 flex-1 rounded-input border border-stroke bg-surface-2 text-title text-text-1 first:rounded-input first:border last:rounded-input"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <div className="mt-5" data-main-cta>
            <Button id="login-submit" type="submit" full loading={busy}>
              Log in
            </Button>
          </div>
          <p className="mt-3 text-small text-text-2">
            Can&apos;t see it? Check your spam folder. The email comes from hello@kabsi.co.
          </p>
          {(() => {
            const link = webmailLink(email.slice(email.lastIndexOf("@") + 1));
            return link ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass("secondary", "md", true) + " mt-3"}
              >
                {link.label}
              </a>
            ) : null;
          })()}
          {seconds > 0 ? (
            <p className="mt-5 text-small text-text-2" aria-live="off" data-countdown>
              You can ask for a new code in {seconds} {seconds === 1 ? "second" : "seconds"}.
            </p>
          ) : (
            <div className="mt-5">
              <Turnstile key={round} onToken={setToken} />
              <button
                type="button"
                className={buttonClass("tertiary") + " mt-2 disabled:text-text-2"}
                disabled={busy || !token}
                onClick={() => void sendCode()}
              >
                Send a new code
              </button>
            </div>
          )}
          <button
            type="button"
            className={buttonClass("tertiary") + " mt-2 block"}
            onClick={() => {
              moved.current = true;
              setStep("email");
              setCode("");
              setError("");
            }}
          >
            Use a different email
          </button>
        </form>
      )}
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-inner bg-bad-soft px-4 py-3 text-small font-semibold text-bad"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
