import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { BusinessStep } from "@/components/onboarding/steps";
import { ScenarioScreen } from "@/components/onboarding/scenario-screen";
import {
  CheckStage,
  CheckedStage,
  ConfirmStage,
  FirstTaskStage,
  LaterStage,
  ManagerStage,
  ResumeLink,
  WhatsAppStage,
  type Who,
} from "@/components/onboarding/stages";
import { ErrorNote } from "@/components/onboarding/onboarding-shell";
import { ErrorState } from "@/components/kabsi/ui";
import { STAGE_OF, screenOf, type Screen } from "@/lib/onboarding-flow";
import {
  activateCard,
  clearScenario,
  confirmBusiness,
  friendlyError,
  loadOnboardingStatus,
  loadScenario,
  myLatestLocation,
  setupLinkEmailed,
  scenarioDone,
  setScenario,
  setStep,
} from "@/lib/onboarding";
import type { OwnerVariant, ScenarioId } from "@/lib/scenarios";
import type { HelpState } from "@/components/onboarding/need-a-hand";
import type { HelpStep } from "@/lib/onboarding-help";
import { WHATSAPP_ON } from "@/lib/site";
import { track } from "@/lib/telemetry";

const searchSchema = z.object({
  code: z
    .string()
    .regex(/^[2-9A-HJKMNP-Za-hjkmnp-z]{6}$/)
    .optional()
    .catch(undefined), // card to link
  new: z.coerce.boolean().optional().catch(undefined), // start another business
  // Screenshots on the development server only (scripts/app-shots/onboarding.mjs): states that need a tap or a
  // WhatsApp number. Ignored in a production build.
  preview: z.enum(["wa", "wa-notyet", "wa-done", "rest"]).optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/start")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Get set up | Kabsi" },
      { name: "description", content: "Set up Kabsi for your business." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StartPage,
});

const HELP_STEP: Record<Screen, HelpStep> = {
  find: "find",
  check: "snapshot",
  confirm: "find",
  whatsapp: "find",
  manager: "access",
  checked: "waiting",
  first_task: "waiting",
  later: "waiting",
};

// "Access works." shows once, until the owner taps "See your first task"; remembered in this browser.
const CHECKED_KEY = (id: string) => `kabsi.onboarding.checked.${id}`;
function seenChecked(id: string) {
  try {
    return window.localStorage.getItem(CHECKED_KEY(id)) === "1";
  } catch {
    return false;
  }
}
function rememberChecked(id: string) {
  try {
    window.localStorage.setItem(CHECKED_KEY(id), "1");
  } catch {
    /* private mode: remembered for this page view */
  }
}

