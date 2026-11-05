import { useEffect, useRef, useState, type FormEvent } from "react";
import { Banner, Button, Field, buttonClass } from "@/components/kabsi/ui";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Turnstile } from "@/components/turnstile";
import { supabase } from "@/lib/supabase";
import { continueWithGoogle, requestEmailCode, SignupError } from "@/lib/signup";
import { emailTypoSuggestion } from "@/lib/email-typo";
import { codeErrorWords, GOOGLE_UNAVAILABLE, IN_APP_LINE, OFFLINE } from "@/lib/sign-in-errors";

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

/** The sign-up sheet's body, shared by /login and the "Save your snapshot and continue" sheet (P0.4-02, K-91; App 4):
 * "Continue with Google" first and "Continue with email" (a 6-digit code) second; in an in-app browser the email code
 * comes first and Google below it. No passwords. */
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
  const [step, setStep] = useState<"choose" | "email" | "code">(inApp ? "email" : start);
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
          Back to Continue with Google
        </button>
      )}
    </form>
  );

  return (
    <div ref={root}>
      {step === "choose" ? (
        <div className="space-y-3">
          <GoogleChoice inApp={false} busy={busy} onGoogle={() => void google()} />
          <Button
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
          <p className="pt-1 text-small text-text-2">
            Google sign-in shares only your name and email address with Kabsi. It does not give
            Kabsi access to your Business Profile.
          </p>
        </div>
      ) : step === "email" ? (
        <>
          {emailForm}
          {inApp ? (
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
