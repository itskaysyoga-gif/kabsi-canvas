// The homepage sections in the order of K-140. The page renders HOME_ORDER (src/lib/website.ts) through SECTIONS, so the
// order is one list that a test reads. Every mockup is built from the app's own components (mockups.tsx) and marked
// "Example". Motion is the one CSS fade-in (data-rise and data-stagger, styles.css) that stops under reduced motion.
import { lazy, Suspense, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Eye, Smartphone, UserPlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow, H2, IconBadge, Section } from "@/components/marketing/parts";
import {
  CoachScreen,
  MockFigure,
  Phone,
  PhoneTitle,
  ProtectionScreen,
  ReviewScreen,
  WhatsappChat,
} from "@/components/marketing/mockups";
import { BRAND_LINE, CTA_CHECK, CTA_HOW, WHATSAPP_ON, heroSub } from "@/lib/site";
import { HOME_ORDER, PILLARS, howSteps, type HomeSection } from "@/lib/website";

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-kb-carbon text-kb-white">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16 lg:py-24">
        <div>
          <h1 className="font-display text-[clamp(2.7rem,6.6vw,5.2rem)] leading-[0.95] text-balance">
            {BRAND_LINE}
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-kb-stone-on-dark">{heroSub()}</p>
          <div className="mt-9 grid gap-3 sm:flex">
            <Button asChild className="w-full sm:w-auto">
              <Link to="/google-profile-check">
                {CTA_CHECK} <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full border-kb-white text-kb-white hover:bg-kb-white/10 sm:w-auto"
            >
              <a href="#how">{CTA_HOW}</a>
            </Button>
          </div>
          <ul className="mt-9 grid gap-x-6 gap-y-2 text-[15px] text-kb-stone-on-dark sm:flex sm:flex-wrap">
            {PILLARS.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <Check className="size-4 text-kb-yellow" aria-hidden="true" />
                {p.title}
              </li>
            ))}
          </ul>
        </div>
        <div className="kb-hero-visual">
          {WHATSAPP_ON ? (
            <MockFigure caption="Example: a new review arrives on WhatsApp with a reply ready and an Approve button.">
              <Phone title={<PhoneTitle>Kabsi on WhatsApp</PhoneTitle>}>
                <WhatsappChat />
              </Phone>
            </MockFigure>
          ) : (
            <MockFigure caption="Example: a new review in Kabsi with a reply ready and an Approve button.">
              <Phone title={<PhoneTitle>Reviews</PhoneTitle>}>
                <ReviewScreen />
              </Phone>
            </MockFigure>
          )}
        </div>
      </div>
    </section>
  );
}

function How() {
  const steps = howSteps();
  const icons = [<Search key="s" />, <UserPlus key="u" />, <Smartphone key="p" />, <Eye key="e" />];
  return (
    <Section id="how" className="scroll-mt-20">
      <Eyebrow>How it works</Eyebrow>
      <H2>Four steps, and the last one is Kabsi keeping watch.</H2>
      <ol data-stagger="" className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className="kb-lift rounded-large border-2 border-kb-hairline bg-kb-white p-6"
          >
            <div className="flex items-center justify-between">
              <IconBadge icon={icons[i]} />
              <span className="font-display text-4xl leading-none text-kb-hairline">{i + 1}</span>
            </div>
            <h3 className="mt-5 text-xl font-bold">{s.title}</h3>
            <p className="mt-2 leading-7 text-kb-stone">{s.text}</p>
            {i === 0 ? (
              <Link
                to="/google-profile-check"
                className="mt-4 inline-flex items-center gap-2 font-bold underline underline-offset-4"
              >
                {CTA_CHECK} <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
          </li>
        ))}
      </ol>
    </Section>
  );
}

/** Where the page stops being the first screen. Everything from here is hydrated after the first screen is ready. */
const FIRST_SCREEN: ReadonlySet<HomeSection> = new Set<HomeSection>(["hero", "how"]);

const FIRST: Partial<Record<HomeSection, () => ReactNode>> = {
  hero: Hero,
  how: How,
};

// The sections below the first screen are one lazy chunk inside a Suspense boundary (lane R, 22 Oct 2026, performance).
// The server renders them in the same response, so nothing is missing for a visitor or a crawler; the browser hydrates
// them as a second, separate piece of work after the first screen is interactive, instead of one long task.
const HomeBelow = lazy(() =>
  import("@/components/marketing/home-sections-below").then((m) => ({ default: m.HomeBelow })),
);

/** The homepage sections, in the order of K-140. */
export function HomeSections() {
  const below = HOME_ORDER.filter((id) => !FIRST_SCREEN.has(id));
  return (
    <>
      {HOME_ORDER.filter((id) => FIRST_SCREEN.has(id)).map((id) => {
        const S = FIRST[id]!;
        return <S key={id} />;
      })}
      <Suspense fallback={null}>
        <HomeBelow ids={below} />
      </Suspense>
    </>
  );
}
