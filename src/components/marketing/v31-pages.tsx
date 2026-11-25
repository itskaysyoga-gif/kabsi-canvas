// How it works, FAQ, About and Security on blueprint 3.1, on SITE-3's one section system (./kit.tsx): the H1 is the
// only yellow bar, the body is the reading size, three backgrounds at most, and each page ends on the charcoal band with
// the free check. Words in v31-data.ts.
import { Clock, Link2, Phone } from "lucide-react";
import { YellowNumber } from "@/components/kabsi/highlight";
import { Faq } from "@/components/kabsi/ui";
import { HOME_HERO, ABOUT, FAQ_V31, HOW, PRICE, SECURITY, TRUST } from "./v31-data";
import { TRIAL_LINE } from "@/lib/offer";
import { SiteLink } from "@/components/kabsi/site-link";
import { Band, CheckBox, Head, Lead, PageTop, Ticks } from "./kit";
import { ChatCard, ClosingBand, ReportSample, TrustLines } from "./v31";
import { DeviceShot, PubImg } from "./life";
import { PUB } from "./public-photos";
import { HOW_CHAT, WATCHED } from "./v31-more";
import { MORE_SCREENS } from "./screens-section";

/** The icons of WATCHED, in its order: hours, phone, website and booking link. */
const WATCHED_ICONS = [Clock, Phone, Link2];

