import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, MessageSquareText, QrCode, RefreshCw, Search, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AccountTop, Panel } from "@/components/kabsi/d3-account";
import { Button, ButtonLink, Chip, EmptyState, ErrorState, Skeleton } from "@/components/kabsi/ui";
import { ReviewCard } from "@/components/reviews/review-card";
import { ReviewDone } from "@/components/reviews/review-done";
import { ReviewCounts } from "@/components/reviews/review-counts";
import { ReportReminders } from "@/components/reviews/report-review";
import { StaffTestTool } from "@/components/reviews/staff-test-tool";
import { allReviews } from "@/lib/reviews";
import {
  FILTERS,
  VIEWS,
  matchesView,
  needsReply,
  sortReviews,
  viewFor,
  type ReviewFilter,
  type ReviewView,
} from "@/lib/review-status";
import { latestByTarget, recentTasks, type TaskItem } from "@/lib/task-feed";
import { myLatestLocation } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

// Reviews (K-15, P0.3-09, Design 3): every review as a card, filtered Waiting, On Google or All. A waiting review has its
// reply ready with Approve reply, Edit and Skip; every other review shows its reply and where it is. "On Google" only
// once Kabsi saw the reply there. The old addresses (/app/inbox, ?f=needs and the older filters) still land here.
type Search = { f?: ReviewView | ReviewFilter; r?: string };
const PAGE = 20;
const NO_TASKS = new Map<string, TaskItem>();

