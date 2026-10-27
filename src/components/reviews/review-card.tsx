import { useEffect, useState } from "react";
import { CONCIERGE_COPY } from "@/lib/concierge-copy";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CheckCircle2,
  Hand,
  LifeBuoy,
  Loader2,
  MessageSquareText,
  MoreHorizontal,
  Pencil,
  SkipForward,
  Star,
  Undo2,
  Wand2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useAutosize } from "@/lib/use-autosize";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge, Button, StatusPill, buttonClass, type Tone } from "@/components/kabsi/ui";
import { TaskOutcome, TaskPill, TaskTrack } from "@/components/kabsi/d3-account";

export { ReviewHead } from "@/components/reviews/review-head";
import { ReviewGraphic } from "@/components/reviews/review-graphic";
import { ReportReview } from "@/components/reviews/report-review";
import { myAccess } from "@/lib/team";
import {
  answerStyleOffer,
  handleOffline,
  holdingReply,
  postReply,
  redraftReply,
  skipReview,
  undoReply,
  type InboxReview,
  type StyleOffer,
} from "@/lib/reviews";
import { HIGH_RISK_CHECKLIST, issueLines } from "@/lib/review-risk";
import { reviewStatus, type StatusTone } from "@/lib/review-status";
import { approvedLine, SENT_LINE } from "@/lib/task-state";
import type { TaskItem } from "@/lib/task-feed";
import { fmtDate } from "@/lib/format";
import { WHATSAPP_ON, whatsappHref } from "@/lib/site";
import { track } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

// The one review card (K-15, Design 3's Kabsi card): who wrote it and what they said, what Kabsi prepared, Approve reply,
// Edit and Skip, with more options behind them. After Approve the reply waits 10 seconds with Undo (K-70), then shows
// where it is: approved, sent to Google, on Google (30.15 section 3.1). Only a role that may approve sees the buttons
// (K-16); the database refuses everyone else anyway.

const MAX = 4000;
const QUICK_CHANGES = ["Shorter", "More formal", "Warmer", "Say sorry more clearly"];

type Busy = "" | "post" | "skip" | "redraft" | "mine" | "holding" | "undo";

/** "Publishing in 10 seconds" with Undo (K-70). When the time is up it says the reply is on its way. A removal
 * (P0.7-05) passes its own words. Posts use it; the review card shows the task track instead. */
export function PublishingBanner({
  until,
  busy,
  error,
  onUndo,
  verb = "Publishing",
  done = "Approved. On its way to Google.",
}: {
  until: number;
  busy: boolean;
  error: string;
  onUndo: () => void;
  verb?: string;
  done?: string;
}) {
  const left = useSecondsLeft(until);
  return (
    <div
      className="rounded-card border border-line bg-surface-1 p-4 shadow-rest sm:p-5"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-bold">
          {left > 0 ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="size-5 text-ok" aria-hidden="true" />
          )}
          {left > 0 ? `${verb} in ${left} ${left === 1 ? "second" : "seconds"}` : done}
        </p>
        {left > 0 ? (
          <Button
            variant="secondary"
            size="md"
            disabled={busy}
            onClick={onUndo}
            icon={<Undo2 className="size-4" aria-hidden />}
          >
            {busy ? "Undoing..." : "Undo"}
          </Button>
        ) : null}
      </div>
      {left > 0 ? (
        <p className="mt-2 text-small text-text-2">
          Tap Undo now to stop it. After that Google has it.
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-small text-bad" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function useSecondsLeft(until: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  return Math.max(0, Math.ceil((until - now) / 1000));
}

const TONE: Record<StatusTone, Tone> = { green: "ok", amber: "warn", red: "bad", grey: "info" };

/** The top of every review card: who, when, the stars and the words, in Design 3's card. */
export function ReviewCardTop({ review }: { review: InboxReview }) {
  const name = review.reviewer_name ?? "A customer";
  const date = review.review_created_at
    ? fmtDate(
        review.review_created_at,
        new Date(review.review_created_at).getFullYear() !== new Date().getFullYear(),
      )
    : "";
  return (
    <>
      <header className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-text-2">
          <MessageSquareText className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-title font-bold">Reply to {name}</h3>
          {date ? <p className="text-small text-text-3">{date}</p> : null}
        </div>
      </header>
      <blockquote className="mt-4 border-s-2 border-line-strong ps-3">
        <p className="flex flex-wrap items-center gap-2 text-small font-bold text-text-2">
          <span className="inline-flex gap-0.5" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={cn(
                  "size-3.5",
                  n <= review.star_rating ? "fill-current text-text-1" : "text-line-strong",
                )}
              />
            ))}
          </span>
          {review.star_rating}-star review from {name}
        </p>
        <p dir="auto" className="mt-1 whitespace-pre-wrap text-body text-text-1">
          {review.comment || <span className="text-text-2">No written review, just a rating.</span>}
        </p>
      </blockquote>
    </>
  );
}

