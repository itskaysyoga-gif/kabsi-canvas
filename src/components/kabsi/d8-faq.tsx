// /faq on Design 8 (Web 4c, lane R's approval of 1 Nov 2026): the hero with the five groups as a jump index, the five
// groups (faq-data.ts FAQ_GROUPS, the same words as the FAQPage data in the route head), "Talk to a person" and the
// closing free check.
import { ArrowRight } from "lucide-react";
import { CONTACT_EMAIL, GOOGLE_THIRD_PARTY_URL, WHATSAPP_ON, WHATSAPP_URL } from "@/lib/site";
import { Faq, buttonClass } from "./ui";
import { PageHero, popCls, stagger } from "./page-hero";
import { Closing } from "./closing";
import { FAQ_GROUPS } from "./faq-data";
import { FAQ_HERO } from "./hero-lines";
import { Marked } from "@/components/kabsi/highlight";

const MAIL = (
  <a className="font-semibold underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>
    {CONTACT_EMAIL}
  </a>
);

/** Style 1: each group's headline phrase on the highlight bar (30.32 item 3). */
const GROUP_MARKS: Record<string, string> = {
  start: "started",
  google: "control",
  plans: "billing",
  whatsapp: "WhatsApp",
  privacy: "data",
};

/**
 * Site 2 (master plan 30.34 item 4): Google's own guidance on working with a third party moved from the footer to the
 * answer on adding Kabsi as a Manager. The FAQPage data keeps the plain answer.
 */
const MANAGER_Q = "How do I add Kabsi to my Google profile?";
const withGuidance = (f: { q: string; a: string }) =>
  f.q === MANAGER_Q
    ? {
        q: f.q,
        a: (
          <>
            <p>{f.a}</p>
            <p className="mt-3">
              <a
                href={GOOGLE_THIRD_PARTY_URL}
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline underline-offset-4"
              >
                Google's guidance on working with a third party
              </a>
            </p>
          </>
        ),
      }
    : f;

export function D8Faq() {
  return (
    <>
      <PageHero
        mark="owners ask"
        hero={FAQ_HERO}
        visual={
          <nav
            aria-label="Topics"
            className="rounded-panel border border-line bg-surface-1 p-2 shadow-float"
          >
            <ul>
              {FAQ_GROUPS.map((g, i) => (
                <li key={g.id} className={popCls} style={stagger(i, 150, 100)}>
                  <a
                    href={`#${g.id}`}
                    className="press flex min-h-14 items-center justify-between gap-4 rounded-inner px-4 hover:bg-surface-2"
                  >
                    <span className="text-title font-bold">{g.title}</span>
                    <span className="flex shrink-0 items-center gap-2 text-small text-text-2">
                      {g.items.length} answers
                      <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        }
      />
      <div className="border-t border-line bg-surface-1">
        <div className="container-kb section-y grid gap-12 lg:grid-cols-[14rem_1fr] lg:gap-16">
          <nav aria-label="Jump to a topic" className="hidden lg:block">
            <ul className="sticky top-24 space-y-1">
              {FAQ_GROUPS.map((g) => (
                <li key={g.id}>
                  <a
                    href={`#${g.id}`}
                    className="press flex min-h-11 items-center rounded-inner px-3 text-small font-semibold text-text-2 hover:bg-surface-2 hover:text-text-1"
                  >
                    <Marked text={g.title} mark={GROUP_MARKS[g.id]} />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="max-w-3xl space-y-14">
            {FAQ_GROUPS.map((g) => (
              <section key={g.id} aria-labelledby={g.id} className="scroll-mt-24">
                <h2 id={g.id} className="text-h2">
                  <Marked text={g.title} mark={GROUP_MARKS[g.id]} />
                </h2>
                <Faq className="mt-6" items={g.items.map(withGuidance)} />
              </section>
            ))}
            <div className="rounded-panel border border-line bg-surface-0 p-6 sm:p-8">
              <h2 className="text-h3">
                <Marked text="Talk to a person" mark="a person" />
              </h2>
              {WHATSAPP_ON ? (
                <>
                  <p className="mt-2 text-body text-text-2">
                    Ask on WhatsApp, or write to {MAIL}. Nora, Kabsi's assistant, answers at once.
                    Ask for a person and Rashid replies in working hours.
                  </p>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noreferrer"
                    className={`${buttonClass("whatsapp")} mt-5`}
                  >
                    Chat on WhatsApp
                  </a>
                </>
              ) : (
                <p className="mt-2 text-body text-text-2">Write to {MAIL}. A person reads it.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <Closing />
    </>
  );
}
