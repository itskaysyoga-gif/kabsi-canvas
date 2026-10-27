import { StatusPill, type Tone } from "@/components/kabsi/ui";
import { detailLine, STATUS_LABEL, type CoachRow, type CoachStatus } from "@/lib/coach";

const TONE: Record<CoachStatus, Tone> = {
  done: "ok",
  todo: "warn",
  unknown: "info",
  later: "info",
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
    <ul className="divide-y divide-line" aria-label={label}>
      {rows.map((r) => {
        const line = detailLine(r);
        return (
          <li key={r.id} className="py-4 first:pt-0 last:pb-0" data-testid={`coach-${r.id}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="min-w-0 flex-1 text-body font-bold text-text-1">{r.title}</p>
              <StatusPill tone={TONE[r.status]}>{STATUS_LABEL[r.status]}</StatusPill>
            </div>
            <p className="mt-1 text-small text-text-2">{r.why}</p>
            {line ? <p className="mt-1 text-small font-semibold text-text-1">{line}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}
