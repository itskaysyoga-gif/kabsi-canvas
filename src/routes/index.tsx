import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PublicLayout } from "@/components/layouts/public-layout";
import { HomeSections } from "@/components/marketing/home-sections";
import { faqJsonLd } from "@/lib/faq";
import { ORG_LD, PRODUCT_LD, WEBSITE_LD, BRAND_LINE, heroSub, pageHead } from "@/lib/site";
import { homeFaq } from "@/lib/website";

// The homepage (P0.8-13, K-140). The sections and their order live in src/lib/website.ts (HOME_ORDER) and
// src/components/marketing/home-sections.tsx.
export const Route = createFileRoute("/")({
  // go.kabsi.co sends switched-off cards here with ?sticker=disabled
  validateSearch: z.object({ sticker: z.enum(["disabled"]).optional().catch(undefined) }),
  head: () =>
    pageHead({
      title: `Kabsi | ${BRAND_LINE}`,
      description: heroSub(),
      path: "/",
      jsonLd: [ORG_LD, WEBSITE_LD, PRODUCT_LD, faqJsonLd(homeFaq())],
    }),
  component: HomePage,
});

function HomePage() {
  const { sticker } = Route.useSearch();
  return (
    <PublicLayout>
      {sticker === "disabled" ? (
        <div
          role="status"
          className="bg-kb-yellow px-5 py-3 text-center text-sm font-bold text-kb-black"
        >
          This review link isn't active. Please ask the staff for help.
        </div>
      ) : null}
      <HomeSections />
    </PublicLayout>
  );
}
