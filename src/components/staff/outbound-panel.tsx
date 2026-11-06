import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { Button, STAFF_CARD, STAFF_H2, STAFF_ITEM, StaffLoading } from "./staff-ui";

// kabsi.co/staff/outbound (Harvey 4A part C, master plan 30.39 item 5): phone first. The day's drafts, each with where it
// came from; Approve, Edit, Skip per email and Approve all after reading; the follow-up shown under its Email 1 and
// approved with it; the replies that need Rashid with their prepared answer; the lock and any stop, read only. There is
// no control that opens sending: the table's trigger refuses it to anyone but lane R.

type Prospect = {
  business_name: string;
  city: string;
  country: string;
  source_page: string;
  source_date: string;
  detail_used: string;
  company_number: string | null;
  company_status: string | null;
  test: boolean;
};
type Message = {
  id: string;
  prospect_id: string;
  parent_id: string | null;
  kind: "first" | "follow_up" | "reply";
  to_address: string;
  subject: string;
  body: string;
  status: string;
  send_after: string | null;
  prospect: Prospect | null;
};
type Reply = {
  id: number;
  prospect_id: string;
  intent: string | null;
  reply_subject: string | null;
  reply_text: string | null;
  received_at: string;
  prospect: Prospect | null;
};
type Lock = {
  sending_open: boolean;
  test_mode: boolean;
  stopped_reason: string | null;
  stopped_at: string | null;
  started_on: string | null;
};

const PROSPECT =
  "prospect:outbound_prospects(business_name, city, country, source_page, source_date, detail_used, company_number, company_status, test)";

export async function outboundData() {
  const [lock, msgs, replies] = await Promise.all([
    supabase
      .from("outbound_settings")
      .select("sending_open, test_mode, stopped_reason, stopped_at, started_on")
      .maybeSingle(),
    supabase
      .from("outbound_messages")
      .select(
        `id, prospect_id, parent_id, kind, to_address, subject, body, status, send_after, ${PROSPECT}`,
      )
      .in("status", ["draft", "approved"])
      .order("send_after", { ascending: true, nullsFirst: false })
      .limit(200),
    supabase
      .from("outbound_events")
      .select(`id, prospect_id, intent, reply_subject, reply_text, received_at, ${PROSPECT}`)
      .eq("needs_rashid", true)
      .is("handled_at", null)
      .order("received_at")
      .limit(50),
  ]);
  for (const r of [lock, msgs, replies]) if (r.error) throw new Error(r.error.message);
  const all = (msgs.data ?? []) as unknown as Message[];
  return {
    lock: lock.data as Lock | null,
    drafts: all.filter((m) => m.kind === "first" && m.status === "draft"),
    followUps: new Map(
      all.filter((m) => m.kind === "follow_up").map((m) => [m.parent_id ?? "", m]),
    ),
    replyDrafts: new Map(
      all.filter((m) => m.kind === "reply" && m.status === "draft").map((m) => [m.prospect_id, m]),
    ),
    queued: all.filter((m) => m.status === "approved").length,
    replies: (replies.data ?? []) as unknown as Reply[],
  };
}

const KEY = ["staff-outbound"];

