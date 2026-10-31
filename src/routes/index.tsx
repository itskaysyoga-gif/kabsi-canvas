import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { PHOTOS } from "@/components/kabsi/photos";
import { HERO_LINE } from "@/components/kabsi/d6-data";
import { D6Home } from "@/components/kabsi/d6-home";
import { ORG_LD, PRODUCT_LD, WEBSITE_LD, pageHead } from "@/lib/site";
import { faqJsonLd } from "@/lib/faq";
import { FAQ, HOME_FAQ } from "@/components/kabsi/faq-data";

// Home is Design 6, round 2 (Web 3; master plan 30.20 section 3, approved by lane R on 30 Oct 2026). The route's own
// chunk (the router splits each route) carries the page and its demonstration, so the shared bundle stays small. It is
// not behind React.lazy: a lazy boundary that is still loading when the shell updates is thrown away and drawn again,
// which blanked the hero for a moment on slow phones and pushed LCP past 5 s (Web 3 after-merge check, 31 Oct 2026).

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
      <D6Home />
    </SiteShell>
  );
}
