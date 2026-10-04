import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, MapPin, Search, Share2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorNote, StepTitle } from "@/components/onboarding/onboarding-shell";
import { ManagerAccessInstructions } from "@/components/onboarding/manager-access-instructions";
import { EligibilityCheck, type Eligibility } from "@/components/onboarding/eligibility";
import { KnowledgeForm } from "@/components/app/knowledge-form";
import { copyText } from "@/lib/clipboard";
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
import { loadPlanSummary, planOptions, type PlanKind } from "@/lib/plans";
import { KABSI_GROUP_ID, SITE_URL } from "@/lib/site";
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
        sub="Four short steps, about five minutes. Nothing is posted to Google without your approval. Start by searching for your business the way it appears on Google Maps."
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
            if (v) track("eligibility_answered", { answer: v });
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

// ── Step 2: consent + invite the Kabsi business group as Manager
export function AccessStep({ location, onChanged }: StepProps) {
  const [agreed, setAgreed] = useState(Boolean(location?.consent_at));
  const [copyState, setCopyState] = useState<"idle" | "done" | "failed">("idle");
  const [shareState, setShareState] = useState<"idle" | "done" | "failed">("idle");
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
  async function copyGroupId() {
    const ok = await copyText(KABSI_GROUP_ID);
    setCopyState(ok ? "done" : "failed");
    window.setTimeout(() => setCopyState("idle"), 2000);
  }
  async function shareSteps() {
    const url = `${SITE_URL}/manager-steps?b=${encodeURIComponent(location!.name)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Add Kabsi as a Manager", url });
        return;
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      }
    }
    const ok = await copyText(url);
    setShareState(ok ? "done" : "failed");
    window.setTimeout(() => setShareState("idle"), 2000);
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

      <Tabs defaultValue="phone" className="mt-6">
        <TabsList className="grid h-12 w-full grid-cols-2 rounded-card bg-kb-sand p-1">
          <TabsTrigger value="phone" className="h-10 rounded-[10px] text-base">
            On your phone
          </TabsTrigger>
          <TabsTrigger value="computer" className="h-10 rounded-[10px] text-base">
            On a computer
          </TabsTrigger>
        </TabsList>
        <TabsContent value="phone" className="mt-6">
          <ManagerAccessInstructions mode="phone" businessName={location.name} />
        </TabsContent>
        <TabsContent value="computer" className="mt-6">
          <ManagerAccessInstructions mode="computer" />
        </TabsContent>
      </Tabs>
      <Button
        type="button"
        onClick={copyGroupId}
        variant="ghost"
        className="mt-5 w-full justify-between rounded-card bg-kb-sand px-4"
      >
        Kabsi group ID: {KABSI_GROUP_ID}{" "}
        {copyState === "done" ? (
          <span className="flex items-center gap-1 text-sm text-kb-green">
            <Check className="size-4" />
            Copied
          </span>
        ) : copyState === "failed" ? (
          <span className="flex items-center gap-1 text-sm text-kb-red">
            <TriangleAlert className="size-4" />
            Couldn't copy
          </span>
        ) : (
          <Copy className="size-4" aria-label="Copy group ID" />
        )}
      </Button>

      <Accordion type="multiple" className="mt-5 border-t border-kb-hairline">
        <AccordionItem value="people-access" className="border-kb-hairline">
          <AccordionTrigger className="min-h-11 text-base">
            Can't find People and access?
          </AccordionTrigger>
          <AccordionContent className="leading-6 text-kb-stone">
            That menu only shows for the profile's owner. Ask whoever verified the profile to add
            us, or send them these steps with the button below.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="no-access" className="border-kb-hairline">
          <AccordionTrigger className="min-h-11 text-base">
            We don't have access to our profile
          </AccordionTrigger>
          <AccordionContent className="leading-6 text-kb-stone">
            Write to hello@kabsi.co and we will help you work out how to request access from Google.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Button
        type="button"
        variant="outline"
        className="mt-5 min-h-[52px] h-auto w-full whitespace-normal py-3 text-center"
        onClick={shareSteps}
      >
        {shareState === "done" ? (
          <Check />
        ) : shareState === "failed" ? (
          <TriangleAlert />
        ) : (
          <Share2 />
        )}
        {shareState === "done"
          ? "Link copied"
          : shareState === "failed"
            ? "Couldn't copy link"
            : "Send these steps to whoever manages our profile"}
      </Button>

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
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isLebanon = useIsLebanon(location?.country);
  const summary = useQuery({
    queryKey: ["plan-summary", location?.id],
    queryFn: () => loadPlanSummary(location!.id),
    enabled: !!location,
  });
  if (!location) return null;
  const s = summary.data;
  if (!s) {
    return summary.isError ? (
      <ErrorNote message="Couldn't load your plan options. Refresh the page." />
    ) : null;
  }
  const viaPartner = s.partner_covered;
  const options = planOptions(s);
  // The free trial is offered once the new plans are live (staff can grant one earlier, and test owners get one).
  const trialOffered = s.v2 && !s.trial_used;
  const kind = picked ?? (trialOffered ? "trial" : (options[0]?.key ?? "lebanon_yearly"));

  async function finish() {
    setBusy(true);
    setError("");
    try {
      await choosePlan(location!.id, viaPartner ? "partner" : (kind as PlanKind));
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
  const cards = [
    ...(trialOffered
      ? [
          {
            key: "trial",
            price: "Free",
            title: `${s.trial_days} day free trial`,
            note: "No card. It starts when Kabsi's access to your Google profile works.",
          },
        ]
      : []),
    ...options.map((o) => ({
      key: o.key as string,
      price: `$${o.price}`,
      title: o.title,
      note: o.note,
    })),
  ];
  return (
    <>
      <StepTitle
        title="Choose your plan"
        sub={
          trialOffered
            ? "Start free, or choose a plan now. Refundable within 14 days."
            : "Yearly plans are refundable within 14 days."
        }
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPicked(p.key)}
            aria-pressed={kind === p.key}
            className={cn(
              "rounded-card border-2 p-5 text-left",
              kind === p.key ? "border-kb-black bg-kb-sand" : "border-kb-hairline",
            )}
          >
            <span className="block font-display text-4xl leading-none">{p.price}</span>
            <span className="mt-2 block font-bold">{p.title}</span>
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
        {busy ? "Saving…" : kind === "trial" ? "Start trial" : "Continue to payment"}
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
