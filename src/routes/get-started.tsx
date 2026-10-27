import { createFileRoute } from "@tanstack/react-router";
import { OnboardingShell, StepTitle } from "@/components/onboarding/onboarding-shell";
import { BusinessFinder } from "@/components/profile-check/business-finder";
import { SnapshotResult } from "@/components/profile-check/snapshot-result";
import { useProfileCheck } from "@/components/profile-check/use-profile-check";

// Onboarding steps 1 and 2, before sign-up (P0.4-01; K-45, K-91): "Which business is yours?" and "Here's what
// customers see". No account yet. The sign-up sheet that follows is P0.4-02; until then the button is the R-02 one.
export const Route = createFileRoute("/get-started")({
  head: () => ({
    meta: [
      { title: "Find your business | Kabsi" },
      {
        name: "description",
        content: "Find your business on Google and see what customers see. No account needed.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

function Page() {
  const check = useProfileCheck("onboarding");
  const showing = check.phase === "result" && check.snapshot;
  return (
    <OnboardingShell step="check" assistant="site" help={{ step: showing ? "snapshot" : "find" }}>
      {showing ? (
        <>
          <StepTitle title="Here's what customers see" />
          <SnapshotResult snapshot={check.snapshot!} page="/get-started" onAnother={check.again} />
        </>
      ) : (
        <>
          <StepTitle
            title="Which business is yours?"
            sub="Kabsi finds your Google profile, so it can set up everything for you. Search by name and city, the way it appears on Google Maps. No account needed."
          />
          <BusinessFinder state={check} />
        </>
      )}
    </OnboardingShell>
  );
}
