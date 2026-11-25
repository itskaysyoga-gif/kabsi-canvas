// Home and Pricing on blueprint 3.1, redone by SITE-3 (R-164 item 7) on the one section system in ./kit.tsx. Home, in
// order: the hero with the phone, the problem on the charcoal band, a week with Kabsi, just tell Kabsi, how it starts,
// proof, the price, trust, questions and the closing band. The chat pictures are drawn in Kabsi's own look (ivory and
// charcoal, the Kabsi mark), labelled Example, never a copy of another app's screens or logo. The yellow bar is on the H1
// and one other headline only. No carousel of offers, no video, no pop-up, no counters, testimonials or ratings of Kabsi.
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  CalendarClock,
  Check,
  ExternalLink,
  ImageIcon,
  Mic,
  Pause,
  Play,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIMARY_CTA } from "@/lib/offer";
import { Marked, YellowNumber } from "@/components/kabsi/highlight";
import { ButtonLink, ExampleBadge, Faq, KabsiMark } from "@/components/kabsi/ui";
import { Num, PubImg, ScreenRow, TradeStrip, useCountOnce, useReducedMotion } from "./life";
import { PUB } from "./public-photos";
import { SiteLink } from "@/components/kabsi/site-link";
import { Band, CheckBox, ClosingDark, Head, Lead, MarkRow } from "./kit";
import {
  CLOSING,
  EXAMPLE_BUSINESS,
  HERO_MARKS,
  HERO_SCENES,
  HOME_FAQ,
  HOME_HERO,
  PRICE,
  PROBLEM,
  PROOF,
  START,
  TELL,
  TELL_CHIPS,
  TRUST,
  WEEK,
  type ChatTurn,
} from "./v31-data";

export { CheckBox, Sec } from "./kit";

/* ---------- The chat, in Kabsi's own look ---------- */

function Approve({ done = false }: { done?: boolean }) {
  return (
    <span
      className={cn(
        "mt-2 inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-label font-bold",
        done ? "bg-ok-soft text-ok" : "bg-kb-ink text-kb-sand",
      )}
    >
      <Check className="size-3.5" aria-hidden />
      {done ? "Approved" : "Approve"}
    </span>
  );
}

type Delay = CSSProperties;
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

function KabsiSays({ turn, d }: { turn: Extract<ChatTurn, { from: "kabsi" }>; d?: Delay }) {
  return (
    <li className="relative flex items-end gap-2" style={d}>
      {/* SITE-4: Kabsi is writing. The dots show only while a scene plays (styles.css, .kb-play). */}
      <span className="kb-dots" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      <KabsiMark ring={false} className="kb-said size-6 shrink-0" />
      <div className="kb-said max-w-[86%] rounded-card rounded-es-sm border border-line bg-surface-1 px-3 py-2.5 text-small text-text-1">
        {turn.title ? <p className="font-bold">{turn.title}</p> : null}
        {turn.quote ? (
          <p className="mt-1 border-s-2 border-line-strong ps-2 text-text-2">{turn.quote}</p>
        ) : null}
        {turn.lines.map((l, i) => (
          <p key={l} className={cn(i === 0 ? "mt-1" : "mt-0.5")}>
            {l}
          </p>
        ))}
        {turn.approve ? <Approve /> : null}
      </div>
    </li>
  );
}

function OwnerSays({ text, photo, d }: { text: string; photo?: boolean | undefined; d?: Delay }) {
  return (
    <li
      className="kb-said ms-auto w-fit max-w-[80%] rounded-card rounded-ee-sm bg-kb-ink px-3 py-2.5 text-small text-kb-sand"
      style={d}
    >
      {photo ? (
        <PubImg
          photo={PUB.dayPost}
          sizes="128px"
          className="mb-2 aspect-[3/2] w-32 rounded-input object-cover"
        />
      ) : null}
      {text}
    </li>
  );
}

/**
 * The turns of a chat. Inside a `.kb-play` list (a playing scene) each turn carries its delay: an owner's message after
 * a short pause, and before each of Kabsi's answers 900 ms of typing dots (styles.css). Elsewhere all show at once.
 * Returns the turns and the time the last one lands, for the line that closes a scene.
 */
function turnsOf(turns: ChatTurn[]) {
  let t = 0;
  const items = turns.map((x, i) => {
    t += x.from === "kabsi" ? 900 : 450;
    const d = delay(t);
    t += 500;
    return x.from === "owner" ? (
      <OwnerSays key={i} text={x.text} photo={x.photo} d={d} />
    ) : (
      <KabsiSays key={i} turn={x} d={d} />
    );
  });
  return { items, end: delay(t) };
}

