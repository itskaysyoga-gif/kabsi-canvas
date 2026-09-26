import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { myLatestLocation } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

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
  review_created_at: string | null;
};
const STATE: Record<string, string> = {
  new: "Drafting",
  drafted: "Waiting for you",
  blocked: "Waiting for you",
  posted: "Replied",
  skipped: "Skipped",
  handled_offline: "Handled by you",
  archived: "Older, not answered",
};
const FILTERS = [
  { key: "all", label: "All" },
  { key: "low", label: "1–3 stars" },
  { key: "high", label: "4–5 stars" },
  { key: "open", label: "Not replied" },
] as const;

async function loadReviews(locationId: string): Promise<Row[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, reviewer_name, star_rating, comment, state, existing_reply, review_created_at")
    .eq("location_id", locationId)
    .order("review_created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

function ReviewsPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const reviews = useQuery({
    queryKey: ["all-reviews", loc?.id],
    queryFn: () => loadReviews(loc!.id),
    enabled: !!loc,
  });
  const list = (reviews.data ?? []).filter((r) =>
    filter === "low"
      ? r.star_rating <= 3
      : filter === "high"
        ? r.star_rating >= 4
        : filter === "open"
          ? !["posted", "handled_offline", "skipped"].includes(r.state)
          : true,
  );
  const count = reviews.data?.length ?? 0;
  const avg = count
    ? (reviews.data!.reduce((s, r) => s + r.star_rating, 0) / count).toFixed(1)
    : null;
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <h1 className="font-display text-4xl leading-none sm:text-5xl">All reviews</h1>
      <p className="mt-2 text-kb-stone">
        {count
          ? `${count} reviews since Kabsi started · average ${avg} of 5`
          : "Reviews show up here once Kabsi is connected."}
      </p>
      {!location.isLoading && !loc ? (
        <Button asChild className="mt-6">
          <Link to="/start">Add your business</Link>
        </Button>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-2" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-pill px-4 py-2 text-sm font-medium",
              filter === f.key
                ? "bg-kb-black text-kb-white"
                : "bg-kb-white text-kb-stone hover:text-kb-black",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {list.map((r) => (
          <article key={r.id} className="rounded-large bg-kb-white p-5 shadow-kb">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold">
                {r.reviewer_name ?? "A customer"}{" "}
                <span className="font-normal text-kb-stone">· Rating {r.star_rating} of 5</span>
              </p>
              <span className="text-xs font-bold uppercase text-kb-stone">
                {STATE[r.state] ?? r.state}
              </span>
            </div>
            <p dir="auto" className="mt-2 whitespace-pre-wrap leading-7">
              {r.comment || (
                <span className="text-kb-stone">No written review, just a rating.</span>
              )}
            </p>
            {r.existing_reply ? (
              <p
                dir="auto"
                className="mt-3 whitespace-pre-wrap rounded-card bg-kb-sand p-3 text-sm leading-6"
              >
                {r.existing_reply}
              </p>
            ) : null}
            {["drafted", "blocked"].includes(r.state) ? (
              <Link to="/app/inbox" className="mt-3 inline-block text-sm font-bold underline">
                Reply in the Inbox
              </Link>
            ) : null}
          </article>
        ))}
        {reviews.data && !list.length ? <p className="text-kb-stone">Nothing here.</p> : null}
      </div>
    </div>
  );
}
