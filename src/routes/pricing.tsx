import { createFileRoute } from "@tanstack/react-router";
import { pageHead, serverOnlyLd } from "@/lib/site";
import { faqJsonLd } from "@/lib/faq";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { PRICING_HERO } from "@/components/kabsi/hero-lines";
import { BILLING_FAQ } from "@/components/kabsi/faq-data";
import { D8Pricing } from "@/components/kabsi/d8-pricing";

export const Route = createFileRoute("/pricing")({
  head: () =>
    pageHead({
      // docs/SEO-PLAN.md: "Kabsi: " and the hero headline, the hero line as description. No Product or Offer markup
      // (prices change with the founding count); BreadcrumbList and FAQPage from "Billing questions".
      title: `Kabsi: ${PRICING_HERO.title}`,
      description: PRICING_HERO.line,
      path: "/pricing",
      image: "pricing",
      crumbs: [{ name: "Pricing", path: "/pricing" }],
      jsonLd: [import.meta.env.SSR ? faqJsonLd(BILLING_FAQ) : serverOnlyLd("/pricing")],
    }),
  component: function Pricing() {
    return (
      <SiteShell>
        <D8Pricing />
      </SiteShell>
    );
  },
});
