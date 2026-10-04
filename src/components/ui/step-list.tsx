import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type Step = { title: React.ReactNode; description?: React.ReactNode; done?: boolean };

// A numbered list of steps. Numbers are black on sand, a finished step turns green with a tick, and the current
// step is outlined in black. No yellow here: the step list never carries the action.
function StepList({
  steps,
  current = 0,
  className,
}: {
  steps: Step[];
  /** Index of the step the owner is on. Steps before it are shown as done unless `done` says otherwise. */
  current?: number;
  className?: string;
}) {
  return (
    <ol className={cn("space-y-4", className)}>
      {steps.map((step, i) => {
        const done = step.done ?? i < current;
        const active = !done && i === current;
        return (
          <li key={i} className="flex gap-3" aria-current={active ? "step" : undefined}>
            <span
              aria-hidden="true"
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full text-kb-small font-bold",
                done && "bg-kb-green text-kb-white",
                active && "border-2 border-kb-black bg-kb-white text-kb-black",
                !done && !active && "bg-kb-sand text-kb-stone",
              )}
            >
              {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={cn("font-bold", !done && !active && "text-kb-stone")}>
                {step.title}
                {done ? <span className="sr-only"> (done)</span> : null}
              </p>
              {step.description ? (
                <p className="mt-0.5 text-kb-small text-kb-stone">{step.description}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export { StepList };
