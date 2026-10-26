import { createFileRoute } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Suspense, lazy } from "react";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { ScanBox } from "@/components/kabsi/scan-box";
import { SectionHead, StepList } from "@/components/kabsi/ui";
import { Img, PHOTOS } from "@/components/kabsi/photos";
import { pageHead } from "@/lib/site";

const HowItWorksLive = lazy(() =>
  import("@/components/kabsi/hiw-sections").then((m) => ({ default: m.HowItWorksLive })),
);

export const Route = createFileRoute("/how-it-works")({
  head: () =>
    pageHead({
      title: "How Kabsi works: Kabsi does the work. You reply Yes.",
      description: "Here is what a normal week with Kabsi looks like on WhatsApp.",
      path: "/how-it-works",
      image: "home",
      crumbs: [{ name: "How it works", path: "/how-it-works" }],
    }),
  component: HowItWorks,
});

/* ---------- Setup, never, closing ---------- */

const SETUP = [
  // The four stages of master plan 30.16 section 3, then the first task.
  { title: "Get your free check" },
  { title: "Sign in and confirm your business" },
  { title: "Connect WhatsApp" },
  { title: "Add Kabsi as a Manager on Google" },
  { title: "Approve your first task" },
];

const NEVER = [
  "Posts without your yes.",
  "Asks for your Google password.",
  "Writes fake reviews or rewards reviews.",
  "Asks only happy customers.",
  "Messages your customers.",
];

function HowItWorks() {
  return (
    <SiteShell>
      <section className="container-kb grid items-center gap-10 pt-28 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-36">
        <SectionHead
          as="h1"
          title="Kabsi does the work. You reply Yes."
          lead="Here is what a normal week with Kabsi looks like on WhatsApp."
        />
        <div className="overflow-hidden rounded-panel">
          <Img
            photo={PHOTOS.phoneReading}
            sizes="(min-width: 1024px) 40vw, 100vw"
            priority
            className="aspect-[4/3] w-full object-cover object-[50%_30%] lg:aspect-[5/4]"
          />
        </div>
      </section>

      <Suspense fallback={null}>
        <HowItWorksLive />
      </Suspense>

      <section
        aria-labelledby="setup-h"
        className="container-kb section-y grid gap-12 lg:grid-cols-2"
      >
        <div>
          <SectionHead id="setup-h" title="Set up in 10 minutes, no passwords" />
          <StepList steps={SETUP} className="mt-10" />
        </div>
        <div>
          <h2 className="text-h2">What Kabsi never does</h2>
          <ul className="mt-10 divide-y divide-line border-y border-line">
            {NEVER.map((n) => (
              <li key={n} className="flex min-h-14 items-center gap-3 py-3 text-body">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-bad-soft text-bad">
                  <X className="size-4" strokeWidth={2.5} aria-hidden />
                </span>
                {n}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="hiw-close" className="border-t border-line bg-band">
        <div className="container-kb section-y">
          <div className="mx-auto max-w-[40rem]">
            <h2 id="hiw-close" className="text-h2">
              Start with a free check.
            </h2>
            <ScanBox className="mt-8" />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
