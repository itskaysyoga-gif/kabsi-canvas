import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  checkAnswer,
  readBack,
  whenWords,
  type AnswerFields,
  type HolidayAnswer,
  type HolidayInfo,
} from "@/lib/holidays";

// The three answers to a holiday question (P0.5-03, K-131): normal hours, closed, or custom hours. Used on the Hours
// screen and on the email link page. Choosing an answer shows what Google will show, in words; "Confirm" is the
// approval. Custom hours are read back first. Nothing is assumed: no answer is chosen until the owner picks one.
export function HolidayAnswerForm({
  holiday,
  today,
  regularHours,
  initial = null,
  confirmLabel,
  onSubmit,
}: {
  holiday: HolidayInfo;
  /** The business's local date, "2026-12-20". */
  today: string;
  /** The approved regular hours in words, when Kabsi has them. */
  regularHours?: string | null | undefined;
  initial?: HolidayAnswer | null;
  confirmLabel?: (answer: HolidayAnswer) => string;
  /** Sends the answer. Throws a readable message when it is refused; the form shows it and keeps the choice. */
  onSubmit: (answer: HolidayAnswer, fields: AnswerFields) => Promise<void>;
}) {
  const ramadan = holiday.kind === "ramadan";
  const choices: { id: HolidayAnswer; label: string }[] = [
    { id: "normal", label: "Normal hours" },
    ...(ramadan ? [] : [{ id: "closed" as const, label: "Closed" }]),
    { id: "custom", label: ramadan ? "Different hours" : "Custom hours" },
  ];
  const [answer, setAnswer] = useState<HolidayAnswer | null>(
    initial && choices.some((c) => c.id === initial) ? initial : null,
  );
  const [open, setOpen] = useState("10:00");
  const [close, setClose] = useState("16:00");
  const [from, setFrom] = useState(holiday.starts_on < today ? today : holiday.starts_on);
  const [to, setTo] = useState(holiday.ends_on);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [err, setErr] = useState("");
  const f = { open, close, from, to };
  const problem = answer ? checkAnswer(holiday, answer, f, today) : null;

  async function confirm() {
    if (!answer || sending.current) return;
    if (problem) return setErr(problem);
    sending.current = true;
    setBusy(true);
    setErr("");
    try {
      await onSubmit(
        answer,
        answer === "normal" ? {} : { from, to, ...(answer === "custom" ? { open, close } : {}) },
      );
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Couldn't save. Nothing changed on Google.");
    }
    sending.current = false;
    setBusy(false);
  }

  return (
    <div>
      <div
        className={`mt-4 grid gap-2 ${choices.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}
        role="group"
        aria-label={`Your hours for ${holiday.name}`}
      >
        {choices.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={answer === c.id}
            onClick={() => {
              setAnswer(c.id);
              setErr("");
            }}
            className={`min-h-12 rounded-card border-2 px-2 text-small font-bold ${answer === c.id ? "border-text-1 bg-surface-2" : "border-line"}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {answer && answer !== "normal" ? (
        <div className="mt-4 space-y-3">
          {holiday.estimated ? (
            <p className="text-small leading-6 text-text-2">
              This date follows the moon. If the announced days are different, move them here.
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`h-from-${holiday.starts_on}`}>From</Label>
              <Input
                id={`h-from-${holiday.starts_on}`}
                type="date"
                min={today}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor={`h-to-${holiday.starts_on}`}>To</Label>
              <Input
                id={`h-to-${holiday.starts_on}`}
                type="date"
                min={from}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          {answer === "custom" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`h-open-${holiday.starts_on}`}>Opens</Label>
                <Input
                  id={`h-open-${holiday.starts_on}`}
                  type="time"
                  value={open}
                  onChange={(e) => setOpen(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor={`h-close-${holiday.starts_on}`}>Closes</Label>
                <Input
                  id={`h-close-${holiday.starts_on}`}
                  type="time"
                  value={close}
                  onChange={(e) => setClose(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {answer ? (
        <div className="mt-4 rounded-card border-2 border-text-1 p-4">
          <p className="text-small">
            {answer === "normal" ? "Kabsi will record:" : "Google will show:"}
          </p>
          <p className="mt-1 font-bold">
            {problem ? "Check the details above." : readBack(holiday, answer, f)}
          </p>
          {answer === "normal" && regularHours ? (
            <p className="mt-1 text-small text-text-2">Your approved hours: {regularHours}</p>
          ) : null}
          {answer === "normal" ? (
            <p className="mt-1 text-small text-text-2">Nothing changes on Google.</p>
          ) : null}
          <Button
            className="mt-4 w-full sm:w-auto"
            disabled={busy || !!problem}
            onClick={() => void confirm()}
          >
            {busy
              ? "Saving…"
              : (confirmLabel?.(answer) ??
                (answer === "normal" ? "Keep my normal hours" : "Confirm and save to Google"))}
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-small text-text-2">
          {holiday.name} {holiday.estimated ? "is expected" : "is"} on{" "}
          {whenWords(holiday.starts_on, holiday.ends_on)}. Kabsi does not assume your hours: choose
          one.
        </p>
      )}
      {err ? (
        <p className="mt-3 text-small text-bad" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
