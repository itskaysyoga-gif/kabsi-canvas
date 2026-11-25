import { Link } from "@tanstack/react-router";
import { RetryLine } from "@/components/kabsi/retry-line";
import { useQuery } from "@tanstack/react-query";
import {
  Camera,
  ChevronRight,
  Clock,
  MessageSquareText,
  Newspaper,
  Store,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/kabsi/ui";
import { profileHealth, weekReceipt, type HealthKey } from "@/lib/home-state";
import { recentTasks } from "@/lib/task-feed";
import type { Task } from "@/lib/tasks";
import { cn } from "@/lib/utils";

// APP-1: Home's second and third parts. "This week" is a receipt of the work that went to Google in the last 7 days, in
// plain numbers, read from the publications (the same read as before, under the same key). "Your Google profile" is the
// health strip: details, hours, photos, posts and reviews, each with its state and one next action.

export const doneLatelyKey = (locationId: string) => ["done-lately", locationId] as const;
export const loadDoneLately = (locationId: string) =>
  recentTasks(locationId, { limit: 50, days: 7 });

export function ThisWeek({ locationId }: { locationId: string }) {
  const q = useQuery({
    queryKey: doneLatelyKey(locationId),
    queryFn: () => loadDoneLately(locationId),
    refetchInterval: 60_000,
  });
  const lines = weekReceipt(q.data ?? []);
  const total = lines.filter((l) => l.key !== "failed").reduce((t, l) => t + l.n, 0);
  return (
    <section
      aria-labelledby="week-h"
      className="rounded-card border border-line bg-surface-1 shadow-rest"
      data-testid="this-week"
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <h2 id="week-h" className="font-display text-h3 font-bold">
          This week
        </h2>
        <Link
          to="/app/report"
          className="inline-flex min-h-11 items-center gap-1 text-small font-bold underline underline-offset-4"
        >
          Your reports
        </Link>
      </div>
      <p className="px-5 text-small text-text-2 sm:px-6">What Kabsi did in the last 7 days.</p>
      {q.isError ? (
        <RetryLine
          className="px-5 pt-3 pb-5 sm:px-6"
          what="This week's work did not load."
          onRetry={() => void q.refetch()}
        />
      ) : q.isLoading ? (
        <div className="space-y-3 px-5 py-5 sm:px-6" role="status" aria-label="Loading">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
        </div>
      ) : (
        <>
          <dl className="mt-3 border-t border-dashed border-line-strong px-5 sm:px-6">
            {lines.map((l) => (
              <div
                key={l.key}
                className="flex items-baseline gap-3 border-b border-line py-3 last:border-b-0"
              >
                <dt className={cn("min-w-0 flex-1 text-body", l.tone === "bad" && "text-bad")}>
                  {l.label}
                </dt>
                <dd
                  className={cn(
                    "font-display text-title font-bold tabular-nums",
                    l.n === 0 && "text-text-2",
                    l.tone === "bad" && "text-bad",
                  )}
                >
                  {l.n}
                </dd>
              </div>
            ))}
          </dl>
          <p className="rounded-b-card border-t border-dashed border-line-strong bg-surface-2 px-5 py-4 text-small text-text-2 sm:px-6">
            {total === 0
              ? "Kabsi checks your Google profile every day. Work you approve shows here."
              : "Kabsi checks your Google profile every day. Nothing went to Google without your yes."}
          </p>
        </>
      )}
    </section>
  );
}

const ICON: Record<HealthKey, LucideIcon> = {
  details: Store,
  hours: Clock,
  photos: Camera,
  posts: Newspaper,
  reviews: MessageSquareText,
};

export function ProfileHealth({ locationId, tasks }: { locationId: string; tasks: Task[] }) {
  const week = useQuery({
    queryKey: doneLatelyKey(locationId),
    queryFn: () => loadDoneLately(locationId),
    refetchInterval: 60_000,
  });
  const items = profileHealth({ tasks, week: week.data ?? [] });
  return (
    <section aria-labelledby="health-h" data-testid="profile-health">
      <h2 id="health-h" className="mb-3 font-display text-h3 font-bold">
        Your Google profile
      </h2>
      <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface-1 shadow-rest">
        {items.map((h) => {
          const I = ICON[h.key];
          return (
            <li key={h.key}>
              <Link
                to={h.action.to as "/"}
                className="press flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:px-5"
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-full",
                    h.tone === "warn" ? "bg-kb-yellow text-kb-black" : "bg-ok-soft text-ok",
                  )}
                >
                  <I className="size-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-bold">{h.label}</span>
                  <span
                    className={cn(
                      "block text-small",
                      h.tone === "warn" ? "font-semibold text-text-1" : "text-text-2",
                    )}
                  >
                    {h.state}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-small font-bold">
                  {h.action.label}
                  <ChevronRight className="size-4" aria-hidden />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
