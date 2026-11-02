// Partners: the programme page, its terms, a partner's own page and the report a partner shares.
import { ArrowRight, Check, Gift, MessageCircle, QrCode as QrIcon, Video } from "lucide-react";
import { useState, type FormEvent } from "react";
import { WHATSAPP_ON, whatsappHref } from "@/lib/site";
import { Turnstile } from "@/components/turnstile";
import { ApiError, applyPartner, usePartnerPlaces, type PartnerKind } from "@/lib/public-api";
import { cn } from "@/lib/utils";
import { PLANS } from "./plans";
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
  buttonClass,
} from "./ui";

/* ---------- /partners ---------- */

const STEPS = [
  {
    title: WHATSAPP_ON ? "Apply on WhatsApp" : "Apply by email",
    text: "Send a message. Kabsi replies with the next step.",
  },
  {
    title: "Share your page or check a business for them",
    text: "Send your own page, or run the free check for a business you know.",
  },
  { title: "Get paid on the 5th of each month", text: "For every business that pays." },
];

const GETS: [typeof QrIcon, string][] = [
  [QrIcon, "Your own page and QR code"],
  [Gift, "Free checks to send to businesses you know"],
  [Video, "A kit of ready posts and a short video"],
  [MessageCircle, "A WhatsApp summary every Monday"],
];

const SUITS = [
  "Business setup consultants",
  "Accountants and bookkeepers",
  "Web and social media freelancers",
  "POS and booking resellers",
  "Business groups and coworking spaces",
  "Creators who speak to small business owners",
];

export const PARTNER_RULES = [
  "Say it is a paid partnership, every time.",
  "Never say Kabsi works with Google.",
  "Never promise rankings, reviews or customers.",
  "Never offer anything for reviews.",
  "No bulk or unsolicited messages.",
];

const PRO = PLANS.find((p) => p.id === "pro")!;

function Earnings() {
  const [n, setN] = useState(10);
  const amount = (n * PRO.monthly * 0.25).toFixed(2);
  return (
    <div className="rounded-panel border border-line bg-surface-1 p-6 sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <label htmlFor="refer-n" className="text-h3">
          Businesses you refer
        </label>
        <ExampleBadge />
      </div>
      <div className="mt-6 flex items-center gap-5">
        <input
          id="refer-n"
          type="range"
          min={1}
          max={30}
          value={n}
          onChange={(e) => setN(Number(e.target.value))}
          aria-describedby="refer-out"
          className="h-11 min-w-0 flex-1 cursor-pointer accent-kb-yellow"
        />
        <output
          htmlFor="refer-n"
          className="w-10 text-end font-display text-h3 font-bold tabular-nums"
        >
          {n}
        </output>
      </div>
      <p id="refer-out" aria-live="polite" className="mt-4 text-title">
        If {n} {n === 1 ? "business" : "businesses"} you refer pay{n === 1 ? "s" : ""} for Pro, you
        earn about <span className="whitespace-nowrap font-bold">${amount}</span> a month.
      </p>
    </div>
  );
}

/** Partners' hero visual (Design 8): an Example partner page with its QR code and 25% of one Pro plan a month. */
function PartnerCardVisual() {
  const share = (PRO.monthly * 0.25).toFixed(2);
  return (
    <figure className="relative mx-auto max-w-[22rem]">
      <div className="rounded-panel border border-line bg-surface-1 p-6 shadow-float">
        <div className="flex items-center justify-between gap-3">
          <p className="text-label font-bold text-text-2">Your partner page</p>
          <ExampleBadge />
        </div>
        <p className="mt-3 font-display text-h3 font-bold">Recommended by Sam, Kabsi Partner</p>
        <p className="mt-1 text-small text-text-2">kabsi.co/p/sam</p>
        <QrCode
          value="https://kabsi.co/partners"
          label="Example QR code, to kabsi.co/partners"
          className="mx-auto mt-5 size-36"
        />
        <p className="mt-4 text-small text-text-2">
          Sam is a Kabsi Partner and earns a share if you subscribe.
        </p>
      </div>
      <div
        className={cn(
          "absolute -end-2 -bottom-6 rounded-card bg-kb-black px-4 py-3 text-kb-white shadow-float sm:-end-8",
          popCls,
        )}
        style={stagger(0, 400)}
      >
        <p className="text-label text-kb-paper/80">For each Pro business</p>
        <p className="font-display text-h3 font-bold">${share} a month</p>
      </div>
      <figcaption className="sr-only">
        An Example partner page with a QR code, and 25% of a ${PRO.monthly} Pro plan: ${share} a
        month.
      </figcaption>
    </figure>
  );
}

export function PartnersPage() {
  const places = usePartnerPlaces();
  return (
    <>
      <PageHero
        hero={{
          ...PARTNERS_HERO,
          line: `${PARTNERS_HERO.line}${WHATSAPP_ON ? " Everything runs on WhatsApp." : ""}`,
        }}
        under={`Pro is $${PRO.monthly} a month. You earn 25% of every payment, while the referred subscription stays paid.`}
        action={<ApplyButtons />}
        visual={<PartnerCardVisual />}
      />

      <section aria-labelledby="p-steps" className="border-t border-line bg-surface-1">
        <div className="container-kb section-y">
          <h2 id="p-steps" className="text-h2">
            How it works
          </h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="border-t-2 border-text-1 pt-4">
                <p className="text-label font-bold text-text-2">Step {i + 1}</p>
                <h3 className="mt-1 text-title">{s.title}</h3>
                <p className="mt-1 text-body text-text-2">{s.text}</p>
              </li>
            ))}
          </ol>
          <h3 className="sr-only">What partners get</h3>
          <ul className="mt-12 grid gap-3 sm:grid-cols-2">
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

      <section aria-labelledby="p-suits" className="border-t border-line">
        <div className="container-kb section-y grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 id="p-suits" className="text-h2">
              Who it suits
            </h2>
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {SUITS.map((s) => (
                <li key={s} className="flex min-h-13 items-center gap-3 text-body">
                  <Check className="size-5 shrink-0 text-ok" strokeWidth={2.5} aria-hidden />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <Earnings />
        </div>
      </section>

      <section aria-labelledby="p-rules" className="theme-dark bg-band">
        <div className="container-kb section-y grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <h2 id="p-rules" className="text-h2">
              The rules
            </h2>
            <p className="mt-4 text-body text-text-2">
              Founding Partners: the first 20 partners get Kabsi Pro free for their own business and
              a monthly call with Rashid.{places ? ` ${places.founding_left} places left.` : ""}
            </p>
            <p className="mt-4 text-small">
              <SiteLink
                to="/partners/terms"
                className="font-semibold text-text-1 underline underline-offset-4"
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
            Questions partners ask
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
              Earn 25% of every payment.
            </h2>
            <p className="mt-4 text-body text-text-2">Kabsi Partners opens at launch.</p>
            {WHATSAPP_ON && (
              <a
                href={whatsappHref("partner")}
                target="_blank"
                rel="noreferrer"
                className={`${buttonClass("secondary")} mt-6`}
              >
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
  const [token, setToken] = useState("");
  const [round, setRound] = useState(0);
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
    const t = token;
    setToken("");
    setRound((n) => n + 1);
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
    <form onSubmit={(e) => void submit(e)} noValidate className="space-y-5">
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
      <Turnstile key={round} onToken={setToken} />
      {failure && <Banner tone="bad" title={failure} />}
      <Button type="submit" variant="secondary" loading={state === "sending"} full>
        Apply by email
      </Button>
    </form>
  );
}
