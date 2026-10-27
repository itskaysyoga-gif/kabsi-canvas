import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { detailLine, STATUS_LABEL, type CoachRow, type CoachStatus } from "@/lib/coach";

const TONE: Record<CoachStatus, StatusTone> = {
  done: "green",
  todo: "amber",
  unknown: "grey",
  later: "grey",
};

/** The Profile Coach's checklist, one card per item with what it is and why. Used by the app and the free Profile Check. */
export function CoachList({
  rows,
  label = "Profile checklist",
}: {
  rows: CoachRow[];
  label?: string;
}) {
  return (
    <ul className="space-y-3" aria-label={label}>
      {rows.map((r) => {
        const line = detailLine(r);
        return (
          <li
            key={r.id}
            className="rounded-card border-2 border-line p-4"
            data-testid={`coach-${r.id}`}
          >
            <StatusPill tone={TONE[r.status]}>{STATUS_LABEL[r.status]}</StatusPill>
            <p className="mt-2 font-bold">{r.title}</p>
            <p className="mt-1 text-small leading-6 text-text-2">{r.why}</p>
            {line ? <p className="mt-1 text-small font-medium">{line}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}
