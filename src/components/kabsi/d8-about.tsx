// About on Design 8 (Web 4c, lane R's approval of 1 Nov 2026): the hero with Rashid's own photo (decision 3: the existing
// founder-rashid file), the founder's note on the dark band, how Kabsi works with owners, the plain facts and the
// closing free check.
import {
  CONTACT_EMAIL,
  NOT_AFFILIATED,
  OPERATOR_NAME,
  SOCIAL_LINKS,
  WHATSAPP_ON,
  WHATSAPP_URL,
} from "@/lib/site";
import { FOUNDER } from "./photos";
import { buttonClass } from "./ui";
import { PageHero } from "./page-hero";
import { Closing } from "./closing";
import { ABOUT_HERO } from "./hero-lines";

const MAIL = (
  <a className="font-semibold underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>
    {CONTACT_EMAIL}
  </a>
);

const PRINCIPLES = [
  {
    title: "The owner decides",
    text: "Nothing goes on Google until the owner says yes: not a reply, not a post, not an hours change.",
  },
  {
    title: "Manager access, never ownership",
    text: "Kabsi works as a Manager the owner adds, and never asks for a Google password or a code.",
  },
  {
    title: "Honest proof only",
    text: "Every example on this site is marked Example. No invented customers, stars or counts.",
  },
] as const;

export function D8About() {
  return (
    <>
      <PageHero
        hero={ABOUT_HERO}
        visual={
          <figure className="relative mx-auto max-w-[24rem]">
            <img
              src={FOUNDER.large}
              width={FOUNDER.w}
              height={FOUNDER.h}
              alt={FOUNDER.alt}
              decoding="async"
              className="aspect-square w-full rounded-panel object-cover shadow-float"
            />
            <figcaption className="mt-3 text-small text-text-2">
              {OPERATOR_NAME}, founder of Kabsi
            </figcaption>
          </figure>
        }
      />
      <section aria-labelledby="note-h" className="theme-dark bg-band">
        <div className="container-kb section-y">
          <h2 id="note-h" className="sr-only">
            A note from the founder
          </h2>
          <figure className="max-w-4xl">
            <blockquote className="font-display text-h2 font-bold text-text-1">
              "I built Kabsi because local owners have a Google profile nobody has time to look
              after. Kabsi measures where you show up, does the work, and asks for your yes on
              WhatsApp before anything goes live."
            </blockquote>
            <figcaption className="mt-6 text-body text-text-2">
              {OPERATOR_NAME}, founder of Kabsi.
            </figcaption>
          </figure>
        </div>
      </section>
      <section aria-labelledby="how-h" className="border-t border-line">
        <div className="container-kb section-y">
          <h2 id="how-h" className="text-h2">
            How Kabsi works with owners
          </h2>
          <ul className="mt-8 grid gap-6 md:grid-cols-3">
            {PRINCIPLES.map((p) => (
              <li key={p.title} className="border-t-2 border-text-1 pt-4">
                <h3 className="text-title">{p.title}</h3>
                <p className="mt-1 text-body text-text-2">{p.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section aria-labelledby="facts-h" className="border-t border-line bg-surface-1">
        <div className="container-kb section-y grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 id="facts-h" className="text-h2">
              Plain facts
            </h2>
            <ul className="mt-8 divide-y divide-line border-y border-line text-body">
              <li className="py-4">{NOT_AFFILIATED}</li>
              <li className="py-4">Kabsi is operated by {OPERATOR_NAME}.</li>
              <li className="py-4">Contact: {MAIL}.</li>
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
                  Or ask a question on WhatsApp. Nora, Kabsi's assistant, answers at once. Ask for a
                  person and Rashid replies in working hours.
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
      <Closing />
    </>
  );
}
