import { useState, type FormEvent } from "react";
import { Check, Copy, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorNote, StepTitle } from "@/components/onboarding/onboarding-shell";
import { KnowledgeForm } from "@/components/app/knowledge-form";
import {
  CONSENT_TEXT,
  choosePlan,
  friendlyError,
  saveConsent,
  saveKnowledge,
  searchPlaces,
  setStep,
  startLocation,
  chooseLocation,
  type KnowledgeCard,
  type Location,
  type PlaceResult,
} from "@/lib/onboarding";
import { track } from "@/lib/telemetry";
import { useIsLebanon } from "@/lib/region";
import { cn } from "@/lib/utils";

type StepProps = { location: Location | null; onChanged: () => Promise<unknown> };

// ── Step 1: find the business on Google Maps
export function BusinessStep({
  partnerHandle,
  inviteId,
  onCreated,
}: {
  partnerHandle?: string | undefined;
  inviteId?: string | undefined;
  onCreated: () => Promise<unknown>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [picked, setPicked] = useState<PlaceResult | null>(null);
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
      chooseLocation(await startLocation(picked, partnerHandle, inviteId));
      track("business_selected", {
        country: picked.country ?? "",
        source: inviteId ? "partner_invite" : partnerHandle ? "partner_link" : "self",
      });
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
        sub="Search for it the way it appears on Google Maps."
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
                onClick={() => setPicked(place)}
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
        <Button className="mt-6 w-full" onClick={confirm} disabled={busy}>
          {busy ? "Saving…" : `Yes, this is ${picked.name}`}
        </Button>
      ) : null}
    </>
  );
}

