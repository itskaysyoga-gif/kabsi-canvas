import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/site";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { V31Pricing } from "@/components/marketing/v31";
import { HEADS } from "@/components/marketing/v31-heads";

// Pricing on blueprint 3.1 section 4 (SITE-1): one card at 29 US dollars a month per location, the trial terms beside
// the button, what is not included said once. No Product or Offer markup. The founding line is only on its private page.
export const Route = createFileRoute("/pricing")({
  head: () =>
    pageHead({
      title: HEADS.pricing.title,
      description: HEADS.pricing.description,
      path: "/pricing",
      image: "pricing",
      crumbs: [{ name: "Pricing", path: "/pricing" }],
    }),
  component: function Pricing() {
    return (
      <SiteShell>
        <V31Pricing />
      </SiteShell>
    );
  },
});
