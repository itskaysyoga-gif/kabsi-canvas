import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { PartnersPage } from "@/components/kabsi/d2-partners";
import { PARTNERS_HERO } from "@/components/kabsi/hero-lines";
import { PARTNER_FAQ } from "@/components/kabsi/faq-data";
import { faqJsonLd } from "@/lib/faq";
import { pageHead, serverOnlyLd } from "@/lib/site";

export const Route = createFileRoute("/partners")({
  head: () =>
    pageHead({
      title: `Kabsi: ${PARTNERS_HERO.title}`,
      description: PARTNERS_HERO.line,
      path: "/partners",
      // SITE-1 (blueprint 3.1 section 5): partners are off; the page stays reachable by direct link, not indexed.
      noindex: true,
      image: "partner",
      crumbs: [{ name: "Partners", path: "/partners" }],
      jsonLd: [import.meta.env.SSR ? faqJsonLd(PARTNER_FAQ) : serverOnlyLd("/partners")],
    }),
  component: () => (
    <SiteShell>
      <PartnersPage />
    </SiteShell>
  ),
});
