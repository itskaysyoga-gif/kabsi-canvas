import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { reportError } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { Button, ButtonLink, KabsiMark } from "./ui";
import { SiteShell } from "./site-chrome";
import { useSearchFlag } from "./page-signals";

/** A quiet 7 by 7 of empty places with the mark in the middle: nothing to show here. */
function EmptyPlaces({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("grid w-56 grid-cols-7 gap-2.5 sm:w-64", className)}>
      {Array.from({ length: 49 }).map((_, i) =>
        i === 24 ? (
          <KabsiMark key={i} className="size-7 justify-self-center sm:size-8" />
        ) : (
          <span
            key={i}
            className={cn(
              "aspect-square rounded-full border border-line-strong",
              i === 17 && "border-dashed border-text-3",
            )}
          />
        ),
      )}
    </div>
  );
}

export function NotFoundPage() {
  // ?state=error shows the error screen in development, for the screenshot checks.
  const state = useSearchFlag("state");
  if (import.meta.env.DEV && state === "error") return <ErrorView />;
  return (
    <SiteShell>
      <title>Kabsi: This page is not here.</title>
      <meta name="robots" content="noindex" />
      <section className="container-kb grid min-h-[80dvh] items-center gap-12 pt-28 pb-20 md:grid-cols-[1fr_auto]">
        <div className="max-w-xl">
          <h1 className="text-display">This page is not here.</h1>
          <p className="mt-5 text-lead text-text-2">
            The link may be old. Nothing on your Google profile changed.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink to="/">Go home</ButtonLink>
            <ButtonLink to="/scan" variant="tertiary">
              Check my business free
            </ButtonLink>
          </div>
        </div>
        <EmptyPlaces className="opacity-80" />
      </section>
    </SiteShell>
  );
}

export function ErrorPage({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  useEffect(() => {
    reportError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <ErrorView
      onRetry={() => {
        router.invalidate();
        reset();
      }}
    />
  );
}

/** The error screen, also shown on /system and at /not-a-page?state=error. */
export function ErrorView({ onRetry }: { onRetry?: () => void }) {
  return (
    <SiteShell>
      <title>Kabsi: Something went wrong on our side.</title>
      <meta name="robots" content="noindex" />
      <section className="container-kb grid min-h-[80dvh] items-center pt-28 pb-20">
        <div className="max-w-xl">
          <h1 className="text-display">Something went wrong on our side.</h1>
          <p className="mt-5 text-lead text-text-2">Nothing you did. Try again in a minute.</p>
          <Button
            className="mt-8"
            onClick={onRetry ?? (() => window.location.reload())}
            icon={<RotateCcw className="size-5" aria-hidden />}
          >
            Try again
          </Button>
        </div>
      </section>
    </SiteShell>
  );
}
