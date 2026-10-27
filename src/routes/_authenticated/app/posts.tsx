import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Newspaper, Pencil, SkipForward } from "lucide-react";
import { EarlyAccessNotice } from "@/components/app/early-access-notice";
import { AccountTop, Panel } from "@/components/kabsi/d3-account";
import { TaskBlock, UndoBar } from "@/components/kabsi/d3-content-task";
import {
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  Skeleton,
  StatusPill,
  Switch,
  WhatsAppLink,
  buttonClass,
} from "@/components/kabsi/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { myLatestLocation } from "@/lib/onboarding";
import { contentCall } from "@/lib/reviews";
import { WHATSAPP_ON } from "@/lib/site";
import { latestByTarget, recentTasks, type TaskItem } from "@/lib/task-feed";
import { track } from "@/lib/telemetry";
import { useAutosize } from "@/lib/use-autosize";
import { cn } from "@/lib/utils";
import {
  approveMonth,
  CTA_LABEL,
  loadPosts,
  loadSettings,
  monthName,
  monthOf,
  nextMonths,
  postPhotos,
  publishPost,
  removePost,
  savePost,
  setAutoPosts,
  setCadence,
  TYPE_LABEL,
  type Post,
  type PostType,
  cancelPost,
  undoPost,
} from "@/lib/posts";

