import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Check } from "lucide-react";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { ScanBox } from "@/components/kabsi/scan-box";
import { buttonClass } from "@/components/kabsi/ui";
import { Img, PHOTOS } from "@/components/kabsi/photos";
import { ORG_LD, PRODUCT_LD, TRIAL_LINE, WEBSITE_LD, pageHead } from "@/lib/site";
import { faqJsonLd } from "@/lib/faq";
import { FAQ, HOME_FAQ } from "@/components/kabsi/faq-data";
import { cn } from "@/lib/utils";
import { Suspense, lazy } from "react";
import { BusinessPicker } from "@/components/kabsi/d5-picker";
import { useFlagState } from "@/components/kabsi/d2-parts";
import { HOME_EXAMPLE_IDS, homeExample, type HomeExample } from "@/content/home-examples";

// The scene and everything below the hero hydrate from their own chunks, so the page is usable on the shared
// bundle alone (brief section 7). The server still renders them, so nothing shifts while they load.
const HeroScene = lazy(() =>
  import("@/components/kabsi/whatsapp").then((m) => ({ default: m.HeroScene })),
);
const BelowHero = lazy(() =>
  import("@/components/kabsi/d4-home").then((m) => ({ default: m.BelowHero })),
);

export const Route = createFileRoute("/")({
  // go.kabsi.co sends switched-off cards here with ?sticker=disabled
  validateSearch: z.object({ sticker: z.enum(["disabled"]).optional().catch(undefined) }),
  head: () => {
    const h = pageHead({
      title: "Kabsi: Your business on Google. Taken care of through WhatsApp.",
      description:
        "Kabsi prepares your review replies, posts and updates to your business details. You approve each one on WhatsApp before it goes live.",
      path: "/",
      image: "home",
      jsonLd: [ORG_LD, WEBSITE_LD, PRODUCT_LD, faqJsonLd(HOME_FAQ.map((i) => FAQ[i - 1]!))],
    });
    return {
      ...h,
      links: [
        ...h.links,
        // The hero photo only shows on wide screens, so only they preload it.
        {
          rel: "preload",
          as: "image",
          href: PHOTOS.salonWash.large,
          imageSrcSet: `${PHOTOS.salonWash.small} 800w, ${PHOTOS.salonWash.large} 1600w`,
          imageSizes: "50vw",
          media: "(min-width: 1024px)",
        },
      ],
    };
  },
  component: Home,
});

function Home() {
  // ?biz=restaurant opens Home on another example (a link for every choice, for screenshots).
  const [pick, setPick] = useFlagState<string>("salon", HOME_EXAMPLE_IDS, "biz");
  const example = homeExample(pick);
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
      <Hero example={example} />
      <BusinessPicker value={example} onChange={setPick} />
      <Suspense fallback={null}>
        <BelowHero example={example} />
      </Suspense>
      <ClosingBand />
    </SiteShell>
  );
}

function Hero({ example }: { example: HomeExample }) {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      {/* Soft light behind the phone; on wide screens the salon photo sits behind it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60rem] lg:hidden"
        style={{
          backgroundImage:
            "radial-gradient(60% 40% at 50% 72%, rgb(255 214 10 / 0.12), transparent 70%)",
        }}
      />
      <div className="container-kb grid gap-10 pt-24 pb-12 sm:pt-28 lg:min-h-[52rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-6 lg:pt-28 lg:pb-20">
        <div className="max-w-[36rem] lg:py-10">
          {/* The one yellow phrase of the hero (brief section 16, item 2). */}
          <h1 id="hero-title" className="animate-enter text-display">
            Your business on Google.{" "}
            <span className="text-kb-yellow">Taken care of through WhatsApp.</span>
          </h1>
          <p
            className="mt-5 animate-enter text-lead text-text-2"
            style={{ animationDelay: "60ms" }}
          >
            Kabsi prepares your review replies, posts and updates to your business details. You
            approve each one on WhatsApp before it goes live.
          </p>
          <div className="mt-8 animate-enter" style={{ animationDelay: "120ms" }}>
            <ScanBox id="hero-scan" />
            <a href="#try" className={cn(buttonClass("secondary", "md"), "mt-5")}>
              See how it works
            </a>
            <p className="mt-5 text-small text-text-2">{TRIAL_LINE}</p>
            {/* Two short proof lines (master plan 30.16 section 5). */}
            <ul className="mt-6 flex flex-col gap-2 border-t border-line pt-5 sm:flex-row sm:gap-6">
              {["You approve every change.", "You keep control of your Google profile."].map(
                (l) => (
                  <li
                    key={l}
                    className="flex items-center gap-2 text-small font-semibold text-text-1"
                  >
                    <Check className="size-4 shrink-0 text-ok" strokeWidth={2.5} aria-hidden />
                    {l}
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>

        {/* On phones the tappable story follows right under the hero, so the scene shows from 1024 px. */}
        <div className="relative hidden lg:block lg:h-full">
          <div
            aria-hidden
            className="absolute inset-y-0 end-[-2rem] start-[18%] hidden overflow-hidden rounded-panel lg:block"
          >
            <Img
              key={example.id}
              photo={example.photo}
              sizes="50vw"
              priority={example.id === "salon"}
              decorative
              className="absolute inset-0 size-full object-cover object-[30%_50%]"
            />
            {/* Keeps the phone the brightest thing. */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, rgb(12 12 11 / 0.5) 0%, rgb(12 12 11 / 0.08) 30%, rgb(12 12 11 / 0) 65%, rgb(12 12 11 / 0.45) 100%), linear-gradient(90deg, rgb(12 12 11 / 0.85) 0%, rgb(12 12 11 / 0) 32%)",
              }}
            />
          </div>
          <Suspense
            fallback={<div className="mx-auto aspect-[433/882] w-[min(100%,20rem)] lg:w-[21rem]" />}
          >
            <HeroScene
              key={example.id}
              review={{
                business: example.business,
                intro: `new 5-star review from ${example.hero.name}`,
                quote: `'${example.hero.quote}'`,
                draft: `'${example.hero.draft}'`,
              }}
              className="relative mx-auto w-[min(100%,20rem)] lg:ms-[6%] lg:me-auto lg:w-[21rem] lg:pt-6"
            />
          </Suspense>
        </div>
      </div>
    </section>
  );
}

function ClosingBand() {
  return (
    <section aria-labelledby="closing-title" className="border-t border-line bg-band">
      <div className="container-kb section-y">
        <div className="mx-auto max-w-[40rem]">
          <h2 id="closing-title" className="text-h2">
            Start with a free check.
          </h2>
          {/* The 10 seconds and the minutes, explained (brief section 14.9). */}
          <p className="mt-4 text-lead text-text-2">
            The quick check shows in about 10 seconds. The full check from 49 places around you
            arrives on WhatsApp within minutes.
          </p>
          <ScanBox id="closing-scan" className="mt-8" />
          <p className="mt-2 text-small text-text-2">{TRIAL_LINE}</p>
        </div>
      </div>
    </section>
  );
}
