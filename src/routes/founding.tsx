import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { FoundingPage } from "@/components/kabsi/d5-founding";
import { FOUNDING_HERO } from "@/components/kabsi/hero-lines";
import { FOUNDING_FAQ } from "@/components/kabsi/faq-data";
import { faqJsonLd } from "@/lib/faq";
import { pageHead, SERVER_ONLY_LD } from "@/lib/site";

export const Route = createFileRoute("/founding")({
  head: () =>
    pageHead({
      title: `Kabsi: ${FOUNDING_HERO.title}`,
      description: FOUNDING_HERO.line,
      path: "/founding",
      image: "founding",
      crumbs: [{ name: "Founding 25", path: "/founding" }],
      jsonLd: [import.meta.env.SSR ? faqJsonLd(FOUNDING_FAQ) : SERVER_ONLY_LD],
    }),
  component: () => (
    <SiteShell>
      <FoundingPage />
    </SiteShell>
  ),
});
