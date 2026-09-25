import { useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { myLatestLocation } from "@/lib/onboarding";
import {
  addTestReview,
  amStaff,
  inboxReviews,
  postReply,
  redraftReply,
  skipReview,
  type InboxReview,
} from "@/lib/reviews";
import { track } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/inbox")({
  head: () => ({ meta: [{ title: "Inbox — Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: InboxPage,
});

const STATE_LABEL: Record<string, string> = {
  posted: "Posted",
  skipped: "Skipped",
  handled_offline: "Handled by you",
};

function InboxPage() {
  const [tab, setTab] = useState<"todo" | "done">("todo");
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const reviews = useQuery({
    queryKey: ["inbox", loc?.id, tab],
    queryFn: () => inboxReviews(loc!.id, tab),
    enabled: !!loc && loc.status === "active",
    refetchInterval: 60_000,
  });

  if (location.isLoading)
    return (
      <Shell>
        <p className="text-kb-stone">Loading…</p>
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
        <p className="leading-7 text-kb-stone">
          Kabsi starts drafting replies as soon as setup is finished.
        </p>
        <Button asChild className="mt-5">
          <Link to="/start">Continue setup</Link>
        </Button>
      </Shell>
    );
  }

  const list = reviews.data ?? [];
  return (
    <Shell sub={loc.name}>
      <div className="mb-6 flex gap-2" role="tablist">
        {(["todo", "done"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-pill px-4 py-2 text-sm font-medium",
              tab === t
                ? "bg-kb-black text-kb-white"
                : "bg-kb-white text-kb-stone hover:text-kb-black",
            )}
          >
            {t === "todo" ? "To reply" : "Done"}
          </button>
        ))}
      </div>
      {reviews.isLoading ? <p className="text-kb-stone">Loading reviews…</p> : null}
      {reviews.error ? (
        <p className="text-kb-red">Couldn't load reviews. Refresh the page.</p>
      ) : null}
      {!reviews.isLoading && !list.length ? (
        <div className="rounded-large bg-kb-white p-7 shadow-kb">
          <p className="font-bold">{tab === "todo" ? "All caught up." : "Nothing here yet."}</p>
          <p className="mt-1 text-sm leading-6 text-kb-stone">
            {tab === "todo"
              ? "When a new Google review arrives, you'll get an email with a reply ready. It also shows up here."
              : "Replies you post or skip will show here."}
          </p>
        </div>
      ) : null}
      <div className="space-y-5">
        {list.map((r) =>
          tab === "todo" ? (
            <ReviewCard key={r.id} review={r} />
          ) : (
            <DoneCard key={r.id} review={r} />
          ),
        )}
      </div>
      <StaffTestTool locationId={loc.id} />
    </Shell>
  );
}

function Shell({ sub, children }: { sub?: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <h1 className="font-display text-4xl leading-none sm:text-5xl">Inbox</h1>
      {sub ? <p className="mt-2 text-kb-stone">{sub}</p> : null}
      <div className="mt-7">{children}</div>
    </div>
  );
}

function ReviewHead({ review }: { review: InboxReview }) {
  const date = review.review_created_at
    ? new Date(review.review_created_at).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      })
    : "";
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-bold">{review.reviewer_name ?? "A customer"}</p>
        <span className="text-sm text-kb-stone">
          · Rating {review.star_rating} of 5{date ? ` · ${date}` : ""}
        </span>
        {review.urgency === "urgent" ? (
          <span className="rounded-pill bg-kb-red px-2.5 py-0.5 text-xs font-bold text-kb-white">
            Needs care
          </span>
        ) : null}
      </div>
      <p dir="auto" className="mt-2 whitespace-pre-wrap leading-7">
        {review.comment || <span className="text-kb-stone">No written review, just a rating.</span>}
      </p>
    </>
  );
}

