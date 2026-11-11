import { createFileRoute } from "@tanstack/react-router";
import { oneOf } from "@/lib/search-params";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { HOME_LINE } from "@/components/kabsi/hero-lines";
import { D9Home, loadHomeLower } from "@/components/kabsi/d9-home";
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
  // Polish 4 part D: the server render (and a visit to Home from another page) has the lower sections' code before it
  // draws; a first visit in the browser keeps their server HTML until the visitor scrolls (d9-home.tsx).
  loader: async () => {
    await loadHomeLower();
  },
  head: () => {
    const h = pageHead({
      // Home 2 (lane R R-158 item 4): the owner's words, "Google listing" (docs/site4/home.md, Meta).
      title: "Kabsi: your Google listing, taken care of on WhatsApp",
      description: HOME_LINE,
      path: "/",
      image: "home",
      // docs/SEO-PLAN.md (Design 8, lane R decision 8): Organization and WebSite only; no Product or Offer markup.
      jsonLd: [ORG_LD, WEBSITE_LD],
    });
    // Home 2: the hero's picture is the WhatsApp thread (its one small photo loads lazily), so no photo is preloaded.
    return h;
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
