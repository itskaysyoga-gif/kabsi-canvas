import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Banner, buttonClass } from "@/components/kabsi/ui";
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
    <div data-testid="plan-choice">
      <Banner
        tone={card.tone === "attention" ? "warn" : "info"}
        title={card.title}
        action={
          <Link to={card.cta.to} className={buttonClass("tertiary")}>
            {card.cta.label}
          </Link>
        }
      >
        {card.body}
      </Banner>
    </div>
  );
}
