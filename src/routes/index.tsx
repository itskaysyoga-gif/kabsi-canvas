import { createFileRoute } from "@tanstack/react-router";
import { oneOf } from "@/lib/search-params";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { V31Home } from "@/components/marketing/v31";
import { HEADS } from "@/components/marketing/v31-heads";
import { ORG_LD, WEBSITE_LD, pageHead } from "@/lib/site";

// Home on blueprint 3.1 (SITE-1, R-163): nine sections, each one phone screen, one action (the free check). The words
// are in src/components/marketing/v31-data.ts; docs/COPY.md section 90.
export const Route = createFileRoute("/")({
  // go.kabsi.co sends switched-off cards here with ?sticker=disabled
  validateSearch: (s: Record<string, unknown>): { sticker?: "disabled" | undefined } => ({
    sticker: oneOf(s["sticker"], ["disabled"] as const),
  }),
  head: () => {
    const head = pageHead({
      title: HEADS.home.title,
      description: HEADS.home.description,
      path: "/",
      image: "home",
      // docs/SEO-PLAN.md: Organization and WebSite only; no Product or Offer markup.
      jsonLd: [ORG_LD, WEBSITE_LD],
    });
    // SITE-4: the hero photo behind the phone is preloaded (the same srcset and sizes as the image itself).
    return {
      ...head,
      links: [
        ...head.links,
        {
          rel: "preload",
          as: "image",
          href: "/photos/owner-phone-tall-480.webp",
          imageSrcSet:
            "/photos/owner-phone-tall-480.webp 480w, /photos/owner-phone-tall-960.webp 960w",
          imageSizes:
            "(min-width: 1280px) 330px, (min-width: 1024px) 290px, (min-width: 640px) 480px, 92vw",
          fetchPriority: "high",
          type: "image/webp",
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
      <V31Home />
    </SiteShell>
  );
}
