// The task state on Hours, Posts and Photos (master plan 30.15 section 3.1, V4): a pill, the track and the line under
// it, from the publication Kabsi sent (src/lib/task-feed.ts), or from the row's own state while no publication is found.
// "On Google" only when Kabsi saw it there (verified); a row alone never says so. Plus the 10 second Undo bar.
import { useEffect, useState } from "react";
import { Undo2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { approvedLine, type OwnerState } from "@/lib/task-state";
import type { TaskItem } from "@/lib/task-feed";
import { cn } from "@/lib/utils";
import { TaskOutcome, TaskPill, TaskTrack } from "./d3-account";
import { Button } from "./ui";

/** A row's own state, when no publication is found: never "confirmed", because only a read back on Google says that. */
export function ownerFromRow(state: string): OwnerState | null {
  switch (state) {
    case "publishing":
      return "approved";
    case "posted":
    case "removing":
    case "removed":
      return "sent";
    case "failed":
      return "failed";
    default:
      return null;
  }
}

/** The pill, the track and the line under it for one thing Kabsi sent or will send to Google. */
export function TaskBlock({
  task,
  kind,
  rowState,
  seen = false,
  className,
}: {
  task: TaskItem | undefined;
  /** The publication kind, for the failure line when only the row is known. */
  kind: string;
  rowState: string;
  /** Kabsi itself read it back on Google (a put-back Google Protection saw corrected). */
  seen?: boolean | undefined;
  className?: string | undefined;
}) {
  const owner = task?.owner ?? (seen ? "confirmed" : ownerFromRow(rowState));
  if (!owner) return null;
  const t = task ?? { owner, kind, state: rowState === "failed" ? "failed" : rowState, link: null };
  return (
    <div className={className}>
      <TaskPill state={owner} />
      {owner !== "undone" && <TaskTrack state={owner} className="mt-3" />}
      <TaskOutcome task={t} className="mt-3" />
    </div>
  );
}

/** "Approved. It goes to Google in [n] seconds." with Undo, until the time is up (K-70). */
export function UndoBar({
  until,
  busy,
  error,
  onUndo,
  later,
}: {
  until: number;
  busy: boolean;
  error: string;
  onUndo: () => void;
  /** What to say while it waits for a later day (a scheduled post), instead of counting seconds. */
  later?: string | undefined;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);
  const left = Math.max(0, Math.ceil((until - now) / 1000));
  const waiting = later && left > 60;
  return (
    <div
      className="rounded-card border border-line bg-surface-1 p-4 shadow-rest sm:p-5"
      role="status"
      aria-live="polite"
    >
      <TaskTrack state={left > 0 ? "approved" : "sent"} />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-body text-text-1">
          {waiting ? later : left > 0 ? approvedLine(left) : "Approved. On its way to Google."}
        </p>
        {left > 0 ? (
          <Button
            variant="secondary"
            size="md"
            loading={busy}
            icon={<Undo2 className="size-4" aria-hidden />}
            onClick={onUndo}
          >
            Undo
          </Button>
        ) : null}
      </div>
      {error ? (
        <p className="mt-3 text-small font-semibold text-bad" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** V4: team, tone, competitors and photos open after the first task is done. Undefined while it loads. */
export function useFirstTaskDone(locationId: string | undefined) {
  const q = useQuery({
    queryKey: ["onboarding-status", locationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("onboarding_status", { p_location: locationId! });
      if (error) throw new Error(error.message);
      return data as { first_task_done?: boolean } | null;
    },
    enabled: !!locationId,
    staleTime: 60_000,
    retry: false,
  });
  if (q.isError) return true; // never hide the owner's own work because a status read failed
  return q.data ? q.data.first_task_done === true : undefined;
}

/** The one short line in place of a part that opens after the first task. */
export function OpensLater({ className }: { className?: string | undefined }) {
  return (
    <p
      className={cn(
        "rounded-card border border-dashed border-line-strong p-4 text-body text-text-2",
        className,
      )}
    >
      These open after your first task is done. One thing at a time.
    </p>
  );
}
