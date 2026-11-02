import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { AllBusinesses } from "@/components/kabsi/d8-industry";
import { HUB_HERO } from "@/components/kabsi/hero-lines";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/for/")({
  head: () =>
    pageHead({
      // docs/SEO-PLAN.md: "Kabsi: " and the hub's headline, the hub line as description; BreadcrumbList.
      title: `Kabsi: ${HUB_HERO.title}`,
      description: HUB_HERO.line,
      path: "/for",
      image: "industry",
      crumbs: [{ name: "Businesses", path: "/for" }],
    }),
  component: () => (
    <SiteShell>
      <AllBusinesses />
    </SiteShell>
  ),
});
