// Partners: the programme page, its terms, a partner's own page and the report a partner shares.
import {
  ArrowRight,
  Briefcase,
  Check,
  Globe,
  Nfc,
  Store,
  Users,
  Video,
} from "lucide-react";
import { PLAN_PRICES, WHATSAPP_ON } from "@/lib/site";
import { usePartnerPlaces } from "@/lib/public-api";
import { cn } from "@/lib/utils";
import { QrCode } from "./d2-parts";
import { SiteLink } from "./site-link";
import { PageHero, popCls, stagger } from "./page-hero";
import { PARTNERS_HERO } from "./hero-lines";
import { PARTNER_FAQ } from "./faq-data";
import { ButtonLink, ExampleBadge, Faq } from "./ui";
import { Marked, YellowLabel } from "@/components/kabsi/highlight";
import { PHOTOS } from "./photos";
import { SectionPhoto } from "./section-photo";

/* ---------- /partners ---------- */

// Partners 1 (lane R R-148, docs/COPY.md section 74) and Partners 3 (30.50 items 5 to 7, COPY.md section 83): the page
// speaks first to sellers of NFC and QR Google review cards. Order: the hero, how it works in three steps, the six kinds
// of partner, the money with an Example on the list price, the five rules, questions, the real count of Founding Partner
// places, one button. No change to the 25 percent, the trial lengths or when partner links pay.

/** True when card payments are open and partner links pay. Flip it, and the one launch-day line goes, with the Launch gate. */
const CARDS_OPEN = false;
/** The one line until card payments open. */
export const PAYING_LINE = "Partner links start paying on launch day.";

const STEPS = [
  {
    title: "Join in two minutes",
    text: "Sign in and answer five short questions. Your link and QR code are ready at once.",
  },
  {
    title: "Share your link or put it on your cards",
    text: "Each business gets a 30 day Kabsi trial instead of 14 days, with no card. Your kit has ready posts and a printable insert.",
  },
  {
    title: "Get paid every month",
    text: "25 percent of every payment, for as long as the business stays. Paid on the 5th.",
  },
];

/** The six kinds of partner (the six of the join form), one short card each: what is special for them. */
const KINDS: [typeof Nfc, string, string][] = [
  [
    Nfc,
    "Review card sellers",
    "Every card you sell comes with a 30 day trial. Kabsi answers the reviews whatever card they came from, and your kit has an A6 insert for the box.",
  ],
  [
    Globe,
    "Freelancers and small agencies",
    "Kabsi does the weekly Google routine for your clients, and each client approves every change. You earn while they stay.",
  ],
  [
    Video,
    "Creators",
    "Ready posts with the paid partnership label, and a link for your bio. Your audience starts with 30 days free.",
  ],
  [
    Briefcase,
    "Consultants and accountants",
    "Something useful to give a client: their Google profile taken care of, with their yes on every change.",
  ],
  [
    Store,
    "POS and booking resellers",
    "Offer it beside your system. Your customers start with 30 days of Pro free, through your link.",
  ],
  [
    Users,
    "Kabsi customers",
    "Already using Kabsi? Join to earn 25 percent instead of a free month for each business that pays.",
  ],
];

/** The money (facts 08): the rate, the hold, the payout and what earns nothing. */
const MONEY = [
  "Each commission waits 30 days, then clears.",
  "Paid on the 5th of each month, once 25 US dollars has cleared.",
  "USDT, USDC or PayPal, with a statement.",
  "Trials and your own business earn nothing.",
];

/** The example, on the list price (PLAN_PRICES), before tax. Labelled Example on the page; never a promise (facts 08). */
const RATE = 0.25;
const share = (monthly: number) => (monthly * RATE).toFixed(2);
const EXAMPLE_ROWS = [
  ["Essentials", PLAN_PRICES.essentialsMonthly],
  ["Pro", PLAN_PRICES.proMonthly],
] as const;

