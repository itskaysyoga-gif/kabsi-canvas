// The core public pages on blueprint 3.1 (SITE-1, R-163): Home's nine sections, and the parts Pricing, How it works,
// FAQ, About and Security share. DESIGN.md tokens only; one key phrase of each light headline on the yellow bar (30.32
// item 3); one yellow button per screen (the free check). The chat pictures are drawn in Kabsi's own look (ivory and
// charcoal, the Kabsi mark), labelled Example, never a copy of another app's screens or logo. No photos, no carousel,
// no autoplay, no pop-up, no counters, testimonials or star ratings of Kabsi.
import { useState, type ReactNode } from "react";
import { Check, ImageIcon, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIMARY_CTA } from "@/lib/offer";
import { ScanBox } from "@/components/kabsi/scan-box";
import { Marked, YellowNumber } from "@/components/kabsi/highlight";
import { ButtonLink, ExampleBadge, Faq, KabsiMark, Segmented } from "@/components/kabsi/ui";
import {
  ALSO_INCLUDED,
  BENEFITS,
  BENEFITS_TITLE,
  CLOSING,
  EXAMPLE_BUSINESS,
  HERO_CHAT,
  HERO_EMAIL,
  HOME_FAQ,
  HOME_HERO,
  PRICE,
  PRICING,
  PROOF,
  START,
  TELL,
  TELL_CHIPS,
  TRUST,
  type ChatTurn,
} from "./v31-data";

/* ---------- Shared pieces ---------- */

/** One section: one headline, one idea, sized to fit a phone screen (blueprint 3, rules for the page). */
export function Sec({
  id,
  title,
  mark,
  line,
  children,
  tone = "page",
  split = false,
  className,
}: {
  id: string;
  title: string;
  mark?: string | undefined;
  line?: ReactNode;
  children?: ReactNode;
  tone?: "page" | "card";
  /** From 1024 px the headline sits on the left and the content on the right. */
  split?: boolean;
  className?: string | undefined;
}) {
  return (
    <section
      aria-labelledby={`${id}-h`}
      className={cn("border-t border-line", tone === "card" && "bg-surface-1", className)}
    >
      <div
        className={cn(
          "container-kb py-12 sm:py-20 lg:py-24",
          split && "lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16",
        )}
      >
        <div>
          <h2 id={`${id}-h`} className="max-w-[40rem] text-h2 text-balance">
            <Marked text={title} mark={mark} />
          </h2>
          {line ? <p className="mt-3 max-w-[38rem] text-lead text-text-2">{line}</p> : null}
        </div>
        {split ? <div className="lg:[&>*:first-child]:mt-0">{children}</div> : children}
      </div>
    </section>
  );
}

/** The page's H1 block for the inner pages: H1 with its phrase on the bar, the line, and the page's own content. */
export function PageTop({
  title,
  mark,
  line,
  children,
}: {
  title: string;
  mark: string;
  line: string;
  children?: ReactNode;
}) {
  return (
    <section aria-labelledby="page-h" data-hero className="relative z-10">
      <div className="container-kb pt-8 pb-10 sm:pt-14 sm:pb-16">
        <h1 id="page-h" className="max-w-[44rem] text-display text-balance">
          <Marked text={title} mark={mark} />
        </h1>
        <p className="mt-4 max-w-[38rem] text-lead text-text-2">{line}</p>
        {children}
      </div>
    </section>
  );
}

