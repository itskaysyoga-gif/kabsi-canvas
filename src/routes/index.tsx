import { createFileRoute } from "@tanstack/react-router";
import { oneOf } from "@/lib/search-params";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { PHOTOS } from "@/components/kabsi/photos";
import { HOME_LINE } from "@/components/kabsi/hero-lines";
import { D9Home } from "@/components/kabsi/d9-home";
import { ORG_LD, WEBSITE_LD, pageHead } from "@/lib/site";

// Home is Design 9 (Web 5 part B, master plan 30.24); before that Design 7 and 8 (Web 4) and Design 6 (Web 3). The route's own
// chunk (the router splits each route) carries the page and its demonstration, so the shared bundle stays small. It is
// not behind React.lazy: a lazy boundary that is still loading when the shell updates is thrown away and drawn again,
// which blanked the hero for a moment on slow phones and pushed LCP past 5 s (Web 3 after-merge check, 31 Oct 2026).

export const Route = createFileRoute("/")({
  // go.kabsi.co sends switched-off cards here with ?sticker=disabled
  validateSearch: (s: Record<string, unknown>): { sticker?: "disabled" | undefined } => ({
    sticker: oneOf(s["sticker"], ["disabled"] as const),
  }),
  head: () => {
    const h = pageHead({
      title: "Kabsi: Your business on Google. Taken care of.",
      description: HOME_LINE,
      path: "/",
      image: "home",
      // docs/SEO-PLAN.md (Design 8, lane R decision 8): Organization and WebSite only; no Product or Offer markup.
      jsonLd: [ORG_LD, WEBSITE_LD],
    });
    return {
      ...h,
      links: [
        ...h.links,
        // The salon photo behind the hero phone shows from 768 px only, so only those screens preload it.
        {
          rel: "preload",
          as: "image",
          href: PHOTOS.salonTablet.large,
          imageSrcSet: `${PHOTOS.salonTablet.small} 800w, ${PHOTOS.salonTablet.large} 1600w`,
          imageSizes: "(min-width: 1024px) 28vw, 60vw",
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
          className="relative z-40 bg-kb-yellow px-5 py-3 text-center text-small font-bold text-kb-black"
        >
          This review link isn't active. Please ask the staff for help.
        </div>
      ) : null}
      <D9Home />
    </SiteShell>
  );
}