function ReviewCard({ review }: { review: InboxReview }) {
  const queryClient = useQueryClient();
  const safeDraft = review.draft?.safety_ok ? review.draft.body : "";
  const [text, setText] = useState(safeDraft);
  const [instruction, setInstruction] = useState("");
  const [showRedraft, setShowRedraft] = useState(false);
  const [busy, setBusy] = useState<"" | "post" | "skip" | "redraft">("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["inbox"] });
  const waiting = review.state === "new";

  async function run(kind: "post" | "skip" | "redraft") {
    setError("");
    setNote("");
    setBusy(kind);
    try {
      if (kind === "post") {
        await postReply(review.id, text);
        track("reply_published", { channel: "dashboard" });
        await refresh();
      } else if (kind === "skip") {
        await skipReview(review.id);
        track("reply_skipped", { channel: "dashboard" });
        await refresh();
      } else {
        const result = await redraftReply(review.id, instruction);
        track("draft_generated", { channel: "dashboard" });
        if (result.draft) {
          setText(result.draft);
          setInstruction("");
          setShowRedraft(false);
        } else
          setNote(
            "Kabsi couldn't make a safe version with that change. Edit the text yourself instead.",
          );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Nothing was posted.");
    }
    setBusy("");
  }

  return (
    <article className="rounded-large bg-kb-white p-6 shadow-kb sm:p-7">
      <ReviewHead review={review} />
      {review.urgency === "urgent" ? (
        <p className="mt-4 rounded-card bg-kb-sand p-4 text-sm leading-6">
          Take a breath before replying. If you can reach the customer, call them first.
        </p>
      ) : null}
      {waiting ? (
        <p className="mt-5 text-sm text-kb-stone">
          Kabsi is drafting a reply. This takes a few minutes.
        </p>
      ) : (
        <>
          <Label htmlFor={`reply-${review.id}`} className="mt-5 block font-bold">
            Your reply
          </Label>
          <p className="mt-1 text-sm text-kb-stone">
            {safeDraft
              ? "Change anything you like. Kabsi posts exactly this text."
              : "Kabsi couldn't safely draft this one. Write your own reply, or skip it."}
          </p>
          <Textarea
            dir="auto"
            id={`reply-${review.id}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            className="mt-3 text-base leading-7"
          />
          {showRedraft ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Label htmlFor={`ins-${review.id}`} className="sr-only">
                What should change?
              </Label>
              <Input
                id={`ins-${review.id}`}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                maxLength={500}
                placeholder="e.g. shorter, more formal, mention our new terrace"
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
          ) : null}
          {error ? (
            <p className="mt-3 text-sm text-kb-red" role="alert">
              {error}
            </p>
          ) : null}
          {note ? <p className="mt-3 text-sm text-kb-stone">{note}</p> : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              disabled={!!busy || !text.trim() || text.trim().length > 4000}
              onClick={() => void run("post")}
            >
              {busy === "post" ? "Posting…" : "Post reply"}
            </Button>
            {!showRedraft ? (
              <Button variant="ghost" disabled={!!busy} onClick={() => setShowRedraft(true)}>
                Ask for changes
              </Button>
            ) : null}
            <Button variant="ghost" disabled={!!busy} onClick={() => void run("skip")}>
              {busy === "skip" ? "Skipping…" : "Skip"}
            </Button>
          </div>
        </>
      )}
    </article>
  );
}

function DoneCard({ review }: { review: InboxReview }) {
  return (
    <article className="rounded-large bg-kb-white p-6 shadow-kb sm:p-7">
      <ReviewHead review={review} />
      <p className="mt-4 text-sm font-bold">
        {STATE_LABEL[review.state] ?? review.state}
        {review.state === "posted" && review.reply_state === "in_review"
          ? " · Google is reviewing it"
          : ""}
      </p>
      {review.existing_reply ? (
        <p
          dir="auto"
          className="mt-2 whitespace-pre-wrap rounded-card bg-kb-sand p-4 text-sm leading-6"
        >
          {review.existing_reply}
        </p>
      ) : null}
    </article>
  );
}

// Staff only, and only for simulated locations (the RPC refuses anything else).
function StaffTestTool({ locationId }: { locationId: string }) {
  const staff = useQuery({ queryKey: ["am-staff"], queryFn: amStaff, staleTime: Infinity });
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
