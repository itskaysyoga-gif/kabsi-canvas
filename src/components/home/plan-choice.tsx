import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Banner } from "@/components/ui/banner";
import { loadEntitlements } from "@/lib/entitlements";
import { planChoice } from "@/lib/plan-choice";

/** Onboarding step 6, from day 11: the plan is the owner's to choose. Until card payments open it says so and links to the Plan page. */
export function PlanChoiceCard({ locationId }: { locationId: string }) {
  const ent = useQuery({
    queryKey: ["entitlements", locationId],
    queryFn: () => loadEntitlements(locationId),
    staleTime: 60_000,
  });
  const card = planChoice(ent.data ?? null);
  if (!card) return null;
  return (
    <Banner tone={card.tone} className="mt-6" title={card.title} data-testid="plan-choice">
      <p>{card.body}</p>
      <Link
        to={card.cta.to}
        className="mt-2 inline-block min-h-11 py-2.5 font-bold text-kb-ink underline underline-offset-4"
      >
        {card.cta.label}
      </Link>
    </Banner>
  );
}
