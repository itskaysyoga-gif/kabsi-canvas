// Web 4 (Design 7): the interactive demonstration moved from Home to How it works. One phone, its status card and the
// five steps share one state (d6-demo.tsx); every state is a replay of fixed Example events, nothing calls a service.
import { DemoProvider, DemoSteps, HeroDemo } from "./d6-demo";

export function AfterYes() {
  return (
    <DemoProvider>
      <section id="demo" aria-labelledby="demo-h" className="theme-dark scroll-mt-16 bg-band">
        <div className="container-kb section-y grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <h2 id="demo-h" className="text-h2">
              What happens after your yes.
            </h2>
            <p className="mt-4 max-w-[34rem] text-lead text-text-2">
              Tap Yes, Edit or Skip on the phone. Each state shows as it happens: Approved, Sent to
              Google, Live on Google, or Did not go through.
            </p>
            {/* The demo video goes here once a real one exists. No "Watch the demo" link until then. */}
            <div data-slot="demo-video" hidden />
            <DemoSteps className="mt-10" />
          </div>
          <div className="relative mx-auto w-full max-w-[34rem]">
            <HeroDemo cardClassName="relative z-10 mx-auto -mt-4 w-[min(86%,18.5rem)]" />
          </div>
        </div>
      </section>
    </DemoProvider>
  );
}
