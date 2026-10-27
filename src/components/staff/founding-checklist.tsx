import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StatusPill, Switch } from "@/components/kabsi/ui";
import { fmtDate } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { STAFF_ITEM } from "./staff-ui";

// Founding 25, founder-assisted start (master plan 30.15 section 3.2, V4): what to do with the owner in the first days,
// per business. Read with staff_founding_checklist(p_location) and ticked with staff_founding_check(p_location, p_item,
// p_done, p_note); both check is_staff() inside and write an audit row. Nothing here reaches Google or the owner.

export type ChecklistItem = {
  item: string;
  label: string;
  /** How many Kabsi found (old reviews with no reply, details that differ), or 1 when a link is missing. */
  found: number;
  /** Only the menu link has it: false when the business is not food and drink. */
  applies?: boolean;
};
export type Checklist = {
  business: string;
  items: ChecklistItem[];
  done: Record<string, { done_at: string | null; note: string | null }>;
};

async function loadChecklist(location: string): Promise<Checklist> {
  const { data, error } = await supabase.rpc(
    "staff_founding_checklist" as never,
    {
      p_location: location,
    } as never,
  );
  if (error) throw new Error(error.hint || error.message);
  return data as Checklist;
}

async function check(location: string, item: string, done: boolean, note: string | null) {
  const { error } = await supabase.rpc(
    "staff_founding_check" as never,
    {
      p_location: location,
      p_item: item,
      p_done: done,
      p_note: note,
    } as never,
  );
  if (error) throw new Error(error.hint || error.message);
}

/** One founding business's start checklist. */
export function FoundingChecklist({ location }: { location: string }) {
  const q = useQuery({
    queryKey: ["staff-founding-checklist", location],
    queryFn: () => loadChecklist(location),
  });
  if (q.isLoading) return <p className="text-small text-text-2">Loading the checklist</p>;
  if (q.error)
    return (
      <p className="text-small text-bad" role="alert">
        The checklist did not load: {q.error.message}
      </p>
    );
  const c = q.data;
  if (!c) return null;
  const open = c.items.filter((i) => i.applies !== false && !c.done[i.item]?.done_at).length;
  return (
    <article className={STAFF_ITEM}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-title font-bold">{c.business}</h4>
        {open ? (
          <StatusPill tone="warn">{open} open</StatusPill>
        ) : (
          <StatusPill tone="ok">All done</StatusPill>
        )}
      </div>
      <ul className="mt-3 divide-y divide-line">
        {c.items.map((i) => (
          <ChecklistRow key={i.item} location={location} item={i} done={c.done[i.item]} />
        ))}
      </ul>
    </article>
  );
}

function ChecklistRow({
  location,
  item,
  done,
}: {
  location: string;
  item: ChecklistItem;
  done: { done_at: string | null; note: string | null } | undefined;
}) {
  const client = useQueryClient();
  const [note, setNote] = useState(done?.note ?? "");
  const [msg, setMsg] = useState("");
  const run = useMutation({
    mutationFn: (on: boolean) => check(location, item.item, on, note.trim() || null),
    onSuccess: () => {
      setMsg("");
      void client.invalidateQueries({ queryKey: ["staff-founding-checklist", location] });
    },
    onError: (e) => setMsg(e instanceof Error ? e.message : String(e)),
  });
  const applies = item.applies !== false;
  const isDone = !!done?.done_at;
  const noteId = `f25-note-${location}-${item.item}`;
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <Switch
        checked={isDone}
        disabled={run.isPending || !applies}
        onChange={(on) => run.mutate(on)}
        label={item.label}
        description={
          !applies
            ? "Does not apply to this business."
            : isDone
              ? `Done ${fmtDate(done!.done_at!)}${done?.note ? `. ${done.note}` : ""}`
              : item.found
                ? `Kabsi found ${item.found}.`
                : "Kabsi found nothing to do."
        }
      />
      {applies && !isDone ? (
        <div className="mt-2">
          <label htmlFor={noteId} className="sr-only">
            Note for {item.label}
          </label>
          <input
            id={noteId}
            value={note}
            maxLength={300}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional), saved when you tick it"
            className="h-11 w-full rounded-input border border-stroke bg-surface-1 px-3 text-small text-text-1 placeholder:text-text-3"
          />
        </div>
      ) : null}
      {msg ? (
        <p className="mt-2 text-small text-bad" role="alert">
          {msg}
        </p>
      ) : null}
    </li>
  );
}
