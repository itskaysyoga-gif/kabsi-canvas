import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Turnstile } from "@/components/turnstile";
import { supabase } from "@/lib/supabase";
import { continueWithGoogle, requestEmailCode, SignupError } from "@/lib/signup";

// Plain words for the errors Supabase Auth returns when a code is checked.
function friendlyAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("expired") || m.includes("invalid"))
    return "That code didn't work. It may have expired: ask for a new one.";
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
    const normalized = email.trim().toLowerCase();
    if (!normalized) return setError("Enter your email address.");
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
            className="inline-flex h-[52px] w-full items-center justify-center gap-3 rounded-pill bg-kb-carbon px-6 text-base font-bold text-kb-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kb-black disabled:opacity-50"
          >
            <span className="grid size-7 place-items-center rounded-full bg-kb-white">
              <img src="/brand/google-g.svg" alt="" className="size-[18px]" />
            </span>
            Continue with Google
          </button>
          <Button
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => {
              setError("");
              setStep("email");
            }}
          >
            Continue with email
          </Button>
          <p className="pt-1 text-sm leading-6 text-kb-stone">
            Google sign-in shares only your name and email address with Kabsi. It does not give
            Kabsi access to your Business Profile.
          </p>
        </div>
      ) : step === "email" ? (
        <form onSubmit={sendCode}>
          <Label htmlFor="email" className="text-base">
            Email address
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 h-[52px] rounded-card border-kb-hairline bg-kb-white px-4 text-base"
            placeholder="you@example.com"
            required
          />
          {(() => {
            const suggestion = emailTypoSuggestion(email.trim());
            return suggestion ? (
              <p className="mt-2 text-sm text-kb-stone">
                Did you mean {suggestion}?{" "}
                <button
                  type="button"
                  className="font-bold underline-offset-4 hover:underline"
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
          <Button className="mt-3 w-full" disabled={busy || !token}>
            {busy ? "Sending" : "Send me a code"}
          </Button>
          <p className="mt-3 text-sm text-kb-stone">
            We email you a 6-digit code. There is no password to remember.
          </p>
          <button
            type="button"
            className="mt-4 min-h-11 text-sm font-bold underline-offset-4 hover:underline"
            onClick={() => {
              setError("");
              setStep("choose");
            }}
          >
            Back to Continue with Google
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode}>
          <p className="leading-7 text-kb-stone">
            Enter the 6-digit code sent to <span className="font-bold text-kb-ink">{email}</span>.
            It works for 10 minutes.
          </p>
          <Label htmlFor="login-code" className="mt-4 block text-base">
            One-time code
          </Label>
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
            containerClassName="mt-3 w-full justify-between"
            aria-label="6-digit one-time code"
          >
            <InputOTPGroup className="w-full justify-between gap-1.5">
              {Array.from({ length: 6 }, (_, index) => (
                <InputOTPSlot
                  key={index}
                  index={index}
                  className="h-12 min-w-0 flex-1 rounded-card border border-kb-hairline text-lg first:rounded-card first:border last:rounded-card"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <Button id="login-submit" className="mt-5 w-full" disabled={busy}>
            {busy ? "Checking" : "Continue"}
          </Button>
          <p className="mt-3 text-sm text-kb-stone">
            Can't see it? Check your spam folder. The email comes from hello@kabsi.co.
          </p>
          {(() => {
            const link = webmailLink(email.slice(email.lastIndexOf("@") + 1));
            return link ? (
              <Button asChild variant="outline" className="mt-3 w-full">
                <a href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              </Button>
            ) : null;
          })()}
          {seconds > 0 ? (
            <p className="mt-5 text-sm text-kb-stone">You can ask for a new code in {seconds}s.</p>
          ) : (
            <div className="mt-5">
              <Turnstile key={round} onToken={setToken} />
              <button
                type="button"
                className="mt-2 min-h-11 text-sm font-bold underline-offset-4 hover:underline disabled:text-kb-stone"
                disabled={busy || !token}
                onClick={() => void sendCode()}
              >
                Send a new code
              </button>
            </div>
          )}
          <button
            type="button"
            className="mt-2 block min-h-11 text-sm font-bold underline-offset-4 hover:underline"
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
        <p role="alert" className="mt-4 rounded-card bg-kb-red/10 px-4 py-3 text-sm text-kb-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}
