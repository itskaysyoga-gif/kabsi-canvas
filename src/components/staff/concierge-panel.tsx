import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/shared/copy-button";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import {
  addReview,
  cancelTask,
  claimTask,
  finishTask,
  loadConciergeQueue,
  markPosted,
  type ConciergeBusiness,
  type ConciergeQueue,
  type ConciergeTask,
} from "@/lib/concierge";

// Concierge queue (D267): what a person on the team does by hand during early access. The reply text shown here is
// exactly what the owner approved; it is pasted on Google unchanged, then marked posted. The owner's approval is
// already in the ledger (D202): this page only records who posted it.
export function ConciergePanel() {
  const queue = useQuery({
    queryKey: ["concierge-queue"],
    queryFn: loadConciergeQueue,
    refetchInterval: 60_000,
  });
  const q = queue.data;
  if (queue.isLoading) return null;
  if (!q || (q.count === 0 && q.tasks.length === 0)) {
    return (
      <section className="mt-8">
        <h2 className="text-xl font-bold">Concierge</h2>
        <p className="mt-1 text-sm text-kb-stone">
          No businesses in early access. Turn concierge on for a business in the list below (up to{" "}
          {q?.cap ?? 30}).
        </p>
      </section>
    );
  }
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold">Concierge</h2>
        <p className="text-sm text-kb-stone">
          {q.count} of {q.cap} businesses in early access
        </p>
      </div>
      <p className="mt-1 text-sm text-kb-stone">
        Owners were told a person posts what they approve within one working day. Oldest first.
      </p>
      <div className="mt-4 space-y-4">
        {q.tasks.length === 0 ? <p className="text-kb-stone">Nothing waiting.</p> : null}
        {q.tasks.map((t) =>
          t.kind === "post_reply" ? (
            <ReplyTask key={t.id} task={t} />
          ) : (
            <InviteTask key={t.id} task={t} />
          ),
        )}
      </div>
      <ReviewEntry queue={q} />
    </section>
  );
}

function useRefresh() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["concierge-queue"] }),
      client.invalidateQueries({ queryKey: ["staff-locations"] }),
    ]);
}

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex" aria-label={`${n} stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={i <= n ? "size-4 fill-kb-black text-kb-black" : "size-4 text-kb-hairline"}
        />
      ))}
    </span>
  );
}

function ReplyTask({ task }: { task: ConciergeTask }) {
  const refresh = useRefresh();
  const [confirm, setConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const run = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => void refresh(),
    onError: (e) => setMsg(e instanceof Error ? e.message : String(e)),
  });
  const r = task.review;
  return (
    <article className="rounded-large bg-kb-white p-5 shadow-kb">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">Post this reply: {task.business}</p>
          {task.address ? <p className="text-sm text-kb-stone">{task.address}</p> : null}
        </div>
        <p className="text-xs text-kb-stone">
          Approved {fmtDateTime(task.approved_at)}
          {task.claimed_by ? ` · ${task.claimed_by} is on it` : ""}
        </p>
      </div>
      {r ? (
        <div className="mt-4 rounded-card bg-kb-sand p-4 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <Stars n={r.stars} />
            <span className="font-medium">{r.reviewer ?? "A customer"}</span>
            <span className="text-kb-stone">{r.date ? fmtDate(r.date) : ""}</span>
          </p>
          <p className="mt-2 whitespace-pre-wrap leading-6">
            {r.text ?? "(no text, only a rating)"}
          </p>
          <p className="mt-2 text-xs text-kb-stone">Find this review on Google to reply to it.</p>
        </div>
      ) : null}
      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-kb-stone">
        Reply to paste, exactly as approved
      </p>
      <div
        className="mt-1 whitespace-pre-wrap rounded-card border-2 border-kb-black p-4 leading-6"
        data-testid="reply-text"
      >
        {task.reply_text ?? "The text was removed after 30 days."}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {task.reply_text ? <CopyButton text={task.reply_text} label="Copy reply" /> : null}
        <Button
          size="compact"
          variant="outline"
          disabled={run.isPending}
          onClick={() => run.mutate(() => claimTask(task.id))}
        >
          I'm on it
        </Button>
        <Button
          size="compact"
          disabled={run.isPending || !task.reply_text}
          onClick={() => setConfirm(true)}
        >
          Mark posted
        </Button>
        <Button
          size="compact"
          variant="outline"
          disabled={run.isPending}
          onClick={() => setCancelling(!cancelling)}
        >
          Cancel
        </Button>
      </div>
      {cancelling ? (
        <div className="mt-3 rounded-card bg-kb-sand p-4 text-sm">
          <p className="font-bold">Cancel this task</p>
          <Input
            aria-label="Reason"
            className="mt-2"
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="compact"
              variant="outline"
              disabled={run.isPending}
              onClick={() => run.mutate(() => cancelTask(task.id, "redo", reason))}
            >
              Send back to the owner
            </Button>
            <Button
              size="compact"
              variant="outline"
              disabled={run.isPending}
              onClick={() => run.mutate(() => cancelTask(task.id, "gone", reason))}
            >
              Review is gone on Google
            </Button>
            <Button
              size="compact"
              variant="outline"
              disabled={run.isPending}
              onClick={() => run.mutate(() => cancelTask(task.id, "access_lost", reason))}
            >
              We lost access
            </Button>
          </div>
        </div>
      ) : null}
      {msg ? <p className="mt-3 text-sm text-kb-red">{msg}</p> : null}
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Did you post it on Google?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm that you pasted exactly this text as the reply on Google and you can see it
              there. Your name is recorded next to the owner's approval.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction onClick={() => run.mutate(() => markPosted(task.id))}>
              Yes, it is posted
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}

