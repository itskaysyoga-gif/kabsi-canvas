import { useQuery } from "@tanstack/react-query";
import { Banner } from "@/components/kabsi/ui";
import { loadEntitlements } from "@/lib/entitlements";
import { trialBannerLine } from "@/lib/trial-banner";

/** Onboarding step 6: "Your 14-day Pro trial has started. No card needed." for the first days of the trial (30 through a partner link). */
export function TrialBanner({ locationId }: { locationId: string }) {
  const ent = useQuery({
    queryKey: ["entitlements", locationId],
    queryFn: () => loadEntitlements(locationId),
    staleTime: 60_000,
  });
  const line = ent.data ? trialBannerLine(ent.data) : null;
  if (!line) return null;
  return (
    <div data-testid="trial-banner">
      <Banner tone="ok" title={line}>
        Kabsi watches your reviews and your Google profile and prepares what you approve. Choose
        Essentials or Pro from day 11. Your review link and QR code stay free either way.
      </Banner>
    </div>
  );
}
