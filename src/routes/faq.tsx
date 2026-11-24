import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { V31Faq } from "@/components/marketing/v31-pages";
import { FAQ_V31 } from "@/components/marketing/v31-data";
import { HEADS } from "@/components/marketing/v31-heads";
import { faqJsonLd } from "@/lib/faq";
import { pageHead, serverOnlyLd } from "@/lib/site";

// The FAQ on blueprint 3.1 section 6 (SITE-1), word for word; FAQPage from the same list, and BreadcrumbList.
export const Route = createFileRoute("/faq")({
  head: () =>
    pageHead({
      title: HEADS.faq.title,
      description: HEADS.faq.description,
      path: "/faq",
      image: "about",
      crumbs: [{ name: "FAQ", path: "/faq" }],
      jsonLd: [
        import.meta.env.SSR
          ? faqJsonLd(FAQ_V31.map((f) => ({ q: f.q, a: f.a })))
          : serverOnlyLd("/faq"),
      ],
    }),
  component: () => (
    <SiteShell>
      <V31Faq />
    </SiteShell>
  ),
});
