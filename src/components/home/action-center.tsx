import { useCallback, useState, type ReactNode } from "react";
import { RetryLine } from "@/components/kabsi/retry-line";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Button, Skeleton, buttonClass } from "@/components/kabsi/ui";
import { shortParas } from "@/components/kabsi/d3-account";
import { ProfileHealth, ThisWeek } from "@/components/home/home-week";
import { BacklogCard } from "@/components/home/backlog-card";
import { YesItem, type Approved } from "@/components/home/yes-item";
import {
  NEEDS_YES,
  REPLY_NOTE,
  attentionLines,
  emptyHomeLine,
  homeState,
  isBacklogSummary,
  nextMonday,
  waitingView,
  type AttentionLine,
} from "@/lib/home-state";
import { loadCardDetails } from "@/lib/home";
import { loadTasks, type Task } from "@/lib/tasks";
import { loadEntitlements } from "@/lib/entitlements";
import { planChoice } from "@/lib/plan-choice";
import { billingAction } from "@/lib/plans";
import type { Access } from "@/lib/team";
import type { Location } from "@/lib/onboarding";

// Home (App 2, master plan 30.22 item 5; APP-1): an owner who opens Kabsi on a phone knows in five seconds what needs them
// and can approve it in one tap. In this order: Waiting for your yes (the count, the next item, the rest), Needs attention
// (real problems only, one line and one button each), This week (the receipt), Your Google profile (the health strip).
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
  const detailTasks = [
    ...new Map(
      [...held.values()]
        .map((h) => h.task)
        .concat(waiting)
        .map((t) => [t.id, t]),
    ).values(),
  ];
  const details = useQuery({
    // The details of the folded items load too, so "See all" opens at once.
    queryKey: ["card-details", loc.id, [...yes, ...waiting].map((t) => t.id).join(",")],
    queryFn: () =>
      loadCardDetails([...new Map([...yes, ...waiting].map((t) => [t.id, t])).values()]),
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
        ? {
            title: choice.title,
            to: choice.cta.to,
            label: choice.cta.label,
            checkout: !!choice.cta.checkout,
          }
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
      <RetryLine what="What waits for you did not load." onRetry={() => void list.refetch()} />
    );
  if (!list.data)
    return (
      <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-24 w-full rounded-card" />
        <Skeleton className="h-24 w-full rounded-card" />
      </div>
    );

  return (
    // APP-1: Home in three parts. What needs the owner's yes comes first (the count, the next item approvable in one tap,
    // the rest below it), then anything that stopped, then "This week" (the receipt) and "Your Google profile" (the
    // health strip). On a computer the receipt and the strip sit in the right column.
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="min-w-0 space-y-8">
        {yes.length > 0 ? (
          <section
            aria-labelledby="yes-h"
            className="overflow-hidden rounded-card border border-line bg-surface-1 shadow-rest"
            data-testid="yes-hero"
          >
            <div className="flex items-center gap-4 border-b border-line bg-surface-2 px-5 py-5 sm:px-6">
              <span
                aria-hidden
                className="grid size-14 shrink-0 place-items-center rounded-full bg-kb-yellow font-display text-h2 font-bold text-kb-black"
              >
                {waiting.length || yes.length}
              </span>
              <div className="min-w-0">
                <h2 id="yes-h" className="font-display text-h3 font-bold">
                  <span className="sr-only">{waiting.length || yes.length} </span>
                  Waiting for your yes
                </h2>
                <p className="text-small text-text-2">{REPLY_NOTE}</p>
              </div>
            </div>
            <div className="px-5 pt-4 pb-5 sm:px-6">
              <p className="mb-2 text-label font-bold text-text-2">Next</p>
              {[yes.slice(0, 1), yes.slice(1)].map((group, g) =>
                group.length ? (
                  <div key={g} className={g ? "mt-5 border-t border-line pt-4" : undefined}>
                    {g ? (
                      <p className="mb-1 text-label font-bold text-text-2">Also waiting</p>
                    ) : null}
                    <ul className="divide-y divide-line">
                      {group.map((t, j) => {
                        const i = g ? j + 1 : 0;
                        return isBacklogSummary(t) ? (
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
                        );
                      })}
                    </ul>
                  </div>
                ) : null,
              )}
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
            </div>
          </section>
        ) : attention.length === 0 ? (
          <AllClear />
        ) : null}
        <NeedsAttention lines={attention} locationId={loc.id} />
      </div>
      <div className="min-w-0 space-y-8">
        <ThisWeek locationId={loc.id} />
        <ProfileHealth locationId={loc.id} tasks={[...all, ...state.gaps]} />
      </div>
    </div>
  );
}

/** Nothing waits: what Kabsi is doing and when the owner hears from it, in the place the yes card would be. */
function AllClear() {
  return (
    <section
      aria-labelledby="clear-h"
      className="flex items-start gap-4 rounded-card border border-line bg-surface-1 p-5 shadow-rest sm:p-6"
      data-testid="all-clear"
    >
      <span
        aria-hidden
        className="grid size-12 shrink-0 place-items-center rounded-full bg-ok-soft text-ok"
      >
        <Check className="size-6" strokeWidth={2.5} />
      </span>
      <div className="min-w-0">
        <h2 id="clear-h" className="font-display text-h3 font-bold">
          Nothing needs your yes
        </h2>
        <p className="mt-1 text-body text-text-2">{emptyHomeLine(nextMonday())}</p>
      </div>
    </section>
  );
}

/** Needs attention: one line and one button each. Shown only when something is wrong. */
export function NeedsAttention({
  lines,
  locationId,
}: {
  lines: AttentionLine[];
  /** Needed only for a line whose button opens the checkout. */
  locationId?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function checkout() {
    if (!locationId) return;
    setBusy(true);
    setFailed(false);
    try {
      const r = await billingAction("checkout", locationId, {
        plan: "essentials",
        period: "month",
      });
      if (r.url) {
        window.location.assign(r.url);
        return;
      }
      setFailed(true);
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }
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
            {l.action?.checkout && locationId ? (
              <div className="flex flex-col items-start gap-1">
                <Button size="md" variant="primary" disabled={busy} onClick={() => void checkout()}>
                  {l.action.label}
                </Button>
                {failed ? (
                  <p className="text-small text-text-2" role="alert">
                    Checkout did not open. Nothing changed.{" "}
                    <Link to={l.action.to as "/"} className="underline">
                      Open your plan
                    </Link>
                  </p>
                ) : null}
              </div>
            ) : l.action ? (
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
