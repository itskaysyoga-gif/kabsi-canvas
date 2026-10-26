// How it works: try it, the topics and the first 14 days (COPY.md section 4).
import {
  BarChart3,
  Bell,
  CalendarClock,
  Camera,
  CreditCard,
  Headphones,
  MapPin,
  QrCode,
  Star,
  Swords,
  Users,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Chip,
  ExampleBadge,
  KabsiMark,
  SectionHead,
  Segmented,
  StatusPill,
  WhatsAppGlyph,
  WhatsAppLink,
} from "./ui";
import { Bubble, PhoneFrame, WaComposer, WaHeader, WaStatusBar } from "./whatsapp";

/* ---------- Try it ---------- */

const PROMPTS: { q: string; a: string; buttons?: string[] }[] = [
  {
    q: "Where do I rank for dentist?",
    a: "We searched 'dentist' on Google Maps from 49 places around your clinic, like a customer would. You came up in the top 3 from 18 of them. North of the mall, Smile Clinic comes up first.",
  },
  {
    q: "A 1-star review came in",
    a: "Bright Dental: new 1-star review from Tom. 'Waited 40 minutes past my time.' Reply ready: 'Tom, we are sorry about the wait. Please call us so we can put it right.' Reply Yes to publish.",
    buttons: ["Yes", "Edit", "Skip"],
  },
  {
    q: "Ask a customer for a review",
    a: "Here is your review link and a ready message for every customer: 'Thank you for coming in today. If you have a minute, a review helps others find us.' Send it, or show the QR card at the counter.",
  },
  {
    q: "Close at 3 today",
    a: "Today's hours on your Google profile will read 9 to 3. Reply Yes to change them.",
    buttons: ["Yes", "Edit", "Skip"],
  },
  {
    q: "Here is a photo of our new dish",
    a: "Ready to post with: 'New on the menu this week.' Reply Yes to post it on your Google profile.",
    buttons: ["Yes", "Edit", "Skip"],
  },
  {
    q: "How did we do this week?",
    a: "6 new reviews, all replied to. You came up in the top 3 from 18 of 49 places, 2 more than last week. Your Results Report comes on Monday.",
  },
];

export function TryIt() {
  const [i, setI] = useState(0);
  const p = PROMPTS[i]!;
  return (
    <section aria-labelledby="try-h" className="container-kb section-y">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_22rem] lg:gap-16">
        <div>
          <SectionHead id="try-h" title="Things you can say to Kabsi" />
          <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Try a message">
            {PROMPTS.map((x, k) => (
              <Chip key={x.q} selected={k === i} aria-pressed={k === i} onClick={() => setI(k)}>
                {x.q}
              </Chip>
            ))}
          </div>
          <WhatsAppLink label="Try it on WhatsApp" className="mt-8" />
        </div>
        <PhoneFrame className="max-w-[20rem]">
          <div className="flex size-full flex-col bg-wa-header" aria-live="polite">
            <WaStatusBar />
            <WaHeader />
            <div
              key={i}
              className="wa-ground flex min-h-0 flex-1 flex-col justify-end gap-1.5 overflow-hidden py-3"
            >
              <Bubble out read>
                {p.q}
              </Bubble>
              <Bubble buttons={p.buttons}>{p.a}</Bubble>
            </div>
            <WaComposer />
          </div>
        </PhoneFrame>
      </div>
    </section>
  );
}

const TOPICS = [
  [MapPin, "Rankings and AI answers"],
  [Swords, "Competitors"],
  [Star, "Reviews and review requests"],
  [CalendarClock, "Hours and holidays"],
  [Camera, "Photos and posts"],
  [Bell, "Changes to your Google profile"],
  [BarChart3, "Your weekly report"],
  [QrCode, "Review link and QR"],
  [Users, "Your team"],
  [CreditCard, "Plan and billing"],
  [Headphones, "Talk to a person"],
] as const;

