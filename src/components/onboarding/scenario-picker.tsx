import { useState } from "react";
import { MORE_SITUATIONS, QUESTIONS, SITUATION_LABELS, type ScenarioId } from "@/lib/scenarios";
import { cn } from "@/lib/utils";

/**
 * "Something not working?" under the Manager guide (K-94). The manual route cannot read the profile, so three tappable
 * questions stand in: can you sign in, is there a Get verified button, is there a suspended or limited warning. A
 * tap that points to a situation opens its screen; the rest are one tap in a list. Nothing here asks for a code.
 */
export function ScenarioPicker({
  busy,
  onPick,
}: {
  busy: boolean;
  onPick: (id: ScenarioId) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, "yes" | "no">>({});
  const allClear = QUESTIONS.every((q) => {
    const a = answers[q.id];
    return a && (a === "yes" ? q.yes === null : q.no === null);
  });

  function answer(id: string, value: "yes" | "no") {
    const q = QUESTIONS.find((x) => x.id === id)!;
    setAnswers((a) => ({ ...a, [id]: value }));
    const target = value === "yes" ? q.yes : q.no;
    if (target) onPick(target);
  }

  return (
    <section
      aria-label="Something not working"
      className="mt-8 rounded-card border-2 border-line p-4"
    >
      <h2 className="text-title font-bold">Something not working?</h2>
      <p className="mt-1 text-small leading-6 text-text-2">
        Answer these and we show you what to do. You can come back to the steps any time.
      </p>
      <ul className="mt-4 space-y-4">
        {QUESTIONS.map((q) => (
          <li key={q.id}>
            <p className="font-medium leading-6">{q.text}</p>
            <div className="mt-2 grid grid-cols-2 gap-3" role="group" aria-label={q.text}>
              {(["yes", "no"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={busy}
                  aria-pressed={answers[q.id] === v}
                  onClick={() => answer(q.id, v)}
                  className={cn(
                    "min-h-11 rounded-pill border-2 px-4 text-body font-bold",
                    answers[q.id] === v
                      ? "border-text-1 bg-kb-black text-kb-white"
                      : "border-text-1 bg-transparent text-text-1 hover:bg-surface-2",
                  )}
                >
                  {v === "yes" ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      {allClear ? (
        <p className="mt-4 rounded-card bg-surface-2 p-3 text-small leading-6" role="status">
          Then nothing is in the way. Follow the steps above, and add Kabsi as a Manager.
        </p>
      ) : null}
      <p className="mt-5 text-small font-bold">Or it is one of these</p>
      <ul className="mt-2 space-y-2">
        {MORE_SITUATIONS.map((id) => (
          <li key={id}>
            <button
              type="button"
              disabled={busy}
              onClick={() => onPick(id)}
              className="flex min-h-11 w-full items-center rounded-card border border-line px-3 py-2 text-left text-small font-medium hover:border-stroke"
            >
              {SITUATION_LABELS[id]}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