// Posts (P0.5-02, K-24, K-80; Design 3's Posts tab): the monthly "anything new" question, the month's posts, each with
// Approve, Edit and Skip and the 10 second Undo, and each approved post with its task state (approved, sent to Google,
// on Google with the link, or did not go through). Kabsi prepares posts from what is true; the owner writes an Update,
// Offer or Event; nothing goes to Google without the approval (D202).
export const Route = createFileRoute("/_authenticated/app/posts")({
  head: () => ({ meta: [{ title: "Posts | Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: PostsPage,
});

type Tasks = { post: Map<string, TaskItem>; removal: Map<string, TaskItem> };

function PostsPage() {
  const queryClient = useQueryClient();
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const ready = !!loc && loc.status === "active" && !loc.concierge;
  const posts = useQuery({
    queryKey: ["posts", loc?.id],
    queryFn: () => loadPosts(loc!.id),
    enabled: !!loc,
  });
  const settings = useQuery({
    queryKey: ["post-settings", loc?.id],
    queryFn: () => loadSettings(loc!.id),
    enabled: !!loc,
  });
  const feed = useQuery({
    queryKey: ["post-tasks", loc?.id],
    queryFn: () =>
      recentTasks(loc!.id, { kinds: ["local_post", "local_post_removal"], days: 120, limit: 100 }),
    enabled: ready,
    retry: false,
  });
  const refresh = () =>
    Promise.all(
      [["posts"], ["post-tasks"], ["dashboard"], ["activity"], ["tasks"], ["post-settings"]].map(
        (queryKey) => queryClient.invalidateQueries({ queryKey }),
      ),
    );
  const months = nextMonths(2);
  const [month, setMonth] = useState(months[0] ?? "");
  const all = posts.data ?? [];
  const inMonth = all.filter((p) => monthOf(p) === month);
  const prepared = inMonth.filter((p) => p.state === "draft");
  const planned = inMonth.filter((p) => p.state !== "skipped");
  const cadence = settings.data?.posts_per_month ?? 4;
  const items = feed.data ?? [];
  const tasks: Tasks = {
    post: latestByTarget(items.filter((t) => t.kind === "local_post")),
    removal: latestByTarget(items.filter((t) => t.kind === "local_post_removal")),
  };

  return (
    <>
      <AccountTop
        title="Posts"
        lead="On Pro, Kabsi writes a post every week. On Essentials, 2 a month."
      />
      {!location.isLoading && !loc ? <ButtonLink to="/start">Add your business</ButtonLink> : null}
      {loc?.concierge ? <EarlyAccessNotice what="Posts" /> : null}
      {loc && !loc.concierge && loc.status !== "active" ? <NotYet /> : null}
      {ready && posts.isError ? (
        <ErrorState title="This page did not load." onRetry={() => void posts.refetch()}>
          Nothing you did, and nothing changed on Google. Try again in a minute.
        </ErrorState>
      ) : null}

      {ready && !posts.isError ? (
        <div className="space-y-4">
          <Panel title="Anything new this month?" id="monthly">
            <p className="text-body text-text-2">
              Any new services, prices, products or opening times? Kabsi turns your answer into
              posts and updates, and asks for your yes on each one.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {WHATSAPP_ON ? (
                <WhatsAppLink label="Answer on WhatsApp" size="md" />
              ) : (
                <a href="#write-post" className={buttonClass("secondary", "md")}>
                  Write a post
                </a>
              )}
            </div>
          </Panel>

          {posts.isLoading ? (
            <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading">
              {[0, 1].map((i) => (
                <div key={i} className="rounded-card border border-line bg-surface-1 p-5">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="mt-3 h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-4/5" />
                </div>
              ))}
            </div>
          ) : all.length === 0 ? (
            <EmptyState icon={Newspaper} title="No posts yet.">
              Tell Kabsi about a new service, an offer or an event on WhatsApp, and it writes the
              post.
            </EmptyState>
          ) : (
            <>
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Month">
                {months.map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={m === month}
                    onClick={() => setMonth(m)}
                    className={cn(
                      "min-h-11 rounded-full border px-4 text-small font-bold",
                      m === month
                        ? "border-text-1 bg-text-1 text-surface-0"
                        : "border-line-strong bg-surface-1 text-text-1",
                    )}
                  >
                    {monthName(m)}
                  </button>
                ))}
              </div>
              <MonthView
                locationId={loc.id}
                month={month}
                posts={inMonth}
                prepared={prepared}
                missing={Math.max(cadence - planned.length, 0)}
                tasks={tasks}
                onChanged={refresh}
              />
            </>
          )}

          <WritePost locationId={loc.id} onSaved={refresh} />
          <Settings locationId={loc.id} />
        </div>
      ) : null}
    </>
  );
}

function MonthView({
  locationId,
  month,
  posts,
  prepared,
  missing,
  tasks,
  onChanged,
}: {
  locationId: string;
  month: string;
  posts: Post[];
  prepared: Post[];
  missing: number;
  tasks: Tasks;
  onChanged: () => unknown;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function approveAll() {
    setBusy(true);
    setMsg("");
    try {
      const r = await approveMonth(locationId, month);
      track("post_approved", { channel: "dashboard" });
      setMsg(
        r.held.length
          ? `${r.approved.length} approved. ${r.held.length} need a change first; open them below.`
          : `${r.approved.length} approved. Each goes to Google on its day.`,
      );
      onChanged();
    } catch (x) {
      setMsg(x instanceof Error ? x.message : "Something went wrong.");
    }
    setBusy(false);
  }
  // What waits for a yes first, in date order; then what was sent, newest first.
  const at = (p: Post) => p.publish_at ?? p.created_at;
  const order = [
    ...posts.filter((p) => p.state === "draft").sort((a, b) => at(a).localeCompare(at(b))),
    ...posts.filter((p) => p.state !== "draft").sort((a, b) => at(b).localeCompare(at(a))),
  ];
  // One yellow button: "Approve the month" when several posts wait, else the first post's Approve.
  const many = prepared.length > 1;
  const firstDraft = order.find((p) => p.state === "draft")?.id;
  return (
    <section className="space-y-4" aria-label={`Posts for ${monthName(month)}`}>
      {many ? (
        <Panel
          title={`${prepared.length} posts for ${monthName(month)} are ready`}
          id="month-ready"
        >
          <p className="text-body text-text-2">
            Approve the month, or read and approve them one by one below.
          </p>
          <Button
            size="md"
            data-main-cta
            className="mt-4 w-full sm:w-auto"
            loading={busy}
            onClick={() => void approveAll()}
          >
            Approve the month
          </Button>
          {msg ? (
            <p className="mt-3 text-small text-text-1" role="status">
              {msg}
            </p>
          ) : null}
        </Panel>
      ) : !prepared.length && missing > 0 ? (
        <p className="text-small text-text-2">
          Kabsi writes posts only from what is true about your business. Answer the question above,
          or write a post below.
        </p>
      ) : null}
      {order.length ? (
        <ol className="space-y-4">
          {order.map((p) => (
            <li key={p.id}>
              {p.state === "draft" ? (
                <DraftCard post={p} primary={!many && p.id === firstDraft} onChanged={onChanged} />
              ) : (
                <SentCard post={p} tasks={tasks} onChanged={onChanged} />
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-body text-text-2">Nothing planned for {monthName(month)} yet.</p>
      )}
    </section>
  );
}

/** The card's top: the kind, the title and when (Design 3's KabsiCard header). */
function CardHead({ post }: { post: Post }) {
  const title =
    post.topic_type === "EVENT" && post.event_title
      ? post.event_title
      : `${TYPE_LABEL[post.topic_type]}${post.source === "auto" ? ", prepared by Kabsi" : ""}`;
  return (
    <header className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-text-2">
        <Newspaper className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-title font-bold text-text-1">{title}</h3>
        <p className="text-small text-text-2">
          {post.publish_at ? fmtDateTime(post.publish_at) : fmtDate(post.created_at)}
          {post.topic_type !== "STANDARD" && post.start_date
            ? `. Runs ${fmtDate(post.start_date)} to ${fmtDate(post.end_date)}`
            : ""}
          {post.offer_terms ? `. ${post.offer_terms}` : ""}
        </p>
      </div>
    </header>
  );
}

const cardCls = "rounded-card border border-line bg-surface-1 p-4 shadow-rest sm:p-5";

// The 10 seconds after an approval (K-70): the countdown with Undo, for a post or its removal.
type Pending = { publication: string; until: number };
function usePending(postId: string, onChanged: () => unknown) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const start = (r: { publication: string; publish_after: string | null }) =>
    setPending({
      publication: r.publication,
      until: r.publish_after ? Date.parse(r.publish_after) : Date.now(),
    });
  async function undo() {
    if (!pending) return;
    setBusy(true);
    setErr("");
    try {
      await undoPost(postId, pending.publication);
      setPending(null);
      onChanged();
    } catch (x) {
      setErr(
        x instanceof Error ? x.message : "Couldn't undo. Check your connection and try again.",
      );
    }
    setBusy(false);
  }
  return { pending, busy, err, start, undo };
}

function DraftCard({
  post,
  primary,
  onChanged,
}: {
  post: Post;
  primary: boolean;
  onChanged: () => unknown;
}) {
  const [body, setBody] = useState(post.body ?? "");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const ref = useAutosize(body);
  const wait = usePending(post.id, onChanged);
  async function run(kind: "publish" | "skip") {
    setBusy(kind);
    setErr("");
    try {
      if (kind === "publish") {
        wait.start(await publishPost(post.id, body));
        setEditing(false);
        track("post_approved", { channel: "dashboard" });
      } else {
        await contentCall({ do: "post_skip", post_id: post.id });
        onChanged();
      }
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Something went wrong.");
    }
    setBusy("");
  }
  if (wait.pending) {
    return (
      <UndoBar
        until={wait.pending.until}
        busy={wait.busy}
        error={wait.err}
        onUndo={() => void wait.undo()}
        later={`Approved. It goes to Google on ${fmtDateTime(wait.pending.until)}.`}
      />
    );
  }
  const yes = primary
    ? ({ variant: "primary", "data-main-cta": true } as const)
    : ({ variant: "secondary" } as const);
  return (
    <article className={cardCls} aria-label={post.event_title ?? TYPE_LABEL[post.topic_type]}>
      <CardHead post={post} />
      <div className="mt-3">
        <StatusPill tone="info">Waiting for your yes</StatusPill>
      </div>
      <div className="mt-4">
        <p className="text-small font-bold text-text-2">Post ready</p>
        {editing ? (
          <>
            <Label htmlFor={`post-${post.id}`} className="sr-only">
              Post text
            </Label>
            <Textarea
              id={`post-${post.id}`}
              ref={ref}
              dir="auto"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-2 min-h-28"
              maxLength={1500}
            />
            <p className="mt-1 text-small text-text-2">
              {body.length} of 1,500 characters
              {post.cta_type ? `. Button: ${CTA_LABEL[post.cta_type] ?? post.cta_type}` : ""}
            </p>
          </>
        ) : (
          <p
            dir="auto"
            className="mt-2 whitespace-pre-wrap rounded-inner bg-surface-2 p-3 text-body text-text-1"
          >
            {body}
          </p>
        )}
      </div>
      <div className="mt-5 border-t border-line pt-4">
        {editing ? (
          <div className="flex flex-wrap gap-2">
            <Button
              size="md"
              {...yes}
              loading={busy === "publish"}
              disabled={!!busy || body.trim().length < 10}
              onClick={() => void run("publish")}
            >
              Save and approve
            </Button>
            <Button
              variant="tertiary"
              onClick={() => {
                setBody(post.body ?? "");
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                size="md"
                {...yes}
                icon={<Check className="size-4" aria-hidden />}
                loading={busy === "publish"}
                disabled={!!busy}
                onClick={() => void run("publish")}
              >
                Approve
              </Button>
              <Button
                variant="secondary"
                size="md"
                icon={<Pencil className="size-4" aria-hidden />}
                disabled={!!busy}
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
              <Button
                variant="quiet"
                size="md"
                icon={<SkipForward className="size-4" aria-hidden />}
                loading={busy === "skip"}
                disabled={!!busy}
                onClick={() => void run("skip")}
              >
                Skip
              </Button>
            </div>
            <p className="mt-3 text-small text-text-2">
              Nothing is published until you approve it.
            </p>
          </>
        )}
        {err ? (
          <p className="mt-3 text-small font-semibold text-bad" role="alert">
            {err}
          </p>
        ) : null}
      </div>
    </article>
  );
}

// A post that left the drafts, with its task state. A waiting one can be cancelled until its time; a published one can
// be removed from Google (P0.7-05): one confirmation, then the same approval and 10 second undo as any write.
function SentCard({
  post,
  tasks,
  onChanged,
}: {
  post: Post;
  tasks: Tasks;
  onChanged: () => unknown;
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const wait = usePending(post.id, onChanged);
  async function cancel() {
    setBusy(true);
    setErr("");
    try {
      await cancelPost(post.id);
      setCancelled(true);
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Something went wrong.");
    }
    setBusy(false);
  }
  async function remove() {
    setBusy(true);
    setErr("");
    try {
      wait.start(await removePost(post.id));
      setConfirm(false);
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Something went wrong.");
    }
    setBusy(false);
  }
  if (wait.pending) {
    return (
      <UndoBar
        until={wait.pending.until}
        busy={wait.busy}
        error={wait.err}
        onUndo={() => void wait.undo()}
      />
    );
  }
  if (cancelled) {
    return (
      <div className={cardCls}>
        <p className="text-body font-bold text-text-1" role="status">
          Cancelled. Nothing was posted.
        </p>
        <p dir="auto" className="mt-2 line-clamp-3 whitespace-pre-wrap text-small text-text-2">
          {post.body}
        </p>
      </div>
    );
  }
  const removal = post.state === "removing" || post.state === "removed";
  const task = removal ? tasks.removal.get(post.id) : tasks.post.get(post.id);
  const skipped = post.state === "skipped";
  const waitsForDay =
    post.state === "publishing" && post.publish_at && Date.parse(post.publish_at) > Date.now();
  return (
    <article className={cardCls} aria-label={post.event_title ?? TYPE_LABEL[post.topic_type]}>
      <CardHead post={post} />
      <p
        dir="auto"
        className={cn(
          "mt-4 line-clamp-4 whitespace-pre-wrap rounded-inner bg-surface-2 p-3 text-body",
          skipped ? "text-text-2 line-through decoration-text-3" : "text-text-1",
        )}
      >
        {post.body}
      </p>
      {skipped ? (
        <p className="mt-4 text-small text-text-2">Skipped. Nothing was published.</p>
      ) : (
        <>
          {removal ? (
            <p className="mt-4 text-small font-bold text-text-2">Removal from Google</p>
          ) : null}
          <TaskBlock
            task={task}
            kind={removal ? "local_post_removal" : "local_post"}
            rowState={post.state}
            className="mt-4"
          />
          {waitsForDay ? (
            <p className="mt-2 text-small text-text-2">
              Goes to Google on {fmtDateTime(post.publish_at)}.
            </p>
          ) : null}
        </>
      )}
      {post.state === "publishing" ? (
        <Button
          size="md"
          variant="secondary"
          className="mt-4"
          loading={busy}
          onClick={() => void cancel()}
        >
          Cancel
        </Button>
      ) : null}
      {post.state === "posted" ? (
        confirm ? (
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-body text-text-1">
              Remove this post from your Google profile? You have 10 seconds to undo.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="md" variant="secondary" loading={busy} onClick={() => void remove()}>
                Remove from Google
              </Button>
              <Button size="md" variant="quiet" disabled={busy} onClick={() => setConfirm(false)}>
                Keep it
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="tertiary" className="mt-2" onClick={() => setConfirm(true)}>
            Remove from Google
          </Button>
        )
      ) : null}
      {err ? (
        <p className="mt-3 text-small font-semibold text-bad" role="alert">
          {err}
        </p>
      ) : null}
    </article>
  );
}

// The owner's own post: Update, Offer or Event, one photo, one button, a day and time (K-80).
function WritePost({ locationId, onSaved }: { locationId: string; onSaved: () => unknown }) {
  const [type, setType] = useState<PostType>("STANDARD");
  const [summary, setSummary] = useState("");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [terms, setTerms] = useState("");
  const [code, setCode] = useState("");
  const [redeem, setRedeem] = useState("");
  const [cta, setCta] = useState("");
  const [url, setUrl] = useState("");
  const [when, setWhen] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");
  const photos = useQuery({
    queryKey: ["post-photos", locationId],
    queryFn: () => postPhotos(locationId),
  });
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setDone("");
    try {
      await savePost(locationId, {
        type,
        summary,
        title: type === "STANDARD" ? null : title || null,
        start_date: type === "STANDARD" ? null : start || null,
        end_date: type === "STANDARD" ? null : end || null,
        start_time: type === "EVENT" ? startTime || null : null,
        end_time: type === "EVENT" ? endTime || null : null,
        terms: type === "OFFER" ? terms : null,
        coupon_code: type === "OFFER" ? code || null : null,
        redeem_url: type === "OFFER" ? redeem || null : null,
        cta_type: cta || null,
        cta_url: cta && cta !== "CALL" ? url : null,
        photo_id: photo,
        publish_at: when ? new Date(when).toISOString() : null,
      });
      setSummary("");
      setTitle("");
      setTerms("");
      setCode("");
      setRedeem("");
      setDone("Saved. Approve it in its month above.");
      onSaved();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Something went wrong.");
    }
    setBusy(false);
  }
  const field =
    "mt-1 h-11 w-full rounded-input border border-stroke bg-surface-2 px-3 text-body text-text-1";
  return (
    <Panel title="Write a post" id="write-post">
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Kind of post">
          {(["STANDARD", "OFFER", "EVENT"] as PostType[]).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              onClick={() => setType(t)}
              className={`min-h-11 rounded-full border px-2 text-small font-bold ${type === t ? "border-text-1 bg-text-1 text-surface-0" : "border-line-strong text-text-1"}`}
            >
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        {type !== "STANDARD" ? (
          <div>
            <Label htmlFor="post-title">{type === "EVENT" ? "Event title" : "Offer title"}</Label>
            <Input
              id="post-title"
              value={title}
              maxLength={58}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        ) : null}
        <div>
          <Label htmlFor="post-text">
            {type === "OFFER"
              ? "The offer, in your words"
              : type === "EVENT"
                ? "About the event"
                : "What's new"}
          </Label>
          <Textarea
            id="post-text"
            dir="auto"
            value={summary}
            maxLength={1500}
            onChange={(e) => setSummary(e.target.value)}
            className="mt-1 min-h-28"
            placeholder="One concrete thing: a dish, a service, a change, an event."
          />
        </div>
        {type !== "STANDARD" ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-small">
              Starts
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className={field}
              />
            </label>
            <label className="text-small">
              Ends
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className={field}
              />
            </label>
            {type === "EVENT" ? (
              <>
                <label className="text-small">
                  From
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={field}
                  />
                </label>
                <label className="text-small">
                  To
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={field}
                  />
                </label>
              </>
            ) : null}
          </div>
        ) : null}
        {type === "OFFER" ? (
          <>
            <div>
              <Label htmlFor="post-terms">Terms</Label>
              <Input
                id="post-terms"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Weekdays only, one per table"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="post-code">Code (if any)</Label>
                <Input id="post-code" value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="post-redeem">Redeem link (if any)</Label>
                <Input
                  id="post-redeem"
                  value={redeem}
                  onChange={(e) => setRedeem(e.target.value)}
                  placeholder="https://"
                />
              </div>
            </div>
          </>
        ) : null}
        <label className="block text-small">
          Button
          <select value={cta} onChange={(e) => setCta(e.target.value)} className={field}>
            <option value="">No button</option>
            {Object.entries(CTA_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        {cta && cta !== "CALL" ? (
          <div>
            <Label htmlFor="post-url">Link on your own website</Label>
            <Input
              id="post-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
            />
          </div>
        ) : null}
        {photos.data?.length ? (
          <fieldset>
            <legend className="text-small">One of your photos (if you like)</legend>
            <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {photos.data.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={photo === p.id}
                  onClick={() => setPhoto(photo === p.id ? null : p.id)}
                  className={`overflow-hidden rounded-inner border-2 ${photo === p.id ? "border-text-1" : "border-transparent"}`}
                >
                  {p.url ? (
                    <img
                      src={p.url}
                      alt="Your photo"
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <span className="block aspect-square w-full bg-surface-2" />
                  )}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}
        <label className="block text-small">
          Send on (leave empty to send it right after you approve)
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className={field}
          />
        </label>
        <Button
          type="submit"
          size="md"
          variant="secondary"
          loading={busy}
          disabled={summary.trim().length < 10}
        >
          Save the post
        </Button>
        {done ? (
          <p className="text-small" role="status">
            {done}
          </p>
        ) : null}
        {err ? (
          <p className="text-small font-semibold text-bad" role="alert">
            {err}
          </p>
        ) : null}
      </form>
    </Panel>
  );
}

// Kabsi's own posts: on or off, and how many a month (4 by default, one a week, or 2).
function Settings({ locationId }: { locationId: string }) {
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: ["post-settings", locationId],
    queryFn: () => loadSettings(locationId),
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const on = settings.data?.auto_posts ?? true;
  async function change(fn: () => Promise<void>) {
    setBusy(true);
    setErr("");
    try {
      await fn();
      await queryClient.invalidateQueries({ queryKey: ["post-settings", locationId] });
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Something went wrong.");
    }
    setBusy(false);
  }
  return (
    <Panel>
      <Switch
        checked={on}
        label="Kabsi's posts"
        description={
          on
            ? "Kabsi plans your posts each month from what is true, and asks when it has nothing to say."
            : "Off. Your own posts still work."
        }
        disabled={busy || settings.isLoading}
        onChange={(v) => void change(() => setAutoPosts(locationId, v))}
      />
      {on ? (
        <div
          className="mt-4 flex flex-wrap items-center gap-2"
          role="radiogroup"
          aria-label="Posts a month"
        >
          <span className="text-small text-text-1">Posts a month:</span>
          {([4, 2] as const).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={settings.data?.posts_per_month === n}
              disabled={busy}
              onClick={() => void change(() => setCadence(locationId, n))}
              className={cn(
                "min-h-11 min-w-11 rounded-full border px-4 text-small font-bold",
                settings.data?.posts_per_month === n
                  ? "border-text-1 bg-text-1 text-surface-0"
                  : "border-line-strong text-text-1",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      ) : null}
      {err ? (
        <p className="mt-2 text-small font-semibold text-bad" role="alert">
          {err}
        </p>
      ) : null}
    </Panel>
  );
}

function NotYet() {
  return (
    <Panel>
      <p className="text-body font-bold">Posts start once Kabsi can reach your Google profile.</p>
      <p className="mt-1 text-small text-text-2">
        Finish setup and this page fills up with posts to approve.
      </p>
      <ButtonLink to="/start" size="md" className="mt-4">
        Continue setup
      </ButtonLink>
    </Panel>
  );
}
