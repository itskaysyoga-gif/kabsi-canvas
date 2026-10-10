import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtDate } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { KABSI_GROUP_ID } from "@/lib/site";

// Staff follow-ups. google_access_removal (K-41, P0.2-02): an owner disconnected Kabsi and Google did not let Kabsi
// remove its own Manager access, or the business is handled by hand. Google's limit is 7 business days from the
// request; the due date says when. Closing one marks access removed and emails the owner (staff_complete_followup).
// google_support (K-19, P0.2-04): Google changed a detail again after Kabsi put the owner's approved value back twice
// in 30 days; a person contacts Google Business Profile support. The detail says what to tell Google.
type Followup = {
  id: string;
  kind: string;
  location_name: string;
  detail: string | null;
  due_at: string;
  created_at: string;
};

async function openFollowups(): Promise<Followup[]> {
  const { data, error } = await supabase
    .from("staff_followups")
    .select("id, kind, location_name, detail, due_at, created_at")
    .is("done_at", null)
    .order("due_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as Followup[];
}

export function FollowupsPanel() {
  const rows = useQuery({
    queryKey: ["staff-followups"],
    queryFn: openFollowups,
    refetchInterval: 60_000,
  });
  if (rows.isLoading) return null;
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold">Follow-ups</h2>
      {rows.isError ? (
        <p className="mt-1 text-sm text-kb-red">Couldn't load follow-ups. Refresh the page.</p>
      ) : !rows.data?.length ? (
        <p className="mt-1 text-sm text-kb-stone">Nothing to finish by hand.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {rows.data.map((f) => (
            <FollowupCard key={f.id} f={f} />
          ))}
        </div>
      )}
    </section>
  );
}

function FollowupCard({ f }: { f: Followup }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const late = Date.parse(f.due_at) < Date.now();
  const support = f.kind === "google_support";
  async function done() {
    setBusy(true);
    setErr("");
    const { error } = await supabase.rpc("staff_complete_followup", { p_id: f.id, p_note: note });
    setBusy(false);
    if (error) return setErr("Couldn't save. Write what you did and try again.");
    await queryClient.invalidateQueries({ queryKey: ["staff-followups"] });
  }
  return (
    <div className="rounded-large bg-kb-white p-5 shadow-kb">
      {support ? (
        <>
          <p className="font-bold">Contact Google support for {f.location_name}</p>
          <p className={late ? "mt-1 text-sm font-bold text-kb-red" : "mt-1 text-sm text-kb-stone"}>
            Due {fmtDate(f.due_at)}. Asked {fmtDate(f.created_at)}.
          </p>
          <p className="mt-2 text-sm leading-6 text-kb-stone">
            Google keeps replacing a detail the owner approved. Open a case with Google Business
            Profile support and ask Google to keep the owner&apos;s value. The values are on the
            change in Google Protection.
          </p>
        </>
      ) : (
        <>
          <p className="font-bold">Remove Kabsi from {f.location_name}</p>
          <p className={late ? "mt-1 text-sm font-bold text-kb-red" : "mt-1 text-sm text-kb-stone"}>
            Due {fmtDate(f.due_at)} (Google allows 7 business days). Asked {fmtDate(f.created_at)}.
          </p>
          <p className="mt-2 text-sm leading-6 text-kb-stone">
            In Business Profile Manager open the business, then People and access, and remove Kabsi
            Clients (group ID {KABSI_GROUP_ID}). Or ask the owner to remove it there.
          </p>
        </>
      )}
      {f.detail ? (
        <p className="mt-2 break-words text-xs text-kb-stone">Why it is here: {f.detail}</p>
      ) : null}
      <Input
        className="mt-3"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What you did, for the record"
        aria-label="What you did"
      />
      <Button
        variant="outline"
        size="compact"
        className="mt-3"
        disabled={busy || !note.trim()}
        onClick={() => void done()}
      >
        {busy ? "Saving…" : support ? "Done, Google support contacted" : "Done, Kabsi is removed"}
      </Button>
      {err ? (
        <p className="mt-2 text-sm text-kb-red" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
