import { useMemo, useState, type ReactNode } from "react";
import { CONCIERGE_COPY } from "@/lib/concierge-copy";
import { fmtDate } from "@/lib/format";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Hand,
  Languages,
  Loader2,
  MessageSquareReply as PageGlyph,
  RefreshCw,
  SkipForward,
  Sparkles,
  Star,
  Wand2,
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
import { myLatestLocation } from "@/lib/onboarding";
import {
  addTestReview,
  amStaff,
  handleOffline,
  inboxReviews,
  postReply,
  redraftReply,
  skipReview,
  type InboxReview,
} from "@/lib/reviews";
import { track } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { PageIcon } from "@/components/shared/page-icon";

export const Route = createFileRoute("/_authenticated/app/inbox")({
  head: () => ({ meta: [{ title: "To reply | Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: InboxPage,
});

const MAX = 4000;
const QUICK_CHANGES = ["Shorter", "More formal", "Warmer", "Say sorry more clearly"];
const LANG: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  ar: "Arabic",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  tr: "Turkish",
  nl: "Dutch",
  franco: "Franco-Arabic",
};

type Filter = "all" | "care" | "ready";

function InboxPage() {
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const reviews = useQuery({
    queryKey: ["inbox", loc?.id, "todo"],
    queryFn: () => inboxReviews(loc!.id, "todo"),
    enabled: !!loc && loc.status === "active",
    refetchInterval: 60_000,
  });
  const [filter, setFilter] = useState<Filter>("all");

  // Needs-care reviews first, then newest first.
  const sorted = useMemo(
    () =>
      [...(reviews.data ?? [])].sort(
        (a, b) =>
          Number(b.urgency === "urgent") - Number(a.urgency === "urgent") ||
          String(b.review_created_at ?? "").localeCompare(String(a.review_created_at ?? "")),
      ),
    [reviews.data],
  );
  const care = sorted.filter((r) => r.urgency === "urgent").length;
  const ready = sorted.filter((r) => r.state !== "new").length;
  const list =
    filter === "care"
      ? sorted.filter((r) => r.urgency === "urgent")
      : filter === "ready"
        ? sorted.filter((r) => r.state !== "new")
        : sorted;

  if (location.isLoading)
    return (
      <Shell>
        <Skeletons />
      </Shell>
    );
  if (location.error)
    return (
      <Shell>
        <ErrorBox onRetry={() => void location.refetch()} />
      </Shell>
    );
  if (!loc) {
    return (
      <Shell>
        <p className="leading-7 text-kb-stone">You haven't added a business yet.</p>
        <Button asChild className="mt-5">
          <Link to="/start">Add your business</Link>
        </Button>
      </Shell>
    );
  }
  if (loc.status !== "active") {
    return (
      <Shell sub={loc.name}>
        <div className="rounded-large bg-kb-white p-7 shadow-kb">
          <p className="font-bold">Replies start once setup is finished.</p>
          <p className="mt-1 leading-7 text-kb-stone">
            As soon as Kabsi can reach your Google profile, every new review shows up here with a
            reply ready.
          </p>
          <Button asChild className="mt-5">
            <Link to="/start">Continue setup</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell sub={loc.name}>
      {sorted.length ? (
        <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label="Show">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            All {sorted.length}
          </Chip>
          {care ? (
            <Chip active={filter === "care"} onClick={() => setFilter("care")} tone="red">
              Needs care {care}
            </Chip>
          ) : null}
          <Chip active={filter === "ready"} onClick={() => setFilter("ready")}>
            Draft ready {ready}
          </Chip>
          <button
            type="button"
            onClick={() => void reviews.refetch()}
            className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-pill px-3 text-sm font-bold text-kb-stone hover:text-kb-black"
          >
            <RefreshCw
              className={cn("size-4", reviews.isFetching && "animate-spin")}
              aria-hidden="true"
            />
            Refresh
          </button>
        </div>
      ) : null}
      {reviews.isLoading ? <Skeletons /> : null}
      {reviews.error ? <ErrorBox onRetry={() => void reviews.refetch()} /> : null}
      {!reviews.isLoading && !reviews.error && !sorted.length ? (
        <div className="rounded-large bg-kb-white p-8 text-center shadow-kb">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-kb-yellow">
            <CheckCircle2 className="size-7" aria-hidden="true" />
          </span>
          <p className="mt-4 font-display text-2xl">You're all caught up.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-kb-stone">
            When a new Google review arrives, you'll get an email with a reply ready, and it shows
            up here too.
          </p>
          <Button asChild variant="outline" size="compact" className="mt-5">
            <Link to="/app/reviews">See all reviews</Link>
          </Button>
        </div>
      ) : null}
      <div className="space-y-5">
        {list.map((r) => (
          // The key includes the draft version so a draft that arrives while the page is open fills the box.
          <ReviewCard key={`${r.id}:${r.draft?.version ?? 0}:${r.state}`} review={r} />
        ))}
      </div>
      <StaffTestTool locationId={loc.id} />
    </Shell>
  );
}

function Shell({ sub, children }: { sub?: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <PageIcon icon={<PageGlyph />} />
      <p className="text-sm font-bold uppercase tracking-wider text-kb-stone">Reviews</p>
      <h1 className="mt-1 font-display text-4xl leading-none sm:text-5xl">To reply</h1>
      {sub ? <p className="mt-2 text-kb-stone">{sub}</p> : null}
      <p className="mt-3 max-w-xl text-sm leading-6 text-kb-stone">
        Every reply is drafted in the reviewer's language from your facts. Nothing goes on Google
        until you approve it.
      </p>
      <div className="mt-7">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  tone,
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone?: "red";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "min-h-10 rounded-pill border px-4 text-sm font-bold transition-colors",
        active
          ? tone === "red"
            ? "border-kb-red bg-kb-red text-kb-white"
            : "border-kb-black bg-kb-black text-kb-white"
          : "border-kb-hairline bg-kb-white hover:border-kb-black",
      )}
    >
      {children}
    </button>
  );
}

function Skeletons() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading reviews">
      {[0, 1].map((i) => (
        <div key={i} className="animate-pulse rounded-large bg-kb-white p-7 shadow-kb">
          <div className="h-4 w-40 rounded-pill bg-kb-sand" />
          <div className="mt-4 h-3 w-full rounded-pill bg-kb-sand" />
          <div className="mt-2 h-3 w-2/3 rounded-pill bg-kb-sand" />
          <div className="mt-6 h-28 rounded-card bg-kb-sand" />
        </div>
      ))}
    </div>
  );
}