export function V31How() {
  return (
    <>
      <PageTop
        title={HOW.title}
        mark={HOW.mark}
        line={HOW.line}
        aside={
          /* SITE-5: the photo with one of Kabsi's screens in front, as on Pricing. SITE-6: the Home screen, where
             everything waits for the owner's yes (it was the weekly report, titled Settings in the app). */
          <div data-nora-avoid className="relative sm:pb-28 lg:pb-0">
            <PubImg
              photo={PUB.howHero}
              sizes="(min-width: 1280px) 500px, (min-width: 1024px) 40vw, 100vw"
              priority
              className="hidden aspect-[4/3] w-[88%] rounded-panel bg-surface-3 object-cover shadow-lift sm:block lg:aspect-[4/5] lg:w-[78%]"
            />
            {/* SITE-6: on a phone the screen stands alone at a size people can read (the photo shows from 640 px). */}
            <div className="mx-auto w-full max-w-[16rem] pt-8 sm:absolute sm:end-0 sm:bottom-0 sm:mx-0 sm:w-[44%] sm:max-w-[13rem] sm:pt-0 lg:top-1/2 lg:bottom-auto lg:w-[46%] lg:max-w-[14.5rem] lg:-translate-y-1/2">
              <DeviceShot
                shot={MORE_SCREENS.home}
                className="max-w-none sm:max-w-none lg:max-w-none"
              />
            </div>
          </div>
        }
      >
        <CheckBox id="how-scan" under={HOME_HERO.under} className="mt-8 max-w-[36rem]" />
      </PageTop>
      <Band
        id="steps"
        tone="warm"
        label="The five steps"
        inner="lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-16"
      >
        <ol className="grid gap-8">
          {HOW.steps.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <YellowNumber n={i + 1} />
              <div>
                <h2 className="text-h3">{s.title}</h2>
                <p className="mt-2 max-w-[56ch] text-read text-text-2">{s.text}</p>
              </div>
            </li>
          ))}
          <li className="flex gap-4">
            <div className="border-s-4 border-kb-yellow ps-4">
              <h2 className="text-h3">Or just tell Kabsi.</h2>
              <p className="mt-2 max-w-[56ch] text-read text-text-2">{HOW.ask}</p>
            </div>
          </li>
        </ol>
        {/* SITE-5: the owner's yes in the chat, beside the steps (sticky on a computer). */}
        <div className="mt-12 lg:mt-0">
          <div className="lg:sticky lg:top-24">
            <ChatCard
              turns={HOW_CHAT}
              label="An Example: a reply changed and approved, then new hours asked for, in the chat"
            />
          </div>
        </div>
      </Band>
      <Band
        id="watch"
        tone="ivory"
        inner="flex flex-col lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:gap-16 xl:gap-24"
      >
        <div className="order-2 mt-10 lg:order-1 lg:mt-0">
          <DeviceShot shot={MORE_SCREENS.shield} className="lg:max-w-[19rem]" />
        </div>
        <div className="order-1 lg:order-2">
          <Head
            id="watch"
            title="When Google changes something, you see it."
            line="Google can change your details from what the public suggests. Kabsi checks your profile every day and shows what changed. For your hours, phone and website, one tap puts it right."
          />
          {/* SITE-6: one card a row on a computer, so the words are as tall as the phone beside them. */}
          <ul className="mt-8 grid gap-4 sm:grid-cols-3 lg:max-w-[34rem] lg:grid-cols-1">
            {WATCHED.map((w, n) => {
              const Icon = WATCHED_ICONS[n] ?? Clock;
              return (
                <li
                  key={w.title}
                  className="flex items-start gap-3 rounded-card border border-line bg-surface-1 p-4 shadow-rest"
                >
                  {/* SITE-6: an icon per detail, so the cards do not read as empty boxes. */}
                  <span
                    aria-hidden
                    className="grid size-10 shrink-0 place-items-center rounded-inner bg-surface-2 text-text-1"
                  >
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <span>
                    <span className="block text-title font-bold">{w.title}</span>
                    <span className="mt-1 block text-small text-text-2">{w.text}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </Band>
      <Band id="report" tone="warm">
        <Head
          id="report"
          title="See what was done."
          line="A short summary every week and a full report every month: work done, what Kabsi found and what Google shows, kept apart."
        />
        <ReportSample className="mt-8" />
        {/* SITE-5: the price in one line, with the way to Pricing. */}
        <p className="mt-10 max-w-[60ch] border-s-4 border-kb-yellow ps-4 text-read text-text-1">
          <strong>{PRICE.card}</strong> {TRIAL_LINE}{" "}
          <SiteLink to="/pricing" className="font-semibold underline underline-offset-4">
            See what the plan includes
          </SiteLink>
        </p>
      </Band>
      <ClosingBand under={HOME_HERO.under} />
    </>
  );
}

export function V31Faq() {
  return (
    <>
      <PageTop
        title="Questions owners ask."
        mark="owners ask."
        line="Short answers. If yours is not here, write to hello@kabsi.co and a person answers."
      />
      <Band id="answers" tone="white" label="Questions and answers">
        <Faq items={FAQ_V31.map((f) => ({ q: f.q, a: f.a }))} />
      </Band>
      <ClosingBand under={HOME_HERO.under} />
    </>
  );
}

export function V31About() {
  return (
    <>
      <PageTop title={ABOUT.title} mark={ABOUT.mark} line={ABOUT.line}>
        <CheckBox id="about-scan" under={HOME_HERO.under} className="mt-8 max-w-[36rem]" />
      </PageTop>
      <Band
        id="why"
        tone="white"
        inner="lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16"
      >
        <Head id="why" title="Why Kabsi exists." />
        <div className="mt-6 lg:mt-0">
          <ul className="space-y-3">
            {ABOUT.why.map((l) => (
              <li key={l} className="max-w-[60ch] text-read text-text-1">
                {l}
              </li>
            ))}
          </ul>
          <Lead className="mt-6">{ABOUT.who}</Lead>
        </div>
      </Band>
      <Band id="promise" tone="ivory">
        <Head id="promise" title={TRUST.title} />
        <TrustLines />
      </Band>
      <ClosingBand under={HOME_HERO.under} />
    </>
  );
}

export function V31Security() {
  return (
    <>
      <PageTop title={SECURITY.title} mark={SECURITY.mark} line={SECURITY.line}>
        <CheckBox id="security-scan" under={HOME_HERO.under} className="mt-8 max-w-[36rem]" />
      </PageTop>
      <Band id="answers" tone="white">
        <Head id="answers" title="In plain words." />
        <dl className="mt-8 grid gap-x-12 gap-y-8 md:grid-cols-2">
          {SECURITY.answers.map((x) => (
            <div key={x.q} className="border-t border-line pt-5">
              <dt className="text-h3">{x.q}</dt>
              <dd className="mt-2 text-read text-text-2">{x.a}</dd>
            </div>
          ))}
        </dl>
      </Band>
      <Band
        id="kept"
        tone="ivory"
        inner="lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16"
      >
        <Head id="kept" title={SECURITY.stored.title + "."} />
        <Ticks items={SECURITY.stored.items} className="mt-6 lg:mt-0" />
      </Band>
      <ClosingBand under={HOME_HERO.under} />
    </>
  );
}
