// The homepage sections below the first screen (lane R, 22 Oct 2026). The page renders HOME_ORDER (src/lib/website.ts) through SECTIONS, so the
// order is one list that a test reads. Every mockup is built from the app's own components (mockups.tsx) and marked
// "Example". Motion is the one CSS fade-in (data-rise and data-stagger, styles.css) that stops under reduced motion.
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Eye, KeyRound, Plug, ShieldCheck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CtaBand,
  Eyebrow,
  FaqList,
  H2,
  IconBadge,
  Section,
  SoonPill,
} from "@/components/marketing/parts";
import { KabsiMark } from "@/components/shared/kabsi-logo";
import {
  CoachScreen,
  ExampleTag,
  MockFigure,
  Phone,
  PhoneTitle,
  ProtectionScreen,
  ReviewScreen,
  WhatsappChat,
} from "@/components/marketing/mockups";
import {
  CONTACT_EMAIL,
  CTA_CHECK,
  FOUNDER_SIGNATURE,
  PLAN_PRICES,
  TAX_NOTE,
  WHATSAPP_ON,
  heroSub,
} from "@/lib/site";
import {
  COMING_SOON,
  CONTROL_ITEMS,
  ESSENTIALS_FOR,
  FOUNDER_NOTE,
  PAYMENT_LINE,
  PILLARS,
  PRICE_LINES,
  PROOF_NOTE,
  PRO_FOR,
  TRIAL_BOX,
  homeFaq,
  planButton,
  planGrid,
  whatsappText,
  type PlanItem,
  type HomeSection,
} from "@/lib/website";
import { VERTICALS } from "@/lib/verticals";
import { cn } from "@/lib/utils";

const PILLAR_SCREENS: Record<(typeof PILLARS)[number]["id"], { caption: string; node: ReactNode }> =
  {
    reviews: {
      caption:
        "Example: the review card in Kabsi, with the reply ready and Approve reply as the main button.",
      node: <ReviewScreen />,
    },
    protected: {
      caption:
        "Example: Google Protection shows a phone number that changed on Google, next to the one you approved.",
      node: <ProtectionScreen />,
    },
    found: {
      caption:
        "Example: the Profile Coach checklist shows what a complete Google profile has and what yours is missing.",
      node: <CoachScreen />,
    },
  };

