// How it works, FAQ, About and Security on blueprint 3.1 (SITE-1, R-163): short pages that say the same thing as Home,
// each ending with the free check. Words in v31-data.ts.
import { YellowNumber } from "@/components/kabsi/highlight";
import { Faq } from "@/components/kabsi/ui";
import { HOME_HERO, ABOUT, FAQ_V31, HOW, SECURITY, TRUST } from "./v31-data";
import { CheckBox, ClosingBand, PageTop, Sec, Ticks, TrustLines } from "./v31";

export function V31How() {
  return (
    <>
      <PageTop title={HOW.title} mark={HOW.mark} line={HOW.line} />
      <section aria-label="The five steps" className="border-t border-line bg-surface-1">
        <ol className="container-kb grid gap-6 py-12 sm:grid-cols-2 sm:py-20 lg:grid-cols-5 lg:gap-8">
          {HOW.steps.map((s, i) => (
            <li key={s.title}>
              <YellowNumber n={i + 1} />
              <h2 className="mt-3 text-title">{s.title}</h2>
              <p className="mt-1 text-small text-text-2">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>
      <Sec id="ask" title="Or just tell Kabsi." mark="just tell" line={HOW.ask} />
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
      >
        <Faq items={FAQ_V31.map((f) => ({ q: f.q, a: f.a }))} className="mt-8 max-w-[44rem]" />
      </PageTop>
      <ClosingBand under={HOME_HERO.under} />
    </>
  );
}

export function V31About() {
  return (
    <>
      <PageTop title={ABOUT.title} mark={ABOUT.mark} line={ABOUT.line}>
        <CheckBox id="about-scan" under={HOME_HERO.under} className="mt-6 max-w-[36rem]" />
      </PageTop>
      <Sec split id="why" title="Why Kabsi exists." mark="exists." tone="card">
        <ul className="mt-5 max-w-[38rem] space-y-2 text-body text-text-1">
          {ABOUT.why.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p className="mt-5 max-w-[38rem] text-body text-text-2">{ABOUT.who}</p>
      </Sec>
      <Sec split id="promise" title={TRUST.title} mark={TRUST.mark}>
        <TrustLines />
      </Sec>
    </>
  );
}

export function V31Security() {
  return (
    <>
      <PageTop title={SECURITY.title} mark={SECURITY.mark} line={SECURITY.line}>
        <CheckBox id="security-scan" under={HOME_HERO.under} className="mt-6 max-w-[36rem]" />
      </PageTop>
      <Sec split id="answers" title="In plain words." mark="plain words." tone="card">
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {SECURITY.answers.map((x) => (
            <div key={x.q} className="rounded-card border border-line bg-surface-0 p-4">
              <dt className="text-title font-bold">{x.q}</dt>
              <dd className="mt-1 text-small text-text-2">{x.a}</dd>
            </div>
          ))}
        </dl>
      </Sec>
      <Sec split id="kept" title={SECURITY.stored.title + "."} mark="keeps.">
        <Ticks items={SECURITY.stored.items} className="mt-5 max-w-[38rem]" />
      </Sec>
    </>
  );
}
