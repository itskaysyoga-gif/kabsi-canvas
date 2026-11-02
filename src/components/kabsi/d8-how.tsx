// How it works on Design 8 (Web 4b, lane R's approval of 1 Nov 2026): the hero with the week at a glance, a week with
// Kabsi as a six-stop timeline (Example: an invented salon in Bristol), getting started with the real Manager
// recording, the demonstration that Web 4 moved here, "You stay in control." and the closing check. The hours buttons
// read "Use my hours" and "Keep Google's" (decision 3).
import {
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardList,
  ImageIcon,
  MessageSquareText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  KABSI_GROUP_ID,
  MAIN_CTA,
  TRIAL_LINE,
  WHATSAPP_LAUNCH_LINE,
  WHATSAPP_ON,
} from "@/lib/site";
import { ExampleBadge } from "./ui";
import { SiteLink } from "./site-link";
import { PageHero, popCls, stagger } from "./page-hero";
import { VideoPlayer } from "./d5-access";
import { ADD_KABSI } from "./access-video";
import { AfterYes } from "./after-yes";
import { Closing, Control } from "./closing";
import { HOW_HERO } from "./hero-lines";

const linkCls =
  "press inline-flex min-h-11 items-center gap-1.5 font-semibold text-text-1 underline decoration-text-3 decoration-1 underline-offset-4 hover:decoration-text-1";

const WEEK_GLANCE = [
  { day: "Every day", what: "Details checked", state: "Done" },
  { day: "Monday", what: "The receipt for last week", state: "Sent" },
  { day: "Tuesday", what: "Reply ready for Chloe's review", state: "You said Yes" },
  { day: "Friday", what: "Bank holiday hours asked", state: "You chose Closed" },
] as const;

