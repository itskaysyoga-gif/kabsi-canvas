import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { useAuth } from "@/components/auth/auth-provider";
import { D9Phone } from "@/components/kabsi/d9-hero";
import { D9_HERO_STREAM } from "@/components/kabsi/d9-data";
import { SiteLink } from "@/components/kabsi/site-link";
import { safeNext } from "@/lib/signup";
import { text } from "@/lib/search-params";
import { signedOutLine, takeSignedOutReason } from "@/lib/signed-out";
import { hasSessionKey } from "@/lib/stored-session";
import { inAppBrowserNow } from "@/lib/in-app-browser";
import { GOOGLE_STOPPED } from "@/lib/sign-in-errors";
import { Marked } from "@/components/kabsi/highlight";
import { WhatsAppInline } from "@/components/kabsi/ui";

const searchSchema = (
  s: Record<string, unknown>,
): { next?: string | undefined; error?: string | undefined } => ({
  next: text(s["next"]),
  error: text(s["error"]),
});

/** The three lines beside the sheet (facts 11 and 13). */
const TRUST = [
  "You stay the owner of your Google profile.",
  "Kabsi never asks for your Google password.",
  "Nothing is published without your yes.",
] as const;

/** Google sent the visitor back without a session: cancelled, refused or failed (in the address, query or hash). */
function googleStopped(search: string | undefined): boolean {
  if (search) return true;
  if (typeof window === "undefined") return false;
  return /[#&?](error|error_code)=/.test(window.location.hash + window.location.search);
}

/**
 * Where a signed-in person goes (App 4, 30.31 item 3): the page they asked for (a safe, same-site `next`), else Home of
 * the dashboard, or setup when no business is added yet (a new account).
 */
async function whereNext(next: string | undefined): Promise<string> {
  if (next) return safeNext(next);
  try {
    const { myLocations } = await import("@/lib/onboarding");
    return (await myLocations()).length === 0 ? "/start" : "/app";
  } catch {
    return "/app";
  }
}

// Log in and sign up are the same sheet (P0.4-02, K-91): Continue with Google, or a 6-digit email code. No passwords.
// App 4 (master plan 30.31 item 3) rebuilt the page on Design 9: the sheet on the left (alone on a phone) and, from
// 1024 px, a quiet panel with three facts and an Example approval on WhatsApp. Google sends the owner back here; the
// session is picked up from the address and the page moves on.
export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Log in | Kabsi" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Log in to Kabsi with Google or a one-time email code." },
      { property: "og:title", content: "Log in | Kabsi" },
      {
        property: "og:description",
        content: "Log in to Kabsi with Google or a one-time email code.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading } = useAuth();
  const { next, error } = Route.useSearch();
  const router = useRouter();
  // Browser-only facts, read after the first paint so the server render and the browser's first render agree.
  const [ready, setReady] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const [inApp, setInApp] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [held, setHeld] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    setLine(signedOutLine(takeSignedOutReason(["away-owner", "away-staff", "ended"])));
    setInApp(inAppBrowserNow());
    setStopped(googleStopped(error));
    setHeld(hasSessionKey());
    setReady(true);
  }, [error]);

  const go = async () => {
    setLeaving(true);
    router.history.replace(await whereNext(next));
  };

  // 1. Signed in already: straight on, without showing the sheet.
  useEffect(() => {
    if (!loading && user && !leaving) void go();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const signedInNow = leaving || (!!user && !loading) || (held && loading);

  return (
    <PublicLayout>
      <section className="container-kb pt-8 pb-16 md:pt-12 lg:pt-16 lg:pb-24">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:gap-16">
          <div className="mx-auto w-full max-w-md lg:mx-0">
            {line || stopped ? (
              <p
                role="status"
                className="mb-4 rounded-inner bg-surface-1 px-4 py-3 text-small font-semibold text-text-1 shadow-rest"
              >
                {line ?? GOOGLE_STOPPED}
              </p>
            ) : null}
            <div className="rounded-card border border-line bg-surface-1 p-5 shadow-rest sm:p-8">
              <h1 className="font-display text-h2 font-bold text-text-1">
                <Marked text="Log in to Kabsi" mark="Log in" />
              </h1>
              <p className="mt-3 mb-7 text-body text-text-2">
                New to Kabsi? The same steps create your account.
              </p>
              {!ready || signedInNow ? (
                <p role="status" className="min-h-40 text-body text-text-2">
                  {signedInNow ? "Opening your dashboard." : ""}
                </p>
              ) : (
                <SignInPanel
                  next={safeNext(next)}
                  onDone={() => void go()}
                  start={stopped ? "email" : "choose"}
                  inApp={inApp}
                  focusFirst
                />
              )}
            </div>
            <p className="mt-6 text-center text-small text-text-2">
              New here?{" "}
              <SiteLink
                to="/scan"
                className="inline-flex min-h-11 items-center font-bold text-text-1 underline underline-offset-4"
              >
                Check my business free
              </SiteLink>
            </p>
          </div>
          <aside aria-label="Why owners trust Kabsi" className="hidden lg:block lg:pt-4">
            <ul className="space-y-4">
              {TRUST.map((t) => (
                <li key={t} className="flex items-start gap-3 text-lead text-text-1">
                  <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-ok-soft text-ok">
                    <Check className="size-4" aria-hidden />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-10">
              <p className="mb-3 text-small font-bold text-text-2">
                An approval on WhatsApp
                <WhatsAppInline />
              </p>
              <D9Phone
                items={D9_HERO_STREAM.filter((m) => m.id === "review")}
                caption="Example: a new review on WhatsApp with a reply ready, and Yes, Edit and Skip."
                className="md:ms-0"
              />
            </div>
          </aside>
        </div>
      </section>
    </PublicLayout>
  );
}