/** The five rules (master plan 29.5, in plain words). The partner terms are the full text. */
export const PARTNER_RULES = [
  "Say it is a paid partnership, every time.",
  "Never say Kabsi works with Google. Never promise rankings, reviews, calls, customers or that a review will be removed.",
  "Follow Google's review rules: never ask only happy customers, never reward a review, never fake one.",
  "No bulk or unsolicited messages, no ads on the Kabsi name, no coupon or cashback sites.",
  "Use only the claims in your kit. No fake accounts, and no earnings from your own business.",
];

/** Partners' hero visual (Partners 1): an Example review card and the Kabsi line that follows a new review. */
function ReviewCardVisual() {
  return (
    <figure className="relative mx-auto max-w-[22rem] pb-12">
      <div className="theme-dark rounded-panel bg-band p-6 text-text-1 shadow-float">
        <div className="flex items-center justify-between gap-3">
          <Nfc className="size-7" aria-hidden />
          <ExampleBadge />
        </div>
        <p className="mt-8 font-display text-h3 font-bold">Tap or scan to leave a review</p>
        <QrCode
          value="https://kabsi.co/partners"
          label="Example QR code, to kabsi.co/partners"
          className="mt-5 size-28 p-1"
        />
      </div>
      <div
        className={cn(
          "absolute -end-2 bottom-0 max-w-[15rem] rounded-card border border-line bg-surface-1 p-4 shadow-float sm:-end-8",
          popCls,
        )}
        style={stagger(0, 400)}
      >
        <p className="flex items-center gap-2 text-label font-bold text-text-2">
          <Check className="size-4 text-ok" strokeWidth={2.5} aria-hidden />
          Kabsi
        </p>
        <p className="mt-1 text-small font-semibold">
          New 5 star review. Reply ready for your yes.
        </p>
      </div>
      <figcaption className="sr-only">
        An Example review card with a QR code, and the Kabsi message that follows a new review: a
        reply ready for the owner&apos;s yes.
      </figcaption>
    </figure>
  );
}

