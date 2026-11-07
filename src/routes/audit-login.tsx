import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { KabsiMark, Button } from "@/components/kabsi/ui";
import { useLazyTurnstile } from "@/components/turnstile";
import { supabase } from "@/lib/supabase";

const ENDED = "This access has ended.";
const SIGN_IN_ERROR = "Unable to sign in. Check the details and try again.";

export const Route = createFileRoute("/audit-login")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Audit sign in | Kabsi" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AuditLogin,
});

function AuditLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const { area, widget, take } = useLazyTurnstile();

  useEffect(() => {
    let current = true;
    void (async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (!current || sessionError || !session) return;
      const { data, error } = await supabase.rpc("audit_login_allowed" as never);
      if (!current) return;
      if (error || data !== true) {
        await supabase.auth.signOut();
        if (current) setMessage(ENDED);
        return;
      }
      router.history.replace("/audit-overview");
    })();
    return () => {
      current = false;
    };
  }, [router]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const captchaToken = await take();
      if (!captchaToken) {
        setMessage("The browser check did not finish. Try again.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
        options: { captchaToken },
      });
      setPassword("");
      if (error) {
        setMessage(SIGN_IN_ERROR);
        return;
      }

      const { data, error: accessError } = await supabase.rpc("audit_login_allowed" as never);
      if (accessError || data !== true) {
        await supabase.auth.signOut();
        setMessage(ENDED);
        return;
      }
      router.history.replace("/audit-overview");
    } catch {
      await supabase.auth.signOut();
      setMessage("We could not verify this access. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="theme-light grid min-h-screen place-items-center bg-surface-0 px-4 py-10 text-text-1">
      <section className="w-full max-w-md rounded-card border border-line bg-surface-1 p-6 shadow-rest sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <KabsiMark className="size-9" />
          <span className="font-display text-title font-bold">Kabsi</span>
        </div>
        <h1 className="font-display text-h2 font-bold">Audit sign in</h1>
        <p className="mt-3 text-body text-text-2">
          This is a temporary access page for an authorized reviewer.
        </p>
        <form ref={area} onSubmit={(event) => void signIn(event)} className="mt-8 space-y-5">
          <div>
            <label htmlFor="audit-email" className="block text-small font-bold">
              Email
            </label>
            <input
              id="audit-email"
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-12 w-full rounded-inner border border-line-strong bg-surface-1 px-4 text-body text-text-1 focus-visible:outline-2 focus-visible:outline-focus"
            />
          </div>
          <div>
            <label htmlFor="audit-password" className="block text-small font-bold">
              Password
            </label>
            <input
              id="audit-password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-12 w-full rounded-inner border border-line-strong bg-surface-1 px-4 text-body text-text-1 focus-visible:outline-2 focus-visible:outline-focus"
            />
          </div>
          {widget}
          {message ? (
            <p className="text-small font-semibold text-bad" role="alert">
              {message}
            </p>
          ) : null}
          <Button type="submit" full loading={busy}>
            Sign in
          </Button>
        </form>
      </section>
    </main>
  );
}
