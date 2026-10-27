import { useEffect, useState, type FormEvent } from "react";
import { Banner, Button, Field, buttonClass } from "@/components/kabsi/ui";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Turnstile } from "@/components/turnstile";
import { supabase } from "@/lib/supabase";
import { continueWithGoogle, requestEmailCode, SignupError } from "@/lib/signup";

// Plain words for the errors Supabase Auth returns when a code is checked.
function friendlyAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("expired") || m.includes("invalid"))
    return "That code did not work. Check it, or send a new one.";
  if (m.includes("rate") || m.includes("seconds") || m.includes("too many"))
    return "Please wait a minute before trying again.";
  return "Something went wrong. Please try again.";
}
// Common domain typos, shown as a hint only, never applied automatically.
const DOMAIN_TYPOS: Record<string, string> = {
  "gmail.co": "gmail.com",
  "gmial.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmai.com": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outlook.co": "outlook.com",
  "icloud.co": "icloud.com",
};
function emailTypoSuggestion(value: string): string | null {
  const at = value.lastIndexOf("@");
  if (at < 1) return null;
  const fixed = DOMAIN_TYPOS[value.slice(at + 1).toLowerCase()];
  return fixed ? `${value.slice(0, at)}@${fixed}` : null;
}
// The approved line for an email that is not a full address (COPY.md 24, Design 4).
const EMAIL_ERROR = "Check the email. It needs a full address, like name@shop.com.";
const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
function webmailLink(domain: string): { label: string; href: string } | null {
  if (domain === "gmail.com" || domain === "googlemail.com")
    return { label: "Open Gmail", href: "https://mail.google.com/" };
  if (domain === "outlook.com" || domain === "hotmail.com" || domain === "live.com")
    return { label: "Open Outlook", href: "https://outlook.live.com/mail/" };
  return null;
}

/** The sign-up sheet's body, shared by /login and the "Save your snapshot and continue" sheet (P0.4-02, K-91):
 * "Continue with Google" first, "Continue with email" (a 6-digit code) second. No passwords. */
export function SignInPanel({ next, onDone }: { next: string; onDone: () => void }) {
  const [step, setStep] = useState<"choose" | "email" | "code">("choose");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [round, setRound] = useState(0);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  async function google() {
    setError("");
    setBusy(true);
    try {
      await continueWithGoogle(next);
    } catch (e) {
      setError(e instanceof SignupError ? e.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }
  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    setError("");
    setEmailError("");
    const normalized = email.trim().toLowerCase();
    if (!normalized || !looksLikeEmail(normalized)) return setEmailError(EMAIL_ERROR);
    setBusy(true);
    try {
      await requestEmailCode(normalized, token);
      setEmail(normalized);
      setStep("code");
      setSeconds(60);
    } catch (e) {
      setError(e instanceof SignupError ? e.message : "Something went wrong. Please try again.");
    }
    // A Turnstile pass is good for one request; the next request gets a fresh one.
    setToken("");
    setRound((n) => n + 1);
    setBusy(false);
  }
  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (code.length !== 6) return setError("Enter the 6-digit code.");
    setBusy(true);
    const { error: authError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    if (authError) {
      setError(friendlyAuthError(authError.message));
      setCode("");
      setBusy(false);
      return;
    }
    onDone();
  }

  return (
    <div>
      {step === "choose" ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => void google()}
            disabled={busy}
            className={buttonClass("secondary", "lg", true)}
          >
            <span className="grid size-7 place-items-center rounded-full border border-line bg-kb-white">
              <img src="/brand/google-g.svg" alt="" className="size-[18px]" />
            </span>
            Continue with Google
          </button>
          <Button
            variant="secondary"
            full
            disabled={busy}
            onClick={() => {
              setError("");
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
        <form onSubmit={sendCode} noValidate>
          <Field
            id="email"
            label="Email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
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
          {(() => {
            const suggestion = emailTypoSuggestion(email.trim());
            return suggestion ? (
              <p className="mt-2 text-small text-text-2">
                Did you mean {suggestion}?{" "}
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center font-bold text-text-1 underline underline-offset-4"
                  onClick={() => setEmail(suggestion)}
                >
                  Use it
                </button>
              </p>
            ) : null;
          })()}
          <div className="mt-3">
            <Turnstile key={round} onToken={setToken} />
          </div>
          <div className="mt-3" data-main-cta>
            <Button type="submit" full loading={busy} disabled={!token}>
              Send me a code
            </Button>
          </div>
          <button
            type="button"
            className={buttonClass("tertiary") + " mt-3"}
            onClick={() => {
              setError("");
              setEmailError("");
              setStep("choose");
            }}
          >
            Back to Continue with Google
          </button>
        </form>
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
            onChange={(value) => {
              setCode(value);
              if (value.length === 6 && !busy)
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
            <p className="mt-5 text-small text-text-2">You can ask for a new code in {seconds}s.</p>
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