function StartPage() {
  const { code, new: startNew, preview: rawPreview } = Route.useSearch();
  const preview = import.meta.env.DEV ? rawPreview : undefined;
  const whatsappOn = WHATSAPP_ON || (preview?.startsWith("wa") ?? false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const query = useQuery({ queryKey: ["onboarding-location"], queryFn: myLatestLocation });
  const location = startNew ? null : (query.data ?? null);

  // Choices on this page the server does not keep: past the free check, past WhatsApp, past "Access works.".
  const [seen, setSeen] = useState<{ check?: boolean; whatsapp?: boolean; checked?: boolean }>({});
  const checkedSeen = location ? seen.checked || seenChecked(location.id) : false;
  // Connected on this visit: "Connected" stays until the owner taps Next.
  const [waHold, setWaHold] = useState(preview === "wa-done");
  const [who, setWho] = useState<Who>("owner");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const status = useQuery({
    queryKey: ["onboarding-status", location?.id],
    queryFn: () => loadOnboardingStatus(location!.id),
    enabled: !!location,
    // While Kabsi waits for the invite or checks access, look again every 10 seconds.
    refetchInterval: (q) => (q.state.data && !q.state.data.checked ? 10_000 : false),
  });
  const screen: Screen = waHold
    ? "whatsapp"
    : screenOf({
        status: location ? (status.data ?? null) : null,
        whatsappOn,
        seen: { ...seen, checked: checkedSeen },
      });

  // Email 1: "Kabsi also sent it to your email." only once the setup email with the link went to this person.
  const emailed = useQuery({
    queryKey: ["setup-link-emailed", status.data?.location_id],
    queryFn: () => setupLinkEmailed(status.data!.location_id),
    enabled: !!status.data?.resume_code && !!status.data?.location_id,
  });
  const scenario = useQuery({
    queryKey: ["scenario", location?.id],
    queryFn: () => loadScenario(location!.id),
    enabled: !!location && screen === "manager",
  });

  useEffect(() => {
    if (!query.isLoading && !location) track("signup_started", { source: "self" });
  }, [query.isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // A card code in the link (from /activate/:code) is linked as soon as the business exists.
  const linked = useRef(false);
  const [cardNote, setCardNote] = useState("");
  useEffect(() => {
    if (!code || !location || linked.current) return;
    linked.current = true;
    activateCard(code.toUpperCase(), location.id, "Counter")
      .then(() => {
        setCardNote(`Card ${code.toUpperCase()} is now linked to ${location.name}.`);
        track("card_activated", { location_id: location.id });
      })
      .catch((e) => setCardNote(friendlyError(e)));
  }, [code, location]);

  const refresh = async () => {
    await Promise.all([query.refetch(), status.refetch()]);
  };
  // After "Add another business" creates the new one, leave ?new so the page follows it, and refresh the switcher.
  const created = async () => {
    await qc.invalidateQueries();
    if (startNew) await navigate({ to: "/start", search: {} });
    await query.refetch();
  };

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(friendlyError(e));
    }
    setBusy(false);
  }
  const confirm = () =>
    void run(async () => {
      await confirmBusiness(location!.id);
      await status.refetch();
    });
  const toFirstTask = () =>
    void run(async () => {
      // The old step list ends here too, so Home and Nora see setup as finished.
      if (location!.onboarding_step !== "done")
        await setStep(location!.id, "done").catch(() => undefined);
      rememberChecked(location!.id);
      setSeen((s) => ({ ...s, checked: true }));
      await refresh();
    });
  const changeScenario = (fn: () => Promise<unknown>) =>
    void run(async () => {
      await fn();
      await qc.invalidateQueries({ queryKey: ["scenario", location!.id] });
    });
  const pickScenario = (id: ScenarioId) => changeScenario(() => setScenario(location!.id, id));
  const pickVariant = (v: OwnerVariant) =>
    changeScenario(() => setScenario(location!.id, "someone_else_owns", v));

  if (query.isLoading || (location && status.isLoading))
    return (
      <OnboardingShell>
        <p className="text-text-2" role="status">
          Loading…
        </p>
      </OnboardingShell>
    );
  if (query.isError || status.isError)
    return (
      <OnboardingShell>
        <ErrorState title="This page did not load." onRetry={() => void refresh()}>
          Nothing you did, and nothing changed on Google. Try again in a minute.
        </ErrorState>
      </OnboardingShell>
    );

  const s = status.data ?? null;
  const help: HelpState = location
    ? {
        step:
          screen === "manager" && scenario.data && !scenario.data.done_at
            ? "scenario"
            : HELP_STEP[screen],
        locationId: location.id,
        agreed: !!s?.consent,
        accessWorking: !!s?.accepted,
        accessState: null,
      }
    : { step: "find" };
  const showResume =
    !!s?.resume_code && (screen === "confirm" || screen === "whatsapp" || screen === "manager");

  return (
    <OnboardingShell
      stage={STAGE_OF[screen]}
      help={help}
      below={
        showResume ? <ResumeLink code={s!.resume_code!} emailed={emailed.data === true} /> : null
      }
    >
      {cardNote ? (
        <p
          className="mb-6 rounded-card bg-surface-2 px-4 py-3 text-small font-semibold"
          role="status"
        >
          {cardNote}
        </p>
      ) : null}
      {screen === "find" && <BusinessStep who={who} onWho={setWho} onCreated={created} />}
      {screen === "check" && s ? (
        <CheckStage status={s} onNext={() => setSeen((x) => ({ ...x, check: true }))} />
      ) : null}
      {screen === "confirm" && location ? (
        <ConfirmStage
          location={location}
          who={who}
          onWho={setWho}
          busy={busy}
          error={error}
          onConfirm={confirm}
        />
      ) : null}
      {screen === "whatsapp" && s ? (
        <WhatsAppStage
          status={s}
          on={whatsappOn}
          preview={preview === "wa-notyet" ? "notyet" : undefined}
          hold={waHold}
          onConnected={() => {
            setWaHold(true);
            void status.refetch();
          }}
          onNext={() => {
            setWaHold(false);
            setSeen((x) => ({ ...x, whatsapp: true }));
          }}
        />
      ) : null}
      {screen === "manager" && location && s ? (
        // A situation the owner reported (K-94) shows its own screen until "I've done it".
        scenario.data && !scenario.data.done_at && !s.accepted ? (
          <>
            <ScenarioScreen
              locationId={location.id}
              businessName={location.name}
              row={scenario.data}
              busy={busy}
              onPickVariant={pickVariant}
              onDone={() => changeScenario(() => scenarioDone(location.id))}
              onBack={() => changeScenario(() => clearScenario(location.id))}
            />
            <ErrorNote message={error} />
          </>
        ) : (
          <>
            <ManagerStage
              location={location}
              status={s}
              who={who}
              busy={busy}
              onPickScenario={pickScenario}
              onChanged={refresh}
            />
            <ErrorNote message={error} />
          </>
        )
      ) : null}
      {screen === "checked" && s ? (
        <>
          <CheckedStage status={s} busy={busy} onNext={toFirstTask} />
          <ErrorNote message={error} />
        </>
      ) : null}
      {screen === "first_task" && location && s ? (
        <FirstTaskStage location={location} status={s} showRest={preview === "rest"} />
      ) : null}
      {screen === "later" ? <LaterStage /> : null}
    </OnboardingShell>
  );
}
