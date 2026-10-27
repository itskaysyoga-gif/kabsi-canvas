import { useQuery } from "@tanstack/react-query";
import { SourceLabel } from "@/components/kabsi/d3-account";
import { Skeleton } from "@/components/kabsi/ui";
import { reviewGrowth } from "@/lib/reviews";

// Review Growth's two numbers (V3, Design 3's ReviewCounts): new reviews from the Google Business Profile and opens of
// the Kabsi review link, each with where it comes from, side by side and never added together. An open is not a review.
export function ReviewCounts({ locationId }: { locationId: string }) {
  const q = useQuery({
    queryKey: ["review-growth", locationId],
    queryFn: () => reviewGrowth(locationId),
    staleTime: 60_000,
  });
  const n = (v: number | undefined) =>
    q.isLoading ? <Skeleton className="h-9 w-12" /> : q.isError ? "-" : (v ?? 0);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-inner bg-surface-2 p-4">
        <SourceLabel className="bg-surface-1">From your Google Business Profile</SourceLabel>
        <div className="mt-3 font-display text-h2 font-bold">{n(q.data?.reviews)}</div>
        <p className="text-small text-text-2">New reviews this month</p>
      </div>
      <div className="rounded-inner bg-surface-2 p-4">
        <SourceLabel className="bg-surface-1">From your Kabsi review link</SourceLabel>
        <div className="mt-3 font-display text-h2 font-bold">{n(q.data?.opens)}</div>
        <p className="text-small text-text-2">
          Times the link was opened. An open is not a review.
        </p>
      </div>
      {q.isError ? (
        <p className="text-small text-text-2 sm:col-span-2">
          These numbers did not load. Try again in a minute.
        </p>
      ) : null}
    </div>
  );
}
