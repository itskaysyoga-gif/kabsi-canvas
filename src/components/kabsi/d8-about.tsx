// About, true facts only (Site 2, master plan 30.34 item 4; Launch 1, 30.35 items 2 and 3). Every line is in
// knowledge/facts or the repo: the founder's background is his own stated background (30.35 item 3) and his founder
// note; the record of the real Google profile Kabsi runs every feature on first was read from Kabsi's database on
// 5 Nov 2026 (reads only) and carries that date. The business is never named in public material (K-85 item 6, 30.35
// item 2). How Kabsi is built is facts 11 and 13. No team, advisors, credentials, customers, numbers or quotes beyond
// these. docs/COPY.md section 59 part D and section 61 part A.
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import {
  CONTACT_EMAIL,
  NOT_AFFILIATED,
  OPERATOR_NAME,
  WHATSAPP_ON,
  WHATSAPP_URL,
} from "@/lib/site";
import { FOUNDER, Img, PHOTOS } from "./photos";
import { WhatsAppGlyph, buttonClass } from "./ui";
import { PageHero } from "./page-hero";
import { Closing } from "./closing";
import { ABOUT_HERO } from "./hero-lines";
import { Marked } from "@/components/kabsi/highlight";

const WHY = [
  "Owners run the business all day. The Google profile waits.",
  "Reviews go unanswered and details on Google go out of date.",
  "Kabsi does that work and brings each piece to the owner for a yes.",
] as const;

const FOUNDER_LINES = [
  "Works in Meta advertising, e-commerce and digital marketing, and runs the online presence and paid campaigns of a real estate partnership.",
  "Saw the same gap every time: unanswered reviews and Google details out of date.",
] as const;

/** The real Google profile Kabsi runs each feature on first, read from Kabsi's database on 5 Nov 2026 (reads only). Never named here. Update the date with the figures. */
const OWN_DATE = "5 November 2026";
const OWN = [
  "Added to Kabsi on 25 September 2026.",
  "A reply to a review went live on Google on 22 October 2026, after the owner's yes.",
  "2 posts and 1 photo went live on Google, each after the owner's yes. Both posts were later taken down.",
  "Kabsi's checks found 3 differences on Google: address, hours and website. The owner decided each.",
  "2 weekly reports, for the weeks of 26 October and 2 November.",
] as const;

const BUILT = [
  "Kabsi connects to your Google Business Profile with your permission.",
  "Meta's WhatsApp Business Platform, through our WhatsApp messaging provider.",
  "Card payments will be processed by Creem, our merchant of record.",
  "Kabsi's database in Frankfurt, Germany.",
] as const;

const KEEP = [
  { title: "Your Google profile", text: "You stay the owner. Remove Kabsi any time." },
  { title: "Your yes", text: "Nothing is published on Google before you say yes." },
  { title: "Your choice", text: "Cancel any time. Your plan runs to the end of the period paid." },
] as const;

function Ticks({ items }: { items: readonly string[] }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {items.map((t) => (
        <li key={t} className="flex gap-3 py-4 text-body">
          <Check className="mt-1 size-4 shrink-0 text-ok" strokeWidth={2.5} aria-hidden />
          {t}
        </li>
      ))}
    </ul>
  );
}

function Section({
  id,
  title,
  mark,
  tone,
  children,
}: {
  id: string;
  title: string;
  mark: string;
  tone?: "tint";
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={tone === "tint" ? "border-t border-line bg-surface-1" : "border-t border-line"}
    >
      <div className="container-kb section-y grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <h2 id={id} className="text-h2 text-balance">
          <Marked text={title} mark={mark} />
        </h2>
        <div>{children}</div>
      </div>
    </section>
  );
}

export function D8About() {
  return (
    <>
      <PageHero
        mark="no time for Google."
        hero={ABOUT_HERO}
        visual={
          <Img
            photo={PHOTOS.bakeryCounter}
            sizes="(min-width: 1024px) 34rem, calc(100vw - 40px)"
            priority
            className="aspect-[3/2] w-full rounded-panel bg-surface-2 object-cover shadow-float"
          />
        }
      />

      <Section id="why-h" title="Why Kabsi exists" mark="exists" tone="tint">
        <ol className="space-y-4">
          {WHY.map((w, i) => (
            <li key={w} className="flex gap-4 text-lead text-text-1">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-kb-yellow text-small font-bold text-kb-black">
                {i + 1}
              </span>
              {w}
            </li>
          ))}
        </ol>
      </Section>

      <section aria-labelledby="founder-h" className="theme-dark bg-band">
        <div className="container-kb section-y">
          <h2 id="founder-h" className="sr-only">
            The founder
          </h2>
          <figure className="grid items-center gap-8 sm:grid-cols-[14rem_1fr] lg:grid-cols-[18rem_1fr] lg:gap-14">
            <img
              src={FOUNDER.large}
              srcSet={`${FOUNDER.small} 400w, ${FOUNDER.large} 800w`}
              sizes="(min-width: 1024px) 18rem, 14rem"
              width={FOUNDER.w}
              height={FOUNDER.h}
              alt={FOUNDER.alt}
              loading="lazy"
              decoding="async"
              className="aspect-square w-56 rounded-panel object-cover shadow-float sm:w-full"
            />
            <figcaption>
              <p className="font-display text-h2 font-bold text-text-1">{OPERATOR_NAME}</p>
              <p className="mt-1 text-title font-semibold text-kb-yellow">Founder</p>
              <ul className="mt-6 space-y-3 text-lead text-text-2">
                {FOUNDER_LINES.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </figcaption>
          </figure>
        </div>
      </section>

      <Section
        id="own-h"
        title="Every feature runs on a real Google profile first"
        mark="real Google profile"
      >
        <p className="text-body text-text-2">
          Before an owner sees a feature, Kabsi runs it on a real Google profile. What Kabsi did
          there:
        </p>
        <div className="mt-6">
          <Ticks items={OWN} />
        </div>
        <p className="mt-4 text-small text-text-3">From Kabsi's own records, {OWN_DATE}.</p>
      </Section>

      <Section id="built-h" title="How Kabsi is built" mark="built" tone="tint">
        <Ticks items={BUILT} />
        <p className="mt-4 text-small text-text-2">{NOT_AFFILIATED}</p>
      </Section>

      <section aria-labelledby="keep-h" className="border-t border-line">
        <div className="container-kb section-y">
          <h2 id="keep-h" className="text-h2">
            <Marked text="What you keep" mark="you keep" />
          </h2>
          <ul className="mt-8 grid gap-6 md:grid-cols-3">
            {KEEP.map((k) => (
              <li key={k.title} className="border-t-2 border-text-1 pt-4">
                <h3 className="text-title">{k.title}</h3>
                <p className="mt-1 text-body text-text-2">{k.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Section id="talk-h" title="Talk to the founder" mark="the founder" tone="tint">
        <p className="text-body text-text-2">
          On WhatsApp, Nora, Kabsi's assistant, answers at once. Ask for a person and Rashid replies
          in working hours.
        </p>
        <p className="mt-2 text-body text-text-2">Or email Rashid. A person reads every message.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {WHATSAPP_ON && (
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className={buttonClass("whatsapp")}
            >
              <WhatsAppGlyph className="size-5" />
              Chat on WhatsApp
            </a>
          )}
          <a href={`mailto:${CONTACT_EMAIL}`} className={buttonClass("secondary")}>
            {CONTACT_EMAIL}
          </a>
        </div>
      </Section>

      <Closing />
    </>
  );
}
