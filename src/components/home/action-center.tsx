import { useCallback, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { EmptyState, ErrorState, Skeleton, buttonClass } from "@/components/kabsi/ui";
import { shortParas, TaskPill } from "@/components/kabsi/d3-account";
import { BacklogCard } from "@/components/home/backlog-card";
import { YesItem, type Approved } from "@/components/home/yes-item";
import {
  NEEDS_YES,
  REPLY_NOTE,
  attentionLines,
  doneThisWeek,
  emptyHomeLine,
  homeState,
  isBacklogSummary,
  nextMonday,
  waitingView,
  type AttentionLine,
} from "@/lib/home-state";
import { loadCardDetails } from "@/lib/home";
import { loadTasks, type Task } from "@/lib/tasks";
import { recentTasks } from "@/lib/task-feed";
import { reviewGrowth } from "@/lib/reviews";
import { loadEntitlements } from "@/lib/entitlements";
import { planChoice } from "@/lib/plan-choice";
import type { Access } from "@/lib/team";
import type { Location } from "@/lib/onboarding";

// Home (App 2, master plan 30.22 item 5): an owner who opens Kabsi on a phone knows in five seconds what needs them and
// can approve it in one tap. In this order: Needs attention (real problems only, one line and one button each), Needs
// your yes (compact items, "Nothing goes on Google until you approve it." said once), Done by Kabsi this week (at most
// three, no duplicates), Your business on Google (at most three real numbers, or nothing). Nothing else.
export function ActionCenter({ loc, access }: { loc: Location; access: Access }) {
  const qc = useQueryClient();
  const role = access.role;
  const list = useQuery({
    queryKey: ["tasks", loc.id],
    queryFn: () => loadTasks(loc.id),
    refetchInterval: 60_000,
  });
  const ent = useQuery({
    queryKey: ["entitlements", loc.id],
    queryFn: () => loadEntitlements(loc.id),
    staleTime: 60_000,
    enabled: role === "owner",
  });
  // Items the owner just approved stay on screen through their Undo window, whatever the list says meanwhile.
  const [held, setHeld] = useState<Map<string, { task: Task; a: Approved }>>(new Map());
  const state = homeState(list.data?.tasks ?? []);
  const all = [...state.cards, ...state.rest];
  const waiting = all.filter((t) => NEEDS_YES.includes(t.kind));
  // Fixes B (DSH-05): the first three waiting items, urgent ones always before the fold; "See all" shows the rest in place.
  const [expanded, setExpanded] = useState(false);
  const view = waitingView(waiting, expanded, new Set(held.keys()));
  const yes = [...view.shown];
  for (const h of held.values()) if (!waiting.some((t) => t.id === h.task.id)) yes.unshift(h.task);
  const details = useQuery({
    // The details of the folded items load too, so "See all" opens at once.
    queryKey: ["card-details", loc.id, [...yes, ...waiting].map((t) => t.id).join(",")],
    queryFn: () => loadCardDetails([...new Map([...yes, ...waiting].map((t) => [t.id, t])).values()]),
    enabled: yes.length > 0,
  });
  const choice = role === "owner" ? planChoice(ent.data ?? null) : null;
  const attention = attentionLines({
    tasks: all,
    accessLost: !!loc.access_lost_at && !loc.access_granted_at,
    setup: null,
    owner: role === "owner",
    plan:
      choice && choice.tone === "attention"
        ? { title: choice.title, to: choice.cta.to, label: choice.cta.label }
        : null,
  });
  const settle = useCallback(
    async (id: string) => {
      // Read the lists again first, so the approved item never flashes back with its Approve button.
      await Promise.all(
        ["tasks", "waiting-count", "done-lately", "reviews", "review-tasks"].map((k) =>
          qc.invalidateQueries({ queryKey: [k] }),
        ),
      );
      setHeld((m) => {
        const n = new Map(m);
        n.delete(id);
        return n;
      });
    },
    [qc],
  );

  if (list.isError)
    return (
      <ErrorState title="This page did not load." onRetry={() => void list.refetch()}>
        Nothing you did, and nothing changed on Google. Try again in a minute.
      </ErrorState>
    );
  if (!list.data)
    return (
      <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-24 w-full rounded-card" />
        <Skeleton className="h-24 w-full rounded-card" />
      </div>
    );

  return (
    // App 3: on a computer, what needs the owner on the left and what Kabsi did on the right, so the page uses the width.
    // The right column only takes room when it has something to show; otherwise the left one uses the full width.
    <div className="grid items-start gap-8 lg:has-[>[data-side]>*]:grid-cols-[minmax(0,1fr)_22rem] xl:has-[>[data-side]>*]:grid-cols-[minmax(0,1fr)_25rem]">
      <div className="min-w-0 space-y-8">
        <HomeCounts locationId={loc.id} yes={waiting.length} urgent={view.urgent} />
        <NeedsAttention lines={attention} />
        {yes.length > 0 ? (
          <HomeSection id="yes-h" title="Needs your yes" count={waiting.length} note={REPLY_NOTE}>
            <ul className="divide-y divide-line">
              {yes.map((t, i) =>
                isBacklogSummary(t) ? (
                  <li key={t.id} className="py-4 first:pt-0 last:pb-0">
                    <BacklogCard task={t} locationId={loc.id} lead={i === 0} />
                  </li>
                ) : (
                  <YesItem
                    key={t.id}
                    task={t}
                    detail={details.data?.[t.id]}
                    access={access}
                    locationId={loc.id}
                    lead={i === 0}
                    approved={held.get(t.id)?.a}
                    onApproved={(a) => setHeld((m) => new Map(m).set(t.id, { task: t, a }))}
                    onSettled={() => void settle(t.id)}
                  />
                ),
              )}
            </ul>
            {view.folded ? (
              <button
                type="button"
                className={buttonClass("tertiary") + " mt-3"}
                aria-expanded={expanded}
                aria-controls="yes-h"
                data-testid="yes-see-all"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "Show fewer" : `See all ${view.total}`}
              </button>
            ) : null}
          </HomeSection>
        ) : null}
        {attention.length === 0 && yes.length === 0 ? (
          <EmptyState icon={Check} title="Nothing needs you right now.">
            {emptyHomeLine(nextMonday())}
          </EmptyState>
        ) : null}
      </div>
      <div data-side className="min-w-0 space-y-8 empty:hidden">
        <DoneThisWeek locationId={loc.id} />
        <BusinessNumbers locationId={loc.id} />
      </div>
    </div>
  );
}

