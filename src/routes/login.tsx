import { createFileRoute, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect } from "react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { useAuth } from "@/components/auth/auth-provider";
import { safeNext } from "@/lib/signup";
import { SiteLink } from "@/components/kabsi/site-link";

const searchSchema = z.object({ next: z.string().optional().catch(undefined) });

// Log in and sign up are the same sheet (P0.4-02, K-91): Continue with Google, or a 6-digit email code. No passwords.
// Google sends the owner back here; the session is picked up from the address and the page moves on to `next`.
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
  const { next } = Route.useSearch();
  const router = useRouter();
  const target = safeNext(next);

  useEffect(() => {
    if (!loading && user) router.history.replace(target);
  }, [loading, target, router.history, user]);

  return (
    <PublicLayout>
      <section className="container-kb py-10 sm:py-16">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-card border border-line bg-surface-1 p-5 shadow-rest sm:p-8">
            <h1 className="font-display text-h2 font-bold text-text-1">Log in to Kabsi</h1>
            <p className="mt-3 mb-7 text-body text-text-2">
              New to Kabsi? The same steps create your account.
            </p>
            <SignInPanel next={target} onDone={() => router.history.replace(target)} />
          </div>
          <p className="mt-6 text-center text-small text-text-2">
            New here?{" "}
            <SiteLink
              to="/scan"
              className="inline-flex min-h-11 items-center font-bold text-text-1 underline underline-offset-4"
            >
              See your map
            </SiteLink>
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
