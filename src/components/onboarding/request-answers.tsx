import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Field } from "@/components/kabsi/ui";
import { ErrorNote, StepTitle } from "@/components/onboarding/onboarding-shell";
import { friendlyError } from "@/lib/onboarding";
import {
  APP_NAME_LABEL,
  APP_NAME_MAX,
  NO_ANSWERS,
  Q_EARLY,
  Q_TRACKING,
  TRACKING_CHOICES,
  loadRequestAnswers,
  sameAnswers,
  saveRequestAnswers,
  skipRequestAnswers,
  type RequestAnswers,
} from "@/lib/request-answers";
import { cn } from "@/lib/utils";

// Onboarding 1 (master plan 30.48, R-145): two optional questions, words in docs/COPY.md section 73. Signed in only. One
// form, two places: onboarding (right after the business is chosen; Continue or Skip) and About your business (change or
// clear later). Both questions can be left alone. Nothing is sent because of an answer.

function Choice({
  name,
  checked,
  label,
  onChange,
}: {
  name: string;
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label
      className={cn(
        "flex min-h-13 cursor-pointer items-center gap-3 rounded-inner border px-4 py-3 text-body",
        checked ? "border-text-1 bg-surface-1" : "border-line-strong",
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="size-5 shrink-0 accent-text-1"
      />
      {label}
    </label>
  );
}

/** The two questions. `clearable` adds "Clear answer" under each (About your business). */
export function RequestQuestions({
  value,
  onChange,
  clearable = false,
  idPrefix,
}: {
  value: RequestAnswers;
  onChange: (next: RequestAnswers) => void;
  clearable?: boolean;
  idPrefix: string;
}) {
  return (
    <div data-testid="request-questions">
      <fieldset>
        <legend className="text-title font-bold">{Q_TRACKING}</legend>
        <div className="mt-3 grid gap-2">
          {TRACKING_CHOICES.map(([v, label]) => (
            <Choice
              key={v}
              name={`${idPrefix}-tracking`}
              checked={value.tracking === v}
              label={label}
              onChange={() =>
                onChange({ ...value, tracking: v, app: v === "booking_app" ? value.app : "" })
              }
            />
          ))}
        </div>
        {value.tracking === "booking_app" ? (
          <Field
            className="mt-3"
            label={APP_NAME_LABEL}
            value={value.app}
            maxLength={APP_NAME_MAX}
            autoComplete="off"
            onChange={(e) => onChange({ ...value, app: e.target.value })}
          />
        ) : null}
        {clearable && value.tracking ? (
          <Button
            type="button"
            variant="tertiary"
            className="mt-2"
            onClick={() => onChange({ ...value, tracking: null, app: "" })}
          >
            Clear answer
          </Button>
        ) : null}
      </fieldset>
      <fieldset className="mt-8">
        <legend className="text-title font-bold">{Q_EARLY}</legend>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Choice
            name={`${idPrefix}-early`}
            checked={value.early === true}
            label="Yes"
            onChange={() => onChange({ ...value, early: true })}
          />
          <Choice
            name={`${idPrefix}-early`}
            checked={value.early === false}
            label="No"
            onChange={() => onChange({ ...value, early: false })}
          />
        </div>
        {clearable && value.early !== null ? (
          <Button
            type="button"
            variant="tertiary"
            className="mt-2"
            onClick={() => onChange({ ...value, early: null })}
          >
            Clear answer
          </Button>
        ) : null}
      </fieldset>
    </div>
  );
}

/**
 * The onboarding screen, right after the business is chosen and confirmed. Continue saves what is chosen, Skip saves
 * nothing; either way the questions are marked as done and the next step opens.
 */
export function RequestQuestionsStage({
  locationId,
  onDone,
}: {
  locationId: string;
  onDone: () => Promise<unknown>;
}) {
  const [value, setValue] = useState<RequestAnswers>(NO_ANSWERS);
  const [busy, setBusy] = useState<"continue" | "skip" | null>(null);
  const [error, setError] = useState("");

  async function go(kind: "continue" | "skip") {
    setError("");
    setBusy(kind);
    try {
      if (kind === "skip") await skipRequestAnswers(locationId);
      else await saveRequestAnswers(locationId, value);
      await onDone();
    } catch (e) {
      setError(friendlyError(e));
    }
    setBusy(null);
  }

  return (
    <>
      <StepTitle
        title="Two quick questions"
        sub="Both are optional. You can skip them, and change your answers any time in About your business."
      />
      <RequestQuestions value={value} onChange={setValue} idPrefix="onboarding" />
      <ErrorNote message={error} />
      <div className="mt-8 flex flex-col items-stretch gap-3" data-main-cta>
        <Button
          full
          onClick={() => void go("continue")}
          loading={busy === "continue"}
          disabled={busy !== null}
        >
          Continue
        </Button>
        <Button
          full
          variant="tertiary"
          onClick={() => void go("skip")}
          loading={busy === "skip"}
          disabled={busy !== null}
        >
          Skip
        </Button>
      </div>
    </>
  );
}

/** About your business: the same two questions, with their saved answers, to change or clear. */
export function RequestAnswersCard({ locationId }: { locationId: string }) {
  const qc = useQueryClient();
  const saved = useQuery({
    queryKey: ["request-answers", locationId],
    queryFn: () => loadRequestAnswers(locationId),
  });
  const [draft, setDraft] = useState<RequestAnswers | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (saved.isLoading || saved.isError) return null;
  const value = draft ?? saved.data ?? NO_ANSWERS;
  const changed = draft !== null && !sameAnswers(draft, saved.data ?? NO_ANSWERS);

  async function save() {
    setError("");
    setDone(false);
    setBusy(true);
    try {
      await saveRequestAnswers(locationId, value);
      await qc.invalidateQueries({ queryKey: ["request-answers", locationId] });
      setDraft(null);
      setDone(true);
    } catch (e) {
      setError(friendlyError(e));
    }
    setBusy(false);
  }

  return (
    <section
      className="mt-8 rounded-card border border-line bg-surface-1 p-5"
      aria-labelledby="request-answers-title"
    >
      <h2 id="request-answers-title" className="font-display text-h3 font-bold">
        Two questions from setup
      </h2>
      <p className="mt-2 text-body text-text-2">
        Both are optional. Change or clear them any time.
      </p>
      <div className="mt-6">
        <RequestQuestions
          value={value}
          onChange={(next) => {
            setDone(false);
            setDraft(next);
          }}
          clearable
          idPrefix="about"
        />
      </div>
      <ErrorNote message={error} />
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => void save()}
          loading={busy}
          disabled={!changed}
        >
          Save answers
        </Button>
        {done ? (
          <p role="status" className="text-small font-semibold text-text-2">
            Saved.
          </p>
        ) : null}
      </div>
    </section>
  );
}
