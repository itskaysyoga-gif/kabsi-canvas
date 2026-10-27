import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/kabsi/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addDays, fmt, localToday, range, times } from "@/lib/hours-format";
import { contentCall } from "@/lib/reviews";
import { track } from "@/lib/telemetry";

// Special days (P0.5-03, D202): a holiday, a late night or a closure. The owner confirms the exact dates and times
// before anything changes on Google; the approval goes through the one publication pipeline.
export function SpecialHoursForm({
  locationId,
  onDone,
}: {
  locationId: string;
  onDone: () => unknown;
}) {
  const today = localToday();
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [closed, setClosed] = useState(true);
  const [open, setOpen] = useState("09:00");
  const [close, setClose] = useState("17:00");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  // Set synchronously so a fast double click cannot start two saves before the button re-renders as disabled.
  const sending = useRef(false);
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
      return setErr(
        "Closing time must be after opening time. For hours past midnight, close at 00:00.",
      );
    setConfirming(true);
  }
  async function confirm() {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setErr("");
    try {
      await contentCall({ do: "hours_publish", location_id: locationId, ...summary, reason });
      track("special_hours_approved", { channel: "dashboard" });
      setMsg("Approved. Kabsi sends it to Google within a few minutes.");
      setConfirming(false);
      setReason("");
      onDone();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Couldn't save. Nothing changed on Google.");
    }
    sending.current = false;
    setBusy(false);
  }

  return (
    <form onSubmit={review} className="mt-4">
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
            className={`min-h-11 rounded-full border px-2 text-small font-bold ${closed === c ? "border-text-1 bg-text-1 text-surface-0" : "border-line-strong text-text-1"}`}
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
      <Label htmlFor="reason" className="mt-4 block text-small">
        Note for yourself <span className="text-text-2">(optional, not shown on Google)</span>
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
        <p className="mt-3 text-small font-semibold text-bad" role="alert">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="mt-3 text-small text-ok" role="status">
          {msg}
        </p>
      ) : null}
      {confirming ? (
        <div className="mt-5 rounded-inner border border-line-strong bg-surface-2 p-4">
          <p className="text-small text-text-2">Google will show:</p>
          <p className="mt-1 text-body font-bold text-text-1">
            {range(summary)}: {times(summary)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="md" data-main-cta loading={busy} onClick={() => void confirm()}>
              Confirm and save to Google
            </Button>
            <Button
              size="md"
              variant="secondary"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Change
            </Button>
          </div>
        </div>
      ) : (
        <Button type="submit" size="md" variant="secondary" className="mt-5">
          Review
        </Button>
      )}
    </form>
  );
}

// "Closed for a while" (P0.5-03): the owner says when the business closes and the day it opens again. Google has no
// reopening date, so Kabsi sets the days in between as closed special hours: Google shows the business closed on those
// days and open again on the reopening date.
export function ClosureForm({ locationId, onDone }: { locationId: string; onDone: () => unknown }) {
  const today = localToday();
  const [start, setStart] = useState(today);
  const [reopen, setReopen] = useState(addDays(today, 8));
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const lastClosedDay = addDays(reopen, -1);

  function review(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    if (reopen <= start) return setErr("The reopening date must be after the first day closed.");
    setErr("");
    setConfirming(true);
  }
  async function confirm() {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setErr("");
    try {
      await contentCall({
        do: "hours_publish",
        location_id: locationId,
        start_date: start,
        end_date: lastClosedDay,
        closed: true,
        reason,
      });
      track("special_hours_approved", { channel: "dashboard", source: "closure" });
      setMsg("Approved. Kabsi sends it to Google within a few minutes.");
      setConfirming(false);
      setReason("");
      onDone();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Couldn't save. Nothing changed on Google.");
    }
    sending.current = false;
    setBusy(false);
  }

  return (
    <form onSubmit={review} className="mt-4">
      <p className="text-small text-text-2">
        Closing for a refit, a holiday or a break? Say the first day you are closed and the day you
        open again.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="closure-start">First day closed</Label>
          <Input
            id="closure-start"
            type="date"
            min={today}
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              if (reopen <= e.target.value) setReopen(addDays(e.target.value, 1));
              setConfirming(false);
            }}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="closure-reopen">Open again on</Label>
          <Input
            id="closure-reopen"
            type="date"
            min={addDays(start, 1)}
            value={reopen}
            onChange={(e) => {
              setReopen(e.target.value);
              setConfirming(false);
            }}
            className="mt-2"
          />
        </div>
      </div>
      <Label htmlFor="closure-reason" className="mt-4 block text-small">
        Note for yourself <span className="text-text-2">(optional, not shown on Google)</span>
      </Label>
      <Input
        id="closure-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={120}
        placeholder="e.g. Kitchen refit"
        className="mt-2"
      />
      {err ? (
        <p className="mt-3 text-small font-semibold text-bad" role="alert">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="mt-3 text-small text-ok" role="status">
          {msg}
        </p>
      ) : null}
      {confirming ? (
        <div className="mt-5 rounded-inner border border-line-strong bg-surface-2 p-4">
          <p className="text-small text-text-2">Google will show:</p>
          <p className="mt-1 text-body font-bold text-text-1">
            {range({ start_date: start, end_date: lastClosedDay })}: Closed
          </p>
          <p className="text-small">Your usual hours again from {fmt(reopen)}.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="md" data-main-cta loading={busy} onClick={() => void confirm()}>
              Confirm and save to Google
            </Button>
            <Button
              size="md"
              variant="secondary"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Change
            </Button>
          </div>
        </div>
      ) : (
        <Button type="submit" size="md" variant="secondary" className="mt-5">
          Review
        </Button>
      )}
    </form>
  );
}