function CardFoot({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 border-t border-line pt-4">{children}</div>;
}

export function ReviewCard({
  review,
  task,
  primary = false,
  onActed,
}: {
  review: InboxReview;
  /** The latest publication of this review's reply, when there is one (its state shows on the card). */
  task?: TaskItem | undefined;
  /** The one yellow button on the screen. */
  primary?: boolean;
  /** Told when the owner approved, skipped or undid, so the list keeps this card in view. */
  onActed?: () => void;
}) {
  const queryClient = useQueryClient();
  const access = useQuery({
    queryKey: ["access", review.location_id],
    queryFn: () => myAccess(review.location_id),
    staleTime: 60_000,
  });
  const safeDraft = review.draft?.safety_ok ? review.draft.body : "";
  const [text, setText] = useState(safeDraft);
  const replyRef = useAutosize(text);
  const [instruction, setInstruction] = useState("");
  const [other, setOther] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState<Busy>("");
  // K-13: a high-risk review has no draft. The reply box opens empty only when the owner chooses to write.
  const [writeOwn, setWriteOwn] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState("");
  const [sent, setSent] = useState<{ publication: string; until: number } | null>(null);
  const [offers, setOffers] = useState<StyleOffer[]>([]);
  // A draft that failed a check is shown with its problems, never as ready (K-14 step 6).
  const flagged =
    review.draft && !review.draft.safety_ok && review.draft.body ? review.draft : null;
  const refresh = () =>
    Promise.all(
      [
        ["reviews"],
        ["waiting-count"],
        ["tasks"],
        ["feed"],
        ["home-facts"],
        ["review-tasks"],
        ["done-lately"],
      ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
  const waiting = review.state === "new";
  const sensitive = review.risk !== "low";
  const highNoDraft = review.risk === "high" && !review.draft && !writeOwn;
  const issues = issueLines(review.risk_reasons);
  // K-16: the owner always; a manager only for what the owner turned on, and never a high-risk review.
  const mayApprove =
    !!access.data?.approve.review_reply &&
    (review.risk !== "high" || access.data.approve_high_risk);
  const showBox = editing || writeOwn || !safeDraft;
  const main = primary ? { "data-main-cta": true } : {};

  async function run(kind: Exclude<Busy, "" | "undo">, ins?: string) {
    setError("");
    setNote("");
    setBusy(kind);
    try {
      if (kind === "post") {
        const posted = await postReply(review.id, text.trim());
        track("reply_published", { channel: "dashboard" });
        setOffers(posted.offers ?? []);
        onActed?.();
        if (posted.state === "manual_queued") {
          setDone(`${CONCIERGE_COPY.posted} ${CONCIERGE_COPY.waiting}`);
        } else if (posted.publication) {
          // The server sets publish_after 10 seconds out; the screen counts down to it (K-70).
          const at = posted.publish_after ? Date.parse(posted.publish_after) : Date.now() + 10_000;
          setSent({ publication: posted.publication, until: at });
        } else {
          setDone("Approved. Kabsi sends it to Google within a few minutes.");
        }
        await refresh();
      } else if (kind === "skip") {
        await skipReview(review.id);
        track("reply_skipped", { channel: "dashboard" });
        onActed?.();
        setOther(false);
        setDone("Skipped. You can still reply on Google any time.");
        await refresh();
      } else if (kind === "mine") {
        await handleOffline(review.id);
        track("reply_skipped", { channel: "dashboard_handled" });
        onActed?.();
        setOther(false);
        setDone("Marked as replied by you.");
        await refresh();
      } else if (kind === "holding") {
        const result = await holdingReply(review.id);
        track("draft_generated", { channel: "dashboard_holding" });
        if (result.draft) {
          setText(result.draft);
          setWriteOwn(true);
          setNote("Holding reply ready. Read it, change it if you like, then approve.");
        } else
          setNote(
            "Kabsi couldn't make a safe holding reply. Write your own, or leave this one for now.",
          );
      } else {
        const result = await redraftReply(review.id, ins ?? instruction);
        track("draft_generated", { channel: "dashboard" });
        if (result.draft) {
          setText(result.draft);
          setInstruction("");
          setOther(false);
          setEditing(false);
          setNote("New version ready. Read it, then approve.");
        } else
          setNote(
            result.issues?.length
              ? `Kabsi couldn't make a safe version with that change (${result.issues[0]}). Edit the text yourself instead.`
              : "Kabsi couldn't make a safe version with that change. Edit the text yourself instead.",
          );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Nothing was posted.");
    }
    setBusy("");
  }

  async function undo() {
    if (!sent) return;
    setError("");
    setBusy("undo");
    try {
      await undoReply(review.id, sent.publication);
      track("reply_undone", { channel: "dashboard" });
      setSent(null);
      setNote("Undone. Nothing was sent to Google. The reply is back here.");
      await refresh();
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      setError(
        m.includes("already on its way")
          ? "Too late to undo: the reply is already on its way to Google."
          : "Couldn't undo. Check your connection and try again.",
      );
    }
    setBusy("");
  }

  const status = reviewStatus(review);
  const pill = highNoDraft ? (
    <StatusPill tone="warn">A person should answer</StatusPill>
  ) : status.key === "draft_ready" ? (
    <StatusPill tone="info">Waiting for your yes</StatusPill>
  ) : (
    <StatusPill tone={TONE[status.tone]}>{status.label}</StatusPill>
  );

  if (sent)
    return (
      <article
        aria-label={`Reply to ${review.reviewer_name ?? "a customer"}`}
        className="rounded-card border border-line bg-surface-1 p-4 shadow-rest sm:p-5"
      >
        <ReviewCardTop review={review} />
        <ApprovedWindow
          until={sent.until}
          text={text.trim()}
          busy={busy === "undo"}
          error={error}
          onUndo={() => void undo()}
        />
        {offers.map((o) => (
          <OfferCard key={o.id} offer={o} />
        ))}
      </article>
    );

  if (done)
    return (
      <article
        aria-label={`Reply to ${review.reviewer_name ?? "a customer"}`}
        className="rounded-card border border-line bg-surface-1 p-4 shadow-rest sm:p-5"
      >
        <ReviewCardTop review={review} />
        <CardFoot>
          <p className="flex items-center gap-2 text-body" role="status">
            <CheckCircle2 className="size-5 shrink-0 text-ok" aria-hidden="true" />
            {done}
          </p>
        </CardFoot>
        {offers.map((o) => (
          <OfferCard key={o.id} offer={o} />
        ))}
      </article>
    );

  return (
    <article
      aria-label={`Reply to ${review.reviewer_name ?? "a customer"}`}
      className={cn(
        "rounded-card border bg-surface-1 p-4 shadow-rest sm:p-5",
        review.risk === "high" ? "border-warn/40" : "border-line",
      )}
    >
      <ReviewCardTop review={review} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {pill}
        {review.risk === "medium" ? <StatusPill tone="warn">Needs care</StatusPill> : null}
        {review.is_backlog ? <Badge>Older review</Badge> : null}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4">
        <ReviewGraphic review={review} />
        <ReportReview review={review} />
      </div>
      {task && task.owner === "failed" ? (
        <div className="mt-4">
          <TaskTrack state="failed" />
          <TaskOutcome task={task} className="mt-3" />
        </div>
      ) : null}
      {review.risk === "medium" && issues.length ? (
        <div className="mt-4 rounded-inner bg-warn-soft p-4 text-small text-text-1">
          {issues.map((i) => (
            <p key={i}>{i}</p>
          ))}
        </div>
      ) : null}
      {review.reply_state === "rejected" && review.reply_state_reason ? (
        <p className="mt-4 rounded-inner bg-surface-2 p-4 text-small" role="status">
          {review.reply_state_reason}
        </p>
      ) : null}
      {access.data && !mayApprove ? (
        <p className="mt-4 rounded-inner bg-surface-2 p-4 text-small text-text-2" role="status">
          {review.risk === "high"
            ? "The owner looks after reviews like this one."
            : "The owner approves replies. They can see this one."}
        </p>
      ) : waiting ? (
        <p className="mt-4 flex items-center gap-2 rounded-inner bg-surface-2 p-4 text-small text-text-2">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Kabsi is drafting a reply. This takes a minute or two.
        </p>
      ) : highNoDraft ? (
        <>
          <div className="mt-4 rounded-inner bg-warn-soft p-4">
            <p className="text-body font-bold text-text-1">Kabsi did not write a reply.</p>
            {issues.map((i) => (
              <p key={i} className="mt-1 text-small text-text-1">
                {i}
              </p>
            ))}
            <p className="mt-1 text-small text-text-2">
              A reply here should come from you, in your own words. Nothing has been posted.
            </p>
          </div>
          <details className="mt-3 rounded-inner border border-line p-3 text-small">
            <summary className="flex min-h-11 cursor-pointer items-center font-bold">
              What to check first
            </summary>
            <ol className="mt-1 list-decimal space-y-1 ps-5 text-text-2">
              {HIGH_RISK_CHECKLIST.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ol>
          </details>
          {error ? (
            <p className="mt-3 text-small text-bad" role="alert">
              {error}
            </p>
          ) : null}
          {note ? (
            <p className="mt-3 text-small text-text-2" role="status">
              {note}
            </p>
          ) : null}
          <CardFoot>
            <div className="flex flex-wrap gap-2">
              <Button
                size="md"
                variant={primary ? "primary" : "secondary"}
                disabled={!!busy}
                onClick={() => setWriteOwn(true)}
                icon={<Pencil className="size-4" aria-hidden />}
                {...main}
              >
                Write my reply
              </Button>
              <Button
                size="md"
                variant="secondary"
                disabled={!!busy}
                loading={busy === "holding"}
                onClick={() => void run("holding")}
              >
                Ask for a neutral holding reply
              </Button>
              {WHATSAPP_ON ? (
                <a
                  href={whatsappHref("general")}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClass("whatsapp", "md")}
                >
                  <LifeBuoy className="size-4" aria-hidden />
                  Talk to Rashid
                </a>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                variant="quiet"
                size="md"
                disabled={!!busy}
                onClick={() => void run("mine")}
                icon={<Hand className="size-4" aria-hidden />}
              >
                {busy === "mine" ? "Saving..." : "I'll reply myself"}
              </Button>
              <Button
                variant="quiet"
                size="md"
                disabled={!!busy}
                onClick={() => void run("skip")}
                icon={<SkipForward className="size-4" aria-hidden />}
              >
                {busy === "skip" ? "Skipping..." : "Skip"}
              </Button>
            </div>
          </CardFoot>
        </>
      ) : (
        <>
          <div className="mt-4 flex items-end justify-between gap-3">
            <Label htmlFor={`reply-${review.id}`} className="text-small font-bold text-text-2">
              {safeDraft ? "Reply ready" : "Write your reply"}
            </Label>
            <span
              className={cn("text-label", text.length > MAX ? "text-bad" : "text-text-2")}
              aria-live="polite"
            >
              {text.length > MAX * 0.75 ? `${text.length} / ${MAX}` : ""}
            </span>
          </div>
          {!safeDraft ? (
            <p className="mt-1 text-small text-text-2">
              {review.risk === "high"
                ? "Write a short, calm reply in your own words. Nothing is posted until you approve it."
                : "Kabsi couldn't safely draft this one. Write your own reply, ask for a new version, or skip it."}
            </p>
          ) : null}
          {flagged ? (
            <div className="mt-3 rounded-inner bg-warn-soft p-4 text-small">
              <p className="font-bold text-warn">
                Not ready: Kabsi couldn't safely verify this draft
              </p>
              <ul className="mt-1 list-disc space-y-1 ps-5 text-text-1">
                {(flagged.safety_notes ?? []).slice(0, 4).map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <p
                dir="auto"
                className="mt-3 whitespace-pre-wrap rounded-inner bg-surface-1 p-3 leading-6"
              >
                {flagged.body}
              </p>
              <Button
                variant="secondary"
                size="md"
                className="mt-3"
                onClick={() => {
                  setText(flagged.body);
                  setEditing(true);
                }}
              >
                Fix it myself
              </Button>
            </div>
          ) : null}
          {showBox ? (
            <Textarea
              dir="auto"
              id={`reply-${review.id}`}
              value={text}
              ref={replyRef}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder={safeDraft ? undefined : "Write a short, calm reply in your own words."}
              className="mt-2 resize-none rounded-input border-stroke bg-surface-2 p-3 text-body md:text-body"
            />
          ) : (
            <p
              dir="auto"
              id={`reply-${review.id}`}
              className="mt-2 whitespace-pre-wrap rounded-inner bg-surface-2 p-3 text-body text-text-1"
            >
              {text}
            </p>
          )}
          {error ? (
            <p className="mt-3 text-small text-bad" role="alert">
              {error}
            </p>
          ) : null}
          {note ? (
            <p className="mt-3 text-small text-text-2" role="status">
              {note}
            </p>
          ) : null}
          <CardFoot>
            <div className="flex flex-wrap gap-2">
              <Button
                size="md"
                variant={primary ? "primary" : "secondary"}
                disabled={!!busy || !text.trim() || text.trim().length > MAX}
                loading={busy === "post"}
                onClick={() => (sensitive ? setConfirm(true) : void run("post"))}
                icon={<Check className="size-4" aria-hidden />}
                {...main}
              >
                {busy === "post" ? "Approving..." : "Approve reply"}
              </Button>
              <Button
                variant="secondary"
                size="md"
                disabled={!!busy}
                onClick={() => setEditing((v) => !v)}
                aria-pressed={showBox}
                icon={<Pencil className="size-4" aria-hidden />}
              >
                {showBox && safeDraft ? "Done editing" : "Edit"}
              </Button>
              <Button
                variant="quiet"
                size="md"
                disabled={!!busy}
                onClick={() => void run("skip")}
                icon={<SkipForward className="size-4" aria-hidden />}
              >
                {busy === "skip" ? "Skipping..." : "Skip"}
              </Button>
              <Button
                variant="tertiary"
                disabled={!!busy}
                onClick={() => setOther(true)}
                icon={<MoreHorizontal className="size-4" aria-hidden />}
              >
                Other options
              </Button>
            </div>
            <p className="mt-3 text-small text-text-2">
              Nothing is published until you approve it.
            </p>
          </CardFoot>
        </>
      )}
      <Sheet open={other} onOpenChange={setOther}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-panel">
          <SheetHeader className="text-start">
            <SheetTitle>Other options</SheetTitle>
            <SheetDescription>Change the reply, reply yourself, or leave it.</SheetDescription>
          </SheetHeader>
          <p className="mt-4 text-small font-bold">Change the reply</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_CHANGES.map((q) => (
              <button
                key={q}
                type="button"
                disabled={!!busy}
                onClick={() => void run("redraft", q)}
                className="min-h-11 rounded-full border border-line-strong px-4 text-small font-semibold hover:border-text-1 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
            <button
              type="button"
              disabled={!!busy}
              onClick={() => void run("redraft", "Write a fresh version")}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line-strong px-4 text-small font-semibold hover:border-text-1 disabled:opacity-50"
            >
              <Wand2 className="size-4" aria-hidden="true" /> Regenerate
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Label htmlFor={`ins-${review.id}`} className="sr-only">
              Your own instruction
            </Label>
            <Input
              id={`ins-${review.id}`}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              maxLength={500}
              placeholder="Or type it: e.g. reply in Spanish, mention we'll call them"
            />
            <Button
              variant="secondary"
              size="md"
              disabled={!!busy || !instruction.trim()}
              onClick={() => void run("redraft")}
            >
              {busy === "redraft" ? "Writing..." : "New version"}
            </Button>
          </div>
          {error ? (
            <p className="mt-3 text-small text-bad" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-5 divide-y divide-line border-t border-line">
            <button
              type="button"
              disabled={!!busy}
              onClick={() => void run("mine")}
              className="flex min-h-14 w-full items-center gap-3 py-3 text-start font-medium disabled:opacity-50"
            >
              <Hand className="size-5 text-text-2" aria-hidden="true" />
              {busy === "mine" ? "Saving..." : "I'll reply myself"}
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => void run("skip")}
              className="flex min-h-14 w-full items-center gap-3 py-3 text-start font-medium disabled:opacity-50"
            >
              <SkipForward className="size-5 text-text-2" aria-hidden="true" />
              {busy === "skip" ? "Skipping..." : "Skip this one"}
            </button>
          </div>
        </SheetContent>
      </Sheet>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Post this reply on Google?</AlertDialogTitle>
            <AlertDialogDescription>
              It appears publicly under your business name, exactly as written.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p
            dir="auto"
            className="max-h-60 overflow-auto whitespace-pre-wrap rounded-inner bg-surface-2 p-4 text-small leading-6"
          >
            {text.trim()}
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => void run("post")}>Approve reply</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}

/** Approved, with the 10 second Undo (K-70), then sent to Google (30.15 section 3.1). */
function ApprovedWindow({
  until,
  text,
  busy,
  error,
  onUndo,
}: {
  until: number;
  text: string;
  busy: boolean;
  error: string;
  onUndo: () => void;
}) {
  const left = useSecondsLeft(until);
  const state = left > 0 ? "approved" : "sent";
  return (
    <>
      <div className="mt-3">
        <TaskPill state={state} />
      </div>
      {text ? (
        <p
          dir="auto"
          className="mt-4 whitespace-pre-wrap rounded-inner bg-surface-2 p-3 text-body text-text-1"
        >
          {text}
        </p>
      ) : null}
      <TaskTrack state={state} className="mt-5" />
      <CardFoot>
        {left > 0 ? (
          <div className="flex flex-wrap items-center gap-3" role="status" aria-live="polite">
            <p className="min-w-0 flex-1 text-body text-text-1">{approvedLine(left)}</p>
            <Button
              variant="secondary"
              size="md"
              disabled={busy}
              onClick={onUndo}
              icon={<Undo2 className="size-4" aria-hidden />}
            >
              {busy ? "Undoing..." : "Undo"}
            </Button>
          </div>
        ) : (
          <p className="text-small text-text-2" role="status" aria-live="polite">
            {SENT_LINE}
          </p>
        )}
        {error ? (
          <p className="mt-2 text-small text-bad" role="alert">
            {error}
          </p>
        ) : null}
      </CardFoot>
    </>
  );
}

// "Save this as a rule?" or "Save this as a fact?" (K-120.2). Kabsi never learns silently: only Save keeps it, as a
// verified fact in About your business.
function OfferCard({ offer }: { offer: StyleOffer }) {
  const [state, setState] = useState<"open" | "busy" | "saved" | "declined" | "error">("open");
  const isFact = offer.kind === "fact";
  async function answer(save: boolean) {
    setState("busy");
    try {
      await answerStyleOffer(offer.id, save);
      setState(save ? "saved" : "declined");
    } catch {
      setState("error");
    }
  }
  if (state === "saved" || state === "declined")
    return (
      <p className="mt-3 text-small text-text-2" role="status">
        {state === "saved"
          ? "Saved in About your business. New drafts follow it."
          : "OK, Kabsi won't ask about this again."}
      </p>
    );
  return (
    <div className="mt-4 rounded-inner border border-line p-4">
      <p className="font-bold">{isFact ? "Save this as a fact?" : "Save this as a rule?"}</p>
      <p className="mt-1 text-text-2">
        {isFact
          ? "You added this to the reply. Kabsi can use it in later drafts."
          : "You made this change to three drafts."}
      </p>
      <p dir="auto" className="mt-2 rounded-inner bg-surface-2 p-3">
        {offer.text}
      </p>
      {state === "error" ? (
        <p className="mt-2 text-bad" role="alert">
          Couldn't save it. Add it in About your business instead.
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="md"
          disabled={state === "busy"}
          onClick={() => void answer(true)}
        >
          {isFact ? "Save as a fact" : "Save as a rule"}
        </Button>
        <Button variant="tertiary" disabled={state === "busy"} onClick={() => void answer(false)}>
          No thanks
        </Button>
      </div>
    </div>
  );
}
