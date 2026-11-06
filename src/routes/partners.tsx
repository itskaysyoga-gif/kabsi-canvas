import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { PartnersPage } from "@/components/kabsi/d2-partners";
import { PARTNERS_HERO } from "@/components/kabsi/hero-lines";
import { PARTNER_FAQ } from "@/components/kabsi/faq-data";
import { faqJsonLd } from "@/lib/faq";
import { pageHead, SERVER_ONLY_LD } from "@/lib/site";

export const Route = createFileRoute("/partners")({
  head: () =>
    pageHead({
      title: `Kabsi: ${PARTNERS_HERO.title}`,
      description: PARTNERS_HERO.line,
      path: "/partners",
      image: "partner",
      crumbs: [{ name: "Partners", path: "/partners" }],
      jsonLd: [import.meta.env.SSR ? faqJsonLd(PARTNER_FAQ) : SERVER_ONLY_LD],
    }),
  component: () => (
    <SiteShell>
      <PartnersPage />
    </SiteShell>
  ),
});
