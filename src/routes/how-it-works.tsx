import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { HOW_HERO } from "@/components/kabsi/hero-lines";
import { HowItWorksPage } from "@/components/kabsi/how-page";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/how-it-works")({
  head: () =>
    pageHead({
      // docs/SEO-PLAN.md: "Kabsi: " and the hero headline, the hero line as description; BreadcrumbList.
      title: `Kabsi: ${HOW_HERO.title}`,
      description: HOW_HERO.line,
      path: "/how-it-works",
      image: "home",
      crumbs: [{ name: "How it works", path: "/how-it-works" }],
    }),
  component: function HowItWorks() {
    return (
      <SiteShell>
        <HowItWorksPage />
      </SiteShell>
    );
  },
});
