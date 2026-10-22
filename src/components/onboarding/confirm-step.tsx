import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { AccessStatus } from "@/components/onboarding/access-status";
import { ErrorNote, StepTitle } from "@/components/onboarding/onboarding-shell";
import { StepClip } from "@/components/onboarding/step-clip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DETAILS,
  OPEN_STATUS_OPTIONS,
  confirmDetails,
  continueLabel,
  detailsPayload,
  loadDetailFacts,
  rowsFromFacts,
  valueProblem,
  type DetailKey,
  type Mark,
  type Row,
} from "@/lib/confirm-details";
import { confirmMode } from "@/lib/onboarding-flow";
import { friendlyError, setStep, type Location } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

/**
 * Step 5 of six. Until Kabsi has access it shows a calm waiting screen (the live status, no spinner, a way on to Home); once
 * access works it asks the owner to confirm the six details Google shows, each with Correct or Change (K-18). What they
 * confirm becomes the baseline Google Protection keeps, and the details_confirmed event is sent by the database from the
 * audit log. Then Home opens with the day-one backlog card, and the first approval within 10 minutes is the goal.
 */
export function ConfirmStep({
  location,
  onChanged,
}: {
  location: Location;
  onChanged: () => Promise<unknown>;
}) {
  const mode = confirmMode(location);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function toHome() {
    setBusy(true);
    setError("");
    try {
      await setStep(location.id, "done");
      await onChanged();
    } catch (e) {
      setError(friendlyError(e));
    }
    setBusy(false);
  }

  if (mode === "waiting") {
    return (
      <>
        <StepTitle
          title="Waiting for your invitation"
          sub="Nothing to do for now. You can close this page, or look around Kabsi while you wait."
        />
        <StepClip clip="confirm" label="What happens next, in 20 seconds" />
        <AccessStatus location={location} onConnected={() => void onChanged()} />
        <p className="mt-6 rounded-card bg-kb-sand p-4 text-sm leading-6">
          Your free trial starts when Kabsi has access, so waiting costs you no days. When access
          works, you confirm your details here and your first replies are ready.
        </p>
        <ErrorNote message={error} />
        <Button className="mt-6 w-full" onClick={() => void toHome()} disabled={busy}>
          {busy ? "Saving…" : "Go to Home"}
        </Button>
      </>
    );
  }
  return <ConfirmForm location={location} onDone={toHome} busy={busy} error={error} />;
}

