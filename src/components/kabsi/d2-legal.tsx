// About and the FAQ (COPY.md 13 and 16). Security, Privacy and Terms keep kabsi-canvas's own full text in this layout
// (src/components/marketing/legal.tsx).
import {
  CONTACT_EMAIL,
  FOUNDING_SENTENCE,
  PRICES_SENTENCE,
  SOCIAL_LINKS,
  TRIAL_LINE,
  WHATSAPP_ON,
  WHATSAPP_URL,
} from "@/lib/site";
import { PageTop } from "./d2-parts";
import { FAQ } from "./faq-data";
import { FOUNDER, Img, PHOTOS } from "./photos";
import { ButtonLink, Faq, buttonClass } from "./ui";
import { ScanBox } from "./scan-box";

const MAIL = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
const UPDATED = "26 October 2026";

/* ---------- About ---------- */

export function AboutPage() {
  return (
    <>
      <section className="container-kb grid items-center gap-10 pt-28 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-36">
        <div>
          <h1 className="text-display">Kabsi is built for the owner at the counter.</h1>
        </div>
        <div className="overflow-hidden rounded-panel">
          <Img
            photo={PHOTOS.bakeryWindow}
            sizes="(min-width: 1024px) 45vw, 100vw"
            priority
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      </section>

      <section aria-labelledby="founder-note" className="container-kb section-y">
        <h2 id="founder-note" className="sr-only">
          A note from the founder
        </h2>
        <figure className="max-w-3xl">
          <blockquote className="font-display text-h2 font-bold text-text-1">
            "I built Kabsi because local owners lose customers to a Google profile nobody has time
            to look after. Kabsi measures where you show up, does the work, and asks for your yes on
            WhatsApp before anything goes live."
          </blockquote>
          <figcaption className="mt-6 flex items-center gap-4 text-body text-text-2">
            <img
              src={FOUNDER.small}
              width={FOUNDER.w}
              height={FOUNDER.h}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-16 shrink-0 rounded-full object-cover"
            />
            Rashid Abou Hamzy, founder of Kabsi
          </figcaption>
        </figure>
      </section>

      <section aria-labelledby="facts" className="border-t border-line">
        <div className="container-kb section-y grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 id="facts" className="text-h2">
              Plain facts
            </h2>
            <ul className="mt-8 divide-y divide-line border-y border-line text-body">
              <li className="py-4">Kabsi is independent and not affiliated with Google.</li>
              <li className="py-4">
                Contact:{" "}
                <a className="underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>
                  {CONTACT_EMAIL}
                </a>
                .
              </li>
              <li className="py-4">Payments are processed by Creem, our merchant of record.</li>
            </ul>
          </div>
          <div>
            <h2 className="text-h2">Follow Kabsi</h2>
            <ul className="mt-8 flex flex-wrap gap-3">
              {SOCIAL_LINKS.map((s) => (
                <li key={s.name}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonClass("secondary")}
                  >
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
            {WHATSAPP_ON && (
              <>
                <p className="mt-8 text-body text-text-2">
                  Or ask a question on WhatsApp. A person answers.
                </p>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className={`${buttonClass("whatsapp")} mt-4`}
                >
                  Chat on WhatsApp
                </a>
              </>
            )}
          </div>
        </div>
      </section>
      <ClosingScan title="Start with a free check." />
    </>
  );
}

/* ---------- FAQ ---------- */

const GROUPS: { id: string; title: string; items: { q: string; a: string }[] }[] = [
  {
    id: "basics",
    title: "The basics",
    items: [
      FAQ[1]!,
      FAQ[2]!,
      FAQ[4]!,
      {
        q: "Does Kabsi message my customers?",
        a: "No. Kabsi talks only to you, on WhatsApp. It gives you a review link and a QR card, and you send them.",
      },
    ],
  },
  {
    id: "money",
    title: "Plans and cancelling",
    items: [
      {
        q: "What does Kabsi cost?",
        a: `${PRICES_SENTENCE} ${FOUNDING_SENTENCE} Both plans are free for 14 days, with no card.`,
      },
      {
        q: "Can I run more than one location?",
        a: "Yes. Each extra location is $15 a month or $150 a year, on the same plan.",
      },
      FAQ[6]!,
      FAQ[7]!,
    ],
  },
  {
    id: "google",
    title: "Google and your data",
    items: [FAQ[0]!, FAQ[3]!, FAQ[5]!, FAQ[8]!, FAQ[9]!],
  },
];

export function FaqPage() {
  return (
    <>
      <PageTop
        title="Questions owners ask"
        lead={
          WHATSAPP_ON
            ? "Short answers. If yours is not here, ask on WhatsApp and a person answers."
            : "Short answers."
        }
      />
      <section className="container-kb mt-12 pb-20 lg:pb-28">
        <nav aria-label="Topics" className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
            {GROUPS.map((g) => (
              <li key={g.id}>
                <a
                  href={`#${g.id}`}
                  className="press inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-small font-semibold hover:border-text-3 hover:bg-surface-2"
                >
                  {g.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-10 max-w-3xl space-y-14">
          {GROUPS.map((g) => (
            <section key={g.id} aria-labelledby={g.id} className="scroll-mt-24">
              <h2 id={g.id} className="text-h2">
                {g.title}
              </h2>
              <Faq className="mt-6" items={g.items} />
            </section>
          ))}
        </div>
        <div
          className="mt-16 max-w-3xl rounded-panel border border-line bg-surface-1 p-6 sm:p-8"
          data-main-cta
        >
          <h2 className="text-h3">Talk to a person</h2>
          <p className="mt-2 text-body text-text-2">
            {WHATSAPP_ON ? "Ask on WhatsApp, or write to " : "Write to "}
            {MAIL}.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <a
              href={WHATSAPP_URL}
              target={WHATSAPP_ON ? "_blank" : undefined}
              rel="noreferrer"
              className={buttonClass("primary")}
            >
              {WHATSAPP_ON ? "Chat on WhatsApp" : CONTACT_EMAIL}
            </a>
            <ButtonLink to="/pricing" variant="secondary">
              See the plans
            </ButtonLink>
          </div>
          <p className="mt-3 text-small text-text-2">{TRIAL_LINE}</p>
        </div>
      </section>
    </>
  );
}

/** A black closing band with the scan box, as on Home. */
function ClosingScan({ title }: { title: string }) {
  return (
    <section aria-labelledby="closing-scan-h" className="theme-dark border-t border-line bg-band">
      <div className="container-kb section-y">
        <div className="mx-auto max-w-[40rem]">
          <h2 id="closing-scan-h" className="text-h2">
            {title}
          </h2>
          <ScanBox id="closing-scan" className="mt-8" />
        </div>
      </div>
    </section>
  );
}
