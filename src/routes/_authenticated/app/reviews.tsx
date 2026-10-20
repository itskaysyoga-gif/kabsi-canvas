import { useMemo, useState } from "react";
import { fmtDate } from "@/lib/format";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronLeft, ChevronRight, RefreshCw, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { PageIcon } from "@/components/shared/page-icon";
import { ReviewCard, ReviewHead } from "@/components/reviews/review-card";
import { ReviewStatusPill } from "@/components/reviews/review-status";
import { StaffTestTool } from "@/components/reviews/staff-test-tool";
import { allReviews, type ReviewRow } from "@/lib/reviews";
import {
  FILTERS,
  matchesFilter,
  needsReply,
  sortReviews,
  type ReviewFilter,
} from "@/lib/review-status";
import { myLatestLocation } from "@/lib/onboarding";
import { cn } from "@/lib/utils";
import { MessageSquareText as PageGlyph } from "lucide-react";

// Reviews (K-15, P0.3-09): one screen for every review. Filters on top; on a phone one review fills the screen with
// Approve as the large button, on a computer the list sits beside it. The older "To reply" address comes here too.
type Search = { f?: ReviewFilter; r?: string };
export const Route = createFileRoute("/_authenticated/app/reviews")({
  head: () => ({ meta: [{ title: "Reviews | Kabsi" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (s: Record<string, unknown>): Search => {
    const f = FILTERS.find((x) => x.key === s["f"])?.key;
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
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const reviews = useQuery({
    queryKey: ["reviews", loc?.id],
    queryFn: () => allReviews(loc!.id),
    enabled: !!loc && loc.status === "active",
    refetchInterval: 60_000,
  });
  const all = useMemo(() => reviews.data ?? [], [reviews.data]);
  const needs = all.filter(needsReply).length;
  // Needs reply is where an owner starts, and when nothing waits the full list is more useful than an empty one.
  const filter: ReviewFilter = search.f ?? (needs > 0 || reviews.isLoading ? "needs" : "all");
  const needle = q.trim().toLowerCase();
  const list = useMemo(
    () =>
      sortReviews(
        all.filter(
          (r) =>
            matchesFilter(r, filter) &&
            (!needle ||
              (r.comment ?? "").toLowerCase().includes(needle) ||
              (r.reviewer_name ?? "").toLowerCase().includes(needle)),
        ),
        filter,
      ),
    [all, filter, needle],
  );
  // The open review stays open when it leaves the filter (an approved reply waits 10 seconds with Undo).
  const current = all.find((r) => r.id === search.r);
  const shown = current ?? list[0];
  const at = shown ? list.findIndex((r) => r.id === shown.id) : -1;
  const open = (id: string | undefined) =>
    void navigate({
      search: (s: Search): Search => {
        const { r: _drop, ...rest } = s;
        return id ? { ...rest, r: id } : rest;
      },
    });
  const setFilter = (f: ReviewFilter) => void navigate({ search: { f } });

  if (!location.isLoading && !loc) {
    return (
      <Page>
        <p className="leading-7 text-kb-stone">You haven't added a business yet.</p>
        <Button asChild className="mt-5">
          <Link to="/start">Add your business</Link>
        </Button>
      </Page>
    );
  }
  if (loc && loc.status !== "active") {
    return (
      <Page>
        <div className="rounded-large bg-kb-white p-7 shadow-kb">
          <p className="font-bold">Replies start once setup is finished.</p>
          <p className="mt-1 leading-7 text-kb-stone">
            As soon as Kabsi can reach your Google profile, every new review shows up here with a
            reply ready.
          </p>
          <Button asChild className="mt-5">
            <Link to="/start">Continue setup</Link>
          </Button>
        </div>
      </Page>
    );
  }

  return (
    <Page wide detail={!!current}>
      {all.length ? (
        <div className={cn("mt-6 space-y-3", current && "hidden lg:block")}>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-kb-stone"
              aria-hidden="true"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search reviews or names"
              aria-label="Search reviews"
              className="h-12 rounded-pill bg-kb-white pl-11"
            />
          </div>
          <div
            className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
            role="group"
            aria-label="Filter reviews"
          >
            {FILTERS.map((f) => {
              const n = all.filter((r) => matchesFilter(r, f.key)).length;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "min-h-10 shrink-0 whitespace-nowrap rounded-pill border px-4 text-sm font-bold",
                    filter === f.key
                      ? f.key === "high"
                        ? "border-kb-red bg-kb-red text-kb-white"
                        : "border-kb-black bg-kb-black text-kb-white"
                      : "border-kb-hairline bg-kb-white text-kb-stone hover:text-kb-black",
                  )}
                >
                  {f.label} {n}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => void reviews.refetch()}
              className="ml-auto inline-flex min-h-10 shrink-0 items-center gap-1.5 px-3 text-sm font-bold text-kb-stone hover:text-kb-black"
            >
              <RefreshCw
                className={cn("size-4", reviews.isFetching && "animate-spin")}
                aria-hidden="true"
              />
              Refresh
            </button>
          </div>
        </div>
      ) : null}

      {reviews.isLoading ? (
        <div className="mt-5 space-y-3" role="status" aria-label="Loading reviews">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-large bg-kb-white/70" />
          ))}
        </div>
      ) : null}
      {reviews.error ? (
        <div className="mt-5 rounded-large bg-kb-white p-5 shadow-kb" role="alert">
          <p className="font-bold">Couldn't load your reviews.</p>
          <p className="mt-1 text-sm text-kb-stone">Check your connection and try again.</p>
          <Button
            variant="outline"
            size="compact"
            className="mt-3"
            onClick={() => void reviews.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : null}
      {reviews.data && !all.length ? (
        <div className="mt-6 rounded-large bg-kb-white p-8 text-center shadow-kb">
          <p className="font-display text-2xl">No reviews yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-kb-stone">
            New ones show up here and in your email, with a reply ready.
          </p>
        </div>
      ) : null}
      {reviews.data && all.length && !list.length && !current ? (
        <div className="mt-6 rounded-large bg-kb-white p-8 text-center shadow-kb">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-kb-yellow">
            <CheckCircle2 className="size-7" aria-hidden="true" />
          </span>
          <p className="mt-4 font-display text-2xl">
            {filter === "needs" ? "You're all caught up" : "No reviews match"}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-kb-stone">
            {filter === "needs"
              ? "When a new Google review arrives, you'll get an email with a reply ready, and it shows up here too."
              : "Try another filter."}
          </p>
          {filter !== "all" ? (
            <Button
              variant="outline"
              size="compact"
              className="mt-5"
              onClick={() => setFilter("all")}
            >
              See all reviews
            </Button>
          ) : null}
        </div>
      ) : null}

      {shown ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <ul
            className={cn("space-y-2", current ? "hidden lg:block" : "block")}
            aria-label="Reviews"
          >
            {list.map((r) => (
              <li key={r.id}>
                <ReviewRowButton
                  row={r}
                  active={shown.id === r.id}
                  highlighted={!!current}
                  concierge={loc?.concierge === true}
                  onOpen={() => open(r.id)}
                />
              </li>
            ))}
          </ul>
          <div className={cn("min-w-0", current ? "block" : "hidden lg:block")}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="compact"
                className="lg:hidden"
                onClick={() => open(undefined)}
              >
                <ChevronLeft /> All reviews
              </Button>
              <p className="ml-auto flex items-center gap-1 text-sm text-kb-stone">
                {at >= 0 ? `${at + 1} of ${list.length}` : null}
                <Button
                  variant="icon"
                  size="icon"
                  aria-label="Previous review"
                  disabled={at <= 0}
                  onClick={() => open(list[at - 1]?.id)}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="icon"
                  size="icon"
                  aria-label="Next review"
                  disabled={at < 0 || at >= list.length - 1}
                  onClick={() => open(list[at + 1]?.id)}
                >
                  <ChevronRight />
                </Button>
              </p>
            </div>
            <Detail
              key={`${shown.id}:${shown.draft?.version ?? 0}`}
              review={shown}
              concierge={loc?.concierge === true}
            />
          </div>
        </div>
      ) : null}
      {loc ? <StaffTestTool locationId={loc.id} /> : null}
    </Page>
  );
}

function Page({
  children,
  wide,
  detail,
}: {
  children: React.ReactNode;
  wide?: boolean;
  /** A phone shows the open review on its own: no title block or filters above it. */
  detail?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-5 sm:px-8 sm:py-12",
        detail ? "py-4" : "py-8",
        wide ? "max-w-6xl" : "max-w-3xl",
      )}
    >
      <div className={cn(detail && "hidden lg:block")}>
        <PageIcon icon={<PageGlyph />} />
        <h1 className="font-display text-4xl leading-none sm:text-5xl">Reviews</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-kb-stone">
          Every reply is drafted in the reviewer's language from your facts. Nothing goes on Google
          until you approve it.
        </p>
      </div>
      {children}
    </div>
  );
}

// One review in the list: stars, name, date, the first lines, its status and, if there is one, its risk.
function ReviewRowButton({
  row,
  active,
  highlighted,
  concierge,
  onOpen,
}: {
  row: ReviewRow;
  active: boolean;
  /** On a phone the list only marks a review once one is open. */
  highlighted: boolean;
  concierge: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={active ? "true" : undefined}
      className={cn(
        "block w-full rounded-large bg-kb-white p-4 text-left shadow-kb transition-colors",
        active
          ? highlighted
            ? "ring-2 ring-kb-black"
            : "lg:ring-2 lg:ring-kb-black"
          : "hover:ring-2 hover:ring-kb-hairline",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="inline-flex shrink-0 gap-0.5"
            role="img"
            aria-label={`${row.star_rating} of 5 stars`}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                aria-hidden="true"
                className={cn(
                  "size-3.5",
                  n <= row.star_rating ? "fill-kb-black text-kb-black" : "text-kb-stone/40",
                )}
              />
            ))}
          </span>
          <span className="truncate text-sm font-bold">{row.reviewer_name ?? "A customer"}</span>
        </span>
        {row.review_created_at ? (
          <span className="shrink-0 text-xs text-kb-stone">{fmtDate(row.review_created_at)}</span>
        ) : null}
      </span>
      <span dir="auto" className="mt-2 line-clamp-2 block text-sm leading-6 text-kb-stone">
        {row.comment ||
          (row.content_purged_at
            ? "Text removed after 30 days (Google's rule)"
            : "Rating only, no text")}
      </span>
      <span className="mt-3 flex flex-wrap items-center gap-2">
        <ReviewStatusPill review={row} concierge={concierge} />
        {row.risk === "high" ? <StatusPill tone="red">High risk</StatusPill> : null}
        {row.risk === "medium" ? <StatusPill tone="amber">Needs care</StatusPill> : null}
      </span>
    </button>
  );
}

// A review that needs a reply gets the full card; every other review is read-only with its reply and status.
function Detail({ review, concierge }: { review: ReviewRow; concierge: boolean }) {
  if (needsReply(review)) return <ReviewCard review={review} />;
  const reply = review.my_reply || review.existing_reply;
  return (
    <article className="rounded-large bg-kb-white p-5 shadow-kb sm:p-7">
      <ReviewHead review={review} />
      <div className="mt-4">
        <ReviewStatusPill review={review} concierge={concierge} />
      </div>
      {review.content_purged_at && !review.comment ? (
        <p className="mt-3 text-sm text-kb-stone">
          Google's rules let Kabsi keep review text for 30 days. Read it on your Google profile.
        </p>
      ) : null}
      {reply ? (
        <div className="mt-4 rounded-card border-l-4 border-kb-yellow bg-kb-sand p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-kb-stone">Your reply</p>
          <p dir="auto" className="mt-1 whitespace-pre-wrap text-sm leading-6">
            {reply}
          </p>
        </div>
      ) : null}
      {review.reply_state_reason && review.reply_state === "in_review" ? (
        <p className="mt-3 text-sm text-kb-stone">{review.reply_state_reason}</p>
      ) : null}
    </article>
  );
}
