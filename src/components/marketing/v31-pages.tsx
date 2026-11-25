// How it works, FAQ, About and Security on blueprint 3.1, on SITE-3's one section system (./kit.tsx): the H1 is the
// only yellow bar, the body is the reading size, three backgrounds at most, and each page ends on the charcoal band with
// the free check. Words in v31-data.ts.
import { YellowNumber } from "@/components/kabsi/highlight";
import { Faq } from "@/components/kabsi/ui";
import { HOME_HERO, ABOUT, FAQ_V31, HOW, SECURITY, TRUST } from "./v31-data";
import { Band, CheckBox, Head, Lead, PageTop, Ticks } from "./kit";
import { ClosingBand, ReportSample, TrustLines } from "./v31";
import { PubImg } from "./life";
import { ProductScreens } from "./screens-section";
import { PUB } from "./public-photos";

export function V31How() {
  return (
    <>
      <PageTop
        title={HOW.title}
        mark={HOW.mark}
        line={HOW.line}
        aside={
          <PubImg
            photo={PUB.howHero}
            sizes="(min-width: 1280px) 500px, (min-width: 1024px) 40vw, 100vw"
            priority
            className="aspect-[4/3] w-full rounded-panel bg-surface-3 object-cover shadow-lift"
          />
        }
      >
        <CheckBox id="how-scan" under={HOME_HERO.under} className="mt-8 max-w-[36rem]" />
      </PageTop>
      <Band id="steps" tone="warm" label="The five steps">
        <ol className="grid gap-x-12 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
          {HOW.steps.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <YellowNumber n={i + 1} />
              <div>
                <h2 className="text-h3">{s.title}</h2>
                <p className="mt-2 text-read text-text-2">{s.text}</p>
              </div>
            </li>
          ))}
          <li className="flex gap-4 md:col-span-2 xl:col-span-1">
            <div className="border-s-4 border-kb-yellow ps-4">
              <h2 className="text-h3">Or just tell Kabsi.</h2>
              <p className="mt-2 text-read text-text-2">{HOW.ask}</p>
            </div>
          </li>
        </ol>
      </Band>
      <ProductScreens />
      <Band id="report" tone="warm">
        <Head
          id="report"
          title="See what was done."
          line="A short summary every week and a full report every month: work done, what Kabsi found and what Google shows, kept apart."
        />
        <ReportSample className="mt-8" />
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