export function OutboundPanel() {
  const q = useQuery({ queryKey: KEY, queryFn: outboundData, refetchInterval: 60_000 });
  if (q.isLoading) return <StaffLoading what="Outbound" />;
  if (q.isError || !q.data) {
    return <p className="text-small text-bad">Couldn't load Outbound. Refresh the page.</p>;
  }
  const d = q.data;
  return (
    <div className="space-y-5">
      <LockState lock={d.lock} queued={d.queued} />
      <section className={STAFF_CARD} aria-labelledby="ob-drafts">
        <h2 id="ob-drafts" className={STAFF_H2}>
          Today's drafts
        </h2>
        {!d.drafts.length ? (
          <p className="mt-1 text-small text-text-2">
            No drafts waiting. New ones are prepared on weekdays at 05:00 UTC.
          </p>
        ) : (
          <>
            <p className="mt-1 text-small text-text-2">
              {d.drafts.length} to read. Approving Email 1 also approves its follow-up.
            </p>
            <div className="mt-4 space-y-4">
              {d.drafts.map((m) => (
                <DraftCard key={m.id} m={m} follow={d.followUps.get(m.id) ?? null} />
              ))}
            </div>
            <ApproveAll ids={d.drafts.map((m) => m.id)} />
          </>
        )}
      </section>
      <section className={STAFF_CARD} aria-labelledby="ob-replies">
        <h2 id="ob-replies" className={STAFF_H2}>
          Replies
        </h2>
        {!d.replies.length ? (
          <p className="mt-1 text-small text-text-2">No reply needs you.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {d.replies.map((r) => (
              <ReplyCard key={r.id} r={r} draft={d.replyDrafts.get(r.prospect_id) ?? null} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function LockState({ lock, queued }: { lock: Lock | null; queued: number }) {
  const line = !lock
    ? "Outbound is not set up."
    : lock.stopped_reason
      ? `Stopped${lock.stopped_at ? ` on ${fmtDate(lock.stopped_at)}` : ""}: ${lock.stopped_reason}. Only lane R reopens it.`
      : lock.sending_open
        ? `Sending is open${lock.started_on ? ` since ${fmtDate(lock.started_on)}` : ""}. Only what you approve is sent.`
        : lock.test_mode
          ? "Sending is locked. Test mode: only the test addresses receive mail."
          : "Sending is locked. Nothing is prepared or sent.";
  return (
    <section className={STAFF_CARD} aria-labelledby="ob-lock">
      <h2 id="ob-lock" className={STAFF_H2}>
        Sending
      </h2>
      <p
        className={
          lock?.stopped_reason
            ? "mt-1 text-small font-bold text-bad"
            : "mt-1 text-small text-text-2"
        }
      >
        {line}
      </p>
      <p className="mt-1 text-small text-text-2">Approved and waiting to send: {queued}.</p>
    </section>
  );
}

function Source({ p }: { p: Prospect | null }) {
  if (!p) return null;
  return (
    <dl className="mt-2 grid gap-1 text-label text-text-2">
      <div>
        <dt className="inline font-bold">Source page: </dt>
        <dd className="inline break-all">{p.source_page}</dd>
      </div>
      <div>
        <dt className="inline font-bold">Read on: </dt>
        <dd className="inline">{fmtDate(p.source_date)}</dd>
      </div>
      <div>
        <dt className="inline font-bold">Detail: </dt>
        <dd className="inline">{p.detail_used}</dd>
      </div>
      <div>
        <dt className="inline font-bold">Company number: </dt>
        <dd className="inline">
          {p.company_number ?? "none"}
          {p.company_status ? ` (${p.company_status})` : ""}
        </dd>
      </div>
      {p.test ? (
        <div className="font-bold">Test business: the email goes to a test address only.</div>
      ) : null}
    </dl>
  );
}

function useAct() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function run(fn: string, args: Record<string, unknown>, fail: string) {
    setBusy(true);
    setErr("");
    const { error } = await supabase.rpc(fn as never, args as never);
    setBusy(false);
    if (error) {
      setErr(fail);
      return false;
    }
    await qc.invalidateQueries({ queryKey: KEY });
    return true;
  }
  return { busy, err, run };
}

function Editor({ m, onDone }: { m: Message; onDone: () => void }) {
  const [subject, setSubject] = useState(m.subject);
  const [body, setBody] = useState(m.body);
  const a = useAct();
  return (
    <div className="mt-3 space-y-2">
      <Input value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject" />
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={12}
        aria-label="Email text"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={a.busy}
          onClick={() =>
            void a
              .run(
                "staff_outbound_edit",
                { p_id: m.id, p_subject: subject, p_body: body },
                "Couldn't save. No dashes, no exclamation marks, and no link but kabsi.co.",
              )
              .then((ok) => ok && onDone())
          }
        >
          {a.busy ? "Saving" : "Save"}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
      {a.err ? (
        <p className="text-small text-bad" role="alert">
          {a.err}
        </p>
      ) : null}
    </div>
  );
}

function Body({ m }: { m: Message }) {
  return (
    <>
      <p className="mt-2 text-small font-bold">{m.subject}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-small leading-6">{m.body}</p>
    </>
  );
}

function DraftCard({ m, follow }: { m: Message; follow: Message | null }) {
  const [editing, setEditing] = useState<"first" | "follow" | null>(null);
  const a = useAct();
  return (
    <article
      className={STAFF_ITEM}
      aria-label={`Email 1 to ${m.prospect?.business_name ?? "a business"}`}
    >
      <p className="font-bold">
        {m.prospect?.business_name}, {m.prospect?.city}
      </p>
      <p className="text-label text-text-2">
        To {m.to_address}
        {m.send_after ? `. Sends from ${fmtDateTime(m.send_after)}` : ""}
      </p>
      <Source p={m.prospect} />
      {editing === "first" ? <Editor m={m} onDone={() => setEditing(null)} /> : <Body m={m} />}
      {follow ? (
        <div className="mt-3 border-t border-line pt-3">
          <p className="text-label font-bold text-text-2">
            Follow-up, day 4 or 5, same thread. Stops on any reply.
          </p>
          {editing === "follow" ? (
            <Editor m={follow} onDone={() => setEditing(null)} />
          ) : (
            <Body m={follow} />
          )}
        </div>
      ) : null}
      {editing ? null : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={a.busy}
            onClick={() =>
              void a.run("staff_outbound_approve", { p_id: m.id }, "Couldn't approve. Try again.")
            }
          >
            Approve
          </Button>
          <Button variant="ghost" onClick={() => setEditing("first")}>
            Edit
          </Button>
          {follow ? (
            <Button variant="ghost" onClick={() => setEditing("follow")}>
              Edit follow-up
            </Button>
          ) : null}
          <Button
            variant="ghost"
            disabled={a.busy}
            onClick={() =>
              void a.run("staff_outbound_skip", { p_id: m.id }, "Couldn't skip. Try again.")
            }
          >
            Skip
          </Button>
        </div>
      )}
      {a.err ? (
        <p className="mt-2 text-small text-bad" role="alert">
          {a.err}
        </p>
      ) : null}
    </article>
  );
}

function ApproveAll({ ids }: { ids: string[] }) {
  const a = useAct();
  return (
    <div className="mt-5 border-t border-line pt-4">
      <p className="text-small text-text-2">
        Read every draft above first. This approves the {ids.length} shown and their follow-ups.
      </p>
      <Button
        className="mt-2"
        variant="outline"
        disabled={a.busy || !ids.length}
        onClick={() =>
          void a.run(
            "staff_outbound_approve_all",
            { p_ids: ids },
            "Couldn't approve them. Try again.",
          )
        }
      >
        {a.busy ? "Approving" : `Approve all ${ids.length}`}
      </Button>
      {a.err ? (
        <p className="mt-2 text-small text-bad" role="alert">
          {a.err}
        </p>
      ) : null}
    </div>
  );
}

function ReplyCard({ r, draft }: { r: Reply; draft: Message | null }) {
  const [editing, setEditing] = useState(false);
  const a = useAct();
  return (
    <article
      className={STAFF_ITEM}
      aria-label={`Reply from ${r.prospect?.business_name ?? "a business"}`}
    >
      <p className="font-bold">
        {r.prospect?.business_name}
        {r.intent === "yes" ? ": a yes" : ""}
      </p>
      <p className="text-label text-text-2">Received {fmtDateTime(r.received_at)}</p>
      <p className="mt-2 whitespace-pre-wrap break-words text-small leading-6">{r.reply_text}</p>
      {draft ? (
        <div className="mt-3 border-t border-line pt-3">
          <p className="text-label font-bold text-text-2">Your answer, ready to send</p>
          {editing ? <Editor m={draft} onDone={() => setEditing(false)} /> : <Body m={draft} />}
          {editing ? null : (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={a.busy}
                onClick={() =>
                  void a.run(
                    "staff_outbound_approve",
                    { p_id: draft.id },
                    "Couldn't send. Try again.",
                  )
                }
              >
                Send
              </Button>
              <Button variant="ghost" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button
                variant="ghost"
                disabled={a.busy}
                onClick={() =>
                  void a.run("staff_outbound_skip", { p_id: draft.id }, "Couldn't skip. Try again.")
                }
              >
                Skip
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          <p className="mt-3 text-small text-text-2">
            No answer is prepared. Kabsi drafts one only for a clear yes. Answer from
            rashid@getkabsi.com, then tap Done.
          </p>
          <Button
            className="mt-2"
            variant="outline"
            disabled={a.busy}
            onClick={() =>
              void a.run(
                "staff_outbound_reply_done",
                { p_event_id: r.id },
                "Couldn't save. Try again.",
              )
            }
          >
            Done
          </Button>
        </>
      )}
      {a.err ? (
        <p className="mt-2 text-small text-bad" role="alert">
          {a.err}
        </p>
      ) : null}
    </article>
  );
}