/** A chat in a plain rounded card with the Kabsi mark: Example. */
export function ChatCard({
  turns,
  label,
  className,
  replay,
}: {
  turns: ChatTurn[];
  label: string;
  className?: string;
  /** When given, the turns play one by one (typing dots first) each time it changes. */
  replay?: unknown;
}) {
  const reduced = useReducedMotion();
  return (
    <figure
      className={cn(
        "rounded-panel border border-line bg-surface-0 p-3 shadow-rest sm:p-4",
        className,
      )}
    >
      <div className="flex items-center gap-2 px-1 pb-3">
        <KabsiMark ring={false} className="size-7" />
        <p className="flex-1 text-small font-bold text-text-1">Kabsi</p>
        <ExampleBadge className="text-text-2" />
      </div>
      <ol
        key={String(replay)}
        className={cn("mt-auto space-y-2.5", replay !== undefined && !reduced && "kb-play")}
        aria-label={label}
      >
        {turnsOf(turns).items}
      </ol>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}

/* ---------- The hero phone: three short scenes in turn ---------- */

const SCENE_MS = 7000;

/**
 * A phone drawn in Kabsi's own style (never another app's screens or logo), labelled Example. It plays the three scenes
 * of HERO_SCENES in turn; it is still when the visitor prefers reduced motion, and the pause button stops it (WCAG 2.2.2).
 */
function HeroPhone() {
  const reduced = useReducedMotion();
  const [at, setAt] = useState(0);
  const [paused, setPaused] = useState(false);
  // SITE-4: the first scene is drawn whole (never an empty phone on arrival); later scenes play turn by turn.
  const [moved, setMoved] = useState(false);
  const playing = !reduced && !paused;
  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => {
      setMoved(true);
      setAt((a) => (a + 1) % HERO_SCENES.length);
    }, SCENE_MS);
    return () => window.clearTimeout(t);
  }, [at, playing]);
  const scene = HERO_SCENES[at] ?? HERO_SCENES[0]!;
  // SITE-4: each scene plays turn by turn, with the typing dots before each of Kabsi's answers.
  const play = turnsOf(scene.turns);
  return (
    <figure
      data-nora-avoid
      className="relative mx-auto w-full max-w-[19rem] sm:max-w-[21rem] lg:mx-0"
    >
      <div className="rounded-[2.75rem] bg-kb-ink p-2.5 shadow-float">
        <div className="overflow-hidden rounded-[2.25rem] bg-surface-0">
          <div className="mx-auto mt-2.5 h-5 w-24 rounded-full bg-kb-ink" aria-hidden />
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <KabsiMark ring={false} className="size-8" />
            <div className="min-w-0 flex-1">
              <p className="text-small font-bold text-text-1">Kabsi</p>
              <p className="truncate text-label text-text-2">{EXAMPLE_BUSINESS}</p>
            </div>
            <ExampleBadge className="text-text-2" />
          </div>
          <ol
            key={at}
            aria-label={`Example: ${scene.name}`}
            className={cn(
              "flex h-[23rem] flex-col justify-end gap-2.5 px-3 pb-4 pt-3 sm:h-[20rem]",
              playing && moved && "kb-play",
            )}
          >
            {play.items}
            <li
              className="kb-said flex items-center gap-2 self-center rounded-full bg-ok-soft px-3 py-1.5 text-label font-bold text-ok"
              style={play.end}
            >
              <Check className="size-3.5" aria-hidden />
              {scene.done}
            </li>
          </ol>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2">
        {HERO_SCENES.map((s, i) => (
          <button
            key={s.name}
            type="button"
            aria-label={s.name}
            aria-pressed={i === at}
            onClick={() => {
              setMoved(true);
              setAt(i);
            }}
            className="press grid size-11 place-items-center rounded-full"
          >
            <span
              className={cn(
                "block h-2 rounded-full transition-[width,background-color] duration-300",
                i === at ? "w-6 bg-text-1" : "w-2 bg-line-strong",
              )}
            />
          </button>
        ))}
        {reduced ? null : (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Play the example" : "Pause the example"}
            className="press grid size-11 place-items-center rounded-full text-text-2 hover:text-text-1"
          >
            {paused ? (
              <Play className="size-4" aria-hidden />
            ) : (
              <Pause className="size-4" aria-hidden />
            )}
          </button>
        )}
      </div>
      <figcaption className="sr-only">
        An Example of Kabsi on a phone: a review reply, new hours for Saturday and a photo post,
        each approved by the owner.
      </figcaption>
    </figure>
  );
}

