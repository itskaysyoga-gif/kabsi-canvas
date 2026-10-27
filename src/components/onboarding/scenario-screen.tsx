import { useEffect, useRef } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { BookingLink } from "@/components/shared/booking-link";
import { ReadyMessage } from "@/components/onboarding/ready-message";
import { StepClip } from "@/components/onboarding/step-clip";
import { Button, buttonClass } from "@/components/kabsi/ui";
import { stepsUrl } from "@/lib/manager-guide";
import type { ScenarioRow } from "@/lib/onboarding";
import {
  OWNER_SCREENS,
  OWNER_VARIANTS,
  SCENARIO_TITLES,
  scenarioMessage,
  screenFor,
  type OwnerVariant,
} from "@/lib/scenarios";
import { SETUP_CALL_MINUTES, SITE_URL } from "@/lib/site";
import { track } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

const dateOf = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/**
 * One layout for every situation (K-94, design review "Scenario screens"): what is happening in one sentence, at most
 * four numbered steps, the button to Google's exact page, "I've done it", and the setup-call link. Someone else owns it
 * first asks which of three cases it is. No Google jargon, and nothing here asks for a password or a code.
 */
export function ScenarioScreen({
  locationId,
  businessName,
  row,
  busy,
  onPickVariant,
  onDone,
  onBack,
}: {
  locationId: string;
  businessName: string;
  row: ScenarioRow;
  busy: boolean;
  onPickVariant: (v: OwnerVariant) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  const asked = useRef<string | null>(null);
  useEffect(() => {
    // G-44: one profile_state_seen per situation the owner reports (K-94).
    if (asked.current === row.scenario) return;
    asked.current = row.scenario;
    track("profile_state_seen", { state: row.scenario, location_id: locationId });
  }, [row.scenario, locationId]);

  const choosing = row.scenario === "someone_else_owns" && !row.variant;
  const screen = screenFor(row.scenario, row.variant);
  const url = stepsUrl(SITE_URL, businessName);

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 inline-flex min-h-11 items-center gap-2 px-2 text-small font-medium underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Back to the steps
      </button>
      <h1 className="mt-2 font-display text-h2 leading-tight sm:text-5xl">
        {SCENARIO_TITLES[row.scenario]}
      </h1>

      {choosing ? (
        <div className="mt-5">
          <p className="leading-7 text-text-2">
            Someone else holds the profile, or you cannot sign in to the account that does. Which is
            it?
          </p>
          <ul className="mt-4 space-y-2">
            {OWNER_VARIANTS.map((v) => (
              <li key={v}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onPickVariant(v)}
                  className="flex min-h-14 w-full items-center rounded-card border-2 border-line p-4 text-left font-medium hover:border-stroke"
                >
                  {OWNER_SCREENS[v].title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <p className="mt-4 text-title leading-8">
            {row.scenario === "someone_else_owns" && row.variant
              ? OWNER_SCREENS[row.variant].title + ". "
              : ""}
            {screen.happening}
          </p>
          {row.scenario === "google_reviewing" ? (
            <p className="mt-2 text-small font-medium text-text-2">
              Review started {dateOf(row.started_at)}.
            </p>
          ) : null}
          {row.scenario === "needs_verifying" ? (
            <div className="mt-4">
              <StepClip clip="verify" label="What to film for a video, in 20 seconds" />
            </div>
          ) : null}
          <ol className="mt-5 space-y-4">
            {screen.steps.map((t, i) => (
              <li key={t} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-kb-yellow text-small font-bold">
                  {i + 1}
                </span>
                <span className="leading-7">{t}</span>
              </li>
            ))}
          </ol>
          {screen.note ? (
            <p className="mt-5 border-l-4 border-kb-yellow pl-4 leading-7">{screen.note}</p>
          ) : null}
          {screen.ready ? (
            <div className="mt-5">
              <p className="mb-2 text-small font-bold">Ready message</p>
              <ReadyMessage
                text={scenarioMessage(screen.ready, businessName, url)}
                subject={`Kabsi and ${businessName}`}
              />
            </div>
          ) : null}
          {screen.google ? (
            <a
              className={cn(
                buttonClass("secondary", "lg", true),
                "mt-5 h-auto min-h-13 whitespace-normal py-3 text-center",
              )}
              href={screen.google.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {screen.google.label} <ExternalLink className="size-5" />
            </a>
          ) : null}
          <p className="mt-5 rounded-card bg-surface-2 p-4 text-small leading-6">{screen.trial}</p>
        </>
      )}

      {!choosing && !screen.noDone ? (
        <Button full className="mt-6" onClick={onDone} disabled={busy}>
          {busy ? "Saving…" : (screen.doneLabel ?? "I've done it")}
        </Button>
      ) : null}
      {!choosing && screen.noDone ? (
        <a
          className={cn(buttonClass("secondary", "lg", true), "mt-6")}
          href="mailto:hello@kabsi.co"
        >
          Write to hello@kabsi.co
        </a>
      ) : null}
      <p className={cn("text-small leading-6 text-text-2", choosing ? "mt-6" : "mt-4 text-center")}>
        Stuck?{" "}
        <BookingLink kind="setup" className="text-text-1">
          Book a free {SETUP_CALL_MINUTES}-minute setup call
        </BookingLink>
        .
      </p>
    </div>
  );
}
