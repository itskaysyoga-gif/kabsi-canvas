import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Pencil, Undo2 } from "lucide-react";
import { Button, buttonClass } from "@/components/kabsi/ui";
import { ShortParas, TaskPill } from "@/components/kabsi/d3-account";
import { cardAction } from "@/lib/home-state";
import { loadHistory, type CardDetail } from "@/lib/home";
import { postReply, undoReply } from "@/lib/reviews";
import { publishPost, undoPost } from "@/lib/posts";
import { approvedLine } from "@/lib/task-state";
import { fmtDateTime } from "@/lib/format";
import { timeAgo } from "@/lib/dashboard";
import { track } from "@/lib/telemetry";
import type { Access } from "@/lib/team";
import type { Task } from "@/lib/tasks";
import { cn } from "@/lib/utils";

// One item in "Needs your yes" (App 2, master plan 30.22 item 5): what it is in one line, the draft clipped to two lines,
// Approve and Edit. The review, the history and the details open inside the item. Approve is the same approval as on
// Reviews and Posts (the one publication pipeline, with the 10 second Undo, K-70); a reply that needs care, a high-risk
// review or anything Kabsi cannot approve as it is opens where the owner decides instead.

const idOf = (t: Task, key: string) => {
  const v = t.evidence[key];
  return typeof v === "string" && /^[0-9a-f-]{36}$/.test(v) ? v : null;
};

export type Approved = { publication: string; until: number };