// Fixes B (DSH-05, DSH-08): three small counts at the top. "Done this week" opens the latest report. Nothing here approves
// anything; it only says how much is waiting, how much is urgent and how much Kabsi did.
function HomeCounts({
  locationId,
  yes,
  urgent,
}: {
  locationId: string;
  yes: number;
  urgent: number;
}) {
  const q = useQuery({
    queryKey: ["done-lately", locationId],
    queryFn: () => recentTasks(locationId, { limit: 20, days: 7 }),
    refetchInterval: 60_000,
  });
  const done = doneThisWeek(q.data ?? [], Number.POSITIVE_INFINITY).length;
  const tile = "block min-h-11 rounded-card border border-line bg-surface-1 px-3 py-2 shadow-rest";
  return (
    <div
      role="group"
      className="grid grid-cols-3 gap-2"
      aria-label="Where things stand"
      data-testid="home-counts"
    >
      <div className={tile}>
        <span className="block font-display text-h3 font-bold">{yes}</span>
        <span className="block text-small text-text-2">Needs your yes</span>
      </div>
      <div className={tile}>
        <span
          className={"block font-display text-h3 font-bold" + (urgent > 0 ? " text-bad" : "")}
        >
          {urgent}
        </span>
        <span className="block text-small text-text-2">Urgent</span>
      </div>
      <Link
        to="/app/report"
        className={tile + " hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2"}
        aria-label={`Done this week ${done}, open the latest report`}
      >
        <span className="block font-display text-h3 font-bold">{q.isLoading ? "" : done}</span>
        <span className="block text-small text-text-2">Done this week</span>
      </Link>
    </div>
  );
}