export function Topics() {
  return (
    <section aria-label="Topics" className="container-kb pb-4">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {TOPICS.map(([I, t]) => (
          <li
            key={t}
            className="flex min-h-16 items-center gap-3 rounded-card border border-line bg-surface-1 p-4"
          >
            <I className="size-5 shrink-0 text-text-2" aria-hidden />
            <span className="text-small font-semibold">{t}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Day 1 to Day 14 ---------- */

const DAYS: {
  day: number;
  title: string;
  wa: string;
  web: string;
  tone: "ok" | "warn" | "info";
  pill: string;
}[] = [
  {
    day: 1,
    title: "Your first full map arrives on WhatsApp.",
    wa: "Your first map is ready. We searched 'bakery' on Google Maps from 49 places around your shop, like a customer standing there. You came up in the top 3 from 18 of them.",
    web: "Nearby: in the first 3 at 18 of 49 places",
    tone: "ok",
    pill: "Ready",
  },
  {
    day: 2,
    title: "Kabsi drafts replies to your newest reviews. You reply Yes.",
    wa: "Corner Bakery: new 4-star review from Maya. Reply ready. Reply Yes to publish.",
    web: "Reply to Maya, ready for your yes",
    tone: "warn",
    pill: "Needs you",
  },
  {
    day: 3,
    title: "Your review link and QR card are ready.",
    wa: "Your review link and QR card for the counter are ready. Send the link to every customer, the same way.",
    web: "Review link and QR card",
    tone: "ok",
    pill: "Ready",
  },
  {
    day: 5,
    title: "Holiday hours and a first post, ready for your yes.",
    wa: "1 November is a holiday. Close at 2 that day? Reply Yes to set it on your Google profile.",
    web: "Holiday hours for 1 November",
    tone: "warn",
    pill: "Needs you",
  },
  {
    day: 7,
    title: "Your first Results Report.",
    wa: "Your Results Report for 18 to 24 October is ready. 3 next steps inside.",
    web: "Results Report, 18 to 24 October",
    tone: "ok",
    pill: "Ready",
  },
  {
    day: 10,
    title: "Competitor Watch: what changed around you.",
    wa: "Harbor Bakes changed its Saturday hours and added 12 photos this week.",
    web: "2 changes around you this week",
    tone: "info",
    pill: "For you to know",
  },
  {
    day: 14,
    title: "Your trial ends. Choose a plan, or Kabsi stops publishing.",
    wa: "Your trial ends today. Choose a plan to keep going. If you do not, Kabsi stops publishing and you keep your review link and QR code.",
    web: "Pro trial, ends today",
    tone: "warn",
    pill: "Needs you",
  },
];

export function Timeline() {
  const [i, setI] = useState(0);
  const [view, setView] = useState<"wa" | "web">("wa");
  const d = DAYS[i]!;
  return (
    <section aria-labelledby="days-h" className="border-y border-line bg-surface-1/40">
      <div className="container-kb section-y">
        <SectionHead
          id="days-h"
          title="Your first 14 days"
          lead="The same thing shows on WhatsApp and on the Kabsi website. Answer wherever you are."
        />
        <div className="mt-10 grid gap-8 lg:grid-cols-[22rem_1fr] lg:gap-12">
          <ol className="relative">
            {DAYS.map((x, k) => (
              <li key={x.day}>
                <button
                  type="button"
                  aria-pressed={k === i}
                  onClick={() => setI(k)}
                  className={cn(
                    "press flex min-h-14 w-full items-start gap-4 rounded-card px-3 py-3 text-start",
                    k === i ? "bg-surface-2" : "hover:bg-surface-2/60",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-8 min-w-14 shrink-0 place-items-center rounded-full text-label font-bold",
                      k === i
                        ? "bg-text-1 text-surface-0"
                        : "border border-line-strong text-text-2",
                    )}
                  >
                    Day {x.day}
                  </span>
                  <span
                    className={cn(
                      "pt-1 text-small",
                      k === i ? "font-semibold text-text-1" : "text-text-2",
                    )}
                  >
                    {x.title}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <div>
            <div className="flex items-center justify-between gap-3 lg:hidden">
              <Segmented
                label="Where you see it"
                value={view}
                onChange={setView}
                options={[
                  { value: "wa", label: "WhatsApp" },
                  { value: "web", label: "The Kabsi website" },
                ]}
              />
            </div>
            <div className="mt-4 grid gap-4 lg:mt-0 lg:grid-cols-2" aria-live="polite">
              <div className={cn(view === "wa" ? "block" : "hidden", "lg:block")}>
                <p className="mb-3 flex items-center gap-2 text-small font-bold text-text-1">
                  <WhatsAppGlyph className="size-4.5" /> WhatsApp
                </p>
                <div
                  key={`wa-${i}`}
                  className="wa-ground flex min-h-64 flex-col justify-end rounded-panel p-4"
                >
                  <Bubble buttons={d.tone === "warn" ? ["Yes", "Edit", "Skip"] : undefined}>
                    {d.wa}
                  </Bubble>
                </div>
              </div>
              <div className={cn(view === "web" ? "block" : "hidden", "lg:block")}>
                <p className="mb-3 flex items-center gap-2 text-small font-bold text-text-1">
                  <KabsiMark className="size-4.5" /> The Kabsi website
                </p>
                <div
                  key={`web-${i}`}
                  className="theme-light min-h-64 animate-enter overflow-hidden rounded-panel"
                >
                  <div
                    className="flex items-center gap-1.5 border-b border-line bg-surface-1 px-4 py-2.5"
                    aria-hidden
                  >
                    {[0, 1, 2].map((n) => (
                      <span key={n} className="size-2.5 rounded-full bg-line-strong" />
                    ))}
                    <span className="ms-3 truncate rounded-full bg-surface-0 px-3 py-0.5 text-label text-text-2">
                      kabsi.co
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-h3">Waiting for you</p>
                    <div className="mt-4 rounded-card border border-line bg-surface-1 p-4 shadow-rest">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-body font-semibold">{d.web}</p>
                        <StatusPill tone={d.tone}>{d.pill}</StatusPill>
                      </div>
                      <p className="mt-2 text-small text-text-2">Day {d.day}</p>
                    </div>
                    <p className="mt-4 text-small text-text-2">
                      {d.day === 14
                        ? "Pro trial, ends today."
                        : `Pro trial, ${14 - d.day} days left.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <ExampleBadge className="mt-4" />
          </div>
        </div>
      </div>
    </section>
  );
}

/** The interactive parts of How it works, in one chunk that hydrates after the page is usable. */
export function HowItWorksLive() {
  return (
    <>
      <TryIt />
      <Topics />
      <div className="h-16 lg:h-24" />
      <Timeline />
    </>
  );
}
