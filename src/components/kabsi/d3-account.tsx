// Parts of the signed-in website (Design 3, light; master plan 30.17 section 4): the page top with the section's tabs,
// panels, source labels and the task track every task shows (approved, sent to Google, on Google, or did not go
// through with what happens next; 30.15 section 3.1). The shell is src/components/layouts/app-layout.tsx.
import { Link, useRouterState } from "@tanstack/react-router";
import { AlertTriangle, Check, ExternalLink, Undo2 } from "lucide-react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { sectionFor, tabsFor } from "@/lib/app-nav";
import { myLatestLocation } from "@/lib/onboarding";
import { myAccess } from "@/lib/team";
import {
  CONFIRMED_LINE,
  OWNER_LABEL,
  SENT_LINE,
  UNDONE_LINE,
  failedNext,
  type OwnerState,
} from "@/lib/task-state";
import type { TaskItem } from "@/lib/task-feed";
import { StatusPill, buttonClass, type Tone } from "./ui";

const clean = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

/** The role of the signed-in person on the open business (cached with the shell's own queries). */
export function useAccountRole() {
  const loc = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const access = useQuery({
    queryKey: ["access", loc.data?.id],
    queryFn: () => myAccess(loc.data!.id),
    enabled: !!loc.data,
  });
  return access.data?.role;
}

/** H1, one lead line, the section's tabs (from src/lib/app-nav.ts) and an optional action on the right. */
export function AccountTop({
  title,
  lead,
  action,
  tabs = true,
  className,
}: {
  title: ReactNode;
  lead?: ReactNode;
  action?: ReactNode;
  tabs?: boolean;
  className?: string;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const role = useAccountRole();
  const section = sectionFor(path, role);
  const list = section && tabs ? tabsFor(section, role) : [];
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[2rem] leading-[1.1] font-bold tracking-[-0.02em] sm:text-[2.5rem]">
            {title}
          </h1>
          {lead && <p className="mt-2 max-w-[42rem] text-body text-text-2">{lead}</p>}
        </div>
        {action}
      </div>
      {list.length > 1 && (
        <nav
          aria-label="Pages in this section"
          className="-mx-4 mt-5 overflow-x-auto px-4 sm:mx-0 sm:px-0"
        >
          <ul className="flex w-max gap-1 border-b border-line sm:w-auto">
            {list.map((t) => {
              const on = clean(path) === t.to;
              return (
                <li key={t.to}>
                  <Link
                    to={t.to as "/"}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "relative flex min-h-11 items-center whitespace-nowrap px-3 text-small font-bold",
                      on ? "text-text-1" : "text-text-2 hover:text-text-1",
                    )}
                  >
                    {t.label}
                    {on && (
                      <span
                        aria-hidden
                        className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-text-1"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}

/** A white panel with an optional H2 and action. */
export function Panel({
  title,
  children,
  className,
  action,
  id,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <section
      aria-labelledby={title && id ? id : undefined}
      className={cn(
        "rounded-card border border-line bg-surface-1 p-4 shadow-rest sm:p-5",
        className,
      )}
    >
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          {title && (
            <h2 id={id} className="font-display text-h3 font-bold">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Where a number comes from (30.15: Google's numbers and Kabsi's checks are labelled, never mixed). */
export function SourceLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-label font-bold text-text-2",
        className,
      )}
    >
      {children}
    </p>
  );
}

export const OWNER_TONE: Record<OwnerState, Tone> = {
  approved: "info",
  sent: "info",
  confirmed: "ok",
  failed: "bad",
  undone: "info",
};

/** The state as a pill: a word and an icon, never colour alone. */
export function TaskPill({ state, className }: { state: OwnerState; className?: string }) {
  return (
    <StatusPill tone={OWNER_TONE[state]} className={className}>
      {OWNER_LABEL[state]}
    </StatusPill>
  );
}

type Step = "done" | "now" | "later" | "bad";

/** Approved, Sent to Google, Live on Google; the middle step turns red when it did not go through. */
export function TaskTrack({ state, className }: { state: OwnerState; className?: string }) {
  if (state === "undone") return null;
  const steps: { label: string; s: Step }[] = [
    { label: "Approved", s: "done" },
    {
      label: "Sent to Google",
      s: state === "approved" ? "now" : state === "failed" ? "bad" : "done",
    },
    {
      label: "Live on Google",
      s: state === "confirmed" ? "done" : state === "sent" ? "now" : "later",
    },
  ];
  return (
    <ol className={cn("grid grid-cols-3 gap-2", className)} aria-label="Where this task is">
      {steps.map((st) => (
        <li key={st.label} className="min-w-0">
          <span
            aria-hidden
            className={cn(
              "block h-1.5 rounded-full",
              st.s === "done" && "bg-kb-green",
              st.s === "now" && "bg-text-1",
              st.s === "later" && "bg-line-strong",
              st.s === "bad" && "bg-bad",
            )}
          />
          <span
            className={cn(
              "mt-2 flex items-center gap-1 text-label font-bold",
              st.s === "later" ? "text-text-3" : st.s === "bad" ? "text-bad" : "text-text-1",
            )}
          >
            {st.s === "done" && <Check className="size-3.5 shrink-0" strokeWidth={3} aria-hidden />}
            {st.s === "bad" && <AlertTriangle className="size-3.5 shrink-0" aria-hidden />}
            <span className="truncate">{st.label}</span>
            <span className="sr-only">
              {st.s === "done"
                ? ", done"
                : st.s === "now"
                  ? ", in progress"
                  : st.s === "bad"
                    ? ", failed"
                    : ""}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** The line under the track: what this state means, the Google link when Kabsi saw it, or what happens next. */
export function TaskOutcome({
  task,
  className,
  action,
}: {
  task: Pick<TaskItem, "owner" | "kind" | "state" | "link">;
  className?: string;
  action?: ReactNode;
}) {
  if (task.owner === "confirmed")
    return (
      <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
        <p className="text-small text-text-2">{CONFIRMED_LINE}</p>
        {task.link && (
          <a href={task.link} target="_blank" rel="noreferrer" className={buttonClass("tertiary")}>
            See it on Google
            <ExternalLink className="size-4" aria-hidden />
          </a>
        )}
      </div>
    );
  if (task.owner === "failed")
    return (
      <div role="alert" className={className}>
        <p className="text-body text-text-1">{failedNext(task.kind, task.state)}</p>
        {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
      </div>
    );
  if (task.owner === "undone")
    return (
      <p className={cn("flex items-center gap-2 text-small text-text-2", className)}>
        <Undo2 className="size-4" aria-hidden />
        {UNDONE_LINE}
      </p>
    );
  if (task.owner === "sent")
    return (
      <p className={cn("text-small text-text-2", className)} aria-live="polite">
        {SENT_LINE}
      </p>
    );
  return null;
}

/** One finished or moving task in a list (Home's "Done lately", Posts, Photos, Hours). */
export function TaskRow({ task, title }: { task: TaskItem; title: ReactNode }) {
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-body font-semibold">{title}</p>
        <TaskPill state={task.owner} />
      </div>
      {task.owner !== "undone" && <TaskTrack state={task.owner} className="mt-3" />}
      <TaskOutcome task={task} className="mt-3" />
    </li>
  );
}
