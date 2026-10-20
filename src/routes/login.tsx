import { createFileRoute, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect } from "react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { useAuth } from "@/components/auth/auth-provider";
import { safeNext } from "@/lib/signup";

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
      <section className="bg-kb-sand px-5 py-12 sm:py-20">
        <div className="mx-auto max-w-md rounded-large bg-kb-white p-6 shadow-kb sm:p-9">
          <h1 className="font-display text-5xl leading-none">Log in</h1>
          <p className="mb-7 mt-3 leading-7 text-kb-stone">
            New to Kabsi? The same steps create your account.
          </p>
          <SignInPanel next={target} onDone={() => router.history.replace(target)} />
        </div>
      </section>
    </PublicLayout>
  );
}
