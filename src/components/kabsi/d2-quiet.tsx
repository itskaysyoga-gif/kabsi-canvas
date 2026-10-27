// Design 2's quiet shell (DESIGN-PROPOSAL.md, Design 2 "New parts" and round 2 item 4): the pages with one job that a
// business's customers, staff or an email open (/review, /activate, /u, /a, /h, /unsubscribe, /billing/done). Light
// (.theme-light on the page and on <body> while it shows, so the privacy panel opens light too), the Kabsi mark, one
// card, one action, the same small print. No menu, no marketing. The consent bar and "Your privacy choices" are the
// site-wide ones (src/components/shared/privacy-banner.tsx), opened with openPrivacyChoices.
import { useEffect, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { openPrivacyChoices } from "@/lib/consent";
import { NOT_AFFILIATED } from "@/lib/site";
import { cn } from "@/lib/utils";
import { SiteLink } from "./site-link";
import { Logo, type Tone } from "./ui";

const smallLink =
  "inline-flex min-h-11 items-center text-text-2 underline underline-offset-4 hover:text-text-1";

export function QuietShell({
  children,
  brand = true,
  top,
  className,
}: {
  children: ReactNode;
  /** The small bar with the Kabsi mark. The customer's review page has none (it is the business's page). */
  brand?: boolean;
  /** A strip above everything (the Test mode line). */
  top?: ReactNode;
  className?: string | undefined;
}) {
  useEffect(() => {
    document.body.classList.add("theme-light");
    return () => document.body.classList.remove("theme-light");
  }, []);
  return (
    <div
      className={cn(
        "theme-light flex min-h-dvh flex-col overflow-x-clip bg-surface-0 text-text-1",
        className,
      )}
    >
      <a
        href="#main"
        className="press fixed start-3 top-3 z-[60] -translate-y-20 rounded-full bg-kb-yellow px-4 py-3 text-small font-bold text-kb-black focus:translate-y-0"
      >
        Skip to content
      </a>
      {top}
      {brand && (
        <header className="container-kb flex h-16 shrink-0 items-center">
          <Logo className="-ms-1 ps-1" />
        </header>
      )}
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="container-kb space-y-1 pt-10 pb-[max(2rem,env(safe-area-inset-bottom))] text-small text-text-3">
        <div className="mx-auto w-full max-w-md">
          <p>{NOT_AFFILIATED}</p>
          <p className="flex flex-wrap items-center gap-x-5">
            <button type="button" onClick={openPrivacyChoices} className={smallLink}>
              Your privacy choices
            </button>
            <SiteLink to="/privacy" className={smallLink}>
              Privacy
            </SiteLink>
            <span>© 2026 Kabsi</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

/** The centred column with the page's one card. */
export function QuietCard({
  children,
  className,
  badge,
}: {
  children: ReactNode;
  className?: string | undefined;
  /** A label above the card (the Example badge on demo data). */
  badge?: ReactNode;
}) {
  return (
    <div className="container-kb pt-4 pb-6 sm:pt-10">
      <div className="mx-auto w-full max-w-md">
        {badge ? <div className="mb-3">{badge}</div> : null}
        <div
          className={cn(
            "rounded-card border border-line bg-surface-1 p-5 shadow-rest sm:p-7",
            className,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** The round icon at the top of a state (done, expired, not found). */
export function QuietMark({ icon: I, tone = "info" }: { icon: LucideIcon; tone?: Tone }) {
  return (
    <span
      className={cn(
        "mb-5 grid size-14 place-items-center rounded-full",
        tone === "ok" && "bg-ok-soft text-ok",
        tone === "warn" && "bg-warn-soft text-warn",
        tone === "bad" && "bg-bad-soft text-bad",
        tone === "info" && "bg-surface-2 text-text-2",
      )}
    >
      <I className="size-7" strokeWidth={1.75} aria-hidden />
    </span>
  );
}

/** The page's H1 in the card, with the business name above it when there is one. */
export function QuietTitle({
  children,
  business,
  lead,
  live,
}: {
  children: ReactNode;
  business?: string | null | undefined;
  lead?: ReactNode;
  /** Announce changes (the Undo countdown). */
  live?: boolean;
}) {
  return (
    <div>
      {business ? <p className="text-small font-bold text-text-2">{business}</p> : null}
      <h1
        className={cn("font-display text-h3 font-bold text-text-1", business && "mt-1")}
        aria-live={live ? "polite" : undefined}
      >
        {children}
      </h1>
      {lead ? <p className="mt-2 text-body text-text-2">{lead}</p> : null}
    </div>
  );
}
