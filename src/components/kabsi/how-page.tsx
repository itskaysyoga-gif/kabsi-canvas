// How it works on Design 9 (Web 5 part C, master plan 30.24): the hero (treatment B) with the three cases at a glance,
// the steps line, the demonstration in three cases (Hours changed, Photo to post, New review) through Approved, Sent to
// Google, Live on Google or Did not go through, getting started with the real Manager recording (kabsi-canvas's own
// wording), "You stay in control." and the closing check. Design 8's week timeline and the after-your-yes section are
// replaced by the demonstration.
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { KABSI_GROUP_ID, MAIN_CTA, TRIAL_LINE } from "@/lib/site";
import { SiteLink } from "./site-link";
import { PageHero } from "./page-hero";
import { VideoPlayer } from "./d5-access";
import { ADD_KABSI } from "./access-video";
import { Closing, Control } from "./closing";
import { HOW_HERO } from "./hero-lines";
import { StepsLine, YellowNumber } from "./d9-hero";
import { DemoThreeCases, HowVisual } from "./d9-how";
import { D9_HOW_LINE } from "./d9-data";

const linkCls =
  "press inline-flex min-h-11 items-center gap-1.5 font-semibold text-text-1 underline decoration-text-3 decoration-1 underline-offset-4 hover:decoration-text-1";

export function HowItWorksPage() {
  return (
    <>
      {/* The visible line is Design 9's; the meta description stays HOW_HERO.line (the route's head). */}
      <PageHero
        hero={{ ...HOW_HERO, line: D9_HOW_LINE }}
        marked
        under={TRIAL_LINE}
        visual={<HowVisual />}
      ></PageHero>
      {/* The product video goes here once a real one exists (docs/VIDEO-PLAN.md, section 9). Hidden until then. */}
      <div data-slot="product-video" hidden />
      <StepsLine id="how-steps-h" />
      <DemoThreeCases />

      <section aria-labelledby="start-h">
        <div className="container-kb section-y grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-16">
          <div>
            <h2 id="start-h" className="text-h2">
              Getting started
            </h2>
            <ol className="mt-8 space-y-8">
              <li className="flex gap-4">
                <YellowNumber n={1} className="size-9 text-small" />
                <div>
                  <h3 className="text-title">Run the free check</h3>
                  <p className="mt-1 text-body text-text-2">About 10 seconds, no access needed.</p>
                  <SiteLink to="/scan" className={cn(linkCls, "text-body")}>
                    {MAIN_CTA}
                    <ArrowRight className="size-4" aria-hidden />
                  </SiteLink>
                </div>
              </li>
              <li className="flex gap-4">
                <YellowNumber n={2} className="size-9 text-small" />
                <div>
                  <h3 className="text-title">Add Kabsi as a Manager</h3>
                  <p className="mt-1 text-body text-text-2">
                    In your Google profile: Business Profile settings, People and access, Add. Paste
                    {KABSI_GROUP_ID}, keep Manager, then Add. No password, and you stay the owner.
                  </p>
                  <SiteLink to="/security" className={cn(linkCls, "text-body")}>
                    What Manager access means
                    <ArrowRight className="size-4" aria-hidden />
                  </SiteLink>
                </div>
              </li>
              <li className="flex gap-4">
                <YellowNumber n={3} className="size-9 text-small" />
                <div>
                  <h3 className="text-title">Your first task</h3>
                  <p className="mt-1 text-body text-text-2">
                    Replies for your older reviews, ready for your yes. Your 14 days start when
                    access works.
                  </p>
                </div>
              </li>
            </ol>
          </div>
          <div className="lg:pt-4">
            <p className="mb-4 text-center text-small font-bold text-text-2">
              What you tap, on a real profile
            </p>
            <VideoPlayer video={ADD_KABSI} />
          </div>
        </div>
      </section>

      <Control short />
      <Closing />
    </>
  );
}
