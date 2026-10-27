import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check } from "lucide-react";
import { Button, ButtonLink, EmptyState, ErrorState, Skeleton } from "@/components/kabsi/ui";
import { Panel, TaskRow } from "@/components/kabsi/d3-account";
import { ActionCard } from "@/components/home/action-card";
import { BacklogCard } from "@/components/home/backlog-card";
import { HomeStrip } from "@/components/home/home-strip";
import { PlanChoiceCard } from "@/components/home/plan-choice";
import { TrialBanner } from "@/components/home/trial-banner";
import { ProfileGaps } from "@/components/app/profile-gaps";
import {
  checkStrip,
  homeState,
  isBacklogSummary,
  nextMonday,
  nextReportLine,
} from "@/lib/home-state";
import { loadCardDetails, loadHomeFacts } from "@/lib/home";
import { loadTasks, taskAction, type Task } from "@/lib/tasks";
import { recentTasks, type TaskItem } from "@/lib/task-feed";
import { timeAgo } from "@/lib/dashboard";
import type { Role } from "@/lib/team";
import type { Location } from "@/lib/onboarding";

// Home, "Waiting for you" (K-06, Design 3, COPY.md 19): the tasks that need the owner, at most three cards with the rest
// behind "See all", or "All caught up.". Below: what Kabsi sent to Google lately with each task's state (30.15 section
// 3.1), the next report, and the profile suggestions.
export function ActionCenter({ loc, role }: { loc: Location; role: Role }) {
  const qc = useQueryClient();
  const facts = useQuery({
    queryKey: ["home-facts", loc.id],
    queryFn: () => loadHomeFacts(loc.id),
    refetchInterval: 60_000,
  });
  const list = useQuery({
    queryKey: ["tasks", loc.id],
    queryFn: () => loadTasks(loc.id),
    refetchInterval: 60_000,
  });
  const state = homeState(list.data?.tasks ?? []);
  const details = useQuery({
    queryKey: ["card-details", loc.id, state.cards.map((t) => t.id).join(",")],
    queryFn: () => loadCardDetails(state.cards),
    enabled: state.cards.length > 0,
  });
  const later = useMutation({
    mutationFn: (t: Task) => taskAction(t.id, "later"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", loc.id] }),
  });
  const [all, setAll] = useState(false);

  const strip = checkStrip({
    lastCheckAt: facts.data?.lastCheckAt ?? null,
    accessLost: !!loc.access_lost_at && !loc.access_granted_at,
    concierge: loc.concierge === true,
  });
  // Billing is the owner's (K-16): a manager sees no plan line.
  const plan = role === "owner" && facts.data ? facts.data.plan : null;

  return (
    <div className="space-y-5">
      {role === "owner" ? <TrialBanner locationId={loc.id} /> : null}
      {role === "owner" ? <PlanChoiceCard locationId={loc.id} /> : null}
      <HomeStrip strip={strip} plan={plan} />

      {list.isError ? (
        <ErrorState title="This page did not load." onRetry={() => void list.refetch()}>
          Nothing you did, and nothing changed on Google. Try again in a minute.
        </ErrorState>
      ) : !list.data ? (
        <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-card border border-line bg-surface-1 p-5">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-4/5" />
            </div>
          ))}
        </div>
      ) : state.kind === "clear" ? (
        <EmptyState icon={Check} title="All caught up.">
          Kabsi will message you on WhatsApp when something needs you.
        </EmptyState>
      ) : (
        <section aria-label="Waiting for you" className="space-y-4">
          {state.cards.map((t, i) =>
            isBacklogSummary(t) ? (
              <BacklogCard key={t.id} task={t} locationId={loc.id} lead={i === 0} />
            ) : (
              <ActionCard
                key={t.id}
                task={t}
                detail={details.data?.[t.id]}
                locationId={loc.id}
                lead={i === 0}
                busy={later.isPending}
                onLater={(x) => later.mutate(x)}
              />
            ),
          )}
          {state.rest.length > 0 ? (
            <div>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setAll((v) => !v)}
                aria-expanded={all}
              >
                {all ? "Show fewer" : `See all ${state.total}`}
              </Button>
              {all ? (
                <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-surface-1 shadow-rest">
                  {state.rest.map((t) => (
                    <li key={t.id}>
                      <Link
                        to={t.path}
                        className="flex min-h-14 items-center gap-3 px-4 py-3 text-body hover:bg-surface-2"
                      >
                        <span className="flex-1">{t.title}</span>
                        <ArrowRight className="size-4 shrink-0 text-text-2" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>
      )}

      <div className="grid gap-4 pt-5 lg:grid-cols-[1.4fr_1fr]">
        <DoneLately locationId={loc.id} />
        <Panel title="Your next report" id="next-report">
          <p className="text-body text-text-2">{nextReportLine(nextMonday())}</p>
          <ButtonLink to="/app/report" variant="tertiary" className="mt-2">
            See last week's report
          </ButtonLink>
        </Panel>
      </div>

      {list.data && state.gaps.length > 0 ? (
        <ProfileGaps locationId={loc.id} gaps={state.gaps} />
      ) : null}
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}...` : s);

/** One task's title in the list: what it was, a few of its words, and when. */
function taskTitle(t: TaskItem) {
  return (
    <>
      {cap(t.noun)}
      {t.text ? (
        <span dir="auto" className="block text-small font-normal text-text-2">
          {clip(t.text, 90)}
        </span>
      ) : null}
      <span className="block text-small font-normal text-text-3">{timeAgo(t.at)}</span>
    </>
  );
}

// "Done lately" (Design 3): what the owner approved in the last two weeks and where each one is now. Read from the
// publications, so it never claims a task that did not happen; "On Google" only once Kabsi saw it there.
function DoneLately({ locationId }: { locationId: string }) {
  const q = useQuery({
    queryKey: ["done-lately", locationId],
    queryFn: () => recentTasks(locationId, { limit: 5, days: 14 }),
    refetchInterval: 60_000,
  });
  return (
    <Panel title="Done lately" id="done-lately">
      {q.isLoading ? (
        <div className="space-y-2" aria-hidden>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : q.isError ? (
        <p className="text-small text-text-2">This did not load. Try again in a minute.</p>
      ) : !q.data?.length ? (
        <p className="text-body text-text-2">
          Nothing yet. What you approve shows here, with where it is on Google.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {q.data.map((t) => (
            <TaskRow key={t.id} task={t} title={taskTitle(t)} />
          ))}
        </ul>
      )}
    </Panel>
  );
}
