import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KabsiCard } from "@/components/ui/kabsi-card";
import { HistorySheet } from "@/components/home/history-sheet";
import { cardAction, cardRisk, REPLY_NOTE } from "@/lib/home-state";
import type { CardDetail } from "@/lib/home";
import { timeAgo } from "@/lib/dashboard";
import type { Task } from "@/lib/tasks";

// One action card (K-06): what happened, why it matters, what Kabsi recommends, the evidence, a risk label when there is
// one, the prepared action, one primary and one secondary button, the time, and a History link. The same card is used
// wherever an item needs the owner. Only the first card on a screen carries the yellow primary (one per screen, K-108).
export function ActionCard({
  task,
  detail,
  locationId,
  lead,
  busy,
  onLater,
}: {
  task: Task;
  detail: CardDetail | undefined;
  locationId: string;
  /** The first card is the one yellow button on Home. */
  lead: boolean;
  busy: boolean;
  onLater: (task: Task) => void;
}) {
  const [history, setHistory] = useState(false);
  const risk = cardRisk(task);
  const act = cardAction(task);
  const isReply = task.kind === "review_reply";
  return (
    <KabsiCard
      needsYou={task.priority === "urgent"}
      title={task.title}
      {...(detail?.eyebrow ? { eyebrow: detail.eyebrow } : {})}
      {...(risk ? { status: { label: risk.label, tone: risk.tone } } : {})}
      {...(detail?.prepared ? { draft: detail.prepared } : {})}
      {...(isReply || task.kind === "post" ? { note: REPLY_NOTE } : {})}
      actions={
        <>
          <Button asChild variant={lead ? "primary" : "secondary"} size="compact">
            <Link to={task.path}>
              {act.primary} <ArrowRight />
            </Link>
          </Button>
          <Button variant="tertiary" disabled={busy} onClick={() => onLater(task)} className="px-2">
            {act.secondary}
          </Button>
        </>
      }
    >
      {detail?.quote ? (
        <p className="mb-3 line-clamp-3 text-kb-small italic text-kb-stone">
          &ldquo;{detail.quote}&rdquo;
        </p>
      ) : null}
      {task.why ? <p className="text-kb-small leading-6">{task.why}</p> : null}
      {task.recommendation ? (
        <p className="mt-2 text-kb-small leading-6">
          <b>Kabsi suggests:</b> {task.recommendation}
        </p>
      ) : null}
      {detail?.evidence.length ? (
        <ul className="mt-2 space-y-0.5 text-kb-small text-kb-stone">
          {detail.evidence.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 flex items-center justify-between gap-3 text-kb-caption text-kb-stone">
        <span>{timeAgo(task.created_at)}</span>
        <button
          type="button"
          onClick={() => setHistory(true)}
          className="inline-flex min-h-10 items-center gap-1.5 px-1 underline underline-offset-4 hover:no-underline"
        >
          <History className="size-4" aria-hidden="true" /> History
        </button>
      </p>
      <HistorySheet open={history} onOpenChange={setHistory} locationId={locationId} task={task} />
    </KabsiCard>
  );
}