function InviteTask({ task }: { task: ConciergeTask }) {
  const refresh = useRefresh();
  const [msg, setMsg] = useState("");
  const done = useMutation({
    mutationFn: () => finishTask(task.id, "Accepted the invitation"),
    onSuccess: () => void refresh(),
    onError: (e) => setMsg(e instanceof Error ? e.message : String(e)),
  });
  return (
    <article className="rounded-large bg-kb-white p-5 shadow-kb">
      <p className="font-bold">Accept the invitation: {task.business}</p>
      {task.address ? <p className="text-sm text-kb-stone">{task.address}</p> : null}
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-6">
        <li>Open Business Profile Manager as hello@kabsi.co and go to Manage invitations.</li>
        <li>Accept only the Manager invitation for exactly this business name and address.</li>
        <li>Tap Accepted here. The owner gets an email and can start.</li>
      </ol>
      {!task.consented ? (
        <p className="mt-2 text-sm text-kb-red">The owner has not given consent yet.</p>
      ) : null}
      <div className="mt-4">
        <Button
          size="compact"
          disabled={done.isPending || !task.consented}
          onClick={() => done.mutate()}
        >
          Accepted
        </Button>
      </div>
      {msg ? <p className="mt-3 text-sm text-kb-red">{msg}</p> : null}
    </article>
  );
}

function ReviewEntry({ queue }: { queue: ConciergeQueue }) {
  const refresh = useRefresh();
  const ready = queue.businesses.filter((b) => b.access);
  const today = new Date().toISOString().slice(0, 10);
  const [loc, setLoc] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewer, setReviewer] = useState("");
  const [date, setDate] = useState(today);
  const [text, setText] = useState("");
  const [backlog, setBacklog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  if (!ready.length) return null;
  const chosen: ConciergeBusiness | undefined = ready.find((b) => b.id === loc) ?? ready[0];

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await addReview({ locationId: chosen!.id, rating, comment: text, reviewer, date, backlog });
      setMsg("Review added. Kabsi drafts a reply within a few minutes and emails the owner.");
      setText("");
      setReviewer("");
      await refresh();
    } catch (x) {
      setMsg(x instanceof Error ? x.message : String(x));
    }
    setBusy(false);
  }
  return (
    <form onSubmit={submit} className="mt-6 rounded-large bg-kb-white p-5 shadow-kb">
      <h3 className="font-bold">Enter a new review</h3>
      <p className="text-sm text-kb-stone">
        Copy it from Google exactly. The owner is emailed a drafted reply.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <select
          aria-label="Business"
          value={chosen?.id}
          onChange={(e) => setLoc(e.target.value)}
          className="h-11 rounded-card border border-kb-hairline bg-kb-white px-3 sm:col-span-2"
        >
          {ready.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
              {b.checked_today ? " (checked today)" : ""}
            </option>
          ))}
        </select>
        <select
          aria-label="Stars"
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="h-11 rounded-card border border-kb-hairline bg-kb-white px-3"
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "star" : "stars"}
            </option>
          ))}
        </select>
        <Input
          aria-label="Review date"
          type="date"
          max={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Input
          aria-label="Reviewer name"
          className="sm:col-span-2"
          placeholder="Reviewer name as shown"
          value={reviewer}
          onChange={(e) => setReviewer(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={backlog} onChange={(e) => setBacklog(e.target.checked)} />
          Older review, from before Kabsi started
        </label>
        <Textarea
          aria-label="Review text"
          className="sm:col-span-4"
          rows={3}
          placeholder="Review text (leave empty for a rating only)"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" size="compact" disabled={busy}>
          {busy ? "Saving…" : "Add review"}
        </Button>
        <CheckedButton business={chosen} />
      </div>
      {msg ? <p className="mt-3 text-sm text-kb-stone">{msg}</p> : null}
    </form>
  );
}

// "Checked Google today": closes the daily reminder for a business with no new reviews to enter.
function CheckedButton({ business }: { business: ConciergeBusiness | undefined }) {
  const refresh = useRefresh();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  if (!business) return null;
  async function run() {
    setBusy(true);
    const { data } = await supabase
      .from("concierge_tasks")
      .select("id")
      .eq("location_id", business!.id)
      .eq("kind", "review_entry")
      .eq("state", "open")
      .limit(1);
    const id = data?.[0]?.id as string | undefined;
    if (id) await finishTask(id, "Checked Google, nothing new");
    await client.invalidateQueries({ queryKey: ["concierge-queue"] });
    await refresh();
    setBusy(false);
  }
  return (
    <Button
      type="button"
      size="compact"
      variant="outline"
      disabled={busy}
      onClick={() => void run()}
    >
      Checked Google, nothing new
    </Button>
  );
}
