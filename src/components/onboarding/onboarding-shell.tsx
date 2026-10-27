import { useEffect, type ReactNode } from "react";
import { KabsiLogo } from "@/components/shared/kabsi-logo";
import { cn } from "@/lib/utils";
import { STAGES } from "@/lib/onboarding-flow";
import { CONTACT_EMAIL, NOT_AFFILIATED } from "@/lib/site";
import { AssistantWidget } from "@/components/assistant/assistant-widget";
import { NeedAHand, type HelpState } from "@/components/onboarding/need-a-hand";

/**
 * The quiet page around onboarding (Design 3): the logo, the four stages (master plan 30.16 section 3) and one column.
 * Light, like every signed-in page. Stage 1, the free check, is public; /start shows stages 2 to 4 and what follows.
 */
export function OnboardingShell({
  stage,
  step,
  help,
  assistant = "app",
  below,
  children,
}: {
  /** The current stage, 0 to 3; 4 when the four are done. No strip when left out. */
  stage?: number;
  /** /get-started (before an account) is the free check: stage 1. */
  step?: "check";
  /** The step's help (K-111): the "Need a hand?" chip goes under the step, the same place on every screen. */
  help?: HelpState;
  /** Nora's surface: the public site before sign-up, the website after. She has no launcher here; the chip opens her. */
  assistant?: "site" | "app";
  /** Under the step, after the help: the resume link. */
  below?: ReactNode;
  children: ReactNode;
}) {
  // The privacy panel and Nora open outside the page: light too, while this page shows.
  useEffect(() => {
    document.body.classList.add("theme-light");
    return () => document.body.classList.remove("theme-light");
  }, []);
  const current = stage ?? (step === "check" ? 0 : undefined);
  return (
    <div className="theme-light flex min-h-dvh flex-col overflow-x-clip bg-surface-0 text-text-1">
      <header className="mx-auto flex h-16 w-full max-w-xl shrink-0 items-center justify-between px-4 sm:px-0">
        <span className="inline-flex min-h-11 items-center">
          <KabsiLogo />
        </span>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="-me-2 inline-flex min-h-11 items-center rounded-full px-2 text-small font-semibold text-text-2 underline-offset-4 hover:text-text-1 hover:underline"
        >
          Need help?
        </a>
      </header>
      <main id="main" className="mx-auto w-full max-w-xl flex-1 px-4 pt-4 pb-10 sm:px-0">
        {current !== undefined ? <Stages current={current} /> : null}
        <div className={current !== undefined ? "mt-8" : undefined}>{children}</div>
        {help ? <NeedAHand help={help} /> : null}
        {below}
      </main>
      <footer className="mx-auto w-full max-w-xl px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] text-small text-text-2 sm:px-0">
        <p>{NOT_AFFILIATED}</p>
      </footer>
      <AssistantWidget surface={assistant} />
    </div>
  );
}

/** The four stages: done green, the current one dark, later ones grey. Names from 640 px; one line on a phone. */
export function Stages({ current }: { current: number }) {
  return (
    <nav aria-label="Setup">
      <ol className="grid grid-cols-4 gap-2">
        {STAGES.map((s, i) => (
          <li key={s} className="min-w-0" aria-current={i === current ? "step" : undefined}>
            <span
              aria-hidden
              className={cn(
                "block h-1.5 rounded-full",
                i < current ? "bg-kb-green" : i === current ? "bg-text-1" : "bg-line-strong",
              )}
            />
            <span
              aria-hidden
              className={cn(
                "mt-2 hidden text-label font-bold sm:block",
                i <= current ? "text-text-1" : "text-text-2",
              )}
            >
              {s}
            </span>
            <span className="sr-only">
              {i < current ? `${s}, done` : i === current ? `${s}, now` : s}
            </span>
          </li>
        ))}
      </ol>
      {current < STAGES.length ? (
        <p className="mt-3 text-small font-bold text-text-2 sm:hidden" aria-hidden>
          Step {current + 1} of {STAGES.length}:{" "}
          <span className="text-text-1">{STAGES[current]}</span>
        </p>
      ) : null}
    </nav>
  );
}

export function StepTitle({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-h2 font-bold text-text-1">{title}</h1>
      {sub ? <p className="mt-3 text-lead text-text-2">{sub}</p> : null}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return message ? (
    <p role="alert" className="mt-4 rounded-card bg-bad-soft px-4 py-3 text-small text-bad">
      {message}
    </p>
  ) : null;
}
