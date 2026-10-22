import type { ReactNode } from "react";
import { KabsiLogo } from "@/components/shared/kabsi-logo";
import { cn } from "@/lib/utils";
import { FLOW, type FlowStep } from "@/lib/onboarding-flow";

// The progress bar of six (K-141): Check, Sign up, Connect, About you, Confirm, Trial. Steps 1 and 2 happen before the
// account (get-started and the sign-up sheet); /start is steps 3 to 6.
export function OnboardingShell({
  step,
  children,
}: {
  step: FlowStep | "done";
  children: ReactNode;
}) {
  const index = step === "done" ? FLOW.length : FLOW.findIndex((s) => s.key === step);
  return (
    <main className="min-h-screen bg-kb-sand">
      <header className="border-b border-kb-hairline bg-kb-white">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-5">
          <KabsiLogo />
          <a
            href="mailto:hello@kabsi.co"
            className="-mr-2 inline-flex min-h-11 items-center rounded-card px-2 text-sm font-medium text-kb-stone underline-offset-4 hover:underline"
          >
            Need help?
          </a>
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-5 pb-16 pt-6 sm:pt-10">
        {step !== "done" ? (
          <p className="mb-2 text-sm font-bold text-kb-ink sm:hidden">
            Step {index + 1} of {FLOW.length}: {FLOW[index]?.label}
          </p>
        ) : null}
        {step !== "done" ? (
          <ol className="mb-6 grid grid-cols-6 gap-1.5 sm:gap-2" aria-label="Setup progress">
            {FLOW.map((s, i) => (
              <li key={s.key} className="min-w-0">
                <div
                  className={cn(
                    "h-1.5 rounded-pill",
                    i <= index ? "bg-kb-black" : "bg-kb-hairline",
                  )}
                />
                <p
                  className={cn(
                    "mt-2 hidden truncate text-sm font-medium sm:block",
                    i === index ? "text-kb-ink" : "text-kb-stone",
                  )}
                  aria-current={i === index ? "step" : undefined}
                >
                  {i + 1}. {s.label}
                </p>
                {i === index ? (
                  <span className="sr-only sm:hidden">Current step: {s.label}</span>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}
        <section className="rounded-large bg-kb-white p-6 shadow-kb sm:p-9">{children}</section>
      </div>
    </main>
  );
}

export function StepTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-4xl leading-tight text-kb-ink sm:text-5xl">{title}</h1>
      {sub ? <p className="mt-3 leading-7 text-kb-stone">{sub}</p> : null}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return message ? (
    <p role="alert" className="mt-4 rounded-card bg-kb-red/10 px-4 py-3 text-sm text-kb-red">
      {message}
    </p>
  ) : null;
}