function Pillars() {
  return (
    <Section tone="sand">
      <Eyebrow>What Kabsi looks after</Eyebrow>
      <H2>Three jobs, done for you and shown to you.</H2>
      <div className="mt-14 grid gap-16 lg:gap-24">
        {PILLARS.map((p, i) => (
          <div key={p.id} data-rise="" className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
            <div className={cn(i % 2 === 1 && "lg:order-2")}>
              <p className="font-display text-5xl leading-none text-kb-hairline">{i + 1}</p>
              <h3 className="mt-3 font-display text-[clamp(1.9rem,3.6vw,2.6rem)] leading-[1.05]">
                {p.title}
              </h3>
              <p className="mt-4 max-w-lg text-lg leading-8 text-kb-stone">{p.text}</p>
            </div>
            <div>
              <ExampleTag className="mb-3" />
              <MockFigure caption={PILLAR_SCREENS[p.id].caption}>
                {PILLAR_SCREENS[p.id].node}
              </MockFigure>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Whatsapp() {
  const t = whatsappText();
  return (
    <Section id="whatsapp" className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <Eyebrow>WhatsApp</Eyebrow>
          {WHATSAPP_ON ? null : <SoonPill />}
        </div>
        <H2>{t.heading}</H2>
        <p className="mt-5 max-w-xl text-lg leading-8 text-kb-stone">{t.intro}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-large border-2 border-kb-hairline p-5">
            <p className="font-bold">{t.canTitle}</p>
            <ul className="mt-3 space-y-2 text-kb-stone">
              {t.can.map((c) => (
                <li key={c} className="flex gap-2">
                  <Check className="mt-1 size-4 shrink-0 text-kb-green" aria-hidden="true" /> {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-large border-2 border-kb-hairline p-5">
            <p className="font-bold">{t.cannotTitle}</p>
            <ul className="mt-3 space-y-2 text-kb-stone">
              {t.cannot.map((c) => (
                <li key={c} className="flex gap-2">
                  <ShieldCheck className="mt-1 size-4 shrink-0" aria-hidden="true" /> {c}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-kb-stone">{t.cannotNote}</p>
          </div>
        </div>
        <p className="mt-5 text-sm text-kb-stone">{t.foot}</p>
      </div>
      <div className="rounded-large bg-kb-sand p-5 sm:p-8">
        <MockFigure caption="Example: a WhatsApp message with a new review, the reply Kabsi wrote, and the buttons Approve and Edit in app.">
          <Phone title={<PhoneTitle>Kabsi on WhatsApp</PhoneTitle>}>
            <WhatsappChat />
          </Phone>
        </MockFigure>
        {WHATSAPP_ON ? null : (
          <p className="mt-4 text-center text-sm font-bold text-kb-stone">
            {COMING_SOON}. Today you approve in the Kabsi app.
          </p>
        )}
      </div>
    </Section>
  );
}

function PlanList({ items }: { items: PlanItem[] }) {
  return (
    <ul className="mt-5 space-y-3">
      {items.map((i) => (
        <li key={i.text} className="flex gap-3 text-[15px] leading-6">
          <Check className="mt-0.5 size-5 shrink-0 text-kb-green" aria-hidden="true" />
          <span>
            {i.text}
            {i.soon ? <SoonPill className="ml-2" /> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Plans() {
  const g = planGrid();
  return (
    <Section tone="sand">
      <Eyebrow>Essentials and Pro</Eyebrow>
      <H2>Everything Kabsi does, plan by plan.</H2>
      <div data-stagger="" className="mt-12 grid gap-5 lg:grid-cols-2">
        <div className="rounded-large bg-kb-white p-6 shadow-kb sm:p-8">
          <p className="font-display text-3xl">Essentials</p>
          <p className="mt-1 text-kb-stone">{ESSENTIALS_FOR}</p>
          <PlanList items={g.essentials} />
        </div>
        <div className="rounded-large bg-kb-white p-6 shadow-kb ring-2 ring-kb-black sm:p-8">
          <p className="font-display text-3xl">Pro</p>
          <p className="mt-1 text-kb-stone">{PRO_FOR}</p>
          <p className="mt-5 text-sm font-bold uppercase tracking-wider text-kb-stone">Pro adds</p>
          <PlanList items={g.proAdds} />
        </div>
      </div>
    </Section>
  );
}

function PriceCard({
  name,
  monthly,
  yearly,
  highlight = false,
}: {
  name: string;
  monthly: number;
  yearly: number;
  highlight?: boolean;
}) {
  const btn = planButton();
  return (
    <div
      className={cn(
        "flex flex-col rounded-large bg-kb-white p-6 shadow-kb sm:p-8",
        highlight && "ring-2 ring-kb-black",
      )}
    >
      <p className="font-display text-3xl">{name}</p>
      <p className="mt-3 font-display text-5xl leading-none">${monthly}</p>
      <p className="mt-2 text-kb-stone">a month, or ${yearly} a year</p>
      <Button asChild variant={highlight ? "default" : "outline"} className="mt-6 w-full">
        <Link to={btn.to}>{btn.label}</Link>
      </Button>
    </div>
  );
}

function Pricing() {
  return (
    <Section id="pricing" className="scroll-mt-20">
      <div className="flex flex-wrap items-center gap-3">
        <Eyebrow>Pricing</Eyebrow>
        <span className="rounded-pill bg-kb-sand px-2.5 py-0.5 text-xs font-bold text-kb-stone ring-1 ring-kb-hairline">
          Early access
        </span>
      </div>
      <H2>Two plans, and a free Pro trial to start.</H2>
      <div data-stagger="" className="mt-10 grid gap-5 md:grid-cols-2">
        <PriceCard
          name="Essentials"
          monthly={PLAN_PRICES.essentialsMonthly}
          yearly={PLAN_PRICES.essentialsYearly}
        />
        <PriceCard
          name="Pro"
          highlight
          monthly={PLAN_PRICES.proMonthly}
          yearly={PLAN_PRICES.proYearly}
        />
      </div>
      <div className="mt-6 rounded-large border-l-4 border-kb-yellow bg-kb-sand p-6">
        <p className="font-bold">{TRIAL_BOX}</p>
        <p className="mt-2 text-kb-stone">
          An extra location is {PRICE_LINES.extra}. Prices are in US dollars, {TAX_NOTE}.
        </p>
        <p className="mt-2 text-kb-stone">{PAYMENT_LINE}</p>
      </div>
      <p className="mt-6">
        <Link to="/pricing" className="font-bold underline underline-offset-4">
          See pricing in full
        </Link>
      </p>
    </Section>
  );
}

const CONTROL_ICONS: Record<(typeof CONTROL_ITEMS)[number]["id"], ReactNode> = {
  ok: <UserCheck />,
  password: <KeyRound />,
  owner: <ShieldCheck />,
  leave: <Plug />,
  independent: <Eye />,
};

function Control() {
  return (
    <Section tone="carbon">
      <Eyebrow>
        <span className="text-kb-stone-on-dark">Control</span>
      </Eyebrow>
      <H2>You stay in control.</H2>
      <ul data-stagger="" className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {CONTROL_ITEMS.map((c, i) => (
          <li
            key={c.id}
            className={cn(
              "rounded-large bg-kb-white/5 p-6 ring-1 ring-kb-white/15",
              i < 3 ? "lg:col-span-2" : "lg:col-span-3",
              i === CONTROL_ITEMS.length - 1 && "sm:col-span-2",
            )}
          >
            <IconBadge icon={CONTROL_ICONS[c.id]} tone="dark" />
            <h3 className="mt-5 text-lg font-bold">{c.title}</h3>
            <p className="mt-2 leading-7 text-kb-stone-on-dark">{c.text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Founder() {
  return (
    <Section tone="sand">
      <Eyebrow>Who is behind Kabsi</Eyebrow>
      <H2>A real person, and proof you can check.</H2>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-large bg-kb-white p-6 shadow-kb sm:p-8">
          <div className="flex items-center gap-3">
            <KabsiMark className="size-8" />
            <h3 className="font-bold text-kb-ink">A note from the founder</h3>
          </div>
          <p className="mt-4 text-lg leading-8 text-kb-stone">{FOUNDER_NOTE}</p>
          <p className="mt-4 font-bold text-kb-ink">
            {FOUNDER_SIGNATURE}{" "}
            <Link to="/about" className="underline underline-offset-4">
              About Kabsi
            </Link>
          </p>
        </div>
        <div className="rounded-large bg-kb-white p-6 shadow-kb sm:p-8">
          <h3 className="font-bold text-kb-ink">Proof you can check yourself</h3>
          <p className="mt-4 leading-7 text-kb-stone">{PROOF_NOTE}</p>
          <ul className="mt-4 space-y-2">
            {[
              ["/google-profile-check", "Run the free Google Profile Check on your own business"],
              ["/security", "Read how access, approvals and removal work"],
              ["/privacy", "Read what Kabsi keeps and for how long"],
            ].map(([to, label]) => (
              <li key={to}>
                <Link
                  to={to as "/security"}
                  className="inline-flex items-center gap-2 font-bold underline underline-offset-4"
                >
                  {label} <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

function Industries() {
  return (
    <Section>
      <Eyebrow>For your business</Eyebrow>
      <H2>Made for the places people find on Google Maps.</H2>
      <ul data-stagger="" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {VERTICALS.map((v) => (
          <li key={v.slug}>
            <Link
              to="/for/$slug"
              params={{ slug: v.slug }}
              className="kb-lift flex h-full items-center gap-4 rounded-large border-2 border-kb-hairline bg-kb-white p-5 hover:border-kb-black"
            >
              <IconBadge icon={v.icon} />
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold">{v.label}</span>
                <span className="block text-sm text-kb-stone">Kabsi for {v.name}</span>
              </span>
              <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[15px]">
        <Link to="/for" className="font-bold underline underline-offset-4">
          All kinds of business
        </Link>
      </p>
    </Section>
  );
}

function Faq() {
  return (
    <Section tone="sand">
      <Eyebrow>Questions</Eyebrow>
      <H2>Straight answers.</H2>
      <div className="mt-10">
        <FaqList items={homeFaq()} />
      </div>
      <p className="mt-6">
        <Link
          to="/faq"
          className="inline-flex items-center gap-2 font-bold underline-offset-4 hover:underline"
        >
          All questions <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </p>
      <p className="mt-4 text-sm text-kb-stone">
        Write to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold underline underline-offset-4">
          {CONTACT_EMAIL}
        </a>{" "}
        and a person replies.
      </p>
    </Section>
  );
}

function Final() {
  return <CtaBand sub={heroSub()} cta={{ to: "/google-profile-check", label: CTA_CHECK }} />;
}

const SECTIONS: Partial<Record<HomeSection, () => ReactNode>> = {
  pillars: Pillars,
  whatsapp: Whatsapp,
  plans: Plans,
  pricing: Pricing,
  control: Control,
  founder: Founder,
  industries: Industries,
  faq: Faq,
  final: Final,
};

/** The sections below the first screen, in the order given (HOME_ORDER, src/lib/website.ts). */
export function HomeBelow({ ids }: { ids: readonly HomeSection[] }) {
  return (
    <>
      {ids.map((id) => {
        const S = SECTIONS[id];
        return S ? <S key={id} /> : null;
      })}
    </>
  );
}