// ── Step 2: consent + add hello@kabsi.co as Manager
export function AccessStep({ location, onChanged }: StepProps) {
  const [agreed, setAgreed] = useState(Boolean(location?.consent_at));
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!location) return null;
  const granted = Boolean(location.access_granted_at);

  async function saveAgreement(value: boolean) {
    setAgreed(value);
    if (!value || location!.consent_at) return;
    setError("");
    try {
      await saveConsent(location!.id);
      track("consent_given", { location_id: location!.id });
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
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText("hello@kabsi.co");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <StepTitle
        title="Give Kabsi access"
        sub={`Kabsi needs to be a Manager on ${location.name}'s Google Business Profile to read reviews and post the replies you approve. You can remove Kabsi at any time.`}
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

      <ol className="mt-6 space-y-4">
        {[
          <>
            Open <strong>Google Maps</strong>, tap your profile picture, then{" "}
            <strong>Your business profiles</strong>.
          </>,
          <>
            Choose <strong>{location.name}</strong>, then <strong>⋮</strong> or{" "}
            <strong>Profile settings</strong>, then <strong>People and access</strong>.
          </>,
          <>
            Tap <strong>Add</strong>, enter the email below, choose <strong>Manager</strong>, then{" "}
            <strong>Invite</strong>.
          </>,
        ].map((text, i) => (
          <li key={i} className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-kb-yellow text-sm font-bold">
              {i + 1}
            </span>
            <span className="leading-7">{text}</span>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={copyEmail}
        className="mt-4 flex w-full items-center justify-between rounded-card bg-kb-sand px-4 py-3 font-bold"
      >
        hello@kabsi.co{" "}
        {copied ? (
          <span className="flex items-center gap-1 text-sm text-kb-green">
            <Check className="size-4" />
            Copied
          </span>
        ) : (
          <Copy className="size-4" aria-label="Copy email" />
        )}
      </button>

      <div
        className={cn(
          "mt-6 rounded-card border-2 p-4",
          granted ? "border-kb-green" : "border-kb-hairline",
        )}
        aria-live="polite"
      >
        {granted ? (
          <p className="flex items-center gap-2 font-bold text-kb-green">
            <Check className="size-5" />
            Access received
          </p>
        ) : location.consent_at ? (
          <div>
            <span className="inline-flex rounded-pill border border-kb-hairline px-2.5 py-1 text-xs font-bold text-kb-stone">
              Early access
            </span>
            <p className="mt-3 text-kb-stone">
              We will email you as soon as access works. You can close this page.
            </p>
          </div>
        ) : (
          <p className="text-kb-stone">Tick the box above, then send the invite.</p>
        )}
      </div>
      <details className="mt-4 text-sm text-kb-stone">
        <summary className="cursor-pointer font-medium text-kb-ink">
          Can't find "People and access"?
        </summary>
        <p className="mt-2 leading-6">
          Your listing may need to be verified or claimed on Google first. You can finish the other
          steps now; Kabsi starts as soon as access works. Stuck? Email hello@kabsi.co.
        </p>
      </details>
      <ErrorNote message={error} />
      <Button className="mt-6 w-full" onClick={next} disabled={busy || !location.consent_at}>
        {granted ? "Continue" : "I've sent the invite, continue"}
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

// ── Step 3: the facts drafts may use (full form lives in Settings, About your business)
export function KnowledgeStep({
  location,
  onChanged,
  mode = "onboarding",
}: StepProps & { mode?: "onboarding" | "settings" }) {
  if (!location) return null;
  return (
    <>
      {mode === "onboarding" ? (
        <StepTitle
          title="About your business"
          sub="Replies only use what you write here. If something isn't here, it's left out, never made up."
        />
      ) : null}
      <KnowledgeForm
        location={location}
        mode={mode}
        submitLabel={mode === "onboarding" ? "Save and continue" : "Save"}
        onSaved={async () => {
          if (mode === "onboarding") await setStep(location.id, "plan");
          await onChanged();
        }}
      />
    </>
  );
}

// ── Step 4: plan (partner-tagged locations never see a price)
export function PlanStep({ location, onChanged }: StepProps) {
  const [kind, setKind] = useState<"pro_6m" | "pro_12m">("pro_12m");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isLebanon = useIsLebanon(location?.country);
  if (!location) return null;
  const viaPartner = Boolean(location.partner_id);

  async function finish() {
    setBusy(true);
    setError("");
    try {
      await choosePlan(location!.id, viaPartner ? "partner" : kind);
      track("plan_selected", { plan: viaPartner ? "partner" : kind, location_id: location!.id });
      await onChanged();
    } catch (e) {
      setError(friendlyError(e));
    }
    setBusy(false);
  }

  if (viaPartner) {
    return (
      <>
        <StepTitle
          title="Your plan"
          sub="Your Kabsi plan is through the partner who set you up. There's nothing to pay here."
        />
        <ErrorNote message={error} />
        <Button className="w-full" onClick={finish} disabled={busy}>
          Finish setup
        </Button>
      </>
    );
  }
  const plans = [
    {
      key: "pro_12m" as const,
      price: "$120",
      period: "12 months",
      note: isLebanon ? "Card included in Lebanon" : "",
    },
    {
      key: "pro_6m" as const,
      price: "$75",
      period: "6 months",
      note: isLebanon ? "Card included in Lebanon" : "",
    },
  ];
  return (
    <>
      <StepTitle title="Choose your plan" sub="Paid once, upfront. Full refund within 14 days." />
      <div className="grid gap-3 sm:grid-cols-2">
        {plans.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setKind(p.key)}
            aria-pressed={kind === p.key}
            className={cn(
              "rounded-card border-2 p-5 text-left",
              kind === p.key ? "border-kb-black bg-kb-sand" : "border-kb-hairline",
            )}
          >
            <span className="block font-display text-4xl leading-none">{p.price}</span>
            <span className="mt-2 block font-bold">Kabsi Pro, {p.period}</span>
            <span className="block text-sm text-kb-stone">{p.note}</span>
          </button>
        ))}
      </div>
      {!isLebanon ? (
        <p className="mt-4 text-sm text-kb-stone">
          Your review link and QR code are free in every country.
        </p>
      ) : null}
      <ErrorNote message={error} />
      <Button className="mt-6 w-full" onClick={finish} disabled={busy}>
        {busy ? "Saving…" : "Continue to payment"}
      </Button>
    </>
  );
}

// ── Done: payment instructions + what happens next
export function DoneStep({ location }: { location: Location | null }) {
  if (!location) return null;
  const active = location.status === "active";
  const lebanon = location.country === "LB";
  const needsPayment = !location.partner_id && !active;
  const hasAccess = Boolean(location.access_granted_at);
  const hasPlan = !needsPayment;
  const setupComplete = hasAccess && hasPlan;
  return (
    <>
      <StepTitle
        title={setupComplete ? "You're set" : "Almost there"}
        sub={
          setupComplete
            ? "Kabsi is watching your reviews. When the next one arrives you'll get an email with a reply ready."
            : "When your next Google review arrives, you'll get an email with a reply ready, as soon as the steps below are done."
        }
      />
      <ul className="space-y-3">
        <li className="flex items-center gap-3">
          <StatusDot done={hasAccess} />
          Access from Google
        </li>
        <li className="flex items-center gap-3">
          <StatusDot done={hasPlan} />
          Your plan
        </li>
      </ul>
      {needsPayment ? (
        <div className="mt-6 rounded-card bg-kb-sand p-5 text-sm leading-6">
          <p className="font-bold">How to pay</p>
          {lebanon ? (
            <p className="mt-2">
              Pay by Whish, OMT or cash. Message us on +961 3 956 917 or hello@kabsi.co and we'll
              confirm within one working day.
            </p>
          ) : null}
          <p className="mt-2">
            USDT (TRC20):{" "}
            <span className="break-all font-mono">TMbdkH9hY14RGgz9N99DCXu3LXGDZBDqMe</span>
            <br />
            Binance Pay ID: <span className="font-mono">User-2ad9b</span>
          </p>
          <p className="mt-2 text-kb-stone">
            After paying in USDT, paste the transaction ID on your{" "}
            <a href="/app/plan" className="font-medium text-kb-ink underline">
              Plan page
            </a>
            .
          </p>
        </div>
      ) : null}
      <Button asChild className="mt-6 w-full">
        <a href="/app">Go to your dashboard</a>
      </Button>
    </>
  );
}
function StatusDot({ done }: { done: boolean }) {
  return (
    <span
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full",
        done ? "bg-kb-green text-kb-white" : "border-2 border-kb-hairline",
      )}
    >
      {done ? <Check className="size-4" /> : null}
    </span>
  );
}
