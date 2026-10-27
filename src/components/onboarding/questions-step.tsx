import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WhatsappChannel } from "@/components/app/whatsapp-channel";
import { StepClip } from "@/components/onboarding/step-clip";
import { ErrorNote, StepTitle } from "@/components/onboarding/onboarding-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadKnowledge, saveFact, verifiedValues } from "@/lib/knowledge";
import { friendlyError, setStep, type Location } from "@/lib/onboarding";
import {
  QUESTIONS_FIVE,
  SKIP_DEFAULTS,
  TONE_EXAMPLES,
  answerProblem,
  factsToSave,
  nothingAnswered,
  type Answers,
  type ToneValue,
} from "@/lib/questions";
import { cn } from "@/lib/utils";

/**
 * Step 4 of six: five quick questions while Kabsi waits for access (K-45, K-141). Skippable, one by one or all together, with
 * safe defaults; each answer is saved as a verified fact the owner gave. Beside them a card to connect WhatsApp, which says
 * "coming soon" while Kabsi has no WhatsApp number and never blocks the step. Nobody waits on a spinner.
 */
export function QuestionsStep({
  location,
  onChanged,
}: {
  location: Location;
  onChanged: () => Promise<unknown>;
}) {
  const qc = useQueryClient();
  const knowledge = useQuery({
    queryKey: ["knowledge", location.id],
    queryFn: () => loadKnowledge(location.id),
  });
  if (knowledge.isLoading) return <p className="text-text-2">Loading…</p>;
  const current = verifiedValues(knowledge.data?.facts ?? []);
  return (
    <QuestionsForm
      location={location}
      initial={{
        ...(typeof current.signature === "string" ? { signature: current.signature } : {}),
        ...(typeof current.tone === "string" ? { tone: current.tone as ToneValue } : {}),
        ...(typeof current.contact_phone === "string" ? { contact: current.contact_phone } : {}),
        ...(typeof current.mention === "string" ? { love: current.mention } : {}),
        ...(typeof current.avoid === "string" ? { never: current.avoid } : {}),
      }}
      onDone={async () => {
        await qc.invalidateQueries({ queryKey: ["knowledge", location.id] });
        await onChanged();
      }}
    />
  );
}

function QuestionsForm({
  location,
  initial,
  onDone,
}: {
  location: Location;
  initial: Answers;
  onDone: () => Promise<unknown>;
}) {
  const [answers, setAnswers] = useState<Answers>(initial);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const granted = Boolean(location.access_granted_at);

  async function finish(save: boolean) {
    setError("");
    setTouched(true);
    if (
      save &&
      QUESTIONS_FIVE.some((q) => answerProblem(q, q.id === "tone" ? answers.tone : answers[q.id]))
    )
      return;
    setBusy(true);
    try {
      if (save) {
        // Only what is new: an unchanged answer is not a new version of the fact.
        for (const f of factsToSave(answers)) {
          const was = f.id === "tone" ? initial.tone : initial[f.id];
          if (was !== f.value) await saveFact(location.id, f.field, f.value);
        }
      }
      await setStep(location.id, "confirm");
      await onDone();
    } catch (e) {
      setError(friendlyError(e));
    }
    setBusy(false);
  }

  return (
    <>
      <StepTitle
        title="Five quick questions"
        sub={
          granted
            ? "Kabsi has access. These make replies sound like you. Skip any of them and Kabsi uses safe defaults."
            : "While you wait for access: these make replies sound like you. Skip any of them and Kabsi uses safe defaults."
        }
      />
      <StepClip clip="questions" label="The five questions, in 20 seconds" />
      <div className="space-y-6">
        {QUESTIONS_FIVE.map((q) =>
          q.id === "tone" ? (
            <fieldset key={q.id}>
              <legend className="text-small font-bold">{q.label}</legend>
              <div className="mt-2 space-y-2">
                {TONE_EXAMPLES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    aria-pressed={answers.tone === t.value}
                    onClick={() =>
                      setAnswers((a) => {
                        const { tone: _was, ...rest } = a;
                        return a.tone === t.value ? rest : { ...rest, tone: t.value };
                      })
                    }
                    className={cn(
                      "block min-h-14 w-full rounded-card border-2 p-3 text-left",
                      answers.tone === t.value
                        ? "border-text-1 bg-surface-2"
                        : "border-line hover:border-stroke",
                    )}
                  >
                    <span className="block font-bold">{t.label}</span>
                    <span className="mt-0.5 block text-small leading-6 text-text-2">
                      &ldquo;{t.example}&rdquo;
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          ) : (
            <div key={q.id}>
              <Label htmlFor={`q-${q.id}`} className="text-small font-bold">
                {q.label}
              </Label>
              {q.hint ? <p className="mt-1 text-small leading-6 text-text-2">{q.hint}</p> : null}
              <Input
                id={`q-${q.id}`}
                type={q.type ?? "text"}
                inputMode={q.type === "tel" ? "tel" : undefined}
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                placeholder={q.placeholder}
                maxLength={q.max + 20}
                className="mt-2 h-[52px] rounded-card px-4 text-body"
                aria-invalid={touched && !!answerProblem(q, answers[q.id])}
              />
              {touched && answerProblem(q, answers[q.id]) ? (
                <p role="alert" className="mt-1 text-small text-bad">
                  {answerProblem(q, answers[q.id])}
                </p>
              ) : null}
            </div>
          ),
        )}
      </div>

      <section className="mt-8" aria-label="WhatsApp">
        <h2 className="text-title font-bold">Get your reviews on WhatsApp</h2>
        <WhatsappChannel />
      </section>

      <details className="mt-5 text-small leading-6 text-text-2">
        <summary className="min-h-11 cursor-pointer font-medium text-text-1">
          If you skip a question
        </summary>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {SKIP_DEFAULTS.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </details>

      <ErrorNote message={error} />
      <Button className="mt-6 w-full" onClick={() => void finish(true)} disabled={busy}>
        {busy ? "Saving…" : nothingAnswered(answers) ? "Continue" : "Save and continue"}
      </Button>
      <Button
        variant="link"
        className="mt-4 w-full"
        onClick={() => void finish(false)}
        disabled={busy}
      >
        Skip for now
      </Button>
    </>
  );
}
