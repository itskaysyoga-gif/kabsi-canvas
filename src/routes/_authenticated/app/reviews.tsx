import { useState } from "react";
import { fmtDate } from "@/lib/format";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { myLatestLocation } from "@/lib/onboarding";
import { cn } from "@/lib/utils";
import { MessageSquareText as PageGlyph, Search, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageIcon } from "@/components/shared/page-icon";

// Every review Kabsi has seen for this business, newest first, with its reply status. Replying happens in the Inbox.
export const Route = createFileRoute("/_authenticated/app/reviews")({
  head: () => ({ meta: [{ title: "Reviews | Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: ReviewsPage,
});

type Row = {
  id: string;
  reviewer_name: string | null;
  star_rating: number;
  comment: string | null;
  state: string;
  existing_reply: string | null;
  reply_state: string | null;
  review_created_at: string | null;
  content_purged_at: string | null;
  /** The reply the owner approved through Kabsi (exact text sent to Google). */
  my_reply?: string | null;
};
const STATE: Record<string, string> = {
  new: "Drafting",
  drafted: "Waiting for you",
  blocked: "Waiting for you",
  publishing: "Approved, our team posts it within one working day",
  posted: "Replied",
  skipped: "Skipped",
  handled_offline: "Handled by you",
  archived: "Older, not answered",
};
const FILTERS = [
  { key: "all", label: "All" },
  { key: "low", label: "1 to 3 stars" },
  { key: "high", label: "4 to 5 stars" },
  { key: "open", label: "Not replied" },
] as const;

async function loadReviews(locationId: string): Promise<Row[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, reviewer_name, star_rating, comment, state, existing_reply, reply_state, review_created_at, content_purged_at",
    )
    .eq("location_id", locationId)
    .order("review_created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Row[];
  // The owner's own approved replies (their words, kept regardless of Google's 30-day rule).
  const { data: pubs } = await supabase
    .from("publications")
    .select("target_id, payload, created_at")
    .eq("location_id", locationId)
    .eq("target_type", "review_reply")
    .in("status", ["live", "in_review", "sent"])
    .order("created_at", { ascending: false })
    .limit(400);
  const mine = new Map<string, string>();
  for (const p of (pubs ?? []) as { target_id: string; payload: { text?: string } | null }[]) {
    if (!mine.has(p.target_id) && p.payload?.text) mine.set(p.target_id, p.payload.text);
  }
  return rows.map((r) => ({ ...r, my_reply: mine.get(r.id) ?? null }));
}

function ReviewsPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [q, setQ] = useState("");
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const reviews = useQuery({
    queryKey: ["all-reviews", loc?.id],
    queryFn: () => loadReviews(loc!.id),
    enabled: !!loc,
  });
  const needle = q.trim().toLowerCase();
  const list = (reviews.data ?? []).filter(
    (r) =>
      (filter === "low"
        ? r.star_rating <= 3
        : filter === "high"
          ? r.star_rating >= 4
          : filter === "open"
            ? !["posted", "handled_offline", "skipped"].includes(r.state)
            : true) &&
      (!needle ||
        (r.comment ?? "").toLowerCase().includes(needle) ||
        (r.reviewer_name ?? "").toLowerCase().includes(needle)),
  );
  const count = reviews.data?.length ?? 0;
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <PageIcon icon={<PageGlyph />} />
      <p className="text-sm font-bold uppercase tracking-wider text-kb-stone">Replies</p>
      <h1 className="mt-1 font-display text-4xl leading-none sm:text-5xl">All reviews</h1>
      <p className="mt-2 text-kb-stone">
        {count
          ? `${count >= 200 ? "Your latest 200" : count} ${count === 1 ? "review" : "reviews"} Kabsi has seen, newest first.`
          : loc && loc.status !== "active"
            ? "Reviews show up here once Kabsi can reach your Google profile."
            : reviews.isLoading
              ? ""
              : "No reviews yet. New ones show up here and in your email."}
      </p>
      {!location.isLoading && !loc ? (
        <Button asChild className="mt-6">
          <Link to="/start">Add your business</Link>
        </Button>
      ) : null}
      {count ? (
        <div className="mt-6 space-y-3">
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
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter reviews">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "min-h-10 rounded-pill border px-4 text-sm font-bold",
                  filter === f.key
                    ? "border-kb-black bg-kb-black text-kb-white"
                    : "border-kb-hairline bg-kb-white text-kb-stone hover:text-kb-black",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {reviews.isLoading ? (
        <div className="mt-5 space-y-3" role="status" aria-label="Loading reviews">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-large bg-kb-white/70" />
          ))}
        </div>
      ) : null}
      {reviews.error ? (
        <div className="mt-5 rounded-large bg-kb-white p-5 shadow-kb" role="alert">
          <p className="font-bold">Couldn't load your reviews.</p>
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
      <div className="mt-5 space-y-3">
        {list.map((r) => (
          <article key={r.id} className="rounded-large bg-kb-white p-5 shadow-kb">
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-kb-carbon text-sm font-bold text-kb-white"
              >
                {(r.reviewer_name ?? "A").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold">{r.reviewer_name ?? "A customer"}</p>
                  <span
                    className={cn(
                      "rounded-pill px-2.5 py-1 text-xs font-bold",
                      r.state === "posted" || r.state === "handled_offline"
                        ? "bg-kb-green/10 text-kb-green"
                        : ["drafted", "blocked"].includes(r.state)
                          ? "bg-kb-yellow text-kb-black"
                          : "bg-kb-sand text-kb-stone",
                    )}
                  >
                    {r.state === "posted" && r.reply_state === "in_review"
                      ? "Replied · Google reviewing"
                      : r.state === "posted" && r.reply_state === "rejected"
                        ? "Reply not accepted by Google"
                        : (STATE[r.state] ?? r.state)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-kb-stone">
                  <span className="inline-flex gap-0.5" aria-label={`${r.star_rating} of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        aria-hidden="true"
                        className={cn(
                          "size-3.5",
                          n <= r.star_rating ? "fill-kb-black text-kb-black" : "text-kb-stone/40",
                        )}
                      />
                    ))}
                  </span>
                  {r.review_created_at ? <span>{fmtDate(r.review_created_at)}</span> : null}
                </div>
              </div>
            </div>
            <p dir="auto" className="mt-3 whitespace-pre-wrap leading-7">
              {r.comment ||
                (r.content_purged_at ? (
                  <span className="text-kb-stone">
                    Google's rules let Kabsi keep review text for 30 days. Read it on your Google
                    profile.
                  </span>
                ) : (
                  <span className="text-kb-stone">No written review, just a rating.</span>
                ))}
            </p>
            {r.my_reply || r.existing_reply ? (
              <div className="mt-3 rounded-card border-l-4 border-kb-yellow bg-kb-sand p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-kb-stone">
                  Your reply
                </p>
                <p dir="auto" className="mt-1 whitespace-pre-wrap text-sm leading-6">
                  {r.my_reply || r.existing_reply}
                </p>
              </div>
            ) : null}
            {["drafted", "blocked"].includes(r.state) ? (
              <Button asChild size="compact" className="mt-4">
                <Link to="/app/inbox">Reply now</Link>
              </Button>
            ) : null}
          </article>
        ))}
        {reviews.data && count && !list.length ? (
          <p className="text-kb-stone">No reviews match.</p>
        ) : null}
      </div>
    </div>
  );
}
