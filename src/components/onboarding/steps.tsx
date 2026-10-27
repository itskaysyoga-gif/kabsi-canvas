import { useState, type FormEvent } from "react";
import { MapPin, Search } from "lucide-react";
import { Button, Field } from "@/components/kabsi/ui";
import { ErrorNote, StepTitle } from "@/components/onboarding/onboarding-shell";
import { WhoQuestion, type Who } from "@/components/onboarding/stages";
import { KnowledgeForm } from "@/components/app/knowledge-form";
import {
  chooseLocation,
  claimFreeCheck,
  confirmBusiness,
  friendlyError,
  searchPlaces,
  startLocation,
  type Location,
  type PlaceResult,
} from "@/lib/onboarding";
import { track } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { forgetSnapshot, keptSnapshot } from "@/lib/signup";

type StepProps = { location: Location | null; onChanged: () => Promise<unknown> };

// ── Stage 2 for an account with no business yet: find it on Google Maps, then "Is this your business?" in one go. The
// business from the free check the owner saw before signing in (keepSnapshot) is picked already, and its check is joined
// to the new business (claim_free_check).
export function BusinessStep({
  who,
  onWho,
  onCreated,
}: {
  who: Who;
  onWho: (w: Who) => void;
  onCreated: () => Promise<unknown>;
}) {
  const [kept] = useState(() => keptSnapshot());
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[] | null>(
    kept
      ? [{ place_id: kept.place_id, name: kept.name, address: kept.address, country: null }]
      : null,
  );
  const [picked, setPicked] = useState<PlaceResult | null>(results?.[0] ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function search(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPicked(null);
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
      const id = await startLocation(picked);
      chooseLocation(id);
      // Stage 2 is the business and who looks after its Google profile: both answered here.
      await confirmBusiness(id).catch(() => undefined);
      if (kept?.check && kept.place_id === picked.place_id)
        await claimFreeCheck(id, kept.check).catch(() => false);
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
            ? "Here is the business from your free check. If it is not yours, search again."
            : "Search for your business the way it appears on Google Maps. Nothing is posted to Google without your approval."
        }
      />
      <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field
          label="Business name and city"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="organization"
          required
          minLength={2}
          className="min-w-0 flex-1"
          leading={<Search className="size-5 shrink-0 text-text-2" aria-hidden />}
        />
        <Button type="submit" variant="secondary" loading={busy && !picked}>
          Search
        </Button>
      </form>
      {results && results.length === 0 ? (
        <p className="mt-5 text-body text-text-2">
          No match. Try the name plus the street or area.
        </p>
      ) : null}
      {results && results.length > 0 ? (
        <ul className="mt-5 space-y-2" aria-label="Search results">
          {results.map((place) => (
            <li key={place.place_id}>
              <button
                type="button"
                onClick={() => setPicked(place)}
                aria-pressed={picked?.place_id === place.place_id}
                className={cn(
                  "flex min-h-13 w-full items-start gap-3 rounded-card border p-4 text-start",
                  picked?.place_id === place.place_id
                    ? "border-text-1 bg-surface-1 shadow-rest"
                    : "border-line-strong hover:border-text-2",
                )}
              >
                <MapPin className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block font-bold break-words">{place.name}</span>
                  <span className="block text-small text-text-2 break-words">{place.address}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <ErrorNote message={error} />
      {picked ? (
        <>
          <WhoQuestion value={who} onChange={onWho} />
          <div className="mt-8" data-main-cta>
            <Button full onClick={() => void confirm()} loading={busy}>
              Yes, this is my business
            </Button>
          </div>
        </>
      ) : null}
    </>
  );
}

// ── About your business (Settings): the full facts screen. Onboarding no longer asks it up front: after the first task.
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