export const Route = createFileRoute("/_authenticated/app/reviews")({
  head: () => ({ meta: [{ title: "Reviews | Kabsi" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (s: Record<string, unknown>): Search => {
    const raw = s["f"];
    const f = VIEWS.find((x) => x.key === raw)?.key ?? FILTERS.find((x) => x.key === raw)?.key;
    const r = s["r"];
    return {
      ...(f ? { f } : {}),
      ...(typeof r === "string" && /^[0-9a-f-]{36}$/.test(r) ? { r } : {}),
    };
  },
  component: ReviewsPage,
});

function ReviewsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [q, setQ] = useState("");
  const [count, setCount] = useState(PAGE);
  // Reviews the owner acted on stay in view while they count down or settle, whatever the filter.
  const [kept, setKept] = useState<ReadonlySet<string>>(new Set());
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const active = !!loc && loc.status === "active";
  const reviews = useQuery({
    queryKey: ["reviews", loc?.id],
    queryFn: () => allReviews(loc!.id),
    enabled: active,
    refetchInterval: 60_000,
  });
  // The latest publication of each reply (owners and managers read them; staff read none, and the review's own state
  // stands in).
  const tasks = useQuery({
    queryKey: ["review-tasks", loc?.id],
    queryFn: async () =>
      latestByTarget(
        await recentTasks(loc!.id, { kinds: ["review_reply"], days: 365, limit: 200 }),
      ),
    enabled: active,
    refetchInterval: 60_000,
    retry: false,
  });
  const byReview = tasks.data ?? NO_TASKS;
  const all = useMemo(() => reviews.data ?? [], [reviews.data]);
  const waitingCount = all.filter(needsReply).length;
  // Waiting is where an owner starts; when nothing waits the full list is more useful than an empty one.
  const view: ReviewView =
    viewFor(search.f) ?? (waitingCount > 0 || reviews.isLoading ? "waiting" : "all");
  const needle = q.trim().toLowerCase();
  const list = useMemo(() => {
    const rows = sortReviews(
      all.filter(
        (r) =>
          (kept.has(r.id) || matchesView(r, view, byReview.get(r.id), tasks.isSuccess)) &&
          (!needle ||
            (r.comment ?? "").toLowerCase().includes(needle) ||
            (r.reviewer_name ?? "").toLowerCase().includes(needle)),
      ),
      view === "waiting" ? "needs" : "all",
    );
    // A review opened from Home, an email or a reminder comes first.
    const at = search.r ? rows.findIndex((r) => r.id === search.r) : -1;
    if (at > 0) rows.unshift(...rows.splice(at, 1));
    return rows;
  }, [all, view, needle, kept, byReview, tasks.isSuccess, search.r]);
  const setView = (f: ReviewView) => {
    setCount(PAGE);
    void navigate({ search: { f } });
  };
  const keep = (id: string) => setKept((s) => new Set(s).add(id));
  // The yellow button goes to the first reply that is ready to approve, else the first review that waits.
  const firstReady = (
    list.find((r) => needsReply(r) && r.state !== "new" && r.draft?.safety_ok) ??
    list.find((r) => needsReply(r) && r.state !== "new")
  )?.id;

  if (location.isLoading) return <ListSkeleton title />;
  if (!loc) {
    return (
      <>
        <AccountTop title="Reviews" />
        <EmptyState
          icon={MessageSquareText}
          title="You haven't added a business yet."
          action={<ButtonLink to="/start">Add your business</ButtonLink>}
        />
      </>
    );
  }
  if (!active) {
    return (
      <>
        <AccountTop title="Reviews" />
        <Panel title="Replies start once setup is finished." id="setup">
          <p className="text-body text-text-2">
            As soon as Kabsi can reach your Google profile, every new review shows up here with a
            reply ready.
          </p>
          <ButtonLink to="/start" size="md" className="mt-5">
            Continue setup
          </ButtonLink>
        </Panel>
      </>
    );
  }

  return (
    <>
      <AccountTop title="Reviews" />
      <ReportReminders
        locationId={loc.id}
        onOpen={(id) => void navigate({ search: { f: "all", r: id } })}
      />
      {all.length ? (
        <div className="mb-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Show">
              {VIEWS.map((v) => {
                const n = all.filter((r) =>
                  matchesView(r, v.key, byReview.get(r.id), tasks.isSuccess),
                ).length;
                return (
                  <Chip
                    key={v.key}
                    selected={view === v.key}
                    aria-pressed={view === v.key}
                    onClick={() => setView(v.key)}
                  >
                    {v.label} {n}
                  </Chip>
                );
              })}
            </div>
            <Button
              variant="tertiary"
              className="ms-auto"
              onClick={() => {
                void reviews.refetch();
                void tasks.refetch();
              }}
              icon={
                <RefreshCw
                  className={cn("size-4", reviews.isFetching && "animate-spin")}
                  aria-hidden="true"
                />
              }
            >
              Refresh
            </Button>
          </div>
          <div className="relative">
            <Search
              className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-text-2"
              aria-hidden="true"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search reviews or names"
              aria-label="Search reviews"
              className="h-12 rounded-full border-stroke bg-surface-1 ps-11"
            />
          </div>
        </div>
      ) : null}

      {reviews.isLoading ? (
        <ListSkeleton />
      ) : reviews.isError ? (
        <ErrorState title="This page did not load." onRetry={() => void reviews.refetch()}>
          Nothing you did, and nothing changed on Google. Try again in a minute.
        </ErrorState>
      ) : !list.length ? (
        view === "waiting" || !all.length ? (
          <EmptyState
            icon={all.length ? CheckCircle2 : MessageSquareText}
            title="No reviews waiting."
            action={
              all.length ? (
                <Button variant="secondary" size="md" onClick={() => setView("all")}>
                  See all reviews
                </Button>
              ) : undefined
            }
          >
            When a review comes in, Kabsi drafts a reply and sends it to you on WhatsApp.
          </EmptyState>
        ) : (
          <EmptyState icon={MessageSquareText} title="No reviews match">
            Try another filter.
          </EmptyState>
        )
      ) : (
        <div className="space-y-4">
          {list
            .slice(0, count)
            .map((r) =>
              needsReply(r) || kept.has(r.id) ? (
                <ReviewCard
                  key={`${r.id}:${r.draft?.version ?? 0}`}
                  review={r}
                  task={byReview.get(r.id)}
                  primary={r.id === firstReady}
                  onActed={() => keep(r.id)}
                />
              ) : (
                <ReviewDone
                  key={r.id}
                  review={r}
                  task={byReview.get(r.id)}
                  concierge={loc.concierge === true}
                />
              ),
            )}
          {list.length > count ? (
            <Button variant="secondary" size="md" onClick={() => setCount((c) => c + PAGE)}>
              Show more
            </Button>
          ) : null}
        </div>
      )}

      <Panel title="Review Growth" id="growth" className="mt-8">
        <ReviewCounts locationId={loc.id} />
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink
            to="/app/cards"
            hash="message"
            variant="secondary"
            size="md"
            icon={<Send className="size-4" aria-hidden />}
          >
            Send your review link
          </ButtonLink>
          <ButtonLink
            to="/app/cards"
            hash="qr"
            variant="quiet"
            size="md"
            icon={<QrCode className="size-4" aria-hidden />}
          >
            Get your QR card
          </ButtonLink>
        </div>
      </Panel>
      <StaffTestTool locationId={loc.id} />
    </>
  );
}

function ListSkeleton({ title }: { title?: boolean }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading">
      {title ? <Skeleton className="mb-6 h-10 w-48" /> : null}
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-card border border-line bg-surface-1 p-5">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
