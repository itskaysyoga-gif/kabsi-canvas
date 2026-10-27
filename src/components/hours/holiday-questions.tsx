import { useState } from "react";
import { HolidayAnswerForm } from "@/components/hours/holiday-answer";
import { answerHoliday, whenWords, type HolidayPrompt } from "@/lib/holidays";
import { track } from "@/lib/telemetry";

// The open holiday questions on the Hours screen (P0.5-03, K-131): what Kabsi asked by email, answered here instead.
export function HolidayQuestions({
  prompts,
  today,
  regularHours,
  onDone,
}: {
  prompts: HolidayPrompt[];
  today: string;
  regularHours: string | null;
  onDone: () => unknown;
}) {
  const [done, setDone] = useState<Record<string, string>>({});
  if (prompts.length === 0) return null;
  return (
    <section className="mt-7" aria-label="Holiday hours">
      {prompts.map((p) => (
        <article key={p.id} className="mb-4 rounded-panel bg-surface-1 p-6 shadow-rest sm:p-7">
          <p className="text-small font-bold uppercase tracking-wider text-text-2">Coming up</p>
          <h2 className="mt-1 font-display text-h3 leading-tight">Your hours for {p.name}</h2>
          <p className="mt-1 text-small text-text-2">
            {p.estimated ? "Expected " : ""}
            {whenWords(p.starts_on, p.ends_on)}
          </p>
          {done[p.id] ? (
            <p className="mt-4 text-small text-ok" role="status">
              {done[p.id]}
            </p>
          ) : (
            <HolidayAnswerForm
              holiday={p}
              today={today}
              regularHours={regularHours}
              onSubmit={async (answer, fields) => {
                const r = await answerHoliday(p.id, answer, fields);
                if (!r.repeat && answer !== "normal")
                  track("special_hours_approved", { channel: "dashboard", source: "holiday" });
                setDone((d) => ({
                  ...d,
                  [p.id]:
                    answer === "normal"
                      ? "Noted. Your normal hours stay."
                      : "Approved. Kabsi sends it to Google in a few seconds and checks that it shows.",
                }));
                await onDone();
              }}
            />
          )}
        </article>
      ))}
    </section>
  );
}