export function PartnersPage() {
  const places = usePartnerPlaces();
  return (
    <>
      <PageHero
        mark="Kabsi answers them."
        hero={{
          ...PARTNERS_HERO,
          line: `${PARTNERS_HERO.line}${WHATSAPP_ON ? " Everything runs on WhatsApp." : ""}`,
        }}
        under={CARDS_OPEN ? null : PAYING_LINE}
        action={<JoinButton />}
        visual={<ReviewCardVisual />}
      />

      <section aria-labelledby="p-steps" className="border-t border-line bg-surface-1">
        <div className="container-kb section-y">
          <h2 id="p-steps" className="text-h2">
            <Marked text="How it works" mark="works" />
          </h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="border-t-2 border-text-1 pt-4">
                <YellowLabel>Step {i + 1}</YellowLabel>
                <h3 className="mt-2 text-title">{s.title}</h3>
                <p className="mt-1 text-body text-text-2">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="p-suits" className="border-t border-line">
        <div className="container-kb pt-18 lg:pt-30">
          <SectionPhoto photo={PHOTOS.salonTablet} />
        </div>
        <div className="container-kb pt-10 pb-18 lg:pb-30">
          <h2 id="p-suits" className="text-h2">
            <Marked text="Six kinds of partner" mark="partner" />
          </h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {KINDS.map(([Icon, t, line]) => (
              <li key={t} className="rounded-card border border-line bg-surface-1 p-6">
                <span className="grid size-11 place-items-center rounded-full bg-surface-2">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-title">{t}</h3>
                <p className="mt-1 text-body text-text-2">{line}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="p-money" className="theme-dark bg-band">
        <div className="container-kb section-y grid gap-8 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 id="p-money" className="text-h2">
              The money, <span className="text-phrase">in plain words.</span>
            </h2>
            <p className="mt-6 font-display text-display font-bold">25 percent</p>
            <p className="mt-2 max-w-[32rem] text-lead text-text-2">
              Of every payment a business you referred makes, for as long as it stays. Extra
              locations count too.
            </p>
            <ul className="mt-6 space-y-3">
              {MONEY.map((m) => (
                <li key={m} className="flex gap-3 rounded-card border border-line p-4 text-body">
                  <Check className="mt-1 size-5 shrink-0 text-ok" strokeWidth={2.5} aria-hidden />
                  {m}
                </li>
              ))}
            </ul>
          </div>
          <div className="self-start rounded-panel border border-line p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-h3">On the list price</h3>
              <ExampleBadge />
            </div>
            <dl className="mt-5 divide-y divide-line border-y border-line">
              {EXAMPLE_ROWS.map(([plan, price]) => (
                <div key={plan} className="flex flex-wrap items-baseline justify-between gap-2 py-4">
                  <dt className="text-body text-text-2">
                    A business on {plan} at ${price} a month
                  </dt>
                  <dd className="font-display text-title font-bold">
                    You earn ${share(price)} a month
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-small text-text-2">
              An example on the list price, before tax, after the 30 day hold and for as long as the
              business pays. It is not a promise of what you will earn.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="p-rules" className="border-t border-line">
        <div className="container-kb section-y grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <h2 id="p-rules" className="text-h2">
              <Marked text="The five rules" mark="rules" />
            </h2>
            <p className="mt-4 text-body text-text-2">
              Breaking a rule ends the partnership and its payments.
            </p>
            <p className="mt-4 text-small">
              <SiteLink
                to="/partners/terms"
                className="inline-flex min-h-11 items-center font-semibold text-text-1 underline underline-offset-4"
              >
                Read the partner terms
              </SiteLink>
            </p>
          </div>
          <ol className="space-y-3">
            {PARTNER_RULES.map((r, i) => (
              <li key={r} className="flex gap-4 rounded-card border border-line p-4 text-body">
                <span className="font-display font-bold text-text-2">{i + 1}</span>
                {r}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="p-faq" className="border-t border-line bg-surface-1">
        <div className="container-kb section-y grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <h2 id="p-faq" className="text-h2">
            <Marked text="Questions partners ask" mark="partners ask" />
          </h2>
          <div>
            <Faq items={PARTNER_FAQ} />
            <p className="mt-6 text-small text-text-2">
              Owners, start with the{" "}
              <SiteLink to="/pricing" className="font-semibold underline underline-offset-4">
                plans
              </SiteLink>
              .
            </p>
          </div>
        </div>
      </section>

      <section
        id="join"
        aria-labelledby="p-join"
        className="scroll-mt-20 theme-dark border-t border-line bg-band"
      >
        <div className="container-kb section-y grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 id="p-join" className="max-w-[40rem] text-h2">
              <Marked text="Earn 25% of every payment." mark="25% of every payment." />
            </h2>
            <p className="mt-4 max-w-[36rem] text-body text-text-2">
              The first 20 partners Kabsi reviews are Founding Partners: Kabsi Pro free for their
              own business and a monthly call with Rashid.
              <span data-qa-mask>{places ? ` ${places.founding_left} places left.` : ""}</span>
            </p>
            <SiteLink
              to="/scan"
              className="press mt-4 flex min-h-11 items-center gap-1.5 text-body font-semibold text-text-1 underline decoration-text-3 decoration-1 underline-offset-4 hover:decoration-text-1"
            >
              Run a free check for a business you know
              <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
            </SiteLink>
          </div>
          <div className="rounded-card border border-line p-5 sm:p-6">
            <p className="text-body">
              Sign in, answer five short questions, and your link and QR code are ready at once.
              Kabsi reviews each partner before their first payout.
            </p>
            <JoinButton className="mt-5" />
            <p className="mt-4 text-small text-text-2">
              Already a partner?{" "}
              <SiteLink
                to="/partner"
                className="font-bold text-text-1 underline underline-offset-4"
              >
                Open your partner home
              </SiteLink>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

/** Partners 2 (30.50 item 4): one way in, kabsi.co/partners/join. There is no application. */
function JoinButton({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row ${className ?? ""}`} data-main-cta>
      <ButtonLink to="/partners/join">Join in two minutes</ButtonLink>
    </div>
  );
}