/* ---------- Home ---------- */

export function HomeHero() {
  return (
    <section aria-labelledby="hero-title" data-hero className="relative isolate z-10 bg-surface-0">
      <div className="container-kb grid gap-10 pt-6 pb-14 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_27rem] lg:items-center lg:gap-14 lg:pt-16 lg:pb-24 xl:grid-cols-[minmax(0,1fr)_31rem] xl:gap-20">
        <div className="max-w-[40rem]">
          <h1 id="hero-title" className="text-display text-balance">
            <Marked text={HOME_HERO.title} mark={HOME_HERO.mark} />
          </h1>
          <Lead className="mt-4 sm:mt-6">{HOME_HERO.line}</Lead>
          <CheckBox id="hero-scan" under={HOME_HERO.under} className="relative z-10 mt-6 sm:mt-8" />
          <MarkRow items={HERO_MARKS} className="mt-4" />
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

/**
 * SITE-4: a real owner at work behind the drawn phone. The photo sits back and to the right; the phone, in front and to
 * the left, stays the focus. The photo is the page's preloaded image (src/routes/index.tsx).
 */
function HeroVisual() {
  return (
    <div className="kb-hero-visual-wrap">
      <PubImg
        photo={PUB.heroOwner}
        sizes="(min-width: 1280px) 330px, (min-width: 1024px) 290px, (min-width: 640px) 480px, 92vw"
        priority
      />
      <div>
        <HeroPhone />
      </div>
    </div>
  );
}

/** The problem, on the page's charcoal band: three points from Google's own help pages, each with its link. */
function Problem() {
  return (
    <Band id="problem" tone="dark">
      <h2 id="problem-h" className="max-w-[24ch] text-h2 text-balance">
        {PROBLEM.title}
      </h2>
      <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
        {PROBLEM.points.map((p) => (
          <li key={p.title} className="border-t border-line pt-5">
            <h3 className="text-h3 text-text-1">{p.title}</h3>
            <p className="mt-3 text-read text-text-2">{p.text}</p>
            <a
              href={p.source}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-small font-semibold text-text-1 underline underline-offset-4"
            >
              {PROBLEM.sourceLabel}
              <ExternalLink className="size-3.5" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ol>
    </Band>
  );
}

/* A week with Kabsi: four days, each with a small drawn card. */

function MiniCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-surface-0 p-3.5 text-small text-text-1 shadow-rest">
      {children}
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="mt-2.5 inline-flex h-7 items-center gap-1 rounded-full bg-ok-soft px-2.5 text-label font-bold text-ok">
      <Check className="size-3.5" aria-hidden />
      {children}
    </span>
  );
}

function DayPicture({ n }: { n: number }) {
  if (n === 0)
    return (
      <MiniCard>
        <p className="flex items-center gap-0.5 text-text-1" role="img" aria-label="5 stars">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className="size-3.5 fill-current" aria-hidden />
          ))}
        </p>
        <p className="mt-1.5 text-text-2">"Friendly and quick. Will be back."</p>
        <p className="mt-1.5 font-semibold">Reply ready</p>
        <Chip>Approved</Chip>
      </MiniCard>
    );
  if (n === 1)
    return (
      <MiniCard>
        <p className="font-semibold">Saturday on Google</p>
        <p className="mt-1 text-text-2 line-through">10:00 to 14:00</p>
        <p className="mt-0.5">9:00 to 17:00</p>
        <Chip>Set back</Chip>
      </MiniCard>
    );
  if (n === 2)
    return (
      <MiniCard>
        {/* SITE-4: a real photo in place of the drawn one (credits in public/photos/CREDITS.md). */}
        <PubImg
          photo={PUB.dayPost}
          sizes="288px"
          className="aspect-[3/2] w-full rounded-input object-cover"
        />
        <Chip>Live on Google</Chip>
      </MiniCard>
    );
  return (
    <MiniCard>
      <p className="flex items-center gap-1.5 font-semibold">
        <CalendarClock className="size-4" aria-hidden />
        Your week
      </p>
      <ul className="mt-1.5 space-y-1 text-text-2">
        <li>4 replies live</li>
        <li>1 change set back</li>
        <li>1 post live</li>
      </ul>
    </MiniCard>
  );
}