export function YesItem({
  task,
  detail,
  access,
  locationId,
  lead,
  approved,
  onApproved,
  onSettled,
}: {
  task: Task;
  detail: CardDetail | undefined;
  access: Access;
  locationId: string;
  /** The first item carries the one yellow button on Home. */
  lead: boolean;
  approved: Approved | undefined;
  onApproved: (a: Approved) => void;
  /** Told when the Undo window is over or the approval was undone, so Home can read the list again. */
  onSettled: (undone: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const reviewId = task.kind === "review_reply" ? idOf(task, "review_id") : null;
  const postId = task.kind === "post" ? idOf(task, "post_id") : null;
  const risk = task.evidence["risk"];
  const text = detail?.prepared ?? "";
  // One tap only where nothing else needs reading first: a low-risk reply or a post, ready and checked, that this
  // person may approve (K-16; the server refuses everyone else anyway).
  const oneTap =
    !!text &&
    !!detail?.safe &&
    ((reviewId &&
      risk !== "medium" &&
      risk !== "high" &&
      (detail.risk ?? "low") === "low" &&
      !task.evidence["google_refused"] &&
      access.approve.review_reply) ||
      (postId && access.approve.post));
  const edit = reviewId
    ? { to: "/app/reviews", search: { f: "waiting", r: reviewId } }
    : { to: task.path, search: {} };
  const line = task.kind === "review_reply" ? (detail?.eyebrow ?? task.title) : task.title;
  const main = lead ? { "data-main-cta": true } : {};

  async function approve() {
    setBusy(true);
    setError("");
    try {
      const r = reviewId ? await postReply(reviewId, text) : await publishPost(postId!, text);
      track(reviewId ? "reply_published" : "post_approved", { channel: "dashboard_home" });
      const pub = "publication" in r ? r.publication : undefined;
      if (pub) {
        const at = r.publish_after ? Date.parse(r.publish_after) : Date.now() + 10_000;
        onApproved({ publication: pub, until: at });
      } else onSettled(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Nothing was published.");
    }
    setBusy(false);
  }

  async function undo() {
    if (!approved) return;
    setBusy(true);
    setError("");
    try {
      if (reviewId) await undoReply(reviewId, approved.publication);
      else await undoPost(postId!, approved.publication);
      if (reviewId) track("reply_undone", { channel: "dashboard_home" });
      onSettled(true);
    } catch {
      setError("Too late to undo: it is already on its way to Google.");
    }
    setBusy(false);
  }

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 text-body font-semibold">{line}</p>
        <span className="shrink-0 text-small text-text-3">{timeAgo(task.created_at)}</span>
      </div>
      {text ? (
        <p dir="auto" className="mt-1 line-clamp-2 text-body text-text-2">
          {text}
        </p>
      ) : null}

      {approved ? (
        <Countdown
          until={approved.until}
          busy={busy}
          onUndo={() => void undo()}
          onDone={() => onSettled(false)}
        />
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {oneTap ? (
            <>
              <Button
                size="md"
                variant={lead ? "primary" : "secondary"}
                loading={busy}
                disabled={busy}
                onClick={() => void approve()}
                icon={<Check className="size-4" aria-hidden />}
                {...main}
              >
                Approve
              </Button>
              <Link
                to={edit.to as "/"}
                search={edit.search as never}
                className={buttonClass("quiet", "md")}
              >
                <Pencil className="size-4" aria-hidden /> Edit
              </Link>
            </>
          ) : (
            <Link
              to={edit.to as "/"}
              search={edit.search as never}
              className={buttonClass(lead ? "primary" : "secondary", "md")}
              {...main}
            >
              {cardAction(task).primary}
            </Link>
          )}
          <Button
            variant="tertiary"
            className="ms-auto"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            icon={
              <ChevronDown
                className={cn("size-4 transition-transform", open && "rotate-180")}
                aria-hidden
              />
            }
          >
            Details
          </Button>
        </div>
      )}
      {error ? (
        <p className="mt-2 text-small text-bad" role="alert">
          {error}
        </p>
      ) : null}
      {open && !approved ? <Details task={task} detail={detail} locationId={locationId} /> : null}
    </li>
  );
}

/** "Approved. It goes to Google in 10 seconds." with Undo, then Sent to Google. */
function Countdown({
  until,
  busy,
  onUndo,
  onDone,
}: {
  until: number;
  busy: boolean;
  onUndo: () => void;
  onDone: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.ceil((until - now) / 1000));
  // A post booked for a later day: say the day, as Posts does, not a countdown of days in seconds.
  const later = left > 60;
  useEffect(() => {
    if (left === 0) {
      const t = setTimeout(onDone, 1500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [left, onDone]);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3" role="status" aria-live="polite">
      <TaskPill state={left > 0 ? "approved" : "sent"} />
      {left > 0 ? (
        <>
          <p className="min-w-0 flex-1 text-small text-text-1">
            {later ? `Approved. It goes to Google on ${fmtDateTime(until)}.` : approvedLine(left)}
          </p>
          <Button
            variant="secondary"
            size="md"
            disabled={busy}
            onClick={onUndo}
            icon={<Undo2 className="size-4" aria-hidden />}
          >
            Undo
          </Button>
        </>
      ) : null}
    </div>
  );
}

/** Inside the item: the review, what Kabsi noticed, and the history. */
function Details({
  task,
  detail,
  locationId,
}: {
  task: Task;
  detail: CardDetail | undefined;
  locationId: string;
}) {
  const history = useQuery({
    queryKey: ["history", task.id],
    queryFn: () => loadHistory(locationId, task),
  });
  return (
    <div className="mt-3 space-y-3 rounded-inner bg-surface-2 p-3 text-small">
      {detail?.quote ? (
        <blockquote className="border-s-2 border-line-strong ps-3">
          <p dir="auto" className="whitespace-pre-wrap text-body text-text-1">
            {detail.quote}
          </p>
        </blockquote>
      ) : null}
      {task.why ? <ShortParas className="text-text-1" text={task.why} /> : null}
      {detail?.evidence.map((e) => (
        <p key={e} className="text-text-2">
          {e}
        </p>
      ))}
      {detail?.prepared ? (
        <p dir="auto" className="whitespace-pre-wrap text-body text-text-1">
          {detail.prepared}
        </p>
      ) : null}
      <div>
        <p className="font-bold text-text-2">History</p>
        {history.isLoading ? (
          <p className="text-text-2">Loading</p>
        ) : history.isError ? (
          <p className="text-text-2">This did not load. Try again in a minute.</p>
        ) : history.data?.length ? (
          <ul className="mt-1 space-y-1">
            {history.data.map((h) => (
              <li key={h.id} className="flex justify-between gap-3">
                <span>{h.line}</span>
                <span className="shrink-0 text-text-3">{timeAgo(h.at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text-2">Nothing yet.</p>
        )}
      </div>
    </div>
  );
}
