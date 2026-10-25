import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorNote, StepTitle } from "@/components/onboarding/onboarding-shell";
import { ManagerGuide } from "@/components/onboarding/manager-guide";
import { AccessStatus } from "@/components/onboarding/access-status";
import { AccessExits } from "@/components/onboarding/access-exits";
import { ScenarioPicker } from "@/components/onboarding/scenario-picker";
import { ScenarioScreen } from "@/components/onboarding/scenario-screen";
import { EligibilityCheck, type Eligibility } from "@/components/onboarding/eligibility";
import { KnowledgeForm } from "@/components/app/knowledge-form";
import { FREE_FROM_GOOGLE, THIRD_PARTY_HELP_URL } from "@/lib/site";
import {
  CONSENT_TEXT,
  choosePlan,
  clearScenario,
  friendlyError,
  loadScenario,
  saveConsent,
  scenarioDone,
  setScenario,
  searchPlaces,
  setStep,
  startLocation,
  chooseLocation,
  type Location,
  type PlaceResult,
} from "@/lib/onboarding";
import { track } from "@/lib/telemetry";
import { CARD_PAYMENTS_COMING, loadPlanSummary } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { forgetSnapshot, keptSnapshot } from "@/lib/signup";
import type { OwnerVariant, ScenarioId } from "@/lib/scenarios";

type StepProps = { location: Location | null; onChanged: () => Promise<unknown> };

