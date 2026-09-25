import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import {
  AccessStep,
  BusinessStep,
  DoneStep,
  KnowledgeStep,
  PlanStep,
} from "@/components/onboarding/steps";
import {
  activateCard,
  friendlyError,
  myLatestLocation,
  type OnboardingStep,
} from "@/lib/onboarding";
import { track } from "@/lib/telemetry";

const searchSchema = z.object({
  p: z
    .string()
    .regex(/^[a-z0-9-]{3,30}$/i)
    .optional()
    .catch(undefined), // partner handle
  code: z
    .string()
    .regex(/^[2-9A-HJKMNP-Za-hjkmnp-z]{6}$/)
    .optional()
    .catch(undefined), // card to link
  new: z.coerce.boolean().optional().catch(undefined), // start another business
});

export const Route = createFileRoute("/_authenticated/start")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Get set up — Kabsi" },
      { name: "description", content: "Set up Kabsi for your business." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StartPage,
});

function StartPage() {
  const { p, code, new: startNew } = Route.useSearch();
  const query = useQuery({
    queryKey: ["onboarding-location"],
    queryFn: myLatestLocation,
    // While waiting for Google access, re-check every 10 seconds.
    refetchInterval: (q) =>
      q.state.data && q.state.data.consent_at && !q.state.data.access_granted_at ? 10_000 : false,
  });
  const location = startNew ? null : (query.data ?? null);
  const step: OnboardingStep = location ? location.onboarding_step : "business";

  useEffect(() => {
    if (!query.isLoading && !location)
      track("signup_started", { source: p ? "partner_link" : "self" });
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

  const refresh = () => query.refetch();

  if (query.isLoading)
    return (
      <OnboardingShell step="business">
        <p className="text-kb-stone">Loading…</p>
      </OnboardingShell>
    );
  if (query.isError)
    return (
      <OnboardingShell step="business">
        <p className="text-kb-red">We couldn't load your setup. Reload the page.</p>
      </OnboardingShell>
    );

  return (
    <OnboardingShell step={step}>
      {cardNote ? (
        <p className="mb-6 rounded-card bg-kb-sand px-4 py-3 text-sm font-medium" role="status">
          {cardNote}
        </p>
      ) : null}
      {step === "business" && <BusinessStep partnerHandle={p} onCreated={refresh} />}
      {step === "access" && <AccessStep location={location} onChanged={refresh} />}
      {step === "knowledge" && <KnowledgeStep location={location} onChanged={refresh} />}
      {step === "plan" && <PlanStep location={location} onChanged={refresh} />}
      {step === "done" && <DoneStep location={location} />}
    </OnboardingShell>
  );
}
