// How it works on Design 9 (Web 5 part C, master plan 30.24). Site 3a (30.50 item 10) set the order: the hero, what
// Kabsi does (the four groups), what you approve (the demonstration), what happens next, and only then the Manager access
// detail. Before Site 3a: the hero (treatment B) with the three cases at a glance, the steps line, the demonstration in three cases (Hours changed, Photo to post, New review) through Approved, Sent to
// Google, Live on Google or Did not go through, getting started with the real Manager recording (kabsi-canvas's own
// wording), "You stay in control." and the closing check. Design 8's week timeline and the after-your-yes section are
// replaced by the demonstration.
import { cn } from "@/lib/utils";
import { KABSI_GROUP_ID, MAIN_CTA, TRIAL_LINE } from "@/lib/site";
import { SiteLink } from "./site-link";
import { PageHero } from "./page-hero";
import { VideoPlayer } from "./d5-access";
import { ADD_KABSI } from "./access-video";
import { Closing, Control } from "./closing";
import { HOW_HERO } from "./hero-lines";
import { D9Arrow, YellowNumber, d9LinkCls } from "./d9-hero";
// Site 3a: the four groups live with Home's sections; How it works has no script budget, Home keeps them lazy.
import { HandlesGroups } from "./d9-home-lower";
import { VOICE_LINE } from "./voice-line";
import { DemoThreeCases, HowVisual } from "./d9-how";
import { D9_HOW_LINE } from "./d9-data";
import { Marked } from "@/components/kabsi/highlight";

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
      {/* Site 3a (30.50 item 10): what Kabsi does, what you approve, what happens next, then the Manager access detail. */}
      <HandlesGroups
        id="does-h"
        title="What Kabsi does"
        mark="does"
        foot={`On WhatsApp: ${VOICE_LINE}`}
        className="bg-surface-1"
      />
      <DemoThreeCases />

      <section aria-labelledby="next-h" className="border-t border-line">
        <div className="container-kb section-y">
          <h2 id="next-h" className="text-h2">
            <Marked text="What happens next" mark="next" />
          </h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3 md:gap-8">
            <li className="flex gap-4 md:block">
              <YellowNumber n={1} className="size-9 shrink-0 text-small" />
              <div className="md:mt-4">
                <h3 className="text-title">Run the free check</h3>
                <p className="mt-1 text-body text-text-2">About 30 seconds, no access needed.</p>
                <SiteLink to="/scan" className={cn(d9LinkCls, "text-body")}>
                  {MAIN_CTA}
                  <D9Arrow />
                </SiteLink>
              </div>
            </li>
            <li className="flex gap-4 md:block">
              <YellowNumber n={2} className="size-9 shrink-0 text-small" />
              <div className="md:mt-4">
                <h3 className="text-title">Add Kabsi as a Manager</h3>
                <p className="mt-1 text-body text-text-2">
                  A few steps in your Google profile. No password, and you stay the owner.
                </p>
                <a href="#manager-h" className={cn(d9LinkCls, "text-body")}>
                  See the steps
                  <D9Arrow />
                </a>
              </div>
            </li>
            <li className="flex gap-4 md:block">
              <YellowNumber n={3} className="size-9 shrink-0 text-small" />
              <div className="md:mt-4">
                <h3 className="text-title">Your first task</h3>
                <p className="mt-1 text-body text-text-2">
                  Replies for your older reviews, ready for your yes. Your 14 days start when access
                  works.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section aria-labelledby="manager-h" className="border-t border-line bg-surface-1">
        <div className="container-kb section-y grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-16">
          <div>
            <h2 id="manager-h" className="scroll-mt-24 text-h2">
              <Marked text="Adding Kabsi as a Manager" mark="as a Manager" />
            </h2>
            <p className="mt-6 max-w-[34rem] text-body text-text-2">
              In your Google profile: Business Profile settings, People and access, Add. Paste{" "}
              {KABSI_GROUP_ID}, keep Manager, then Add. No password, and you stay the owner.
            </p>
            <SiteLink to="/security" className={cn(d9LinkCls, "mt-2 text-body")}>
              What Manager access means
              <D9Arrow />
            </SiteLink>
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
