// Parts of the signed-in website (Design 3, light; master plan 30.17 section 4): the page top with the section's tabs,
// panels, source labels and the task track every task shows (approved, sent to Google, on Google, or did not go
// through with what happens next; 30.15 section 3.1). The shell is src/components/layouts/app-layout.tsx.
import { Link, useRouterState } from "@tanstack/react-router";
import { Headline } from "@/components/kabsi/highlight";
import { Check, ExternalLink, Undo2 } from "lucide-react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { sectionFor, tabOn, tabsFor } from "@/lib/app-nav";
import { myLatestLocation } from "@/lib/onboarding";
import { myAccess } from "@/lib/team";
import { OWNER_LABEL, UNDONE_LINE, failedNext, type OwnerState } from "@/lib/task-state";
import type { TaskItem } from "@/lib/task-feed";
import { StatusPill, buttonClass, type Tone } from "./ui";
import { StateTrack, type TrackState } from "./state-track";

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
  mark,
}: {
  /** The phrase of a string title on the highlight bar; the title's last word when not given (App 5). */
  mark?: string | undefined;
  title: ReactNode;
  lead?: ReactNode;
  action?: ReactNode;
  tabs?: boolean;
  className?: string;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const f = useRouterState({
    select: (s) => {
      const v = (s.location.search as Record<string, unknown>)["f"];
      return typeof v === "string" ? v : null;
    },
  });
  const role = useAccountRole();
  const section = sectionFor(path, role);
  const list = section && tabs ? tabsFor(section, role) : [];
  // App 2: one title per screen. Inside a place with tabs the title is the place, and the tab says which page is open.
  const heading = list.length > 1 && section ? section.label : title;
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-h2 font-bold text-balance text-text-1">
            {typeof heading === "string" ? <Headline text={heading} mark={heading === title ? mark : undefined} /> : heading}
          </h1>
          {lead && <p className="mt-2 max-w-[42rem] text-body text-text-2">{lead}</p>}
        </div>
        {action}
      </div>
      {list.length > 1 && (
        <nav
          aria-label="Pages in this section"
          className="-mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0"
        >
          <ul className="flex w-max gap-1 border-b border-line sm:w-auto">
            {list.map((t) => {
              const on = tabOn(t, path, f);
              return (
                <li key={`${t.to}${t.f ?? ""}`}>
                  <Link
                    to={t.to as "/"}
                    search={(t.f ? { f: t.f } : {}) as never}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "relative flex min-h-12 items-center whitespace-nowrap px-3 text-body font-semibold",
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
        "rounded-card border border-line bg-surface-1 p-5 shadow-rest sm:p-6",
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

const TRACK: Record<Exclude<OwnerState, "undone">, TrackState> = {
  approved: "approved",
  sent: "sent",
  confirmed: "live",
  failed: "failed",
};

/** Approved, Sent to Google, Live on Google, or Did not go through in place of Live (App 3: the one shared track, the same
 * as the public demonstration). On a narrow card (under 22rem) the states stack, one line each, never cut. */
export function TaskTrack({
  state,
  className,
}: {
  state: OwnerState;
  className?: string | undefined;
}) {
  if (state === "undone") return null;
  return <StateTrack state={TRACK[state]} label="Where this task is" className={className} />;
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
  // App 2: the state is already on the item (its pill and track); only what the owner can use is added: the Google link
  // once Kabsi saw it there, or what happens next when it did not go through. No explanation repeated on every item.
  if (task.owner === "confirmed")
    return task.link ? (
      <div className={className}>
        <a
          href={task.link}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonClass("tertiary"), "whitespace-normal text-start")}
        >
          See it on Google
          <ExternalLink className="size-4" aria-hidden />
        </a>
      </div>
    ) : null;
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

export type ChoiceOption = { value: string; label: string };

/**
 * App 3: a choice of eight or fewer as compact chips in rows that wrap (was a dropdown or a grid of boxes). A radio group,
 * so arrow keys move between the chips. The chosen chip is charcoal on yellow with a tick; the others are outlined. One
 * help line shows under the chips, for the chosen one (the caller passes it), never inside every chip.
 */
export function ChoiceChips({
  name,
  legend,
  options,
  value,
  onChange,
  help,
  legendClassName,
  className,
  disabled,
}: {
  name: string;
  legend: ReactNode;
  options: ChoiceOption[];
  value: string | null;
  onChange: (v: string) => void;
  help?: ReactNode;
  legendClassName?: string | undefined;
  className?: string | undefined;
  disabled?: boolean | undefined;
}) {
  return (
    <fieldset className={className} disabled={disabled}>
      <legend className={cn("text-small font-bold text-text-1", legendClassName)}>{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value === o.value;
          return (
            <label
              key={o.value}
              className={cn(
                "press inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-small font-semibold transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
                on
                  ? "border-kb-yellow bg-kb-yellow text-kb-black"
                  : "border-stroke bg-surface-1 text-text-1 hover:bg-surface-2",
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={on}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {on ? <Check className="size-4 shrink-0" strokeWidth={2.5} aria-hidden /> : null}
              {o.label}
            </label>
          );
        })}
      </div>
      {help ? (
        <p className="mt-2 text-small text-text-2" aria-live="polite">
          {help}
        </p>
      ) : null}
    </fieldset>
  );
}

/** Sentences of a text, split after a full stop or question mark that is followed by a capital or a digit. */
export function sentences(text: string): string[] {
  return text
    .trim()
    .split(/(?<=[.?])\s+(?=[A-Z0-9"'])/)
    .filter(Boolean);
}

/**
 * App 5 (master plan 30.33 item 2): a long line shown as paragraphs of at most 25 words, cut only between sentences, so
 * not one word changes. A single sentence longer than 25 words stays whole.
 */
export function shortParas(text: string, max = 25): string[] {
  const out: string[] = [];
  let cur = "";
  for (const s of sentences(text)) {
    const next = cur ? `${cur} ${s}` : s;
    if (cur && next.split(/\s+/).length > max) {
      out.push(cur);
      cur = s;
    } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

export function ShortParas({ text, className }: { text: string; className?: string }) {
  return (
    <>
      {shortParas(text).map((p, i) => (
        <p key={i} className={cn(className, i > 0 && "mt-2")}>
          {p}
        </p>
      ))}
    </>
  );
}
