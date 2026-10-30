import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate } from "@/lib/format";
import {
  EVIDENCE_SOURCES,
  EVIDENCE_TYPES,
  evidenceCsv,
  sourceLabel,
  typeLabel,
  type EvidenceRow,
} from "@/lib/evidence";
import { supabase } from "@/lib/supabase";
import { Button, STAFF_CARD, STAFF_H2, STAFF_ITEM } from "./staff-ui";

// The staff evidence log (30.19 section 3 item 3): what owners ask for that Kabsi does not do, repeated problems, time saved,
// missed enquiries or sales, and support given, in the owner's own words where there are some. Staff add rows by hand; Nora adds
// one when a hand-off to a person was about something Kabsi does not do. Staff only, kept 24 months, one CSV export.
async function loadRows(): Promise<EvidenceRow[]> {
  const { data, error } = await supabase
    .from("staff_evidence" as never)
    .select("id, location_id, business_name, observed_on, source, type, words, created_at")
    .order("observed_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error((error as { message: string }).message);
  return (data ?? []) as unknown as EvidenceRow[];
}

const today = () => new Date().toISOString().slice(0, 10);
const OTHER = "other";

export function EvidencePanel({ businesses }: { businesses: { id: string; name: string }[] }) {
  const queryClient = useQueryClient();
  const rows = useQuery({ queryKey: ["staff-evidence"], queryFn: loadRows });
  const [which, setWhich] = useState(OTHER);
  const [typed, setTyped] = useState("");
  const [date, setDate] = useState(today());
  const [source, setSource] = useState<string>("call");
  const [type, setType] = useState<string>("request");
  const [words, setWords] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const names = Object.fromEntries(businesses.map((b) => [b.id, b.name]));

  async function add(e: FormEvent) {
    e.preventDefault();
    if (which === OTHER && !typed.trim()) return setMsg("Write the business name.");
    setBusy(true);
    setMsg("");
    const { error } = await supabase.rpc(
      "staff_evidence_add" as never,
      {
        p_location: which === OTHER ? null : which,
        p_business: which === OTHER ? typed : null,
        p_observed_on: date,
        p_source: source,
        p_type: type,
        p_words: words,
      } as never,
    );
    setBusy(false);
    if (error) return setMsg("Couldn't save. Check the fields and try again.");
    setWords("");
    setTyped("");
    setMsg("Saved.");
    await queryClient.invalidateQueries({ queryKey: ["staff-evidence"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.rpc("staff_evidence_delete" as never, { p_id: id } as never);
    if (error) return setMsg("Couldn't delete that row.");
    await queryClient.invalidateQueries({ queryKey: ["staff-evidence"] });
  }

  function exportCsv() {
    const blob = new Blob(["\uFEFF", evidenceCsv(rows.data ?? [], names)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kabsi-evidence-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section id="evidence" className={STAFF_CARD}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={STAFF_H2}>Evidence log</h2>
        <Button size="compact" variant="outline" disabled={!rows.data?.length} onClick={exportCsv}>
          <Download aria-hidden /> Export CSV
        </Button>
      </div>
      <p className="mt-1 text-small text-text-2">
        One row for each thing an owner asks for that Kabsi does not do, a repeated problem, time
        saved, a missed enquiry or sale, or support given. Write the owner&apos;s own words when
        there are some. Kept 24 months.
      </p>
      <form
        onSubmit={(e) => void add(e)}
        className={`${STAFF_ITEM} mt-4 grid gap-3 sm:grid-cols-2`}
      >
        <div>
          <Label htmlFor="ev-business">Business</Label>
          <select
            id="ev-business"
            value={which}
            onChange={(e) => setWhich(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-inner border border-line-strong bg-surface-1 px-3 text-body"
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
            <option value={OTHER}>Another business</option>
          </select>
        </div>
        {which === OTHER ? (
          <div>
            <Label htmlFor="ev-name">Business name</Label>
            <Input
              id="ev-name"
              value={typed}
              maxLength={200}
              onChange={(e) => setTyped(e.target.value)}
            />
          </div>
        ) : null}
        <div>
          <Label htmlFor="ev-date">Date</Label>
          <Input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ev-source">Source</Label>
          <select
            id="ev-source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-inner border border-line-strong bg-surface-1 px-3 text-body"
          >
            {EVIDENCE_SOURCES.map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="ev-type">Type</Label>
          <select
            id="ev-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-inner border border-line-strong bg-surface-1 px-3 text-body"
          >
            {EVIDENCE_TYPES.map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="ev-words">The owner&apos;s own words</Label>
          <Textarea
            id="ev-words"
            value={words}
            maxLength={1000}
            onChange={(e) => setWords(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" size="compact" variant="outline" disabled={busy}>
            Add the row
          </Button>
          {msg ? <p className="text-small text-text-2">{msg}</p> : null}
        </div>
      </form>
      <div className="mt-4 space-y-3">
        {rows.isLoading ? <p className="text-small text-text-2">Loading</p> : null}
        {rows.isError ? (
          <p className="text-small text-bad">
            The evidence log did not load.{" "}
            <button type="button" className="underline" onClick={() => void rows.refetch()}>
              Try again
            </button>
          </p>
        ) : null}
        {rows.data?.length === 0 ? (
          <p className="text-small text-text-2">Nothing written yet.</p>
        ) : null}
        {rows.data?.slice(0, 50).map((r) => (
          <div key={r.id} className={STAFF_ITEM}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="min-w-0 font-bold">
                {r.business_name ??
                  (r.location_id ? (names[r.location_id] ?? "A business") : "A business")}
              </p>
              <button
                type="button"
                className="text-small text-text-2 underline"
                onClick={() => {
                  if (window.confirm("Delete this row? It cannot be put back.")) void remove(r.id);
                }}
              >
                Delete
              </button>
            </div>
            <p className="text-small text-text-2">
              {fmtDate(r.observed_on)} · {sourceLabel(r.source)} · {typeLabel(r.type)}
            </p>
            {r.words ? <p className="mt-2 whitespace-pre-wrap text-body">{r.words}</p> : null}
          </div>
        ))}
        {(rows.data?.length ?? 0) > 50 ? (
          <p className="text-small text-text-2">
            The newest 50 are shown. The export holds the newest 1000.
          </p>
        ) : null}
      </div>
    </section>
  );
}
