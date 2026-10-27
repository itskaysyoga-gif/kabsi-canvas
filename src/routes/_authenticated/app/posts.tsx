import { useState, type FormEvent } from "react";
import { EarlyAccessNotice } from "@/components/app/early-access-notice";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAutosize } from "@/lib/use-autosize";
import { myLatestLocation } from "@/lib/onboarding";
import { contentCall } from "@/lib/reviews";
import { PublishingBanner } from "@/components/reviews/review-card";
import { track } from "@/lib/telemetry";
import { Megaphone as PageGlyph } from "lucide-react";
import { PageIcon } from "@/components/shared/page-icon";
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
  STATE_LABEL,
  TYPE_LABEL,
  type Post,
  type PostType,
  cancelPost,
  undoPost,
} from "@/lib/posts";

// Posts (P0.5-02, K-24, K-80): the month view. Kabsi prepares posts from what is true (one a week by default) and asks
// one question when it has nothing true to say; the owner writes an Update, Offer or Event, approves the month or each
// post, and Kabsi sends each at its time through the one pipeline. Nothing goes to Google without the approval (D202).
export const Route = createFileRoute("/_authenticated/app/posts")({
  head: () => ({ meta: [{ title: "Posts | Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: PostsPage,
});

const QUESTION = "Anything new this month? A dish, a service, an event?";

function PostsPage() {
  const queryClient = useQueryClient();
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
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
  const refresh = () =>
    Promise.all(
      [["posts"], ["dashboard"], ["activity"], ["tasks"], ["post-settings"]].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
  const months = nextMonths(2);
  const [month, setMonth] = useState(months[0] ?? "");
  const all = posts.data ?? [];
  const inMonth = all.filter((p) => monthOf(p) === month);
  const prepared = inMonth.filter((p) => p.state === "draft");
  const planned = inMonth.filter((p) => p.state !== "skipped");
  const cadence = settings.data?.posts_per_month ?? 4;
  const ready = loc && loc.status === "active" && !loc.concierge;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <PageIcon icon={<PageGlyph />} />
      <p className="text-small font-bold uppercase tracking-wider text-text-2">Content</p>
      <h1 className="mt-1 font-display text-h2 leading-none sm:text-5xl">Posts</h1>
      <p className="mt-2 max-w-xl text-text-2">
        Short updates on your Google profile, from what is true about your business. You approve
        each one; Kabsi sends it on its day.
      </p>
      {!location.isLoading && !loc ? (
        <Button asChild className="mt-6">
          <Link to="/start">Add your business</Link>
        </Button>
      ) : null}
      {loc?.concierge ? <EarlyAccessNotice what="Posts" /> : null}
      {loc && !loc.concierge && loc.status !== "active" ? <NotYet /> : null}
      {posts.isError ? (
        <p className="mt-6 text-small text-bad" role="alert">
          Couldn't load your posts. Refresh the page to try again.
        </p>
      ) : null}

      {ready ? (
        <>
          <div className="mt-7 flex gap-2" role="tablist" aria-label="Month">
            {months.map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={m === month}
                onClick={() => setMonth(m)}
                className={`h-11 rounded-pill border px-4 text-small font-bold ${m === month ? "border-text-1 bg-kb-black text-kb-white" : "border-line bg-surface-1"}`}
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
            onChanged={refresh}
          />

          <WritePost locationId={loc.id} onSaved={refresh} />
          <Settings locationId={loc.id} />
        </>
      ) : null}
    </div>
  );
}

function MonthView({
  locationId,
  month,
  posts,
  prepared,
  missing,
  onChanged,
}: {
  locationId: string;
  month: string;
  posts: Post[];
  prepared: Post[];
  missing: number;
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
  const order = [...posts].sort((a, b) =>
    (a.publish_at ?? a.created_at).localeCompare(b.publish_at ?? b.created_at),
  );
  return (
    <section className="mt-5">
      {prepared.length ? (
        <div className="rounded-panel bg-surface-1 p-5 shadow-rest">
          <h2 className="font-display text-h3 leading-tight">
            {prepared.length} {prepared.length === 1 ? "post" : "posts"} for {monthName(month)}{" "}
            {prepared.length === 1 ? "is" : "are"} ready
          </h2>
          <p className="mt-1 text-small text-text-2">
            Approve the month, or read and approve them one by one below.
          </p>
          <Button
            className="mt-4 w-full sm:w-auto"
            disabled={busy}
            onClick={() => void approveAll()}
          >
            {busy ? "Approving…" : "Approve the month"}
          </Button>
          {msg ? (
            <p className="mt-3 text-small" role="status">
              {msg}
            </p>
          ) : null}
        </div>
      ) : missing > 0 ? (
        <div className="rounded-panel bg-surface-1 p-5 shadow-rest">
          <h2 className="font-display text-h3 leading-tight">{QUESTION}</h2>
          <p className="mt-1 text-small text-text-2">
            Kabsi writes posts only from what is true about your business. Tell it below, or add a
            fact in{" "}
            <Link to="/app/knowledge" className="font-bold underline underline-offset-4">
              About your business
            </Link>
            .
          </p>
        </div>
      ) : null}
      {order.length ? (
        <ol className="mt-4 space-y-3">
          {order.map((p) => (
            <li key={p.id}>
              {p.state === "draft" ? (
                <DraftCard post={p} onChanged={onChanged} />
              ) : (
                <SentCard post={p} onChanged={onChanged} />
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-small text-text-2">Nothing planned for {monthName(month)} yet.</p>
      )}
    </section>
  );
}

function PostMeta({ post }: { post: Post }) {
  return (
    <p className="text-label font-bold uppercase tracking-wider text-text-2">
      {STATE_LABEL[post.state]} · {TYPE_LABEL[post.topic_type]}
      {post.publish_at ? ` · ${fmtDateTime(post.publish_at)}` : ` · ${fmtDate(post.created_at)}`}
      {post.source === "auto" ? " · prepared by Kabsi" : ""}
    </p>
  );
}

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

function DraftCard({ post, onChanged }: { post: Post; onChanged: () => unknown }) {
  const [body, setBody] = useState(post.body ?? "");
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
      <PublishingBanner
        until={wait.pending.until}
        busy={wait.busy}
        error={wait.err}
        onUndo={() => void wait.undo()}
      />
    );
  }
  return (
    <article className="rounded-panel bg-surface-1 p-5 shadow-rest">
      <PostMeta post={post} />
      {post.topic_type === "EVENT" && post.event_title ? (
        <p className="mt-2 font-bold">{post.event_title}</p>
      ) : null}
      {post.topic_type !== "STANDARD" && post.start_date ? (
        <p className="mt-1 text-small text-text-2">
          {fmtDate(post.start_date)} to {fmtDate(post.end_date)}
          {post.offer_terms ? ` · ${post.offer_terms}` : ""}
        </p>
      ) : null}
      <Label htmlFor={`post-${post.id}`} className="sr-only">
        Post text
      </Label>
      <Textarea
        id={`post-${post.id}`}
        ref={ref}
        dir="auto"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="mt-3 min-h-28"
        maxLength={1500}
      />
      <p className="mt-1 text-label text-text-2">
        {body.length} of 1,500 characters
        {post.cta_type ? ` · Button: ${CTA_LABEL[post.cta_type] ?? post.cta_type}` : ""}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="compact"
          variant="outline"
          disabled={!!busy}
          onClick={() => void run("publish")}
        >
          {busy === "publish" ? "Approving…" : "Approve"}
        </Button>
        <Button size="compact" variant="ghost" disabled={!!busy} onClick={() => void run("skip")}>
          Skip
        </Button>
      </div>
      {err ? (
        <p className="mt-2 text-small text-bad" role="alert">
          {err}
        </p>
      ) : null}
    </article>
  );
}

// A post that left the drafts. A published one can be removed from Google (P0.7-05): one confirmation, then the same
// approval and 10 second undo as any write.
function SentCard({ post, onChanged }: { post: Post; onChanged: () => unknown }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const wait = usePending(post.id, onChanged);
  // A waiting post (approved, due later) can be cancelled until its time: it goes back to a draft, nothing is posted.
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
      <PublishingBanner
        until={wait.pending.until}
        busy={wait.busy}
        error={wait.err}
        onUndo={() => void wait.undo()}
        verb="Removing from Google"
        done="Approved. Kabsi is removing it from Google."
      />
    );
  }
  if (cancelled) {
    return (
      <div className="rounded-card bg-surface-1 p-4 shadow-rest">
        <p className="text-small font-bold" role="status">
          Cancelled. Nothing was posted.
        </p>
        <p dir="auto" className="mt-2 line-clamp-3 whitespace-pre-wrap text-small leading-6">
          {post.body}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-card bg-surface-1 p-4 shadow-rest">
      <PostMeta post={post} />
      <p dir="auto" className="mt-2 line-clamp-3 whitespace-pre-wrap text-small leading-6">
        {post.body}
      </p>
      {post.state === "publishing" ? (
        <Button
          size="compact"
          variant="outline"
          className="mt-3"
          disabled={busy}
          onClick={() => void cancel()}
        >
          {busy ? "Cancelling…" : "Cancel"}
        </Button>
      ) : null}
      {post.state === "posted" ? (
        confirm ? (
          <div className="mt-3">
            <p className="text-small">
              Remove this post from your Google profile? You have 10 seconds to undo.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                size="compact"
                variant="outline"
                disabled={busy}
                onClick={() => void remove()}
              >
                {busy ? "Removing…" : "Remove from Google"}
              </Button>
              <Button
                size="compact"
                variant="ghost"
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                Keep it
              </Button>
            </div>
          </div>
        ) : (
          <Button size="compact" variant="ghost" className="mt-2" onClick={() => setConfirm(true)}>
            Remove from Google
          </Button>
        )
      ) : null}
      {err ? (
        <p className="mt-2 text-small text-bad" role="alert">
          {err}
        </p>
      ) : null}
    </div>
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
  const field = "mt-1 h-11 w-full rounded-card border border-line bg-surface-1 px-3";
  return (
    <section className="mt-10">
      <h2 className="text-small font-bold uppercase tracking-wider text-text-2">Write a post</h2>
      <form
        onSubmit={(e) => void submit(e)}
        className="mt-3 space-y-4 rounded-panel bg-surface-1 p-5 shadow-rest"
      >
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Kind of post">
          {(["STANDARD", "OFFER", "EVENT"] as PostType[]).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              onClick={() => setType(t)}
              className={`h-11 rounded-card border text-small font-bold ${type === t ? "border-text-1 bg-kb-black text-kb-white" : "border-line"}`}
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
                  className={`overflow-hidden rounded-card border-2 ${photo === p.id ? "border-text-1" : "border-transparent"}`}
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
        <Button type="submit" variant="outline" disabled={busy || summary.trim().length < 10}>
          {busy ? "Checking…" : "Save the post"}
        </Button>
        {done ? (
          <p className="text-small" role="status">
            {done}
          </p>
        ) : null}
        {err ? (
          <p className="text-small text-bad" role="alert">
            {err}
          </p>
        ) : null}
      </form>
    </section>
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
    <section className="mt-10 rounded-panel bg-surface-1 p-5 shadow-rest">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-bold">Kabsi's posts</p>
          <p className="text-small text-text-2">
            {on
              ? "Kabsi plans your posts each month from what is true, and asks when it has nothing to say."
              : "Off. Your own posts still work."}
          </p>
        </div>
        <Button
          size="compact"
          variant="outline"
          disabled={busy || settings.isLoading}
          aria-pressed={on}
          onClick={() => void change(() => setAutoPosts(locationId, !on))}
        >
          {on ? "Turn off" : "Turn on"}
        </Button>
      </div>
      {on ? (
        <div
          className="mt-4 flex flex-wrap items-center gap-2"
          role="radiogroup"
          aria-label="Posts a month"
        >
          <span className="text-small">Posts a month:</span>
          {([4, 2] as const).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={settings.data?.posts_per_month === n}
              disabled={busy}
              onClick={() => void change(() => setCadence(locationId, n))}
              className={`h-11 min-w-11 rounded-pill border px-4 text-small font-bold ${settings.data?.posts_per_month === n ? "border-text-1 bg-kb-black text-kb-white" : "border-line"}`}
            >
              {n}
            </button>
          ))}
        </div>
      ) : null}
      {err ? (
        <p className="mt-2 text-small text-bad" role="alert">
          {err}
        </p>
      ) : null}
    </section>
  );
}

function NotYet() {
  return (
    <div className="mt-7 rounded-panel bg-surface-1 p-6 shadow-rest">
      <p className="font-bold">Posts start once Kabsi can reach your Google profile.</p>
      <p className="mt-1 text-small leading-6 text-text-2">
        Finish setup and this page fills up with posts to approve.
      </p>
      <Button asChild size="compact" className="mt-4">
        <Link to="/start">Continue setup</Link>
      </Button>
    </div>
  );
}
