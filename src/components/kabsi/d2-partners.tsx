// Partners: the programme page, its terms, a partner's own page and the report a partner shares.
import { Check, Gift, MessageCircle, QrCode as QrIcon, Video } from "lucide-react";
import { useState, type FormEvent } from "react";
import { WHATSAPP_ON, whatsappHref } from "@/lib/site";
import { Turnstile } from "@/components/turnstile";
import { ApiError, applyPartner, usePartnerPlaces, type PartnerKind } from "@/lib/public-api";
import { PLANS } from "./plans";
import { Img, PHOTOS } from "./photos";
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

const PARTNER_FAQ = [
  {
    q: "When do I get paid?",
    a: "On the 5th of each month, once at least $25 has cleared its 30-day hold, with a statement.",
  },
  { q: "How?", a: "USDT or USDC, or PayPal." },
  { q: "What do businesses I refer get?", a: "30 days of Pro free instead of 14, no card." },
  {
    q: "Can I see who joined?",
    a: "You see the trade and area. The name only if the owner says yes.",
  },
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

export function PartnersPage() {
  const places = usePartnerPlaces();
  return (
    <>
      <section className="container-kb grid items-center gap-10 pt-28 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-36">
        <div>
          <SectionHead
            as="h1"
            title="Earn 25% of every payment."
            lead="Recommend Kabsi to local business owners you know. You earn while the referred subscription stays paid. Everything runs on WhatsApp."
          />
          <ApplyButtons className="mt-8" />
        </div>
        <div className="overflow-hidden rounded-panel">
          <Img
            photo={PHOTOS.phoneTyping}
            sizes="(min-width: 1024px) 45vw, 100vw"
            priority
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      </section>

      <section aria-labelledby="p-steps" className="container-kb section-y">
        <SectionHead id="p-steps" title="How it works" />
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <Card className="h-full">
                <span className="grid size-10 place-items-center rounded-full border border-line-strong font-display text-title font-bold">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-h3">{s.title}</h3>
                <p className="mt-2 text-body text-text-2">{s.text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="p-gets" className="container-kb pb-20 lg:pb-28">
        <SectionHead id="p-gets" title="What partners get" />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {GETS.map(([Icon, t]) => (
            <li
              key={t}
              className="flex items-center gap-4 rounded-card border border-line bg-surface-1 p-5"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-surface-2">
                <Icon className="size-6" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="text-title">{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="p-earn" className="border-t border-line">
        <div className="container-kb section-y grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHead
              id="p-earn"
              title="What you could earn"
              lead="Pro is $39 a month. You earn 25% of every payment, while the referred subscription stays paid."
            />
          </div>
          <Earnings />
        </div>
      </section>

      <section aria-labelledby="p-suits" className="container-kb section-y">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHead id="p-suits" title="Who it suits" />
            <ul className="mt-8 divide-y divide-line border-y border-line">
              {SUITS.map((s) => (
                <li key={s} className="flex min-h-14 items-center gap-3 text-body">
                  <Check className="size-5 shrink-0 text-ok" strokeWidth={2.5} aria-hidden />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-h2">The rules</h2>
            <ol className="mt-8 space-y-4">
              {PARTNER_RULES.map((r, i) => (
                <li key={r} className="flex gap-4 text-body">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line-strong text-small font-bold">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-text-1">{r}</span>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-small">
              <ButtonLink to="/partners/terms" variant="tertiary" className="text-small">
                Read the partner terms
              </ButtonLink>
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="p-founding" className="container-kb pb-20 lg:pb-28">
        <div className="flex flex-col gap-4 rounded-panel border border-line-strong bg-surface-1 p-6 sm:flex-row sm:items-center sm:p-8">
          {places && (
            <div
              className="grid size-16 shrink-0 place-items-center rounded-full bg-surface-2 font-display text-h3 font-bold"
              aria-hidden
            >
              {places.founding_left}
            </div>
          )}
          <div className="flex-1">
            <h2 id="p-founding" className="text-h3">
              Founding Partners
            </h2>
            <p className="mt-2 text-body text-text-2">
              The first 20 partners get Kabsi Pro free for their own business and a monthly call
              with Rashid.{places ? ` ${places.founding_left} places left.` : ""}
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="p-faq" className="border-t border-line">
        <div className="container-kb section-y grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <SectionHead id="p-faq" title="Questions partners ask" />
          <Faq items={PARTNER_FAQ} />
        </div>
      </section>

      <section id="apply" className="scroll-mt-20 border-t border-line bg-band">
        <div className="container-kb section-y grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="max-w-[40rem] text-h2">Earn 25% of every payment.</h2>
            {WHATSAPP_ON && (
              <a
                href={whatsappHref("partner")}
                target="_blank"
                rel="noreferrer"
                className={`${buttonClass("secondary")} mt-8`}
              >
                Apply on WhatsApp
              </a>
            )}
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
