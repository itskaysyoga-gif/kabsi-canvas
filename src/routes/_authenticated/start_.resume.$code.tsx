import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { OnboardingShell, StepTitle } from "@/components/onboarding/onboarding-shell";
import { ErrorState, buttonClass } from "@/components/kabsi/ui";
import { chooseLocation, resumeStep } from "@/lib/onboarding";
import { resumeTarget } from "@/lib/onboarding-flow";

// The resume link (V4, master plan 30.16 section 3): kabsi.co/start/resume/CODE opens the next step the owner has not
// finished, on any device. It never signs anyone in: /_authenticated sends a signed-out visitor to /login with next set
// to this page, and GET /api/resume answers only a member of the business (a stranger with a forwarded link sees the
// same plain line as a wrong code).
export const Route = createFileRoute("/_authenticated/start_/resume/$code")({
  head: () => ({
    meta: [{ title: "Your setup link | Kabsi" }, { name: "robots", content: "noindex" }],
  }),
  component: ResumePage,
});

function ResumePage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const step = useQuery({
    queryKey: ["resume", code],
    queryFn: () => resumeStep(code.toLowerCase()),
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    const a = step.data;
    if (!a) return;
    // The page that answers works on the business the link belongs to.
    chooseLocation(a.location_id);
    void navigate({ to: resumeTarget(a.path), replace: true });
  }, [step.data, navigate]);

  if (step.isLoading || step.data)
    return (
      <OnboardingShell>
        <p className="text-text-2" role="status">
          Opening your next step…
        </p>
      </OnboardingShell>
    );
  if (step.isError)
    return (
      <OnboardingShell>
        <ErrorState title="This page did not load." onRetry={() => void step.refetch()}>
          Nothing you did, and nothing changed on Google. Try again in a minute.
        </ErrorState>
      </OnboardingShell>
    );
  return (
    <OnboardingShell>
      <StepTitle
        title="That link is not right."
        sub="It may be for a business you are not part of. Your own setup opens from here."
      />
      <Link to="/start" className={buttonClass("primary", "lg")} data-main-cta>
        Continue setup
      </Link>
    </OnboardingShell>
  );
}
