import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { myLatestLocation } from "@/lib/onboarding";
import { contentCall } from "@/lib/reviews";
import { track } from "@/lib/telemetry";

// Special hours: holidays, closures, late nights. The owner confirms the exact dates and times before
// anything changes on Google (D202). Regular weekly hours are not changed here.
export const Route = createFileRoute("/_authenticated/app/hours")({
  head: () => ({ meta: [{ title: "Hours — Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: HoursPage,
});

type Row = {
  id: string;
  start_date: string;
  end_date: string;
  closed: boolean;
  open_time: string | null;
  close_time: string | null;
  reason: string | null;
  state: string;
};

async function loadHours(locationId: string): Promise<Row[]> {
  const { data, error } = await supabase
    .from("special_hours")
    .select("id, start_date, end_date, closed, open_time, close_time, reason, state")
    .eq("location_id", locationId)
    .order("start_date", { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}
const fmt = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
const range = (r: { start_date: string; end_date: string }) =>
  r.start_date === r.end_date ? fmt(r.start_date) : `${fmt(r.start_date)} to ${fmt(r.end_date)}`;
const times = (r: { closed: boolean; open_time: string | null; close_time: string | null }) =>
  r.closed ? "Closed" : `${r.open_time?.slice(0, 5)} to ${r.close_time?.slice(0, 5)}`;

function HoursPage() {
  const queryClient = useQueryClient();
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const rows = useQuery({
    queryKey: ["hours", loc?.id],
    queryFn: () => loadHours(loc!.id),
    enabled: !!loc,
  });
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 sm:py-12">
      <h1 className="font-display text-4xl leading-none sm:text-5xl">Hours</h1>
      <p className="mt-2 text-kb-stone">
        Closed for a holiday or open late? Set special hours so Google shows the right times.
      </p>
      {!location.isLoading && !loc ? (
        <Button asChild className="mt-6">
          <Link to="/start">Add your business</Link>
        </Button>
      ) : null}
      {loc && loc.status === "active" ? (
        <HoursForm
          locationId={loc.id}
          onDone={() => queryClient.invalidateQueries({ queryKey: ["hours"] })}
        />
      ) : loc ? (
        <p className="mt-6 text-kb-stone">Hours can be set once your business is active.</p>
      ) : null}
      {rows.data?.length ? (
        <div className="mt-10">
          <h2 className="text-lg font-bold">Set with Kabsi</h2>
          <div className="mt-3 space-y-2">
            {rows.data.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-card bg-kb-white p-4 shadow-kb"
              >
                <div>
                  <p className="font-medium">{range(r)}</p>
                  <p className="text-sm text-kb-stone">
                    {times(r)}
                    {r.reason ? ` · ${r.reason}` : ""}
                  </p>
                </div>
                <span className="text-xs font-bold uppercase text-kb-stone">
                  {r.state === "posted"
                    ? "On Google"
                    : r.state === "failed"
                      ? "Not saved"
                      : r.state}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HoursForm({ locationId, onDone }: { locationId: string; onDone: () => unknown }) {
  const today = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [closed, setClosed] = useState(true);
  const [open, setOpen] = useState("09:00");
  const [close, setClose] = useState("17:00");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const summary = {
    start_date: start,
    end_date: end < start ? start : end,
    closed,
    open_time: closed ? null : open,
    close_time: closed ? null : close,
  };

  function review(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (!closed && close <= open && close !== "00:00")
      return setErr("Closing time must be after opening time.");
    setConfirming(true);
  }
  async function confirm() {
    setBusy(true);
    setErr("");
    try {
      await contentCall({ do: "hours_publish", location_id: locationId, ...summary, reason });
      track("special_hours_approved", { channel: "dashboard" });
      setMsg("Saved on your Google profile.");
      setConfirming(false);
      setReason("");
      onDone();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Couldn't save. Nothing changed on Google.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={review} className="mt-7 rounded-large bg-kb-white p-6 shadow-kb sm:p-7">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="start">From</Label>
          <Input
            id="start"
            type="date"
            min={today}
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              if (end < e.target.value) setEnd(e.target.value);
              setConfirming(false);
            }}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="end">To</Label>
          <Input
            id="end"
            type="date"
            min={start}
            value={end}
            onChange={(e) => {
              setEnd(e.target.value);
              setConfirming(false);
            }}
            className="mt-2"
          />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {[true, false].map((c) => (
          <button
            key={String(c)}
            type="button"
            aria-pressed={closed === c}
            onClick={() => {
              setClosed(c);
              setConfirming(false);
            }}
            className={`h-11 rounded-card border-2 text-sm font-bold ${closed === c ? "border-kb-black bg-kb-sand" : "border-kb-hairline"}`}
          >
            {c ? "Closed" : "Open, different hours"}
          </button>
        ))}
      </div>
      {!closed ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="open">Opens</Label>
            <Input
              id="open"
              type="time"
              value={open}
              onChange={(e) => {
                setOpen(e.target.value);
                setConfirming(false);
              }}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="close">Closes</Label>
            <Input
              id="close"
              type="time"
              value={close}
              onChange={(e) => {
                setClose(e.target.value);
                setConfirming(false);
              }}
              className="mt-2"
            />
          </div>
        </div>
      ) : null}
      <Label htmlFor="reason" className="mt-4 block text-sm">
        Note for yourself <span className="text-kb-stone">(optional, not shown on Google)</span>
      </Label>
      <Input
        id="reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={120}
        placeholder="e.g. Independence Day"
        className="mt-2"
      />
      {err ? (
        <p className="mt-3 text-sm text-kb-red" role="alert">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="mt-3 text-sm text-kb-green" role="status">
          {msg}
        </p>
      ) : null}
      {confirming ? (
        <div className="mt-5 rounded-card border-2 border-kb-black p-4">
          <p className="text-sm">Google will show:</p>
          <p className="mt-1 font-bold">
            {range(summary)}: {times(summary)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => void confirm()}>
              {busy ? "Saving…" : "Confirm and save to Google"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Change
            </Button>
          </div>
        </div>
      ) : (
        <Button type="submit" className="mt-5 w-full">
          Review
        </Button>
      )}
    </form>
  );
}
