import {
  ArrowRight,
  Check,
  CheckCircle2,
  KeyRound,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { homeExample, type HomeExample } from "@/content/home-examples";
import { industryCheck } from "@/content/industries";
import { FoundingBanner } from "./d5-founding";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { CONTACT_EMAIL, TRIAL_LINE, WHATSAPP_ON, foundingPlacesLine } from "@/lib/site";
import { FOUNDER } from "./photos";
import { NearbyPlaces } from "./nearby-places";
import { ButtonLink, ExampleBadge, Faq, KabsiMark, SectionHead } from "./ui";
import { LATER_CHIP } from "@/lib/after-yes";
import { Bubble, CLOCK, DoneBubble, TimeChip } from "./whatsapp";
import { PLANS } from "./plans";
import { FoundingPriceLine, useFoundingLeft } from "./founding-price";
import { FAQ, HOME_FAQ } from "./faq-data";
import { SiteLink } from "./site-link";

/*
 * Home for Design 4 (brief sections 14.5 and 15.4): the WhatsApp story you can tap, three benefits that lead with
 * the work, access and ownership, short pricing, four questions. Everything is Rose Lane Salon (Example).
 */

/* ---------- The WhatsApp story: Yes, Edit, Skip, and a live 10 second Undo that publishes nothing ---------- */

const UNDO_SECONDS = 10;

type DemoState = "ready" | "approved" | "published" | "undone" | "edit" | "skipped";

function WaButton({
  children,
  onClick,
  disabled,
}: {
  children: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="press grid min-h-11 place-items-center rounded-bubble bg-wa-in text-chat font-bold text-wa-link shadow-bubble disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function TryTheStory({
  example = homeExample("salon"),
}: {
  example?: HomeExample | undefined;
}) {
  const DEMO = {
    business: example.business,
    name: example.demo.name,
    review: `'${example.demo.quote}'`,
    draft: `'${example.demo.draft}'`,
  };
  const [state, setState] = useState<DemoState>("ready");
  const [left, setLeft] = useState(UNDO_SECONDS);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (state !== "approved") return;
    timer.current = window.setInterval(() => {
      setLeft((n) => {
        if (n <= 1) {
          window.clearInterval(timer.current);
          setState("published");
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer.current);
  }, [state]);

  const reset = () => {
    window.clearInterval(timer.current);
    setLeft(UNDO_SECONDS);
    setState("ready");
  };
  const answered = state !== "ready";
  const word = state === "edit" ? "Edit" : state === "skipped" ? "Skip" : "Yes";

  return (
    <section id="try" aria-labelledby="try-h" className="scroll-mt-20 border-t border-line">
      <div className="container-kb section-y grid gap-10 lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-center lg:gap-16">
        <div>
          <SectionHead
            id="try-h"
            title="Try it: one review, ready for your yes."
            lead="This is how every reply, post and change reaches you. Tap Yes, Edit or Skip."
          />
          <ul className="mt-8 hidden gap-3 text-body text-text-2 sm:grid">
            <li>
              <span className="font-bold text-text-1">Yes:</span> it goes to Google, with 10 seconds
              to Undo.
            </li>
            <li>
              <span className="font-bold text-text-1">Edit:</span> change a word, then reply Yes.
            </li>
            <li>
              <span className="font-bold text-text-1">Skip:</span> nothing is posted.
            </li>
          </ul>
        </div>

        <div className="overflow-hidden rounded-panel border border-line bg-surface-1 shadow-lift">
          <div className="flex items-center gap-3 border-b border-wa-divider bg-wa-header px-4 py-3 text-wa-ink">
            <KabsiMark ring={false} className="size-9" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-small font-bold">Kabsi</p>
              <p className="text-label text-wa-time-out">On WhatsApp</p>
            </div>
            <ExampleBadge />
          </div>
          <div className="wa-ground space-y-2 px-1 py-4">
            <Bubble enter={false}>
              <span className="font-bold">{DEMO.business}:</span> new 4-star review from {DEMO.name}
              . <span className="italic">{DEMO.review}</span>
              <span className="mt-1 block">Reply ready: {DEMO.draft} Reply Yes to publish.</span>
            </Bubble>
            {!answered && (
              <div
                className="ms-2 me-[14%] grid grid-cols-3 gap-1"
                role="group"
                aria-label="Your answer"
              >
                <WaButton onClick={() => setState("approved")}>Yes</WaButton>
                <WaButton onClick={() => setState("edit")}>Edit</WaButton>
                <WaButton onClick={() => setState("skipped")}>Skip</WaButton>
              </div>
            )}
            {answered && (
              <Bubble out read time={CLOCK}>
                {word}
              </Bubble>
            )}
            <div aria-live="polite" className="space-y-2">
              {state === "approved" && (
                <Bubble enter>
                  Approved. It goes to Google in {left} seconds. Reply Undo to stop it.
                  <span className="mt-2 block">
                    <button
                      type="button"
                      onClick={() => {
                        window.clearInterval(timer.current);
                        setState("undone");
                      }}
                      className="press inline-flex min-h-11 items-center gap-2 rounded-bubble border border-wa-divider px-4 font-bold text-wa-link"
                    >
                      <RotateCcw className="size-4" aria-hidden /> Undo ({left})
                    </button>
                  </span>
                </Bubble>
              )}
              {state === "published" && (
                <>
                  <TimeChip>{LATER_CHIP}</TimeChip>
                  <DoneBubble business={DEMO.business} />
                </>
              )}
              {state === "undone" && <Bubble enter>Undone. Nothing reached Google.</Bubble>}
              {state === "edit" && (
                <Bubble enter>
                  Send the words you want. I show you the new reply before anything is published.
                </Bubble>
              )}
              {state === "skipped" && <Bubble enter>Skipped. Nothing is posted.</Bubble>}
            </div>
          </div>
          <div className="flex min-h-14 items-center justify-between gap-3 border-t border-line px-4 py-2">
            <p className="text-label text-text-3">
              A sample conversation. This preview publishes nothing.
            </p>
            {answered && (
              <button
                type="button"
                onClick={reset}
                className="press inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-2 text-small font-semibold text-text-2 hover:text-text-1"
              >
                <RotateCcw className="size-4" aria-hidden /> Start again
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Three benefits that lead with the work: the one lighter section ---------- */

const WORK = [
  {
    title: "Review replies, ready",
    text: "Kabsi drafts a reply to every new review, in your voice. You tap Yes, Edit or Skip on WhatsApp.",
  },
  {
    title: "Your details kept right",
    text: `Hours, holidays, phone and booking link checked. If anyone changes your Google profile, you hear about it ${
      WHATSAPP_ON ? "by email and on WhatsApp." : "by email, and on WhatsApp once it opens."
    }`,
  },
  {
    title: "Posts and photos, done",
    text: "Posts about your services and offers, and the photos you send on WhatsApp, prepared and waiting for your yes.",
  },
];

export function WorkDone({
  example = homeExample("salon"),
}: {
  example?: HomeExample | undefined;
}) {
  return (
    <section aria-labelledby="work-h" className="theme-light">
      <div className="container-kb section-y grid gap-12 lg:grid-cols-[1fr_minmax(0,30rem)] lg:gap-16">
        <div>
          <SectionHead id="work-h" title="The Google work, done for you" />
          <ol className="mt-10 divide-y divide-line border-y border-line">
            {WORK.map((w, i) => (
              <li key={w.title} className="grid grid-cols-[2.5rem_1fr] gap-3 py-6">
                <span className="font-display text-h3 font-bold text-text-3" aria-hidden>
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-h3">{w.title}</h3>
                  <p className="mt-2 max-w-[34rem] text-body text-text-2">{w.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-8 max-w-[34rem] text-body text-text-1">
            And you see where you come up nearby: three places, who came first there, and one count
            from the 49 places Kabsi checked.
          </p>
          <SiteLink
            to="/for"
            className="press mt-8 inline-flex min-h-12 items-center gap-2 rounded-full border border-line-strong bg-surface-1 px-5 text-small font-bold hover:border-text-3"
          >
            Kabsi for your kind of business
            <ArrowRight className="size-4" aria-hidden />
          </SiteLink>
        </div>
        <NearbyPlaces
          className="self-start"
          check={industryCheck(example.nearby.example, example.nearby.keyword)}
        />
      </div>
    </section>
  );
}

/* ---------- Access and ownership: "You keep the keys" ---------- */

const KEYS = [
  {
    icon: UserRound,
    title: "You stay the owner of your Google profile.",
    text: "Kabsi joins as a Manager. Manager access lets Kabsi make changes, and Kabsi publishes only what you approve. Remove it any time on Google: your profile, Business Profile settings, People and access.",
  },
  {
    icon: KeyRound,
    title: "Kabsi never asks for your Google password.",
    text: "You add Kabsi through Google's own settings, in a few taps. Never send anyone a password or a code.",
  },
  {
    icon: ShieldCheck,
    title: "Nothing is published without your yes.",
    text: "You approve the exact words on WhatsApp, with 10 seconds to Undo.",
  },
];

export function KeepTheKeys() {
  return (
    <section aria-labelledby="keys-h" className="container-kb section-y">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
        <div>
          <SectionHead
            id="keys-h"
            title="You keep the keys."
            lead="The free check needs no access. When you start, you add Kabsi as a Manager on your Google profile."
          />
        </div>
        <div>
          <ul className="space-y-6">
            {KEYS.map((k) => (
              <li key={k.title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line-strong text-text-1">
                  <k.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-title">{k.title}</h3>
                  <p className="mt-1 text-body text-text-2">{k.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex gap-4 rounded-card border border-line bg-surface-1 p-5">
            <img
              src={FOUNDER.small}
              width={FOUNDER.w}
              height={FOUNDER.h}
              alt={FOUNDER.alt}
              loading="lazy"
              decoding="async"
              className="size-14 shrink-0 rounded-full object-cover"
            />
            <div>
              <p className="flex items-center gap-2 text-title">
                <CheckCircle2 className="size-5 text-ok" aria-hidden /> A person helps
              </p>
              <p className="mt-2 text-body text-text-2">
                Kabsi is built and run by Rashid Abou Hamzy, its founder. Stuck on a step?{" "}
                {WHATSAPP_ON ? "Reply Help on WhatsApp, or write" : "Write"} to {CONTACT_EMAIL}, and
                a person answers.
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* The remove recording lives on Security only (brief section 17.2); Home keeps the line and a link. */}
      <p className="mt-12 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-8 text-title">
        <ShieldCheck className="size-5 text-ok" aria-hidden />
        You can remove Kabsi any time.
        <SiteLink
          to="/security"
          className="inline-flex min-h-11 items-center gap-1 text-body font-semibold text-text-1 underline decoration-text-3 underline-offset-4 hover:decoration-text-1"
        >
          See how on Security
          <ArrowRight className="size-4" aria-hidden />
        </SiteLink>
      </p>
    </section>
  );
}

/* ---------- Short pricing: plan cards that list the work first ---------- */

export function ShortPricing() {
  const left = useFoundingLeft();
  return (
    <section aria-labelledby="price-h" className="border-t border-line">
      <div className="container-kb section-y">
        <SectionHead
          id="price-h"
          title="Two plans. The work comes first."
          lead="Each plan does the Google work for one business, and you approve every change. Prices in US dollars, plus tax where it applies."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {PLANS.map((p) => (
            <article
              key={p.id}
              className={cn(
                "rounded-panel border bg-surface-1 p-6 sm:p-7",
                p.id === "pro" ? "border-line-strong" : "border-line",
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-h3">{p.name}</h3>
                <p>
                  <span className="font-display text-h3 font-bold">${p.monthly}</span>
                  <span className="ms-1 text-small text-text-2">a month</span>
                </p>
              </div>
              <FoundingPriceLine plan={p.id} left={left} />
              <ul className="mt-5 space-y-2.5">
                {p.work.map((w) => (
                  <li key={w} className="flex gap-3 text-body text-text-1">
                    <Check className="mt-1 size-4 shrink-0 text-ok" strokeWidth={2.5} aria-hidden />
                    {w}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="mt-6 text-small text-text-2">{TRIAL_LINE}</p>
        {left !== null && left > 0 ? (
          <p className="mt-2 text-small text-text-2">{foundingPlacesLine(left)}</p>
        ) : null}
        <ButtonLink to="/pricing" variant="secondary" className="mt-6">
          Compare the plans
        </ButtonLink>
      </div>
    </section>
  );
}

/* ---------- Four questions ---------- */

export function FourQuestions() {
  return (
    <section aria-labelledby="faq-h" className="border-t border-line">
      <div className="container-kb section-y grid gap-10 lg:grid-cols-[1fr_1.6fr]">
        <SectionHead id="faq-h" title="Questions owners ask" />
        <Faq items={HOME_FAQ.map((i) => FAQ[i - 1]!)} />
      </div>
    </section>
  );
}

/** Everything on Home between the hero and the closing band, in lane R's order (brief section 14.5). */
export function BelowHero({ example }: { example?: HomeExample | undefined }) {
  return (
    <>
      <TryTheStory key={example?.id} example={example} />
      <WorkDone example={example} />
      <KeepTheKeys />
      <FoundingBanner className="section-y pb-0" />
      <ShortPricing />
      <FourQuestions />
    </>
  );
}
