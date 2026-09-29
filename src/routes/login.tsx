import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth/auth-provider";

const searchSchema = z.object({ next: z.string().optional().catch(undefined) });
// Only same-site paths: "/x", never "//host" or "/\\host" (browsers treat both as another site).
function safeNext(next?: string) {
  return next && /^\/(?![\/\\])/.test(next) && !next.includes("\\") ? next : "/app";
}
// Plain words for the errors Supabase Auth returns.
function friendlyAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("expired") || m.includes("invalid"))
    return "That code didn't work. It may have expired: ask for a new one.";
  if (m.includes("rate") || m.includes("seconds") || m.includes("too many"))
    return "Please wait a minute before asking for another code.";
  if (m.includes("email") && m.includes("valid")) return "That email address doesn't look right.";
  return "Something went wrong. Please try again.";
}
// Common domain typos → the intended domain. Shown as a hint only, never applied automatically.
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
// Webmail shortcuts for the "check your email" screen.
function webmailLink(domain: string): { label: string; href: string } | null {
  if (domain === "gmail.com" || domain === "googlemail.com")
    return { label: "Open Gmail", href: "https://mail.google.com/" };
  if (domain === "outlook.com" || domain === "hotmail.com" || domain === "live.com")
    return { label: "Open Outlook", href: "https://outlook.live.com/mail/" };
  return null;
}
export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Log in | Kabsi" },
      { name: "description", content: "Log in to Kabsi with a secure email code." },
      { property: "og:title", content: "Log in | Kabsi" },
      { property: "og:description", content: "Log in to Kabsi with a secure email code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});
function LoginPage() {
  const { user, loading } = useAuth();
  const { next } = Route.useSearch();
  const router = useRouter();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!loading && user) router.history.replace(safeNext(next));
  }, [loading, next, router.history, user]);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    setError("");
    setBusy(true);
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setError("Enter your email address.");
      setBusy(false);
      return;
    }
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: { shouldCreateUser: true },
    });
    if (authError) setError(friendlyAuthError(authError.message));
    else {
      setEmail(normalized);
      setStep("code");
      setSeconds(60);
    }
    setBusy(false);
  }
  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (code.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
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
    router.history.replace(safeNext(next));
  }

  return (
    <PublicLayout>
      <section className="bg-kb-sand px-5 py-12 sm:py-20">
        <div className="mx-auto max-w-md rounded-large bg-kb-white p-6 shadow-kb sm:p-9">
          <div className="grid size-12 place-items-center rounded-full bg-kb-yellow">
            <Mail className="size-5" />
          </div>
          <h1 className="mt-6 font-display text-5xl leading-none">
            {step === "email" ? "Log in" : "Check your email"}
          </h1>
          <p className="mt-3 leading-7 text-kb-stone">
            {step === "email"
              ? "We’ll send you a one-time code. No password needed."
              : `Enter the 6-digit code sent to ${email}.`}
          </p>
          {step === "email" ? (
            <form className="mt-7" onSubmit={sendCode}>
              <Label htmlFor="email" className="text-base">
                Email address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
              <Button className="mt-4 w-full" disabled={busy}>
                {busy ? "Sending…" : "Send code"}
              </Button>
            </form>
          ) : (
            <form className="mt-7" onSubmit={verifyCode}>
              <Label htmlFor="login-code" className="text-base">
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
                        (
                          document.getElementById("login-submit") as HTMLButtonElement | null
                        )?.click(),
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
                {busy ? "Checking…" : "Log in"}
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
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  className="font-bold underline-offset-4 hover:underline disabled:text-kb-stone"
                  disabled={seconds > 0 || busy}
                  onClick={() => void sendCode()}
                >
                  {seconds > 0 ? `Resend code in ${seconds}s` : "Resend code"}
                </button>
                <button
                  type="button"
                  className="font-bold underline-offset-4 hover:underline"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError("");
                  }}
                >
                  Use a different email
                </button>
              </div>
            </form>
          )}
          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-card bg-kb-red/10 px-4 py-3 text-sm text-kb-red"
            >
              {error}
            </p>
          ) : null}
        </div>
        <p className="mx-auto mt-5 max-w-md text-center text-sm text-kb-stone">
          We only send you a code. There is no password to remember.
        </p>
      </section>
    </PublicLayout>
  );
}