/** A tick list. */
export function Ticks({ items, className }: { items: readonly string[]; className?: string }) {
  return (
    <ul className={cn("space-y-2.5", className)}>
      {items.map((t) => (
        <li key={t} className="flex gap-3 text-body text-text-1">
          <Check className="mt-1 size-4.5 shrink-0 text-ok" aria-hidden />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

/** The free check box, the one action. `under` is the line under it. */
export function CheckBox({
  id,
  under,
  className,
}: {
  id: string;
  under: string;
  className?: string;
}) {
  return <ScanBox id={id} note={under} className={className} />;
}

/* ---------- The chat picture, in Kabsi's own look ---------- */

function Approve() {
  return (
    <span className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-full bg-kb-ink px-3.5 text-label font-bold text-kb-sand">
      <Check className="size-3.5" aria-hidden />
      Approve
    </span>
  );
}

function KabsiSays({ turn }: { turn: Extract<ChatTurn, { from: "kabsi" }> }) {
  return (
    <li className="flex items-end gap-2">
      <KabsiMark ring={false} className="size-6 shrink-0" />
      <div className="max-w-[86%] rounded-card rounded-es-sm border border-line bg-surface-1 px-3 py-2.5 text-small text-text-1">
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

function OwnerSays({ text, photo }: { text: string; photo?: boolean | undefined }) {
  return (
    <li className="ms-auto w-fit max-w-[80%] rounded-card rounded-ee-sm bg-kb-ink px-3 py-2.5 text-small text-kb-sand">
      {photo ? (
        <span className="mb-2 grid aspect-[4/3] w-36 place-items-center rounded-input bg-kb-carbon text-kb-mute">
          <ImageIcon className="size-6" aria-hidden />
          <span className="sr-only">A photo</span>
        </span>
      ) : null}
      {text}
    </li>
  );
}

/** A chat in a plain rounded card with the Kabsi mark: Example. */
export function ChatCard({
  turns,
  label,
  className,
}: {
  turns: ChatTurn[];
  label: string;
  className?: string;
}) {
  return (
    <figure
      className={cn(
        "rounded-panel border border-line bg-surface-2 p-3 shadow-rest sm:p-4",
        className,
      )}
    >
      <div className="flex items-center gap-2 px-1 pb-3">
        <KabsiMark ring={false} className="size-7" />
        <p className="flex-1 text-small font-bold text-text-1">Kabsi</p>
        <ExampleBadge className="text-text-2" />
      </div>
      <ol className="space-y-2.5" aria-label={label}>
        {turns.map((t, i) =>
          t.from === "owner" ? (
            <OwnerSays key={i} text={t.text} photo={t.photo} />
          ) : (
            <KabsiSays key={i} turn={t} />
          ),
        )}
      </ol>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}

function EmailCard() {
  return (
    <figure className="rounded-panel border border-line bg-surface-1 p-4 shadow-rest sm:p-5">
      <div className="flex items-center gap-2 border-b border-line pb-3">
        <KabsiMark ring={false} className="size-7" />
        <div className="min-w-0 flex-1">
          <p className="text-small font-bold text-text-1">Kabsi</p>
          <p className="truncate text-label text-text-2">{HERO_EMAIL.subject}</p>
        </div>
        <ExampleBadge className="text-text-2" />
      </div>
      <div className="pt-3 text-small text-text-1">
        <p className="font-bold">New 5-star review</p>
        <p className="mt-1 border-s-2 border-line-strong ps-2 text-text-2">{HERO_EMAIL.quote}</p>
        <p className="mt-2">Reply ready:</p>
        <p className="mt-0.5">{HERO_EMAIL.reply}</p>
        <Approve />
      </div>
      <figcaption className="sr-only">
        An Example email from Kabsi with a reply to approve
      </figcaption>
    </figure>
  );
}

/** The hero picture, with the WhatsApp and Email switch (blueprint 3.2). */
function HeroPicture() {
  const [via, setVia] = useState<"whatsapp" | "email">("whatsapp");
  return (
    <div className="w-full max-w-[24rem] lg:justify-self-end">
      <Segmented
        label="How Kabsi reaches you"
        value={via}
        onChange={setVia}
        options={[
          { value: "whatsapp", label: "WhatsApp" },
          { value: "email", label: "Email" },
        ]}
        className="mb-3"
      />
      {via === "whatsapp" ? (
        <ChatCard turns={HERO_CHAT} label={`Example chat with Kabsi for ${EXAMPLE_BUSINESS}`} />
      ) : (
        <EmailCard />
      )}
    </div>
  );
}

/* ---------- Home ---------- */

export function HomeHero() {
  return (
    <section aria-labelledby="hero-title" data-hero className="relative isolate z-10">
      <div className="container-kb grid gap-8 pt-6 pb-12 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center lg:gap-16 lg:pt-16 lg:pb-20">
        <div className="max-w-[40rem]">
          <h1 id="hero-title" className="text-display text-balance">
            <Marked text={HOME_HERO.title} mark={HOME_HERO.mark} />
          </h1>
          <p className="mt-4 max-w-[36rem] text-lead text-text-2 sm:mt-6">{HOME_HERO.line}</p>
          <CheckBox id="hero-scan" under={HOME_HERO.under} className="relative z-10 mt-5 sm:mt-7" />
        </div>
        <HeroPicture />
      </div>
    </section>
  );
}

function TellKabsi() {
  const [at, setAt] = useState(0);
  const chip = TELL_CHIPS[at] ?? TELL_CHIPS[0]!;
  return (
    <Sec id="tell" title={TELL.title} mark={TELL.mark} line={TELL.line} tone="card">
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_24rem] lg:gap-16">
        <div>
          <ul className="flex flex-wrap gap-2" aria-label="Example messages">
            {TELL_CHIPS.map((c, i) => (
              <li key={c.ask}>
                <button
                  type="button"
                  aria-pressed={i === at}
                  onClick={() => setAt(i)}
                  className={cn(
                    "press inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-small font-semibold",
                    i === at
                      ? "border-text-1 bg-text-1 text-surface-0"
                      : "border-line-strong bg-surface-1 text-text-1 hover:bg-surface-2",
                  )}
                >
                  {c.photo ? <ImageIcon className="size-4" aria-hidden /> : null}
                  {c.ask}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 inline-flex items-center gap-2 text-small text-text-2">
            <Mic className="size-4" aria-hidden />
            {TELL.voice}
          </p>
        </div>
        <div aria-live="polite">
          <ChatCard
            turns={[
              { from: "owner", text: chip.ask, photo: chip.photo },
              { from: "kabsi", lines: chip.answer, approve: chip.approve },
            ]}
            label={`Example: you send "${chip.ask}" and Kabsi answers`}
          />
        </div>
      </div>
    </Sec>
  );
}

export function BenefitCards() {
  return (
    <>
      <ul className="mt-6 grid gap-3 sm:grid-cols-3 sm:gap-5">
        {BENEFITS.map((b, i) => (
          <li key={b.title} className="rounded-card border border-line bg-surface-1 p-4 sm:p-6">
            <YellowNumber n={i + 1} />
            <h3 className="mt-3 text-title">{b.title}</h3>
            <p className="mt-1 text-small text-text-2">{b.text}</p>
          </li>
        ))}
      </ul>
      <p className="mt-5 max-w-[38rem] text-small text-text-2">{ALSO_INCLUDED}</p>
    </>
  );
}

export function StartSteps() {
  return (
    <>
      <ol className="mt-6 grid gap-5 sm:grid-cols-3">
        {START.steps.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <YellowNumber n={i + 1} />
            <div>
              <h3 className="text-title">{s.title}</h3>
              <p className="mt-0.5 text-small text-text-2">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-6 max-w-[38rem] rounded-card border border-line bg-surface-1 p-4 text-body font-semibold text-text-1">
        {START.firstDay}
      </p>
    </>
  );
}

export function ReportSample() {
  return (
    <figure className="mt-6 max-w-[34rem] rounded-panel border border-line bg-surface-1 p-4 shadow-rest sm:p-6">
      <div className="flex items-center gap-2">
        <KabsiMark ring={false} className="size-7" />
        <p className="flex-1 text-small font-bold text-text-1">
          {PROOF.month} · {EXAMPLE_BUSINESS}
        </p>
        <ExampleBadge className="text-text-2" />
      </div>
      <div className="mt-3 space-y-3">
        {PROOF.bands.map((b) => (
          <div key={b.name}>
            <p className="text-label font-bold text-text-2">{b.name}</p>
            <dl className="mt-1 divide-y divide-line border-y border-line">
              {b.rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-1.5 text-small">
                  <dt className="text-text-1">{k}</dt>
                  <dd className="font-bold text-text-1">{v}</dd>
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

/** The one price card (blueprint 3.7 and 4). `items` lists what is included on Pricing. */
export function PriceCard({ items, className }: { items?: readonly string[]; className?: string }) {
  return (
    <div
      className={cn(
        "max-w-[30rem] rounded-panel border border-line bg-surface-1 p-5 shadow-rest sm:p-7",
        className,
      )}
    >
      <p className="font-display text-h2 font-bold text-text-1">{PRICE.amount}</p>
      <p className="text-body text-text-2">{PRICE.per}</p>
      {items ? <Ticks items={items} className="mt-5" /> : null}
      <div data-main-cta className="mt-6">
        <ButtonLink to="/scan" full>
          {PRIMARY_CTA}
        </ButtonLink>
      </div>
      <p className="mt-3 text-small text-text-2">{PRICE.terms}</p>
    </div>
  );
}

export function TrustLines() {
  return (
    <ul className="mt-6 grid gap-3 sm:grid-cols-2">
      {TRUST.lines.map((l) => (
        <li
          key={l}
          className="flex items-center gap-3 rounded-card border border-line bg-surface-1 p-4 text-body font-semibold text-text-1"
        >
          <Check className="size-5 shrink-0 text-ok" aria-hidden />
          {l}
        </li>
      ))}
    </ul>
  );
}

export function ClosingBand({ under }: { under: string }) {
  return (
    <section aria-labelledby="closing-h" className="border-t border-line bg-surface-1">
      <div className="container-kb py-12 sm:py-20">
        <div className="mx-auto max-w-[40rem]">
          <h2 id="closing-h" className="text-h2">
            <Marked text={CLOSING.title} mark={CLOSING.mark} />
          </h2>
          <CheckBox id="closing-scan" under={under} className="mt-6" />
        </div>
      </div>
    </section>
  );
}

export function V31Home() {
  return (
    <>
      <HomeHero />
      <TellKabsi />
      <Sec id="does" title={BENEFITS_TITLE.title} mark={BENEFITS_TITLE.mark}>
        <BenefitCards />
      </Sec>
      <Sec id="starts" title={START.title} mark={START.mark} tone="card">
        <StartSteps />
      </Sec>
      <Sec split id="proof" title={PROOF.title} mark={PROOF.mark}>
        <ReportSample />
      </Sec>
      <Sec split id="price" title={PRICE.title} mark={PRICE.mark} tone="card">
        <PriceCard className="mt-6" />
      </Sec>
      <Sec split id="trust" title={TRUST.title} mark={TRUST.mark}>
        <TrustLines />
      </Sec>
      <Sec split id="questions" title="Questions." mark="Questions." tone="card">
        <Faq items={HOME_FAQ.map((f) => ({ q: f.q, a: f.a }))} className="mt-6 max-w-[44rem]" />
      </Sec>
      <ClosingBand under={HOME_HERO.under} />
    </>
  );
}

/* ---------- Pricing ---------- */

export function V31Pricing() {
  return (
    <>
      <PageTop title={PRICING.title} mark={PRICING.mark} line={PRICING.line}>
        <PriceCard items={PRICING.included} className="mt-8" />
      </PageTop>
      <Sec split id="not" title="What Kabsi does not do." mark="does not do.">
        <p className="mt-3 max-w-[38rem] text-lead text-text-2">{PRICING.notIncluded}</p>
        <p className="mt-4 max-w-[38rem] text-small text-text-2">{PRICING.free}</p>
      </Sec>
      <ClosingBand under={HOME_HERO.under} />
    </>
  );
}
