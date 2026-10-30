import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Suspense, lazy } from "react";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { PHOTOS } from "@/components/kabsi/photos";
import { HERO_LINE } from "@/components/kabsi/d6-data";
import { ORG_LD, PRODUCT_LD, WEBSITE_LD, pageHead } from "@/lib/site";
import { faqJsonLd } from "@/lib/faq";
import { FAQ, HOME_FAQ } from "@/components/kabsi/faq-data";

// Home is Design 6, round 2 (Web 3; master plan 30.20 section 3, approved by lane R on 30 Oct 2026). The page and its
// demonstration hydrate from their own chunk, so the shared bundle stays small (brief section 7). The server still
// renders every section, so nothing shifts while it loads.
const D6Home = lazy(() =>
  import("@/components/kabsi/d6-home").then((m) => ({ default: m.D6Home })),
);

export const Route = createFileRoute("/")({
  // go.kabsi.co sends switched-off cards here with ?sticker=disabled
  validateSearch: z.object({ sticker: z.enum(["disabled"]).optional().catch(undefined) }),
  head: () => {
    const h = pageHead({
      title: "Kabsi: Your business on Google. Taken care of.",
      description: HERO_LINE,
      path: "/",
      image: "home",
      jsonLd: [ORG_LD, WEBSITE_LD, PRODUCT_LD, faqJsonLd(HOME_FAQ.map((i) => FAQ[i - 1]!))],
    });
    return {
      ...h,
      links: [
        ...h.links,
        // The salon photo behind the hero phone shows from 768 px only, so only those screens preload it.
        {
          rel: "preload",
          as: "image",
          href: PHOTOS.salonWash.large,
          imageSrcSet: `${PHOTOS.salonWash.small} 800w, ${PHOTOS.salonWash.large} 1600w`,
          imageSizes: "(min-width: 1024px) 40vw, 100vw",
          media: "(min-width: 768px)",
        },
      ],
    };
  },
  component: Home,
});

function Home() {
  const { sticker } = Route.useSearch();
  return (
    <SiteShell>
      {sticker === "disabled" ? (
        <div
          role="status"
          className="relative z-50 bg-kb-yellow px-5 pt-20 pb-3 text-center text-small font-bold text-kb-black"
        >
          This review link isn't active. Please ask the staff for help.
        </div>
      ) : null}
      <Suspense fallback={null}>
        <D6Home />
      </Suspense>
    </SiteShell>
  );
}