function ErrorBox({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-large bg-kb-white p-6 shadow-kb" role="alert">
      <p className="font-bold">Couldn't load your reviews.</p>
      <p className="mt-1 text-sm text-kb-stone">Check your connection and try again.</p>
      <Button variant="outline" size="compact" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function Stars({ n, className }: { n: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`${n} of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          aria-hidden="true"
          className={cn("size-4", s <= n ? "fill-kb-black text-kb-black" : "text-kb-stone/40")}
        />
      ))}
    </span>
  );
}

function ReviewHead({ review }: { review: InboxReview }) {
  const date = review.review_created_at
    ? fmtDate(
        review.review_created_at,
        new Date(review.review_created_at).getFullYear() !== new Date().getFullYear(),
      )
    : "";
  const lang =
    review.language && review.language !== "none" ? (LANG[review.language] ?? null) : null;
  const name = review.reviewer_name ?? "A customer";
  return (
    <>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-kb-carbon text-base font-bold text-kb-white"
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-bold">{name}</p>
            {review.urgency === "urgent" ? (
              <span className="inline-flex items-center gap-1 rounded-pill bg-kb-red px-2.5 py-0.5 text-xs font-bold text-kb-white">
                <AlertTriangle className="size-3.5" aria-hidden="true" /> Needs care
              </span>
            ) : null}
            {review.is_backlog ? (
              <span className="rounded-pill bg-kb-sand px-2.5 py-0.5 text-xs font-bold text-kb-stone">
                Older review
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-kb-stone">
            <Stars n={review.star_rating} />
            {date ? <span>{date}</span> : null}
            {lang ? (
              <span className="inline-flex items-center gap-1">
                <Languages className="size-3.5" aria-hidden="true" /> {lang}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <p dir="auto" className="mt-4 whitespace-pre-wrap text-[17px] leading-7">
        {review.comment || <span className="text-kb-stone">No written review, just a rating.</span>}
      </p>
    </>
  );
}

const SECONDARY =
  "h-auto min-h-14 flex-col gap-1 whitespace-normal rounded-card px-1 py-2 text-center text-[13px] leading-tight sm:h-[52px] sm:min-h-0 sm:flex-row sm:gap-2 sm:rounded-pill sm:px-5 sm:py-0 sm:text-base";

function ReviewCard({ review }: { review: InboxReview }) {
  const queryClient = useQueryClient();
  const safeDraft = review.draft?.safety_ok ? review.draft.body : "";
  const [text, setText] = useState(safeDraft);
  const replyRef = useAutosize(text);
  const [instruction, setInstruction] = useState("");
  const [showRedraft, setShowRedraft] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState<"" | "post" | "skip" | "redraft" | "mine">("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState("");
  const refresh = () =>
    Promise.all(
      [["inbox"], ["waiting-count"], ["dashboard"], ["activity"], ["all-reviews"]].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
  const waiting = review.state === "new";
  const sensitive = review.urgency === "urgent" || review.star_rating <= 2;

  async function run(kind: "post" | "skip" | "redraft" | "mine", ins?: string) {
    setError("");
    setNote("");
    setBusy(kind);
    try {
      if (kind === "post") {
        const posted = await postReply(review.id, text.trim());
        track("reply_published", { channel: "dashboard" });
        setDone(
          posted.state === "manual_queued"
            ? `${CONCIERGE_COPY.posted} ${CONCIERGE_COPY.waiting}`
            : "Approved. Kabsi sends it to Google within a few minutes.",
        );
        await refresh();
      } else if (kind === "skip") {
        await skipReview(review.id);
        track("reply_skipped", { channel: "dashboard" });
        setDone("Skipped. You can still reply on Google any time.");
        await refresh();
      } else if (kind === "mine") {
        await handleOffline(review.id);
        track("reply_skipped", { channel: "dashboard_handled" });
        setDone("Marked as handled by you.");
        await refresh();
      } else {
        const result = await redraftReply(review.id, ins ?? instruction);
        track("draft_generated", { channel: "dashboard" });
        if (result.draft) {
          setText(result.draft);
          setInstruction("");
          setShowRedraft(false);
          setNote("New version ready. Read it, then post.");
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

  if (done)
    return (
      <div
        className="flex items-center gap-3 rounded-large bg-kb-white p-5 text-sm shadow-kb"
        role="status"
      >
        <CheckCircle2 className="size-5 text-kb-green" aria-hidden="true" />
        <span>
          <b>{review.reviewer_name ?? "A customer"}:</b> {done}
        </span>
      </div>
    );

  return (
    <article
      className={cn(
        "rounded-large bg-kb-white p-5 shadow-kb sm:p-7",
        review.urgency === "urgent" && "ring-2 ring-kb-red/40",
      )}
    >
      <ReviewHead review={review} />
      {review.urgency === "urgent" ? (
        <p className="mt-4 flex gap-2 rounded-card bg-kb-sand p-4 text-sm leading-6">
          <Hand className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Take a breath before replying. If you can reach the customer, call them first. The draft
          stays calm and moves the talk to a private conversation.
        </p>
      ) : null}
      {review.reply_state === "rejected" && review.reply_state_reason ? (
        <p className="mt-4 rounded-card bg-kb-sand p-4 text-sm leading-6" role="status">
          {review.reply_state_reason}
        </p>
      ) : null}
      {waiting ? (
        <p className="mt-5 flex items-center gap-2 rounded-card bg-kb-sand p-4 text-sm text-kb-stone">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Kabsi is drafting a reply. This takes a minute or two.
        </p>
      ) : (
        <>
          <div className="mt-6 flex items-end justify-between gap-3">
            <Label htmlFor={`reply-${review.id}`} className="flex items-center gap-2 font-bold">
              <Sparkles className="size-4" aria-hidden="true" />
              {safeDraft ? "Your reply, ready to approve" : "Write your reply"}
            </Label>
            <span
              className={cn("text-xs", text.length > MAX ? "text-kb-red" : "text-kb-stone")}
              aria-live="polite"
            >
              {text.length > MAX * 0.75 ? `${text.length} / ${MAX}` : ""}
            </span>
          </div>
          <p className="mt-1 text-sm text-kb-stone">
            {safeDraft
              ? "Change anything you like. Kabsi publishes exactly this text after you approve."
              : "Kabsi couldn't safely draft this one. Write your own reply, ask for a new version, or skip it."}
          </p>
          <Textarea
            dir="auto"
            id={`reply-${review.id}`}
            value={text}
            ref={replyRef}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={safeDraft ? undefined : "Write a short, calm reply in your own words."}
            className="mt-3 resize-none rounded-card border-l-4 border-l-kb-yellow bg-kb-sand/60 text-base leading-7 md:text-base"
          />
          {showRedraft ? (
            <div className="mt-3 rounded-card border border-kb-hairline p-3">
              <p className="text-sm font-bold">What should change?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK_CHANGES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={!!busy}
                    onClick={() => void run("redraft", q)}
                    className="min-h-9 rounded-pill border border-kb-hairline px-3 text-sm hover:border-kb-black disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
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
                  {busy === "redraft" ? "Writing…" : "New version"}
                </Button>
              </div>
            </div>
          ) : null}
          {error ? (
            <p className="mt-3 text-sm text-kb-red" role="alert">
              {error}
            </p>
          ) : null}
          {note ? (
            <p className="mt-3 text-sm text-kb-stone" role="status">
              {note}
            </p>
          ) : null}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              className="w-full sm:w-auto"
              disabled={!!busy || !text.trim() || text.trim().length > MAX}
              onClick={() => (sensitive ? setConfirm(true) : void run("post"))}
            >
              {busy === "post" ? "Approving…" : "Approve reply"}
            </Button>
            {/* Secondary actions: one tidy row of three on phones, inline on larger screens. */}
            <div
              className={cn(
                "grid gap-1 sm:flex sm:gap-2",
                showRedraft ? "grid-cols-2" : "grid-cols-3",
              )}
            >
              {!showRedraft ? (
                <Button
                  variant="ghost"
                  className={SECONDARY}
                  disabled={!!busy}
                  onClick={() => setShowRedraft(true)}
                >
                  <Wand2 /> Ask for changes
                </Button>
              ) : null}
              <Button
                variant="ghost"
                className={SECONDARY}
                disabled={!!busy}
                onClick={() => void run("mine")}
              >
                <Hand /> {busy === "mine" ? "Saving…" : "I'll handle it"}
              </Button>
              <Button
                variant="ghost"
                className={SECONDARY}
                disabled={!!busy}
                onClick={() => void run("skip")}
              >
                <SkipForward /> {busy === "skip" ? "Skipping…" : "Skip"}
              </Button>
            </div>
          </div>
        </>
      )}
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
            className="max-h-60 overflow-auto whitespace-pre-wrap rounded-card bg-kb-sand p-4 text-sm leading-6"
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

// Staff only, and only for simulated locations (the RPC refuses anything else).
function StaffTestTool({ locationId }: { locationId: string }) {
  const staff = useQuery({ queryKey: ["am-staff"], queryFn: amStaff, staleTime: 5 * 60_000 });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewer, setReviewer] = useState("Test customer");
  const [msg, setMsg] = useState("");
  if (!staff.data) return null;
  async function add() {
    setMsg("");
    try {
      await addTestReview(locationId, rating, comment, reviewer);
      setComment("");
      setMsg("Added. It appears here after the next sync (within 5 minutes).");
    } catch (e) {
      setMsg(
        e instanceof Error && e.message.includes("not_a_mock_location")
          ? "Only works on test (simulated) locations."
          : "Couldn't add it.",
      );
    }
  }
  return (
    <details className="mt-10 rounded-large border border-dashed border-kb-hairline p-5">
      <summary className="cursor-pointer text-sm font-bold">Staff: add a test review</summary>
      <div className="mt-4 grid gap-3">
        <div className="flex gap-3">
          <Input
            aria-label="Reviewer name"
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
          />
          <select
            aria-label="Rating"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="rounded-card border border-kb-hairline bg-kb-white px-3"
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} of 5
              </option>
            ))}
          </select>
        </div>
        <Textarea
          dir="auto"
          aria-label="Review text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Review text, in any language"
        />
        <Button size="compact" variant="outline" onClick={() => void add()}>
          Add test review
        </Button>
        {msg ? <p className="text-sm text-kb-stone">{msg}</p> : null}
      </div>
    </details>
  );
}
