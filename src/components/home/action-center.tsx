import { useCallback, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { EmptyState, ErrorState, Skeleton, buttonClass } from "@/components/kabsi/ui";
import { TaskPill } from "@/components/kabsi/d3-account";
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
  const yes = all.filter((t) => NEEDS_YES.includes(t.kind));
  for (const h of held.values()) if (!yes.some((t) => t.id === h.task.id)) yes.unshift(h.task);
  const details = useQuery({
    queryKey: ["card-details", loc.id, yes.map((t) => t.id).join(",")],
    queryFn: () => loadCardDetails(yes),
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
    <div className="space-y-8">
      <NeedsAttention lines={attention} />
      {yes.length > 0 ? (
        <HomeSection id="yes-h" title="Needs your yes" count={yes.length} note={REPLY_NOTE}>
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
        </HomeSection>
      ) : null}
      {attention.length === 0 && yes.length === 0 ? (
        <EmptyState icon={Check} title="Nothing needs you right now.">
          {emptyHomeLine(nextMonday())}
        </EmptyState>
      ) : null}
      <DoneThisWeek locationId={loc.id} />
      <BusinessNumbers locationId={loc.id} />
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
              {l.detail?.map((d, i) => (
                <p
                  key={i}
                  dir="auto"
                  className={
                    i === l.detail!.length - 1 && l.detail!.length > 2
                      ? "mt-1 text-label font-semibold text-text-2"
                      : "mt-1 text-small text-text-2"
                  }
                >
                  {d}
                </p>
              ))}
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
          <li key={t.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <p className="min-w-0 flex-1 truncate text-body">
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
          <div key={x.label} className="rounded-card border border-line bg-surface-1 p-4">
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
                className="grid size-7 place-items-center rounded-full bg-text-1 text-label font-bold text-surface-0"
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
      <div className="rounded-card border border-line bg-surface-1 p-4 shadow-rest sm:p-5">
        {children}
      </div>
    </section>
  );
}
