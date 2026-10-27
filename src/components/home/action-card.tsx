import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Clock,
  CreditCard,
  HelpCircle,
  History,
  MessageSquareText,
  Newspaper,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Button, StatusPill, buttonClass } from "@/components/kabsi/ui";
import { HistorySheet } from "@/components/home/history-sheet";
import { HomeCard } from "@/components/home/home-card";
import { cardAction, cardRisk, REPLY_NOTE } from "@/lib/home-state";
import type { CardDetail } from "@/lib/home";
import { timeAgo } from "@/lib/dashboard";
import type { Task, TaskKind } from "@/lib/tasks";

// One task that needs the owner (K-06, Design 3's card): what happened, the evidence, what Kabsi prepared, a risk label
// when there is one, one button that opens it where the owner decides, Later, and the History behind it. Only the first
// card on Home carries the yellow button (one per screen, K-108).

const ICON: Partial<Record<TaskKind, LucideIcon>> = {
  review_reply: MessageSquareText,
  post: Newspaper,
  photo_batch: Camera,
  hours_confirm: Clock,
  profile_change: ShieldCheck,
  knowledge_confirm: HelpCircle,
  reconnect: AlertTriangle,
  google_needs_action: AlertTriangle,
  billing: CreditCard,
};

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
  // A review card opens that review on the Reviews screen.
  const rid = task.evidence["review_id"];
  const reviewId = isReply && typeof rid === "string" && /^[0-9a-f-]{36}$/.test(rid) ? rid : null;
  const primary = buttonClass(lead ? "primary" : "secondary", "md");
  const mainProps = lead ? { "data-main-cta": true } : {};
  return (
    <HomeCard
      icon={ICON[task.kind] ?? Sparkles}
      title={task.title}
      when={timeAgo(task.created_at)}
      tone={risk?.tone === "red" ? "warn" : "plain"}
      foot={
        <>
          <div className="flex flex-wrap items-center gap-2">
            {reviewId ? (
              <Link
                to="/app/reviews"
                search={{ f: "needs", r: reviewId }}
                className={primary}
                {...mainProps}
              >
                {act.primary} <ArrowRight className="size-4" aria-hidden />
              </Link>
            ) : (
              <Link to={task.path} className={primary} {...mainProps}>
                {act.primary} <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
            <Button variant="quiet" size="md" disabled={busy} onClick={() => onLater(task)}>
              {act.secondary}
            </Button>
            <Button
              variant="tertiary"
              className="ms-auto"
              onClick={() => setHistory(true)}
              icon={<History className="size-4" aria-hidden />}
            >
              History
            </Button>
          </div>
          {isReply || task.kind === "post" ? (
            <p className="mt-3 text-small text-text-2">{REPLY_NOTE}</p>
          ) : null}
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {risk ? (
          <StatusPill tone={risk.tone === "red" ? "bad" : "warn"}>{risk.label}</StatusPill>
        ) : (
          <StatusPill tone={detail?.prepared ? "info" : "warn"}>
            {detail?.prepared ? "Waiting for your yes" : "Needs you"}
          </StatusPill>
        )}
      </div>
      {detail?.eyebrow && !detail.quote ? (
        <p className="mt-4 text-small font-bold text-text-2">{detail.eyebrow}</p>
      ) : null}
      {detail?.quote ? (
        <blockquote className="mt-4 border-s-2 border-line-strong ps-3">
          {detail.eyebrow ? (
            <p className="text-small font-bold text-text-2">{detail.eyebrow}</p>
          ) : null}
          {detail.quote ? (
            <p dir="auto" className="mt-1 line-clamp-3 text-body text-text-1">
              {detail.quote}
            </p>
          ) : null}
        </blockquote>
      ) : null}
      {task.why ? <p className="mt-3 text-body text-text-1">{task.why}</p> : null}
      {task.recommendation ? (
        <p className="mt-2 text-small text-text-2">
          <b className="text-text-1">Kabsi suggests:</b> {task.recommendation}
        </p>
      ) : null}
      {detail?.evidence.length ? (
        <ul className="mt-2 space-y-0.5 text-small text-text-2">
          {detail.evidence.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
      {detail?.prepared ? (
        <div className="mt-4">
          <p className="text-small font-bold text-text-2">
            {isReply ? "Reply ready" : task.kind === "post" ? "Post ready" : "Ready"}
          </p>
          <p
            dir="auto"
            className="mt-2 whitespace-pre-wrap rounded-inner bg-surface-2 p-3 text-body text-text-1"
          >
            {detail.prepared}
          </p>
        </div>
      ) : null}
      <HistorySheet open={history} onOpenChange={setHistory} locationId={locationId} task={task} />
    </HomeCard>
  );
}
