import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { D8Faq } from "@/components/kabsi/d8-faq";
import { FAQ_HERO } from "@/components/kabsi/hero-lines";
import { FAQ_ALL } from "@/components/kabsi/faq-data";
import { faqJsonLd } from "@/lib/faq";
import { pageHead, serverOnlyLd } from "@/lib/site";

export const Route = createFileRoute("/faq")({
  // docs/SEO-PLAN.md: "Kabsi: " and the hero headline, the hero line as description; FAQPage from all five groups, word
  // for word, and BreadcrumbList.
  head: () =>
    pageHead({
      title: `Kabsi: ${FAQ_HERO.title}`,
      description: FAQ_HERO.line,
      path: "/faq",
      image: "about",
      crumbs: [{ name: "FAQ", path: "/faq" }],
      jsonLd: [import.meta.env.SSR ? faqJsonLd(FAQ_ALL) : serverOnlyLd("/faq")],
    }),
  component: () => (
    <SiteShell>
      <D8Faq />
    </SiteShell>
  ),
});
