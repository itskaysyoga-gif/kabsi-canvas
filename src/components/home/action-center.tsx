import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, FileText, MessageSquareReply, PenLine, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionCard } from "@/components/home/action-card";
import { BacklogCard } from "@/components/home/backlog-card";
import { HomeStrip } from "@/components/home/home-strip";
import { PlanChoiceCard } from "@/components/home/plan-choice";
import { TrialBanner } from "@/components/home/trial-banner";
import { ProfileGaps } from "@/components/app/profile-gaps";
import {
  checkStrip,
  headline,
  homeState,
  isBacklogSummary,
  replyCount,
  subline,
} from "@/lib/home-state";
import { loadCardDetails, loadFeed, loadHomeFacts } from "@/lib/home";
import { loadTasks, taskAction, type Task } from "@/lib/tasks";
import { timeAgo } from "@/lib/dashboard";
import type { Role } from "@/lib/team";
import type { Location } from "@/lib/onboarding";

// Home as the Action Center (K-06): is there anything for me to do? Either "You're all caught up" or at most three
// cards. Below: what Kabsi did this week, one line on customer activity, and the profile suggestions.
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
  const shown = [...state.cards, ...state.rest];
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
    <>
      {role === "owner" ? <TrialBanner locationId={loc.id} /> : null}
      {role === "owner" ? <PlanChoiceCard locationId={loc.id} /> : null}
      <HomeStrip strip={strip} plan={plan} />

      {list.isError ? (
        <section className="mt-6 rounded-large bg-kb-white p-6 shadow-kb" role="alert">
          <h2 className="text-xl font-bold">We couldn't load what needs you</h2>
          <p className="mt-1 text-kb-small text-kb-stone">
            Your replies and your profile are safe. Try again in a moment.
          </p>
          <Button
            variant="secondary"
            size="compact"
            className="mt-4"
            onClick={() => void list.refetch()}
          >
            Try again
          </Button>
        </section>
      ) : !list.data ? (
        <div className="mt-6 space-y-4" aria-busy="true">
          <div className="h-16 animate-pulse rounded-card bg-kb-white/70" />
          <div className="h-56 animate-pulse rounded-card bg-kb-white/70" />
        </div>
      ) : state.kind === "clear" ? (
        <section className="mt-6 flex items-start gap-4 rounded-large bg-kb-carbon p-6 text-kb-white">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-kb-yellow text-kb-black">
            <Check className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-2xl font-bold">{headline(0)}</h2>
            <p className="mt-2 leading-7 text-kb-stone-on-dark">
              Kabsi is taking care of the rest. When a new Google review arrives, you'll get an
              email with a reply ready.
            </p>
          </div>
        </section>
      ) : (
        <section className="mt-6" aria-labelledby="needs-you">
          <h2 id="needs-you" className="text-2xl font-bold">
            {headline(state.total)}
          </h2>
          <p className="mt-1 text-kb-small leading-6 text-kb-stone">
            {subline(state.total, replyCount(shown))}
          </p>
          <div className="mt-4 space-y-4">
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
          </div>
          {state.rest.length > 0 ? (
            <div className="mt-4">
              <Button
                variant="secondary"
                size="compact"
                onClick={() => setAll((v) => !v)}
                aria-expanded={all}
              >
                {all ? "Show fewer" : `See all ${state.total}`}
              </Button>
              {all ? (
                <ul className="mt-3 divide-y divide-kb-hairline rounded-card bg-kb-white shadow-kb">
                  {state.rest.map((t) => (
                    <li key={t.id}>
                      <Link
                        to={t.path}
                        className="flex min-h-14 items-center gap-3 px-4 py-3 text-kb-small hover:bg-kb-sand"
                      >
                        <span className="flex-1">{t.title}</span>
                        <ArrowRight className="size-4 shrink-0 text-kb-stone" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>
      )}

      <FeedCard locationId={loc.id} linkOpens={facts.data?.linkOpens30d ?? 0} />

      {list.data && state.gaps.length > 0 ? (
        <ProfileGaps locationId={loc.id} gaps={state.gaps} />
      ) : null}
    </>
  );
}

const FEED_ICON = (action: string) =>
  action === "google_check" ? (
    <ScanSearch />
  ) : action === "reply_drafted" ? (
    <PenLine />
  ) : (
    <MessageSquareReply />
  );

// "What Kabsi did" (K-09): read from the audit log, so it never claims work that did not happen.
function FeedCard({ locationId, linkOpens }: { locationId: string; linkOpens: number }) {
  const q = useQuery({
    queryKey: ["feed", locationId],
    queryFn: () => loadFeed(locationId),
    refetchInterval: 120_000,
  });
  const items = q.data ?? [];
  return (
    <section className="mt-6 rounded-large bg-kb-white p-5 shadow-kb" aria-labelledby="did">
      <h2 id="did" className="font-bold">
        What Kabsi did this week
      </h2>
      {q.isLoading ? (
        <p className="mt-3 text-kb-small text-kb-stone">Loading...</p>
      ) : q.isError ? (
        <p className="mt-3 text-kb-small text-kb-stone">We couldn't load this just now.</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-kb-small leading-6 text-kb-stone">
          Nothing yet. Kabsi's work shows up here as it happens.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((a) => (
            <li key={a.key} className="flex items-start gap-3">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-kb-sand [&_svg]:size-4">
                {FEED_ICON(a.action)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-kb-small font-medium leading-5">{a.text}</span>
                <span className="block text-kb-caption text-kb-stone">{timeAgo(a.at)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 space-y-2 border-t border-kb-hairline pt-3 text-kb-small text-kb-stone">
        {linkOpens > 0 ? (
          <p>
            {linkOpens} {linkOpens === 1 ? "person" : "people"} opened your review link in the last
            30 days. That is activity, not reviews.
          </p>
        ) : null}
        <Link
          to="/app/report"
          className="inline-flex min-h-10 items-center gap-1.5 text-kb-black underline underline-offset-4 hover:no-underline"
        >
          <FileText className="size-4" aria-hidden="true" /> Your Weekly Care Report
        </Link>
      </div>
    </section>
  );
}