// ── Step 1: find the business on Google Maps
export function BusinessStep({ onCreated }: { onCreated: () => Promise<unknown> }) {
  // The business from the snapshot the owner saw before signing up (P0.4-02) is picked already.
  const [kept] = useState<PlaceResult | null>(() => {
    const k = keptSnapshot();
    return k ? { ...k, country: null } : null;
  });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[] | null>(kept ? [kept] : null);
  const [picked, setPicked] = useState<PlaceResult | null>(kept);
  const [eligible, setEligible] = useState<Eligibility>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function search(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPicked(null);
    setEligible(null);
    setBusy(true);
    try {
      setResults(await searchPlaces(query));
    } catch (e) {
      setError(friendlyError(e));
      setResults(null);
    }
    setBusy(false);
  }
  async function confirm() {
    if (!picked) return;
    setError("");
    setBusy(true);
    try {
      chooseLocation(await startLocation(picked));
      forgetSnapshot();
      track("business_found", { country: picked.country ?? "", source: "start" });
      await onCreated();
    } catch (e) {
      setError(friendlyError(e));
    }
    setBusy(false);
  }

  return (
    <>
      <StepTitle
        title="Find your business"
        sub={
          kept
            ? "Four short steps, about five minutes. Nothing is posted to Google without your approval. Here is the business from your snapshot. If it is not yours, search again."
            : "Four short steps, about five minutes. Nothing is posted to Google without your approval. Start by searching for your business the way it appears on Google Maps."
        }
      />
      <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row">
        <Label htmlFor="biz" className="sr-only">
          Business name and area
        </Label>
        <Input
          id="biz"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Business name and city"
          className="h-[52px] rounded-card px-4 text-base"
          autoComplete="organization"
          required
          minLength={2}
        />
        <Button type="submit" variant="outline" disabled={busy} className="sm:w-40">
          <Search />
          {busy && !picked ? "Searching…" : "Search"}
        </Button>
      </form>
      {results && results.length === 0 ? (
        <p className="mt-5 text-kb-stone">No match. Try the name plus the street or area.</p>
      ) : null}
      {results && results.length > 0 ? (
        <ul className="mt-5 space-y-2" aria-label="Search results">
          {results.map((place) => (
            <li key={place.place_id}>
              <button
                type="button"
                onClick={() => {
                  setPicked(place);
                  setEligible(null);
                }}
                aria-pressed={picked?.place_id === place.place_id}
                className={cn(
                  "flex w-full items-start gap-3 rounded-card border-2 p-4 text-left",
                  picked?.place_id === place.place_id
                    ? "border-kb-black bg-kb-sand"
                    : "border-kb-hairline hover:border-kb-stone",
                )}
              >
                <MapPin className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block font-bold">{place.name}</span>
                  <span className="block text-sm text-kb-stone">{place.address}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <ErrorNote message={error} />
      {picked ? (
        <EligibilityCheck
          businessName={picked.name}
          value={eligible}
          onChange={(v) => {
            setEligible(v);
            // G-44: one event per profile situation the owner reports (K-94).
            if (v) track("profile_state_seen", { state: v });
          }}
        />
      ) : null}
      {picked && eligible === "yes" ? (
        <Button className="mt-6 w-full" onClick={confirm} disabled={busy}>
          {busy ? "Saving…" : `Yes, this is ${picked.name}`}
        </Button>
      ) : null}
    </>
  );
}

// ── Step 3 of six: add Kabsi as a Manager, with a live status (K-93, K-141). The consent comes first (it is the
// owner's authorisation, stored with its text and time); then the guide, the status pill and the three exits.
export function AccessStep({ location, onChanged }: StepProps) {
  const [agreed, setAgreed] = useState(Boolean(location?.consent_at));
  const [card, setCard] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const qc = useQueryClient();
  const scenario = useQuery({
    queryKey: ["scenario", location?.id],
    queryFn: () => loadScenario(location!.id),
    enabled: !!location,
  });
  if (!location) return null;
  const granted = Boolean(location.access_granted_at);

  async function change(run: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await run();
      await qc.invalidateQueries({ queryKey: ["scenario", location!.id] });
    } catch (e) {
      setError(friendlyError(e));
    }
    setBusy(false);
  }
  const pick = (id: ScenarioId) => void change(() => setScenario(location.id, id));
  const pickVariant = (v: OwnerVariant) =>
    void change(() => setScenario(location.id, "someone_else_owns", v));
  // "I've done it": the owner did what the screen said. They carry on with the questions while Google catches up.
  async function doneIt() {
    await change(async () => {
      await scenarioDone(location!.id);
      await setStep(location!.id, "knowledge");
    });
    await onChanged();
  }

  async function saveAgreement(value: boolean) {
    setAgreed(value);
    if (!value || location!.consent_at) return;
    setError("");
    try {
      await saveConsent(location!.id);
      // G-44: the owner starts giving Kabsi access. Only the manual Manager invite exists today (route "manual").
      track("connect_started", { location_id: location!.id, route: "manual" });
      await onChanged();
    } catch (e) {
      setAgreed(false);
      setError(friendlyError(e));
    }
  }
  async function next() {
    setBusy(true);
    setError("");
    try {
      await setStep(location!.id, "knowledge");
      await onChanged();
    } catch (e) {
      setError(friendlyError(e));
    }
    setBusy(false);
  }

  if (scenario.data && !granted) {
    return (
      <>
        <ScenarioScreen
          locationId={location.id}
          businessName={location.name}
          row={scenario.data}
          busy={busy}
          onPickVariant={pickVariant}
          onDone={() => void doneIt()}
          onBack={() => void change(() => clearScenario(location.id))}
        />
        <ErrorNote message={error} />
      </>
    );
  }

  return (
    <>
      <StepTitle
        title="Add Kabsi as a Manager"
        sub={`Kabsi needs to be a Manager on ${location.name}'s Google Business Profile to read reviews and prepare the replies you approve. Nothing is published without your approval.`}
      />
      <label className="flex cursor-pointer items-start gap-3 rounded-card border-2 border-kb-hairline p-4">
        <Checkbox
          checked={agreed}
          onCheckedChange={(v) => void saveAgreement(v === true)}
          disabled={Boolean(location.consent_at)}
          className="mt-1"
        />
        <span className="text-sm leading-6">{CONSENT_TEXT}</span>
      </label>
      <p className="mt-3 text-xs leading-5 text-kb-stone" data-testid="free-from-google">
        {FREE_FROM_GOOGLE}{" "}
        <a
          href={THIRD_PARTY_HELP_URL}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          Google's guide to working with a third party
        </a>
      </p>

      <div className="mt-6">
        <ManagerGuide businessName={location.name} onStep={setCard} />
      </div>

      <AccessStatus
        location={location}
        onConnected={() => {
          // Access works: the screen moves on by itself after a moment, so the green pill is seen.
          if (location.onboarding_step === "access") {
            window.setTimeout(() => void next(), 2500);
          }
        }}
      />

      <AccessExits location={location} step={card} />

      {!granted ? <ScenarioPicker busy={busy} onPick={pick} /> : null}

      <ErrorNote message={error} />
      <Button className="mt-6 w-full" onClick={next} disabled={busy || !location.consent_at}>
        {granted ? "Continue" : "I've sent the invitation"}
      </Button>
      {!granted ? (
        <Button
          variant="link"
          className="mt-4 w-full"
          onClick={next}
          disabled={busy || !location.consent_at}
        >
          Do this later
        </Button>
      ) : null}
    </>
  );
}

// ── About your business (Settings): the full facts screen. Onboarding no longer uses this: step 4 is the five questions
// (questions-step.tsx), saved through the same facts functions.
export function KnowledgeStep({ location, onChanged }: StepProps & { mode?: "settings" }) {
  if (!location) return null;
  return (
    <KnowledgeForm
      location={location}
      mode="settings"
      submitLabel="Save"
      onSaved={async () => {
        await onChanged();
      }}
    />
  );
}