function WeekVisual() {
  return (
    <figure className="theme-dark relative rounded-panel bg-band p-5 text-text-1 shadow-float sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <p className="text-title font-bold">This week at Hollis Hair</p>
        <ExampleBadge />
      </div>
      <div className="relative mt-5">
        <span
          aria-hidden
          className="absolute start-[0.4375rem] top-2 bottom-2 w-px bg-line-strong"
        />
        <ol className="space-y-4 ps-6">
          {WEEK_GLANCE.map((w, i) => (
            <li key={w.day} className={cn("relative", popCls)} style={stagger(i, 250, 220)}>
              <span
                aria-hidden
                className="absolute -start-6 top-1.5 size-3.5 rounded-full border-2 border-kb-paper bg-band"
              />
              <p className="text-label font-bold text-text-2">{w.day}</p>
              <p className="text-body font-semibold">{w.what}</p>
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-small text-ok">
                <Check className="size-4" strokeWidth={2.5} aria-hidden />
                {w.state}
              </p>
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="sr-only">
        An Example week: details checked every day, the Monday receipt, a reply approved on Tuesday,
        bank holiday hours chosen on Friday.
      </figcaption>
    </figure>
  );
}

type WeekRow = {
  day: string;
  icon: LucideIcon;
  title: string;
  kabsi: string;
  buttons?: string[];
  you: string;
};

/** A week at an Example salon in Bristol, in the order it happens. */
const WEEK: WeekRow[] = [
  {
    day: "Every day",
    icon: ShieldCheck,
    title: "The daily watch",
    kabsi: "Kabsi checks your hours, phone, website and address on Google.",
    you: "Nothing, unless something changed.",
  },
  {
    day: "Monday, 09:00",
    icon: ClipboardList,
    title: "The Monday receipt",
    kabsi:
      "Last week: 6 replies live on Google, 1 post, details checked every day. One next step: add 3 photos of the team at work.",
    you: "Read it in a minute.",
  },
  {
    day: "Tuesday, 10:15",
    icon: MessageSquareText,
    title: "A review arrives",
    kabsi:
      "New 5-star review from Chloe B. Reply ready: 'Thank you, Chloe. We will tell Amber. See you in six weeks.'",
    buttons: ["Yes", "Edit", "Skip"],
    you: "Yes.",
  },
  {
    day: "Wednesday, 08:02",
    icon: ShieldCheck,
    title: "Google shows different hours",
    kabsi: "Google shows Saturday closing at 17:00. You told Kabsi 18:00. Kabsi changed nothing.",
    buttons: ["Use my hours", "Keep Google's"],
    you: "Use my hours.",
  },
  {
    day: "Thursday, 12:40",
    icon: ImageIcon,
    title: "A post, made ready",
    kabsi: "Post ready with your photo: 'Late appointments every Thursday until 8 pm this month.'",
    buttons: ["Yes", "Edit", "Skip"],
    you: "Edit one word, then Yes.",
  },
  {
    day: "Friday, 09:05",
    icon: CalendarDays,
    title: "Holiday hours, asked in time",
    kabsi: "A bank holiday is five days away. Normal hours, closed or custom?",
    buttons: ["Normal", "Closed", "Custom"],
    you: "Closed.",
  },
];

function StepNo({ n }: { n: number }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line-strong text-small font-bold">
      {n}
    </span>
  );
}

export function D8HowItWorks() {
  return (
    <>
      <PageHero hero={HOW_HERO} under={TRIAL_LINE} visual={<WeekVisual />} />
      {/* The product video goes here once a real one exists. Hidden until then. */}
      <div data-slot="product-video" hidden />

      <section aria-labelledby="week-h" className="border-t border-line bg-surface-1">
        <div className="container-kb section-y">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="week-h" className="text-h2">
              A week with Kabsi
            </h2>
            <ExampleBadge />
          </div>
          <p className="mt-3 max-w-[40rem] text-body text-text-2">
            Hollis Hair, an invented salon in Bristol. Each message is what Kabsi sends; each answer
            is the owner's.
          </p>
          <div className="relative mt-10 lg:mx-auto lg:max-w-[52rem]">
            <span
              aria-hidden
              className="absolute start-5 top-2 bottom-2 w-px bg-line-strong sm:start-7"
            />
            <ol className="space-y-8 ps-12 sm:ps-16">
              {WEEK.map((w) => {
                const Icon = w.icon;
                return (
                  <li key={w.day} className="relative">
                    <span className="absolute -start-12 top-0 grid size-10 place-items-center rounded-full border border-line-strong bg-surface-1 sm:-start-16 sm:size-14">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <p className="text-label font-bold text-text-2">{w.day}</p>
                    <h3 className="mt-0.5 text-h3">{w.title}</h3>
                    <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem] md:items-start">
                      <div className="rounded-card bg-surface-2 p-4">
                        <p className="text-label font-bold text-text-2">Kabsi</p>
                        <p className="mt-1 text-body">{w.kabsi}</p>
                        {w.buttons && (
                          <p className="mt-3 flex flex-wrap gap-1.5">
                            <span className="sr-only">Buttons: </span>
                            {w.buttons.map((b) => (
                              <span
                                key={b}
                                className="rounded-full border border-line-strong bg-surface-1 px-3 py-1 text-small font-semibold"
                              >
                                {b}
                              </span>
                            ))}
                          </p>
                        )}
                      </div>
                      <p className="text-body md:pt-4">
                        <span className="font-bold">You: </span>
                        <span className="text-text-2">{w.you}</span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
          {!WHATSAPP_ON && (
            <p className="mt-8 text-small text-text-2 lg:mx-auto lg:max-w-[52rem]">
              {WHATSAPP_LAUNCH_LINE}
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="start-h">
        <div className="container-kb section-y grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-16">
          <div>
            <h2 id="start-h" className="text-h2">
              Getting started
            </h2>
            <ol className="mt-8 space-y-8">
              <li className="flex gap-4">
                <StepNo n={1} />
                <div>
                  <h3 className="text-title">Run the free check</h3>
                  <p className="mt-1 text-body text-text-2">
                    Your public Google profile and what to do first. About 10 seconds, no access
                    needed.
                  </p>
                  <SiteLink to="/scan" className={cn(linkCls, "text-body")}>
                    {MAIN_CTA}
                    <ArrowRight className="size-4" aria-hidden />
                  </SiteLink>
                </div>
              </li>
              <li className="flex gap-4">
                <StepNo n={2} />
                <div>
                  <h3 className="text-title">Add Kabsi as a Manager</h3>
                  <p className="mt-1 text-body text-text-2">
                    In your Google profile: Menu, Business Profile settings, People and access, Add.
                    Paste {KABSI_GROUP_ID}, keep Manager, then Add (on some screens, Invite). No
                    password, and you stay the owner.
                  </p>
                  <SiteLink to="/security" className={cn(linkCls, "text-body")}>
                    What Manager access means
                    <ArrowRight className="size-4" aria-hidden />
                  </SiteLink>
                </div>
              </li>
              <li className="flex gap-4">
                <StepNo n={3} />
                <div>
                  <h3 className="text-title">Your first task</h3>
                  <p className="mt-1 text-body text-text-2">
                    Kabsi reads your reviews and brings the older ones with no reply as one item,
                    the drafts ready for your yes. Your 14 days start when access works.
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

      <AfterYes />
      <Control />
      <Closing />
    </>
  );
}
