import { useRef, useState } from "react";
import { Button } from "@/components/kabsi/ui";
import { Input } from "@/components/ui/input";
import { contentCall } from "@/lib/reviews";
import { track } from "@/lib/telemetry";
import {
  cloneWeek,
  DAY_KEYS,
  DAY_LABEL,
  MAX_PERIODS_PER_DAY,
  sameWeek,
  validateWeek,
  weekSummary,
  type DayKey,
  type Week,
} from "@/lib/hours";

// The weekly opening hours (P0.5-03, K-21). Choosing "Review" shows the week in words; "Confirm and save to Google"
// is the owner's approval of exactly that week. The server checks it again, makes it the hours Google Protection
// watches from now on and sends it after the undo window.
export function WeekEditor({
  locationId,
  initial,
  onDone,
  onClose,
}: {
  locationId: string;
  initial: Week;
  onDone: () => unknown;
  /** Back to the week as it is, without saving. */
  onClose?: (() => void) | undefined;
}) {
  const [week, setWeek] = useState<Week>(() => cloneWeek(initial));
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const changed = !sameWeek(week, initial);

  const edit = (fn: (w: Week) => void) => {
    setWeek((w) => {
      const next = cloneWeek(w);
      fn(next);
      return next;
    });
    setConfirming(false);
    setMsg("");
    setErr("");
  };
  const toggle = (day: DayKey, open: boolean) =>
    edit((w) => {
      w[day] = open ? [{ open: "09:00", close: "17:00" }] : [];
    });

  function review() {
    setMsg("");
    const problem = validateWeek(week);
    if (problem) return setErr(problem);
    setErr("");
    setConfirming(true);
  }
  async function confirm() {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setErr("");
    try {
      const r = await contentCall<{ state: string }>({
        do: "hours_regular",
        location_id: locationId,
        week,
      });
      if (r.state === "unchanged") {
        setMsg("These are already your approved hours. Nothing was sent.");
      } else {
        track("special_hours_approved", { channel: "dashboard", source: "regular_hours" });
        setMsg(
          "Approved. Kabsi sends it to Google in a few seconds and checks that it shows. You can undo it until then.",
        );
        onDone();
      }
      setConfirming(false);
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Couldn't save. Nothing changed on Google.");
    }
    sending.current = false;
    setBusy(false);
  }

  return (
    <div>
      <ul className="divide-y divide-line">
        {DAY_KEYS.map((day) => {
          const periods = week[day];
          const open = periods.length > 0;
          return (
            <li key={day} className="py-4 first:pt-0">
              <div className="flex items-center justify-between gap-3">
                <p className="text-body font-bold text-text-1">{DAY_LABEL[day]}</p>
                <div
                  className="grid grid-cols-2 gap-1"
                  role="group"
                  aria-label={`${DAY_LABEL[day]} open or closed`}
                >
                  {[true, false].map((o) => (
                    <button
                      key={String(o)}
                      type="button"
                      aria-pressed={open === o}
                      onClick={() => open !== o && toggle(day, o)}
                      className={`min-h-11 min-w-20 rounded-full border px-3 text-small font-bold ${open === o ? "border-text-1 bg-text-1 text-surface-0" : "border-line-strong text-text-1"}`}
                    >
                      {o ? "Open" : "Closed"}
                    </button>
                  ))}
                </div>
              </div>
              {open ? (
                <div className="mt-3 space-y-2">
                  {periods.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        type="time"
                        aria-label={`${DAY_LABEL[day]} opens`}
                        value={p.open}
                        onChange={(e) => edit((w) => void (w[day][i]!.open = e.target.value))}
                      />
                      <span className="text-small text-text-2">to</span>
                      <Input
                        type="time"
                        aria-label={`${DAY_LABEL[day]} closes`}
                        value={p.close}
                        onChange={(e) => edit((w) => void (w[day][i]!.close = e.target.value))}
                      />
                      {periods.length > 1 ? (
                        <button
                          type="button"
                          aria-label={`Remove this period on ${DAY_LABEL[day]}`}
                          onClick={() => edit((w) => void w[day].splice(i, 1))}
                          className="grid size-11 shrink-0 place-items-center rounded-full text-text-2 hover:bg-surface-2 hover:text-text-1"
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-x-4">
                    {periods.length < MAX_PERIODS_PER_DAY ? (
                      <button
                        type="button"
                        onClick={() =>
                          edit((w) => void w[day].push({ open: "14:00", close: "18:00" }))
                        }
                        className="min-h-11 text-small font-bold underline underline-offset-4"
                      >
                        Add more hours
                      </button>
                    ) : null}
                    {day === "MONDAY" ? (
                      <button
                        type="button"
                        onClick={() =>
                          edit((w) => {
                            for (const d of DAY_KEYS) w[d] = w.MONDAY.map((p) => ({ ...p }));
                          })
                        }
                        className="min-h-11 text-small font-bold underline underline-offset-4"
                      >
                        Same hours every day
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-small text-text-2">
        To stay open past midnight, set the closing time after midnight (for example 02:00). Closing
        at 00:00 means the end of that day.
      </p>
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
          <ul className="mt-1 space-y-0.5 text-body font-bold text-text-1">
            {weekSummary(week).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
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
        <div className="mt-5 flex flex-wrap gap-2">
          <Button size="md" variant="secondary" disabled={!changed} onClick={review}>
            Review
          </Button>
          {onClose ? (
            <Button size="md" variant="tertiary" onClick={onClose}>
              Cancel
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
