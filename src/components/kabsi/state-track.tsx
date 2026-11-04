// One state track for every task (App 3, master plan 30.26 item 5): Approved, Sent to Google, Live on Google, with Did
// not go through in place of Live when Google says no. The public demonstration (d9-how.tsx) draws it as a column with a
// line under each state; the signed-in website draws the same marks as a row under a task or a photo tile. Kept tiny
// (lucide icons only), because How it works loads it too.
import { Circle, CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** "none": nothing has happened yet (the demonstration before the owner's yes). */
export type TrackState = "none" | "approved" | "sent" | "live" | "failed";

export type TrackStep = { id: "approved" | "sent" | "live"; label: string; text?: string };

/** The three steps with their names (the same words as WhatsApp and the demonstration). */
export const TRACK_STEPS: TrackStep[] = [
  { id: "approved", label: "Approved" },
  { id: "sent", label: "Sent to Google" },
  { id: "live", label: "Live on Google" },
];

export const FAILED_LABEL = "Did not go through";

type Mark = "done" | "now" | "later" | "failed";

function marks(state: TrackState, steps: TrackStep[]) {
  const order: TrackState[] = ["approved", "sent", "live"];
  const at = state === "failed" ? 1 : order.indexOf(state);
  return steps.map((s) => {
    const i = order.indexOf(s.id);
    const failedHere = state === "failed" && s.id === "live";
    const now = state === s.id && s.id !== "live";
    const done = !failedHere && !now && i <= at;
    const mark: Mark = failedHere ? "failed" : now ? "now" : done ? "done" : "later";
    return { step: s, mark };
  });
}

const ICON = { failed: CircleAlert, now: LoaderCircle, done: CircleCheck, later: Circle };
const TONE: Record<Mark, string> = {
  failed: "text-bad",
  done: "text-ok",
  now: "text-text-1",
  later: "text-text-3",
};
const SR: Record<Mark, string> = {
  failed: ", happened",
  done: ", done",
  now: ", now",
  later: ", not yet",
};

/**
 * The track. `column` (the demonstration): each state with its line of text. `row` (tasks and photo tiles): the three
 * marks side by side from 22rem of width, one line each below it, so a name is never cut or shortened.
 */
export function StateTrack({
  state,
  layout = "row",
  steps = TRACK_STEPS,
  failedText,
  label = "Where it is",
  className,
}: {
  state: TrackState;
  layout?: "row" | "column" | undefined;
  steps?: TrackStep[] | undefined;
  failedText?: string | undefined;
  label?: string | undefined;
  className?: string | undefined;
}) {
  const list = marks(state, steps);
  if (layout === "column")
    return (
      <ol className={cn("relative space-y-5 ps-11", className)} aria-label={label}>
        <span aria-hidden className="absolute start-[0.9rem] top-3 bottom-3 w-px bg-line-strong" />
        {list.map(({ step, mark }) => {
          const Icon = ICON[mark];
          return (
            <li key={step.id} className="relative">
              <span
                className={cn(
                  "absolute -start-11 top-0 grid size-7 place-items-center rounded-full bg-surface-1 transition-colors duration-200",
                  TONE[mark],
                )}
              >
                <Icon
                  className={cn(
                    "size-6",
                    mark === "now" && "motion-safe:animate-[kb-spin_1.2s_linear_infinite]",
                  )}
                  aria-hidden
                />
              </span>
              <p className={cn("text-title", mark === "later" && "text-text-3")}>
                {mark === "failed" ? FAILED_LABEL : step.label}
                <span className="sr-only">{SR[mark]}</span>
              </p>
              <p className="text-small text-text-2">
                {mark === "failed" ? (failedText ?? "") : step.text}
              </p>
            </li>
          );
        })}
      </ol>
    );
  // Narrow (a photo tile, a phone card): one short line per state, so no name is cut or runs into the next. From 22rem
  // of width: the three marks side by side on one rule.
  return (
    <div className={cn("@container", className)}>
      <ol className="grid gap-1.5 @[22rem]:grid-cols-3 @[22rem]:gap-1" aria-label={label}>
        {list.map(({ step, mark }, i) => {
          const Icon = ICON[mark];
          const name = mark === "failed" ? FAILED_LABEL : step.label;
          return (
            <li
              key={step.id}
              className="flex min-w-0 items-center gap-2 @[22rem]:flex-col @[22rem]:items-stretch @[22rem]:gap-1.5"
            >
              <span className="flex shrink-0 items-center gap-1">
                <Icon
                  className={cn(
                    "size-5 shrink-0",
                    TONE[mark],
                    mark === "now" && "motion-safe:animate-[kb-spin_1.2s_linear_infinite]",
                  )}
                  strokeWidth={2.25}
                  aria-hidden
                />
                {i < list.length - 1 ? (
                  <span
                    aria-hidden
                    className={cn(
                      "hidden h-0.5 flex-1 rounded-full @[22rem]:block",
                      mark === "done" ? "bg-ok" : "bg-line-strong",
                    )}
                  />
                ) : null}
              </span>
              <span
                className={cn(
                  "min-w-0 text-small leading-tight font-semibold",
                  mark === "later" ? "text-text-3" : mark === "failed" ? "text-bad" : "text-text-1",
                )}
              >
                {name}
                <span className="sr-only">{SR[mark]}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