function Week() {
  return (
    <Band id="week" tone="ivory">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Head id="week" title={WEEK.title} mark="with Kabsi." line={WEEK.line} />
        <ExampleBadge className="text-text-2" />
      </div>
      <ol className="relative mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {WEEK.days.map((d, i) => (
          <li
            key={d.day}
            className="relative flex flex-col border-s-2 border-line ps-5 lg:border-s-0 lg:border-t-2 lg:ps-0 lg:pt-5"
          >
            <span
              aria-hidden
              className="absolute -start-[0.4375rem] top-1 size-3 rounded-full bg-text-1 lg:-top-[0.4375rem] lg:start-0"
            />
            <p className="text-small font-bold text-text-2">{d.day}</p>
            <h3 className="mt-1 text-title">{d.title}</h3>
            <p className="mt-1 text-read text-text-2">{d.text}</p>
            {/* SITE-7: the pictures sit at the foot of each day on a computer, so the row ends on one line. */}
            <div className="mt-4 max-w-[18rem] lg:mt-auto lg:pt-4">
              <DayPicture n={i} />
            </div>
          </li>
        ))}
      </ol>
    </Band>
  );
}

function TellKabsi() {
  const [at, setAt] = useState(0);
  const chip = TELL_CHIPS[at] ?? TELL_CHIPS[0]!;
  return (
    <Band
      id="tell"
      tone="warm"
      inner="lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16 xl:gap-24"
    >
      <div>
        <Head id="tell" title={TELL.title} line={TELL.line} />
        <ul className="mt-8 flex flex-wrap gap-3" aria-label="Example messages">
          {TELL_CHIPS.map((c, i) => (
            <li key={c.ask}>
              <button
                type="button"
                aria-pressed={i === at}
                onClick={() => setAt(i)}
                className={cn(
                  "press inline-flex min-h-12 items-center gap-2 rounded-full border px-5 text-read font-semibold",
                  i === at
                    ? "border-text-1 bg-text-1 text-surface-0"
                    : "border-line-strong bg-surface-0 text-text-1 hover:bg-surface-2",
                )}
              >
                {c.photo ? <ImageIcon className="size-4.5" aria-hidden /> : null}
                {c.ask}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex max-w-[34rem] items-start gap-3 rounded-card border border-line bg-surface-0 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-text-1 text-surface-0">
            <Mic className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-read font-bold text-text-1">{TELL.voice}</p>
            <p className="mt-0.5 text-read text-text-2">{TELL.voiceLine}</p>
          </div>
        </div>
      </div>
      <div aria-live="polite" className="mt-8 lg:mt-0 lg:self-start">
        <ChatCard
          turns={[
            { from: "owner", text: chip.ask, photo: chip.photo },
            { from: "kabsi", lines: chip.answer, approve: chip.approve },
            // SITE-4: the owner's tap on the button Kabsi shows, so the exchange reads to the end.
            ...(chip.approve ? [{ from: "owner" as const, text: "Approve" }] : []),
          ]}
          label={`Example: you send "${chip.ask}" and Kabsi answers`}
          className="flex flex-col"
          replay={at}
        />
      </div>
    </Band>
  );
}

export function StartSteps() {
  return (
    <>
      <ol className="mt-8 grid gap-6">
        {START.steps.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <YellowNumber n={i + 1} />
            <div>
              <h3 className="text-title">{s.title}</h3>
              <p className="mt-0.5 text-read text-text-2">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-8 max-w-[60ch] border-s-4 border-kb-yellow ps-4 text-read font-semibold text-text-1">
        {START.firstDay}
      </p>
    </>
  );
}

function Starts() {
  return (
    <Band
      id="starts"
      tone="ivory"
      inner="lg:grid lg:grid-cols-2 lg:items-center lg:gap-16 xl:gap-24"
    >
      <div>
        <Head id="starts" title={START.title} />
        <StartSteps />
      </div>
      <PubImg
        photo={PUB.florist}
        sizes="(min-width: 1280px) 560px, (min-width: 1024px) 45vw, 100vw"
        className="mt-10 aspect-[4/3] w-full rounded-panel bg-surface-2 object-cover shadow-lift lg:mt-0"
      />
    </Band>
  );
}

export function ReportSample({ className }: { className?: string }) {
  const ref = useCountOnce();
  return (
    <figure
      ref={ref}
      className={cn(
        "rounded-panel border border-line bg-surface-1 p-5 shadow-lift sm:p-7",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <KabsiMark ring={false} className="size-8" />
        <div className="min-w-0 flex-1">
          <p className="text-read font-bold text-text-1">{PROOF.month}</p>
          <p className="text-small text-text-2">{EXAMPLE_BUSINESS}</p>
        </div>
        <ExampleBadge className="text-text-2" />
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-3 sm:gap-6">
        {PROOF.bands.map((b) => (
          <div key={b.name}>
            <p className="text-small font-bold text-text-2">{b.name}</p>
            <dl className="mt-2 divide-y divide-line border-y border-line">
              {b.rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2 text-small">
                  <dt className="text-text-1">{k}</dt>
                  <dd className="font-bold text-text-1">
                    <Num value={v} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      <figcaption className="sr-only">An Example monthly report from Kabsi</figcaption>
    </figure>
  );
}

function Proof() {
  return (
    <Band id="proof" tone="warm">
      <Head
        id="proof"
        title={PROOF.title}
        line="A short summary every week. A full report every month. Work done, what Kabsi found and what Google shows, kept apart."
      />
      <ReportSample className="mt-10" />
      {/* SITE-4: the same work in Kabsi's own account and email, with an example business. */}
      <ScreenRow ids={["report", "cards", "email"]} className="mt-12 sm:mt-16" />
    </Band>
  );
}

/**
 * The one price card, full width: the price and the button on the left; the terms, one line about the plan and a link to
 * Pricing on the right. SITE-5: Home and the industry pages show it this way, so the plan's full lists live on Pricing
 * only. SITE-7: the full variant (with the lists) was never shown and is gone.
 */
export function PriceCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-8 rounded-panel border border-line bg-surface-1 p-6 shadow-lift sm:p-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16 lg:items-center",
        className,
      )}
    >
      <div>
        <p className="font-display text-display font-bold text-text-1">{PRICE.amount}</p>
        <p className="mt-1 text-read text-text-2">{PRICE.per}</p>
        <div data-main-cta className="mt-8 max-w-[24rem]">
          <ButtonLink to="/scan" full>
            {PRIMARY_CTA}
          </ButtonLink>
        </div>
      </div>
      <div>
        <p className="max-w-[44ch] text-read text-text-1">{PRICE.terms}</p>
        <p className="mt-4 max-w-[44ch] text-read text-text-2">{ALSO_PLAN}</p>
        <SiteLink
          to="/pricing"
          className="press mt-4 inline-flex min-h-11 items-center gap-1.5 text-read font-semibold text-text-1 underline decoration-text-3 underline-offset-4 hover:decoration-text-1"
        >
          Your first 14 days, day by day
        </SiteLink>
      </div>
    </div>
  );
}

/** SITE-5: the compact card's one line about the plan (every part of it is on Pricing's list). */
const ALSO_PLAN =
  "Everything Kabsi does is in the one plan: replies, alerts, daily checks, holiday hours, posts and your reports.";

/** Trust: the four lines as a quiet row, not cards. */
export function TrustLines() {
  return (
    <ul className="mt-8 grid gap-x-10 gap-y-4 border-y border-line py-6 sm:grid-cols-2 lg:grid-cols-4">
      {TRUST.lines.map((l) => (
        <li key={l} className="flex gap-2.5 text-read font-semibold text-text-1">
          <Check className="mt-1 size-5 shrink-0 text-ok" aria-hidden />
          {l}
        </li>
      ))}
    </ul>
  );
}

/** The closing band of every public page: charcoal, the search box and the yellow button. */
export function ClosingBand({ under }: { under: string }) {
  return <ClosingDark title={CLOSING.title} under={under} />;
}

export function V31Home() {
  return (
    <>
      <HomeHero />
      <Problem />
      <TradeStrip className="bg-tint-warm" />
      <Week />
      <TellKabsi />
      <Starts />
      <Proof />
      <Band id="price" tone="warm">
        <Head id="price" title={PRICE.title} />
        <PriceCard className="mt-8" />
      </Band>
      <Band id="trust" tone="ivory" inner="py-10 sm:py-14 lg:py-16">
        <h2 id="trust-h" className="text-h2 text-balance">
          {TRUST.title}
        </h2>
        <TrustLines />
      </Band>
      <Band id="questions" tone="ivory" inner="pt-4 sm:pt-6 lg:pt-8">
        <Head id="questions" title="Questions." />
        <Faq items={HOME_FAQ.map((f) => ({ q: f.q, a: f.a }))} className="mt-8" />
      </Band>
      <ClosingBand under={HOME_HERO.under} />
    </>
  );
}