/** Needs attention: one line and one button each. Shown only when something is wrong. */
export function NeedsAttention({ lines }: { lines: AttentionLine[] }) {
  if (!lines.length) return null;
  return (
    <HomeSection id="attention-h" title="Needs attention" count={lines.length}>
      <ul className="divide-y divide-line">
        {lines.map((l) => (
          <li
            key={l.key}
            className={
              l.detail?.length
                ? "flex flex-col items-start gap-3 py-3 first:pt-0 last:pb-0"
                : "flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            }
          >
            <div className="min-w-0 flex-1 self-stretch">
              <p className="text-body font-semibold">{l.text}</p>
              {/* App 5: a long detail shows as short paragraphs, cut between sentences (same words). */}
              {l.detail?.flatMap((d, i) =>
                shortParas(d).map((part, j) => (
                  <p
                    key={`${i}-${j}`}
                    dir="auto"
                    className={
                      i === l.detail!.length - 1 && l.detail!.length > 2
                        ? "mt-1 text-small font-semibold text-text-2"
                        : "mt-1 text-small text-text-2"
                    }
                  >
                    {part}
                  </p>
                )),
              )}
            </div>
            {l.action ? (
              <Link to={l.action.to as "/"} className={buttonClass("secondary", "md")}>
                {l.action.label}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// "Done by Kabsi this week": the latest state of what the owner approved in the last 7 days, each item once, at most
// three, read from the publications so it never claims a task that did not happen. "See all" opens the reports.
function DoneThisWeek({ locationId }: { locationId: string }) {
  const q = useQuery({
    queryKey: ["done-lately", locationId],
    queryFn: () => recentTasks(locationId, { limit: 20, days: 7 }),
    refetchInterval: 60_000,
  });
  const items = doneThisWeek(q.data ?? []);
  if (!items.length) return null;
  return (
    <HomeSection
      id="done-h"
      title="Done by Kabsi this week"
      action={
        <Link to="/app/report" className={buttonClass("tertiary")}>
          See all
        </Link>
      }
    >
      <ul className="divide-y divide-line">
        {items.map((t) => (
          <li
            key={t.id}
            className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0"
          >
            <p className="line-clamp-2 min-w-0 flex-1 basis-56 text-body break-words">
              <span className="font-semibold">{cap(t.noun)}</span>
              {t.text ? (
                <span dir="auto" className="text-text-2">
                  : {t.text}
                </span>
              ) : null}
            </p>
            <TaskPill state={t.owner} className="shrink-0" />
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}

// "Your business on Google": one strip of real numbers (new reviews from the Google Business Profile this month, opens of
// the Kabsi review link this month; never added together), or nothing when there is nothing to show.
function BusinessNumbers({ locationId }: { locationId: string }) {
  const q = useQuery({
    queryKey: ["review-growth", locationId],
    queryFn: () => reviewGrowth(locationId),
    staleTime: 60_000,
  });
  const nums = [
    { n: q.data?.reviews ?? 0, label: "New reviews this month" },
    { n: q.data?.opens ?? 0, label: "Review link opens this month" },
  ].filter((x) => x.n > 0);
  if (!nums.length) return null;
  return (
    <section aria-labelledby="numbers-h">
      <h2 id="numbers-h" className="mb-3 font-display text-h3 font-bold">
        Your business on Google
      </h2>
      <dl className="grid grid-cols-2 gap-3">
        {nums.map((x) => (
          <div
            key={x.label}
            className="rounded-card border border-line bg-surface-1 p-5 shadow-rest"
          >
            <dd className="font-display text-h2 font-bold">{x.n}</dd>
            <dt className="text-small text-text-2">{x.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** A Home section: its title with a count, at most one short line, and its items in one panel. */
function HomeSection({
  id,
  title,
  count,
  note,
  action,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  note?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={id} className="flex items-center gap-2 font-display text-h3 font-bold">
          {title}
          {count ? (
            <>
              <span
                aria-hidden
                className="grid size-7 place-items-center rounded-full bg-kb-yellow text-label font-bold text-kb-black"
              >
                {count}
              </span>
              <span className="sr-only">, {count}</span>
            </>
          ) : null}
        </h2>
        {action}
      </div>
      {note ? <p className="-mt-1 mb-3 text-small text-text-2">{note}</p> : null}
      <div className="rounded-card border border-line bg-surface-1 p-5 shadow-rest sm:p-6">
        {children}
      </div>
    </section>
  );
}
