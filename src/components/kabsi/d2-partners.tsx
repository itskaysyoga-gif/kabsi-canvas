// Partners: the programme page, its terms, a partner's own page and the report a partner shares.
import {
  ArrowRight,
  Check,
  Gift,
  Globe,
  MessageCircle,
  Nfc,
  QrCode as QrIcon,
  Video,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { WHATSAPP_ON, whatsappHref } from "@/lib/site";
import { useLazyTurnstile } from "@/components/turnstile";
import { ApiError, applyPartner, usePartnerPlaces, type PartnerKind } from "@/lib/public-api";
import { cn } from "@/lib/utils";
import { QrCode } from "./d2-parts";
import { SiteLink } from "./site-link";
import { PageHero, popCls, stagger } from "./page-hero";
import { PARTNERS_HERO } from "./hero-lines";
import { PARTNER_FAQ } from "./faq-data";
import {
  Banner,
  Button,
  ButtonLink,
  Card,
  ExampleBadge,
  Faq,
  Field,
  SectionHead,
  WhatsAppGlyph,
  buttonClass,
} from "./ui";
import { Marked, YellowLabel } from "@/components/kabsi/highlight";
import { PHOTOS } from "./photos";
import { SectionPhoto } from "./section-photo";

/* ---------- /partners ---------- */

// Partners 1 (lane R R-148, docs/COPY.md section 74): the page speaks first to sellers of NFC and QR Google review cards,
// then to local web and social media freelancers. No change to the 25 percent, the trial lengths or when links switch on.

const STEPS = [
  {
    title: "Apply now",
    text: "Fill in the form or send a message. Kabsi replies with the next step.",
  },
  {
    title: "Add your link to every card you sell",
    text: "Each business gets a 30 day Kabsi trial instead of 14 days, with no card.",
  },
  {
    title: "Get paid on the 5th of each month",
    text: "25 percent of every payment, for as long as the business stays.",
  },
];

const GETS: [typeof QrIcon, string][] = [
  [QrIcon, "Your own link and QR code"],
  [Gift, "Free checks to send to businesses you know"],
  [Video, "A kit of ready posts and a short video"],
  [MessageCircle, "A WhatsApp summary every Monday"],
];

/** Who it is for: the first segment (R-148 item 1), then the rest of the earlier list. */
const FIRST: [typeof QrIcon, string, string][] = [
  [
    Nfc,
    "Sellers of NFC and QR review cards",
    "Your customers already want reviews. Kabsi answers each one.",
  ],
  [Globe, "Web and social media freelancers", "You already look after how they look online."],
];

const ALSO = [
  "Business setup consultants",
  "Accountants and bookkeepers",
  "POS and booking resellers",
  "Business groups and coworking spaces",
  "Creators who speak to small business owners",
];

/** The money (facts 08): the rate, the hold, the payout and what earns nothing. No amounts per partner. */
const MONEY = [
  "Each commission waits 30 days, then clears.",
  "Paid on the 5th of each month, once 25 US dollars has cleared.",
  "USDT, USDC or PayPal, with a statement.",
  "Trials and your own business earn nothing.",
];

export const PARTNER_RULES = [
  "Say it is a paid partnership, every time.",
  "Never say Kabsi works with Google.",
  "Never promise rankings, reviews or customers.",
  "Follow Google's review rules: never ask only happy customers, never reward a review, never fake one.",
  "No bulk or unsolicited messages.",
  "Breaking a rule ends the partnership and its payments.",
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
        under="You earn 25 percent of every payment, for as long as the business stays. Applications are open now."
        action={<ApplyButtons />}
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
          <p className="mt-8 max-w-[40rem] text-body text-text-2">
            Partner links switch on when card payments open. The first 20 approved partners are
            Founding Partners.
          </p>
          <h3 className="mt-12 text-h3">What partners get</h3>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {GETS.map(([Icon, t]) => (
              <li
                key={t}
                className="flex items-center gap-4 rounded-card border border-line bg-surface-0 p-4"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="text-body font-semibold">{t}</span>
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
          </div>
          <ul className="space-y-3 self-end">
            {MONEY.map((m) => (
              <li key={m} className="flex gap-3 rounded-card border border-line p-4 text-body">
                <Check className="mt-1 size-5 shrink-0 text-ok" strokeWidth={2.5} aria-hidden />
                {m}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="p-suits" className="border-t border-line">
        <div className="container-kb pt-18 lg:pt-30">
          <SectionPhoto photo={PHOTOS.salonTablet} />
        </div>
        <div className="container-kb pt-10 pb-18 lg:pb-30">
          <h2 id="p-suits" className="text-h2">
            <Marked text="Who it is for" mark="is for" />
          </h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {FIRST.map(([Icon, t, line]) => (
              <li key={t} className="rounded-card border border-line bg-surface-1 p-6">
                <span className="grid size-11 place-items-center rounded-full bg-surface-2">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-title">{t}</h3>
                <p className="mt-1 text-body text-text-2">{line}</p>
              </li>
            ))}
          </ul>
          <h3 className="mt-10 text-title">Also a good fit</h3>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {ALSO.map((s) => (
              <li key={s} className="flex min-h-13 items-center gap-3 text-body">
                <Check className="size-5 shrink-0 text-ok" strokeWidth={2.5} aria-hidden />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="p-rules" className="theme-dark bg-band">
        <div className="container-kb section-y grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <h2 id="p-rules" className="text-h2">
              The rules
            </h2>
            <p className="mt-4 text-body text-text-2">
              The first 20 approved partners are Founding Partners: Kabsi Pro free for their own
              business and a monthly call with Rashid.
              <span data-qa-mask>{places ? ` ${places.founding_left} places left.` : ""}</span>
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

      <section aria-labelledby="p-faq" className="border-t border-line">
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
        id="apply"
        aria-labelledby="p-apply"
        className="scroll-mt-20 border-t border-line bg-surface-1"
      >
        <div className="container-kb section-y grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 id="p-apply" className="max-w-[40rem] text-h2">
              <Marked text="Earn 25% of every payment." mark="25% of every payment." />
            </h2>
            <p className="mt-4 text-body text-text-2">
              Kabsi Partners opens when card payments open.
            </p>
            {WHATSAPP_ON && (
              <a
                href={whatsappHref("partner")}
                target="_blank"
                rel="noreferrer"
                className={`${buttonClass("secondary")} mt-6`}
              >
                <WhatsAppGlyph className="size-5" />
                Apply on WhatsApp
              </a>
            )}
            <SiteLink
              to="/scan"
              className="press mt-4 flex min-h-11 items-center gap-1.5 text-body font-semibold text-text-1 underline decoration-text-3 decoration-1 underline-offset-4 hover:decoration-text-1"
            >
              Run a free check for a business you know
              <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
            </SiteLink>
          </div>
          <ApplyForm />
        </div>
      </section>
    </>
  );
}

/** The two ways in: WhatsApp while Kabsi has a number, and the form at the foot of the page. */
function ApplyButtons({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row ${className ?? ""}`} data-main-cta>
      {WHATSAPP_ON && (
        <a
          href={whatsappHref("partner")}
          target="_blank"
          rel="noreferrer"
          className={buttonClass("primary")}
        >
          <WhatsAppGlyph className="size-5" />
          Apply on WhatsApp
        </a>
      )}
      <a href="#apply" className={buttonClass(WHATSAPP_ON ? "secondary" : "primary")}>
        Apply by email
      </a>
    </div>
  );
}

const KINDS: [string, PartnerKind][] = [
  // Partners 1 (R-148): the first segment. Stored as a reseller, so the application function needs no change.
  ["Seller of NFC or QR review cards", "reseller"],
  ["Business setup consultant", "agency"],
  ["Accountant or bookkeeper", "accountant"],
  ["Web or social media freelancer", "agency"],
  ["POS or booking reseller", "reseller"],
  ["Business group or coworking space", "business_group"],
  ["Creator who speaks to small business owners", "creator"],
  ["Something else", "other"],
];

/** "Apply by email": the application goes to POST programs/partners (Partners session); Rashid answers by email. */
function ApplyForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<"name" | "email" | "kind" | "terms", string>>
  >({});
  // The bot check loads on the form's first touch, not at page start (Fix 1); Apply waits for its token.
  const check = useLazyTurnstile();
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [failure, setFailure] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const err: typeof errors = {};
    if (name.trim().length < 2) err.name = "Please write your name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()))
      err.email = "Please write an email address we can reach you at.";
    if (!kind) err.kind = "Please choose what you do.";
    if (!terms) err.terms = "Please read and agree to the partner terms.";
    setErrors(err);
    setFailure(null);
    if (Object.keys(err).length) return;
    setState("sending");
    const t = await check.take();
    if (!t) {
      setState("idle");
      return;
    }
    try {
      await applyPartner({
        name: name.trim(),
        email: email.trim(),
        kind: KINDS.find(([l]) => l === kind)![1],
        terms: true,
        turnstile: t,
      });
      setState("sent");
    } catch (x) {
      const f = x instanceof ApiError ? x.field : undefined;
      const message =
        x instanceof Error ? x.message : "Something went wrong. Please try again in a minute.";
      if (f === "name" || f === "email" || f === "kind" || f === "terms")
        setErrors({ [f]: message });
      else setFailure(message);
      setState("idle");
    }
  };
  if (state === "sent")
    return (
      <Banner tone="ok" title="Application sent.">
        Kabsi replies with the next step.
      </Banner>
    );
  return (
    <form ref={check.area} onSubmit={(e) => void submit(e)} noValidate className="space-y-5">
      <Field
        label="Your name"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name ?? null}
      />
      <Field
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email ?? null}
      />
      <div>
        <label htmlFor="partner-kind" className="mb-2 block text-small font-bold text-text-1">
          Who it suits
        </label>
        <select
          id="partner-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          aria-invalid={errors.kind ? true : undefined}
          aria-describedby={errors.kind ? "partner-kind-err" : undefined}
          className={`h-13 w-full rounded-input border bg-surface-2 px-4 text-body text-text-1 ${errors.kind ? "border-bad ring-1 ring-bad" : "border-stroke"}`}
        >
          <option value="">Choose one</option>
          {KINDS.map(([l]) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        {errors.kind && (
          <p id="partner-kind-err" className="mt-2 text-small font-semibold text-bad">
            {errors.kind}
          </p>
        )}
      </div>
      <div>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-body text-text-1">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            aria-invalid={errors.terms ? true : undefined}
            className="mt-1 size-5 shrink-0 accent-kb-green"
          />
          <span>
            I agree to the{" "}
            <ButtonLink to="/partners/terms" variant="tertiary" className="inline min-h-0 p-0">
              partner terms
            </ButtonLink>
            .
          </span>
        </label>
        {errors.terms && (
          <p className="mt-1 ms-8 text-small font-semibold text-bad">{errors.terms}</p>
        )}
      </div>
      {check.widget}
      {failure && <Banner tone="bad" title={failure} />}
      <Button type="submit" variant="secondary" loading={state === "sending"} full>
        Apply by email
      </Button>
    </form>
  );
}
