import { useEffect, useState } from "react";
import { CONCIERGE_COPY } from "@/lib/concierge-copy";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Hand,
  Loader2,
  Pencil,
  SkipForward,
  Sparkles,
  Undo2,
  Wand2,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { ReviewHead } from "@/components/reviews/review-head";

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
import { HIGH_RISK_CHECKLIST, HIGH_RISK_TITLE, issueLines } from "@/lib/review-risk";
import { track } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

// The one review card (K-15): the review, what Kabsi prepared, Approve as the large button, Edit and Other options behind
// it. After Approve the reply waits 10 seconds with Undo (K-70) before it goes to Google. Only a role that may approve
// sees the buttons (K-16); the database refuses everyone else anyway.

const MAX = 4000;
const QUICK_CHANGES = ["Shorter", "More formal", "Warmer", "Say sorry more clearly"];
const SECONDARY =
  "h-auto min-h-14 flex-col gap-1 whitespace-normal rounded-card px-1 py-2 text-center text-[13px] leading-tight sm:h-[52px] sm:min-h-0 sm:flex-row sm:gap-2 sm:rounded-pill sm:px-5 sm:py-0 sm:text-body";

type Busy = "" | "post" | "skip" | "redraft" | "mine" | "holding" | "undo";

/** "Publishing in 10 seconds" with Undo (K-70). When the time is up it says the reply is on its way. A removal
 * (P0.7-05) passes its own words. */
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
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.ceil((until - now) / 1000));
  return (
    <div className="rounded-panel bg-surface-1 p-5 shadow-rest" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-bold">
          {left > 0 ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="size-5 text-ok" aria-hidden="true" />
          )}
          {left > 0 ? `${verb} in ${left} ${left === 1 ? "second" : "seconds"}` : done}
        </p>
        {left > 0 ? (
          <Button variant="secondary" size="compact" disabled={busy} onClick={onUndo}>
            <Undo2 /> {busy ? "Undoing..." : "Undo"}
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

export function ReviewCard({ review }: { review: InboxReview }) {
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
      [["reviews"], ["waiting-count"], ["tasks"], ["feed"], ["home-facts"]].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
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

  async function run(kind: Exclude<Busy, "" | "undo">, ins?: string) {
    setError("");
    setNote("");
    setBusy(kind);
    try {
      if (kind === "post") {
        const posted = await postReply(review.id, text.trim());
        track("reply_published", { channel: "dashboard" });
        setOffers(posted.offers ?? []);
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
        setOther(false);
        setDone("Skipped. You can still reply on Google any time.");
        await refresh();
      } else if (kind === "mine") {
        await handleOffline(review.id);
        track("reply_skipped", { channel: "dashboard_handled" });
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

  if (sent)
    return (
      <>
        <PublishingBanner
          until={sent.until}
          busy={busy === "undo"}
          error={error}
          onUndo={() => void undo()}
        />
        {offers.map((o) => (
          <OfferCard key={o.id} offer={o} />
        ))}
      </>
    );

  if (done)
    return (
      <div className="rounded-panel bg-surface-1 p-5 text-small shadow-rest">
        <div className="flex items-center gap-3" role="status">
          <CheckCircle2 className="size-5 text-ok" aria-hidden="true" />
          <span>
            <b>{review.reviewer_name ?? "A customer"}:</b> {done}
          </span>
        </div>
        {offers.map((o) => (
          <OfferCard key={o.id} offer={o} />
        ))}
      </div>
    );

  return (
    <article
      className={cn(
        "rounded-panel bg-surface-1 p-5 shadow-rest sm:p-7",
        review.risk === "high" && "ring-2 ring-bad/40",
      )}
    >
      <ReviewHead review={review} />
      <div className="mt-3 flex flex-wrap gap-x-6">
        <ReviewGraphic review={review} />
        <ReportReview review={review} />
      </div>
      {review.risk === "high" ? (
        <div className="mt-4 rounded-card bg-surface-2 p-4 text-small leading-6">
          <p className="flex gap-2 font-bold">
            <Hand className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {HIGH_RISK_TITLE}
          </p>
          {issues.map((i) => (
            <p key={i} className="mt-1">
              {i}
            </p>
          ))}
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            {HIGH_RISK_CHECKLIST.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
        </div>
      ) : review.risk === "medium" && issues.length ? (
        <div className="mt-4 rounded-card border border-warn/30 bg-warn-soft p-4 text-small leading-6">
          {issues.map((i) => (
            <p key={i}>{i}</p>
          ))}
        </div>
      ) : null}
      {review.reply_state === "rejected" && review.reply_state_reason ? (
        <p className="mt-4 rounded-card bg-surface-2 p-4 text-small leading-6" role="status">
          {review.reply_state_reason}
        </p>
      ) : null}
      {access.data && !mayApprove ? (
        <p
          className="mt-5 rounded-card bg-surface-2 p-4 text-small leading-6 text-text-2"
          role="status"
        >
          {review.risk === "high"
            ? "The owner looks after reviews like this one."
            : "The owner approves replies. They can see this one."}
        </p>
      ) : waiting ? (
        <p className="mt-5 flex items-center gap-2 rounded-card bg-surface-2 p-4 text-small text-text-2">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Kabsi is drafting a reply. This takes a minute or two.
        </p>
      ) : highNoDraft ? (
        <>
          <p className="mt-5 text-small text-text-2">
            Kabsi did not draft a reply. Nothing is posted unless you write or approve one.
          </p>
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
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={!!busy}
              onClick={() => void run("holding")}
            >
              {busy === "holding" ? "Writing..." : "Ask for a neutral holding reply"}
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              disabled={!!busy}
              onClick={() => setWriteOwn(true)}
            >
              Write my own reply
            </Button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1 sm:flex sm:gap-2">
            <Button
              variant="ghost"
              className={SECONDARY}
              disabled={!!busy}
              onClick={() => void run("mine")}
            >
              <Hand /> {busy === "mine" ? "Saving..." : "I'll reply myself"}
            </Button>
            <Button
              variant="ghost"
              className={SECONDARY}
              disabled={!!busy}
              onClick={() => void run("skip")}
            >
              <SkipForward /> {busy === "skip" ? "Skipping..." : "Skip"}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-6 flex items-end justify-between gap-3">
            <Label htmlFor={`reply-${review.id}`} className="flex items-center gap-2 font-bold">
              <Sparkles className="size-4" aria-hidden="true" />
              {safeDraft ? "Your reply, ready to approve" : "Write your reply"}
            </Label>
            <span
              className={cn("text-label", text.length > MAX ? "text-bad" : "text-text-2")}
              aria-live="polite"
            >
              {text.length > MAX * 0.75 ? `${text.length} / ${MAX}` : ""}
            </span>
          </div>
          <p className="mt-1 text-small text-text-2">
            {safeDraft
              ? "Kabsi publishes exactly this text after you approve."
              : review.risk === "high"
                ? "Write a short, calm reply in your own words. Nothing is posted until you approve it."
                : "Kabsi couldn't safely draft this one. Write your own reply, ask for a new version, or skip it."}
          </p>
          {flagged ? (
            <div className="mt-3 rounded-card border border-warn/30 bg-warn-soft p-4 text-small">
              <p className="font-bold text-warn">
                Not ready: Kabsi couldn't safely verify this draft
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-text-1">
                {(flagged.safety_notes ?? []).slice(0, 4).map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <p
                dir="auto"
                className="mt-3 whitespace-pre-wrap rounded-card bg-surface-1 p-3 leading-6"
              >
                {flagged.body}
              </p>
              <Button
                variant="secondary"
                size="compact"
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
              className="mt-3 resize-none rounded-card border-l-4 border-l-kb-yellow bg-surface-2 text-body leading-7 md:text-body"
            />
          ) : (
            <p
              dir="auto"
              id={`reply-${review.id}`}
              className="mt-3 whitespace-pre-wrap rounded-card border-l-4 border-l-kb-yellow bg-surface-2 p-4 text-body leading-7"
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
          <div className="mt-5 space-y-2">
            <Button
              className="h-14 w-full text-title"
              disabled={!!busy || !text.trim() || text.trim().length > MAX}
              onClick={() => (sensitive ? setConfirm(true) : void run("post"))}
            >
              {busy === "post" ? "Approving..." : "Approve reply"}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                className="w-full"
                disabled={!!busy}
                onClick={() => setEditing((v) => !v)}
                aria-pressed={showBox}
              >
                <Pencil /> {showBox && safeDraft ? "Done editing" : "Edit"}
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                disabled={!!busy}
                onClick={() => setOther(true)}
              >
                <SlidersHorizontal /> Other options
              </Button>
            </div>
          </div>
        </>
      )}
      <Sheet open={other} onOpenChange={setOther}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-large">
          <SheetHeader className="text-left">
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
                className="min-h-11 rounded-pill border border-line px-4 text-small font-medium hover:border-text-1 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
            <button
              type="button"
              disabled={!!busy}
              onClick={() => void run("redraft", "Write a fresh version")}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-line px-4 text-small font-medium hover:border-text-1 disabled:opacity-50"
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
              variant="outline"
              size="compact"
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
              className="flex min-h-14 w-full items-center gap-3 py-3 text-left font-medium disabled:opacity-50"
            >
              <Hand className="size-5 text-text-2" aria-hidden="true" />
              {busy === "mine" ? "Saving..." : "I'll reply myself"}
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => void run("skip")}
              className="flex min-h-14 w-full items-center gap-3 py-3 text-left font-medium disabled:opacity-50"
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
            className="max-h-60 overflow-auto whitespace-pre-wrap rounded-card bg-surface-2 p-4 text-small leading-6"
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
    <div className="mt-4 rounded-card border border-line p-4">
      <p className="font-bold">{isFact ? "Save this as a fact?" : "Save this as a rule?"}</p>
      <p className="mt-1 text-text-2">
        {isFact
          ? "You added this to the reply. Kabsi can use it in later drafts."
          : "You made this change to three drafts."}
      </p>
      <p dir="auto" className="mt-2 rounded-card bg-surface-2 p-3">
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
          size="compact"
          disabled={state === "busy"}
          onClick={() => void answer(true)}
        >
          {isFact ? "Save as a fact" : "Save as a rule"}
        </Button>
        <Button
          variant="ghost"
          size="compact"
          disabled={state === "busy"}
          onClick={() => void answer(false)}
        >
          No thanks
        </Button>
      </div>
    </div>
  );
}