function ConfirmForm({
  location,
  onDone,
  busy: finishing,
  error: finishError,
}: {
  location: Location;
  onDone: () => Promise<void>;
  busy: boolean;
  error: string;
}) {
  const qc = useQueryClient();
  const facts = useQuery({
    queryKey: ["detail-facts", location.id],
    queryFn: () => loadDetailFacts(location.id),
    // Kabsi reads the profile within minutes of access: look again until it has.
    refetchInterval: (q) => ((q.state.data ?? []).length === 0 ? 10_000 : false),
  });
  const [marks, setMarks] = useState<Partial<Record<DetailKey, Mark>>>({});
  const [editing, setEditing] = useState<DetailKey | null>(null);
  const [draft, setDraft] = useState("");
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (facts.isLoading) return <p className="text-kb-stone">Loading…</p>;
  if (facts.isError) {
    return (
      <p role="alert" className="text-kb-red">
        Couldn&apos;t load your details. Refresh the page.
      </p>
    );
  }
  const rows = rowsFromFacts(facts.data ?? []);
  const read = rows.some((r) => r.shown);
  const marked = Object.keys(marks).length;

  function correct(r: Row) {
    setEditing(null);
    setMarks((m) => ({ ...m, [r.key]: { kind: "correct" } }));
  }
  function startChange(r: Row) {
    setEditing(r.key);
    setProblem("");
    const m = marks[r.key];
    setDraft(m?.kind === "change" ? m.value : (r.shown?.display ?? ""));
  }
  function saveChange(r: Row) {
    const p = valueProblem(r.key, draft);
    if (p) return setProblem(p);
    setMarks((m) => ({ ...m, [r.key]: { kind: "change", value: draft.trim() } }));
    setEditing(null);
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const payload = detailsPayload(rows, marks);
      if (Object.keys(payload).length > 0) {
        await confirmDetails(location.id, payload);
        await qc.invalidateQueries({ queryKey: ["detail-facts", location.id] });
        await qc.invalidateQueries({ queryKey: ["profile-facts"] });
      }
      await onDone();
    } catch (e) {
      setError(friendlyError(e));
    }
    setBusy(false);
  }

  return (
    <>
      <StepTitle
        title="Confirm your details"
        sub="This is what Google shows customers. Tap Correct if it is right, or Change if it is not. What you confirm is what Kabsi keeps safe: if Google changes it, you decide what happens."
      />
      <StepClip clip="confirm" label="Confirm your details, in 20 seconds" />
      {!read ? (
        <p className="mb-5 rounded-card bg-kb-sand p-4 text-sm leading-6" role="status">
          Kabsi is reading your profile now. It takes a few minutes. You can skip this and confirm
          later in Google Profile.
        </p>
      ) : null}
      <ul className="space-y-3">
        {rows.map((r) => {
          const m = marks[r.key];
          const d = DETAILS.find((x) => x.key === r.key)!;
          const isEditing = editing === r.key;
          const confirmedNow = m !== undefined || r.confirmed;
          return (
            <li key={r.key} className="rounded-card border-2 border-kb-hairline p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-bold uppercase text-kb-stone">{r.label}</p>
                {confirmedNow && !isEditing ? (
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-kb-green">
                    <Check className="size-4" aria-hidden="true" /> Approved by you
                  </span>
                ) : null}
              </div>
              {isEditing ? (
                <div className="mt-2">
                  {r.key === "open_status" ? (
                    <div className="grid gap-2" role="radiogroup" aria-label={r.label}>
                      {OPEN_STATUS_OPTIONS.map((o) => (
                        <button
                          key={o.raw}
                          type="button"
                          role="radio"
                          aria-checked={draft === o.display}
                          onClick={() => setDraft(o.display)}
                          className={cn(
                            "min-h-11 rounded-card border-2 px-3 text-left font-medium",
                            draft === o.display
                              ? "border-kb-black bg-kb-sand"
                              : "border-kb-hairline",
                          )}
                        >
                          {o.display}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      type={d.type ?? "text"}
                      inputMode={d.type === "tel" ? "tel" : d.type === "url" ? "url" : undefined}
                      placeholder={d.placeholder}
                      aria-label={r.label}
                      className="h-[52px] rounded-card px-4 text-base"
                    />
                  )}
                  {d.hint ? <p className="mt-1 text-sm leading-6 text-kb-stone">{d.hint}</p> : null}
                  {problem ? (
                    <p role="alert" className="mt-1 text-sm text-kb-red">
                      {problem}
                    </p>
                  ) : null}
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="compact"
                      onClick={() => saveChange(r)}
                    >
                      Use this
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="compact"
                      onClick={() => setEditing(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p dir="auto" className="mt-1 break-words text-lg leading-7">
                    {m?.kind === "change"
                      ? m.value
                      : (r.shown?.display ?? (
                          <span className="text-kb-stone">Kabsi has not read this yet</span>
                        ))}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="compact"
                      onClick={() => correct(r)}
                      disabled={!r.shown || m?.kind === "correct"}
                      aria-pressed={m?.kind === "correct"}
                    >
                      Correct
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="compact"
                      onClick={() => startChange(r)}
                      aria-pressed={m?.kind === "change"}
                    >
                      {r.shown ? "Change" : "Add"}
                    </Button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-sm leading-6 text-kb-stone">
        A detail you leave alone stays as it is and shows Needs your OK in Google Profile.
      </p>
      <ErrorNote message={error || finishError} />
      <Button
        className="mt-6 w-full"
        onClick={() => void save()}
        disabled={busy || finishing || editing !== null}
      >
        {busy || finishing ? "Saving…" : continueLabel(marked)}
      </Button>
    </>
  );
}
