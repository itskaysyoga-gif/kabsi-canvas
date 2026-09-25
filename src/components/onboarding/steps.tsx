import { useState, type FormEvent } from "react";
import { Check, Copy, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorNote, StepTitle } from "@/components/onboarding/onboarding-shell";
import {
  CONSENT_TEXT,
  choosePlan,
  friendlyError,
  saveConsent,
  saveKnowledge,
  searchPlaces,
  setStep,
  startLocation,
  type KnowledgeCard,
  type Location,
  type PlaceResult,
} from "@/lib/onboarding";
import { track } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

type StepProps = { location: Location | null; onChanged: () => Promise<unknown> };

// ── Step 1: find the business on Google Maps
export function BusinessStep({
  partnerHandle,
  onCreated,
}: {
  partnerHandle?: string | undefined;
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
      await startLocation(picked, partnerHandle);
      track("business_selected", {
        country: picked.country ?? "",
        source: partnerHandle ? "partner_link" : "self",
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
          placeholder="e.g. Café Ward, Hamra"
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
          <p className="text-kb-stone">
            Waiting for your invite… This updates by itself, usually a few minutes after you send
            it.
          </p>
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

// ── Step 3: the facts drafts may use
export function KnowledgeStep({ location, onChanged }: StepProps) {
  const card = location?.knowledge_card ?? {};
  const [signature, setSignature] = useState(card.signature ?? "");
  const [tone, setTone] = useState<"warm" | "formal" | "short">(card.tone ?? "warm");
  const [phone, setPhone] = useState(card.contact_phone ?? "");
  const [hours, setHours] = useState(card.hours_note ?? "");
  const [mention, setMention] = useState(card.mention ?? "");
  const [staff, setStaff] = useState((card.staff_names ?? []).join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!location) return null;

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveKnowledge(location!.id, {
        ...card,
        signature: signature.trim(),
        tone,
        contact_phone: phone.trim(),
        hours_note: hours.trim(),
        mention: mention.trim(),
        staff_names: staff
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 20),
      });
      await setStep(location!.id, "plan");
      await onChanged();
    } catch (e) {
      setError(friendlyError(e));
    }
    setBusy(false);
  }

  const field = "mt-2 h-[52px] rounded-card px-4 text-base";
  return (
    <form onSubmit={save}>
      <StepTitle
        title="About your business"
        sub="Replies only use what you write here. If something isn't here, it's left out, never made up."
      />
      <Label htmlFor="sig">How you sign replies</Label>
      <Input
        id="sig"
        required
        value={signature}
        onChange={(e) => setSignature(e.target.value)}
        placeholder={`e.g. Rami, ${location.name}`}
        className={field}
        maxLength={80}
      />
      <fieldset className="mt-5">
        <legend className="text-sm font-medium">Tone</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["warm", "formal", "short"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              aria-pressed={tone === t}
              className={cn(
                "h-11 rounded-card border-2 text-sm font-bold",
                tone === t ? "border-kb-black bg-kb-sand" : "border-kb-hairline",
              )}
            >
              {t === "warm" ? "Warm" : t === "formal" ? "Formal" : "Short & friendly"}
            </button>
          ))}
        </div>
      </fieldset>
      <Label htmlFor="phone" className="mt-5 block">
        Phone to give unhappy customers <span className="text-kb-stone">(optional)</span>
      </Label>
      <Input
        id="phone"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className={field}
        maxLength={30}
      />
      <Label htmlFor="hours" className="mt-5 block">
        Opening hours note <span className="text-kb-stone">(optional)</span>
      </Label>
      <Input
        id="hours"
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        placeholder="e.g. Open daily 8am to midnight"
        className={field}
        maxLength={160}
      />
      <Label htmlFor="mention" className="mt-5 block">
        Anything you'd like mentioned <span className="text-kb-stone">(optional)</span>
      </Label>
      <Textarea
        id="mention"
        value={mention}
        onChange={(e) => setMention(e.target.value)}
        placeholder="e.g. We deliver in Hamra and Verdun. Free parking behind the shop."
        className="mt-2 min-h-24 rounded-card px-4 py-3 text-base"
        maxLength={600}
      />
      <Label htmlFor="staff" className="mt-5 block">
        Staff names that may appear in replies{" "}
        <span className="text-kb-stone">(optional, comma-separated)</span>
      </Label>
      <Input
        id="staff"
        value={staff}
        onChange={(e) => setStaff(e.target.value)}
        className={field}
        maxLength={300}
      />
      <ErrorNote message={error} />
      <Button type="submit" className="mt-6 w-full" disabled={busy}>
        {busy ? "Saving…" : "Save and continue"}
      </Button>
    </form>
  );
}

// ── Step 4: plan (partner-tagged locations never see a price)
export function PlanStep({ location, onChanged }: StepProps) {
  const [kind, setKind] = useState<"pro_6m" | "pro_12m">("pro_12m");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
    { key: "pro_12m" as const, price: "$120", period: "12 months", note: "Card included" },
    { key: "pro_6m" as const, price: "$75", period: "6 months", note: "Card included" },
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
  return (
    <>
      <StepTitle
        title="You're set"
        sub={
          active
            ? "Kabsi is watching your reviews. When the next one arrives you'll get an email with a reply ready."
            : "When your next Google review arrives, you'll get an email with a reply ready, as soon as the steps below are done."
        }
      />
      <ul className="space-y-3">
        <li className="flex items-center gap-3">
          <StatusDot done={Boolean(location.access_granted_at)} />
          Google access {location.access_granted_at ? "received" : "waiting for your invite"}
        </li>
        {!location.partner_id ? (
          <li className="flex items-center gap-3">
            <StatusDot done={!needsPayment} />
            Plan {needsPayment ? "waiting for payment" : "active"}
          </li>
        ) : null}
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
            After paying, send the transaction reference to hello@kabsi.co.
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
