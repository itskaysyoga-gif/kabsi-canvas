import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KabsiCard } from "@/components/ui/kabsi-card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { approveBacklog, loadBacklogList, loadBacklogProgress } from "@/lib/backlog";
import { backlogBreakdown, backlogCounts, progressLine } from "@/lib/home-state";
import { myAccess } from "@/lib/team";
import type { Task } from "@/lib/tasks";
import { cn } from "@/lib/utils";

// "We found 23 unanswered reviews. Replies are ready." (K-66). Approve all is only for the low-risk replies, and the owner
// sees every one of them first: the approval covers exactly that list. Reviews that need a look are read one by one and
// reviews that need care have no draft. The replies go to Google through the one pipeline, at most 5 a minute (K-36).
export function BacklogCard({
  task,
  locationId,
  lead,
}: {
  task: Task;
  locationId: string;
  lead: boolean;
}) {
  const qc = useQueryClient();
  const counts = backlogCounts(task);
  const [open, setOpen] = useState(false);
  const access = useQuery({
    queryKey: ["access", locationId],
    queryFn: () => myAccess(locationId),
    staleTime: 60_000,
  });
  const mayApprove = !!access.data?.approve.review_reply;
  const list = useQuery({
    queryKey: ["backlog-list", locationId],
    queryFn: () => loadBacklogList(locationId),
    enabled: open,
  });
  const progress = useQuery({
    queryKey: ["backlog-progress", locationId],
    queryFn: () => loadBacklogProgress(locationId),
    refetchInterval: (q) => {
      const p = q.state.data;
      return p && p.sent < p.total ? 8_000 : false;
    },
  });
  const approve = useMutation({
    mutationFn: () => approveBacklog(locationId, list.data ?? []),
    onSuccess: async () => {
      setOpen(false);
      await Promise.all(
        [
          ["tasks"],
          ["backlog-progress"],
          ["backlog-list"],
          ["reviews"],
          ["waiting-count"],
          ["feed"],
        ].map((queryKey) => qc.invalidateQueries({ queryKey })),
      );
    },
  });
  const p = progress.data;
  const going = !!p && p.sent < p.total;

  return (
    <KabsiCard
      needsYou={false}
      eyebrow="Day one"
      title={task.title}
      actions={
        <>
          {mayApprove && counts.low > 0 ? (
            <Button
              variant={lead ? "primary" : "secondary"}
              size="compact"
              onClick={() => setOpen(true)}
            >
              See the {counts.low} low-risk {counts.low === 1 ? "reply" : "replies"} <ArrowRight />
            </Button>
          ) : null}
          <Button
            asChild
            variant={mayApprove && counts.low > 0 ? "tertiary" : lead ? "primary" : "secondary"}
            size="compact"
          >
            <Link to="/app/reviews" search={{ f: "needs" }}>
              Read one by one
            </Link>
          </Button>
        </>
      }
    >
      <p className="text-kb-small leading-6">{backlogBreakdown(counts)}</p>
      {task.why ? <p className="mt-2 text-kb-small leading-6 text-kb-stone">{task.why}</p> : null}
      {!mayApprove ? (
        <p className="mt-2 text-kb-small text-kb-stone">
          The owner approves replies. They can see these.
        </p>
      ) : null}
      {p ? (
        <div className="mt-3 rounded-card bg-kb-sand p-3" role="status" aria-live="polite">
          <p className="flex items-center gap-2 text-kb-small font-bold">
            {going ? null : <CheckCircle2 className="size-4 text-kb-green" aria-hidden="true" />}
            {progressLine(p.sent, p.total)}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-pill bg-kb-white">
            <div
              className="h-full rounded-pill bg-kb-yellow transition-all"
              style={{ width: `${Math.round((p.sent / Math.max(1, p.total)) * 100)}%` }}
            />
          </div>
          {going ? (
            <p className="mt-2 text-kb-caption text-kb-stone">
              Kabsi sends at most 5 replies a minute to Google, so this takes a few minutes.
            </p>
          ) : null}
          {p.failed > 0 ? (
            <p className="mt-2 text-kb-caption text-kb-red">
              {p.failed} could not be sent. You'll find {p.failed === 1 ? "it" : "them"} in Reviews.
            </p>
          ) : null}
        </div>
      ) : null}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="flex max-h-[90vh] flex-col rounded-t-large">
          <SheetHeader className="text-left">
            <SheetTitle>
              {list.data
                ? `${list.data.length} low-risk ${list.data.length === 1 ? "reply" : "replies"}`
                : "Low-risk replies"}
            </SheetTitle>
            <SheetDescription>
              Read them first. You approve exactly these, and nothing else. Nothing goes on Google
              until you approve.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
            {list.isLoading ? <p className="text-kb-small text-kb-stone">Loading...</p> : null}
            {list.isError ? (
              <p className="text-kb-small text-kb-red" role="alert">
                We couldn't load the replies. Try again in a moment.
              </p>
            ) : null}
            {list.data && !list.data.length ? (
              <p className="text-kb-small text-kb-stone">No low-risk replies are waiting.</p>
            ) : null}
            <ul className="space-y-3">
              {(list.data ?? []).map((i) => (
                <li key={i.id} className="rounded-card border border-kb-hairline p-3">
                  <p className="flex items-center gap-2 text-kb-small font-bold">
                    <span
                      className="inline-flex gap-0.5"
                      role="img"
                      aria-label={`${i.stars} of 5 stars`}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          aria-hidden="true"
                          className={cn(
                            "size-3.5",
                            n <= i.stars ? "fill-kb-black text-kb-black" : "text-kb-stone/40",
                          )}
                        />
                      ))}
                    </span>
                    {i.reviewer ?? "A customer"}
                  </p>
                  {i.comment ? (
                    <p dir="auto" className="mt-1 line-clamp-2 text-kb-small italic text-kb-stone">
                      &ldquo;{i.comment}&rdquo;
                    </p>
                  ) : null}
                  <p
                    dir="auto"
                    className="mt-2 whitespace-pre-wrap rounded-card border-l-4 border-l-kb-yellow bg-kb-sand/60 p-3 text-kb-small leading-6"
                  >
                    {i.reply}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          {approve.isError ? (
            <p className="mt-3 text-kb-small text-kb-red" role="alert">
              {approve.error instanceof Error
                ? approve.error.message
                : "Couldn't approve these. Nothing was sent."}
            </p>
          ) : null}
          <Button
            className="mt-4 w-full"
            disabled={approve.isPending || !list.data?.length}
            onClick={() => approve.mutate()}
          >
            {approve.isPending
              ? "Approving..."
              : `Approve these ${list.data?.length ?? 0} ${list.data?.length === 1 ? "reply" : "replies"}`}
          </Button>
          <p className="mt-2 text-center text-kb-caption text-kb-stone">
            Kabsi sends at most 5 a minute. You can still skip or change any reply later in Reviews.
          </p>
        </SheetContent>
      </Sheet>
    </KabsiCard>
  );
}
