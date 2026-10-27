import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { loadHistory } from "@/lib/home";
import { fmtDateTime } from "@/lib/format";
import type { Task } from "@/lib/tasks";

// The audit trail behind a card (K-06 "history", K-43): what Kabsi and the owner did with this item, newest first.
export function HistorySheet({
  open,
  onOpenChange,
  locationId,
  task,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  task: Task;
}) {
  const q = useQuery({
    queryKey: ["task-history", task.id],
    queryFn: () => loadHistory(locationId, task),
    enabled: open,
  });
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-panel">
        <SheetHeader className="text-start">
          <SheetTitle>History</SheetTitle>
          <SheetDescription>{task.title}</SheetDescription>
        </SheetHeader>
        {q.isLoading ? (
          <p className="mt-4 text-small text-text-2">Loading...</p>
        ) : q.isError ? (
          <p className="mt-4 text-small text-bad">
            We couldn't load the history. Try again in a moment.
          </p>
        ) : (q.data ?? []).length === 0 ? (
          <p className="mt-4 text-small text-text-2">Nothing has happened to this yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {(q.data ?? []).map((h) => (
              <li key={h.id} className="py-3">
                <p className="text-small font-medium">{h.line}</p>
                <p className="text-small text-text-2">{fmtDateTime(h.at)}</p>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}
