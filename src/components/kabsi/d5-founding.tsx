// Founding 25 (master plan 30.17 section 1, COPY.md "Founding 25"): the banner on Home, Pricing and every industry
// page, and /founding with the application. The count of places left is the real one (GET programs/founding); while it
// has not loaded, or did not load, no number shows. The application posts to programs/founding (Partners session).
import { CheckCircle2, Sparkles } from "lucide-react";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useLazyTurnstile } from "@/components/turnstile";
import {
  ApiError,
  FOUNDING_CONSENT,
  applyFounding,
  useFoundingPlaces,
  type FoundingApplication,
  type FoundingPlaces,
  type FoundingTrade,
} from "@/lib/public-api";
import { getConsent, onConsentChange } from "@/lib/consent";
import { useFlagState } from "./d2-parts";
import { PageHero, popCls, stagger } from "./page-hero";
import { FOUNDING_HERO } from "./hero-lines";
import { FOUNDING_FAQ } from "./faq-data";
import { FOUNDER } from "./photos";
import { FOUNDING25_TOTAL } from "./founding-total";
import { Banner, Button, ButtonLink, Faq, Field, Segmented, StatusPill } from "./ui";

export { FOUNDING25_TOTAL };
export const FOUNDING25_LINE =
  "Founding 25: three months of Kabsi Pro, free, for 25 businesses. Kabsi does the Google work; you tell Rashid what to make better.";
export const FOUNDING25_UNDER =
  "By application. No card. After 90 days, choose a plan or stop, nothing is charged by itself.";

/** The banner, the same on every page that carries it. Its button is never the page's yellow one. */
export function FoundingBanner({ className }: { className?: string | undefined }) {
  const places = useFoundingPlaces();
  const left = places?.left ?? null;
  return (
    <section aria-label="Founding 25" className={cn("container-kb", className)}>
      <div className="grid gap-5 rounded-panel border border-line-strong bg-surface-1 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-12">
        <div>
          <p className="flex items-center gap-2 text-label font-bold text-text-2">
            <Sparkles className="size-4" aria-hidden />
            Founding 25
          </p>
          <p className="mt-3 max-w-[40rem] font-display text-h3 font-semibold text-text-1">
            Three months of Kabsi Pro, free, for 25 businesses. Kabsi does the Google work; you tell
            Rashid what to make better.
          </p>
          <p className="mt-3 text-small text-text-2">{FOUNDING25_UNDER}</p>
        </div>
        <div className="flex flex-col gap-3 lg:items-end">
          {left === 0 ? (
            <p className="text-body font-bold">All 25 places are taken.</p>
          ) : (
            <>
              {left !== null && (
                <p className="text-body font-bold">
                  {left} of {places?.total ?? FOUNDING25_TOTAL} places left.
                </p>
              )}
              <ButtonLink to="/founding" variant="secondary">
                Apply for a place
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- /founding ---------- */

const STATES = ["open", "sent", "reviewing", "accepted", "waitlist", "full"] as const;
type State = (typeof STATES)[number];

const WHO = [
  "A verified Google profile with at least 10 reviews",
  "A place customers visit: a salon, a restaurant, a clinic, a garage",
  "The owner on WhatsApp, in the UAE, the UK or the US",
  "A 2-minute check-in every two weeks",
];

const GET = [
  "Kabsi Pro free for 90 days, from the day Google access works. No card.",
  "Rashid, the founder, helps you start: old reviews with no reply, wrong details, missing links.",
  "Then the founding price if you choose a plan: $19 or $39 a month, kept while your subscription stays paid.",
];

const GIVE = [
  "Honest feedback in a short check-in every two weeks.",
  "A case study, named or anonymous, in your words. You approve the final text.",
];

/** The four groups of the 25 places (facts 4.1); the places left come from GET programs/founding. */
const MIX: { group: string; trade: FoundingTrade; cap: number }[] = [
  { group: "Beauty and hair", trade: "beauty_hair", cap: 10 },
  { group: "Food and drink", trade: "food", cap: 5 },
  { group: "Health", trade: "health", cap: 5 },
  { group: "Other trades", trade: "other", cap: 5 },
];

/** Each kind of business, and the group of the 25 places it counts in (programs.ts FOUNDING_TRADES). */
const TRADES: [string, FoundingTrade][] = [
  ["Hair salon", "beauty_hair"],
  ["Barbershop", "beauty_hair"],
  ["Nail or beauty salon", "beauty_hair"],
  ["Spa or massage", "beauty_hair"],
  ["Restaurant", "food"],
  ["Cafe", "food"],
  ["Bakery", "food"],
  ["Dental clinic", "health"],
  ["Medical or aesthetic clinic", "health"],
  ["Physiotherapy", "health"],
  ["Auto repair", "other"],
  ["Gym or fitness studio", "other"],
  ["Hotel", "other"],
  ["Home services", "other"],
  ["Something else", "other"],
];
/** The three countries Founding 25 is open to, each with an example number for the WhatsApp field (Design 8). */
const COUNTRIES: { label: string; code: FoundingApplication["country"]; example: string }[] = [
  { label: "United Arab Emirates", code: "AE", example: "+971 50 123 4567" },
  { label: "United Kingdom", code: "GB", example: "+44 7700 900123" },
  { label: "United States", code: "US", example: "+1 202 555 0143" },
];
const DEFAULT_EXAMPLE = "+44 7700 900123";

/** The visitor's country, from /api/geo through the privacy banner's one read (consent.ts); null until it is known. */
function useVisitorCountry(): string | null {
  const [country, setCountry] = useState<string | null>(null);
  useEffect(() => {
    setCountry(getConsent().country);
    return onConsentChange((c) => setCountry(c.country));
  }, []);
  return country;
}

export function FoundingPage() {
  const [flagged, setState] = useFlagState<State>("open", STATES);
  const places = useFoundingPlaces();
  // All 25 taken: the form gives way to the "full" state (the server refuses past 25 in any case).
  const state: State = places?.left === 0 && flagged === "open" ? "full" : flagged;
  return (
    <>
      <PageHero
        hero={FOUNDING_HERO}
        under={FOUNDING25_UNDER}
        action={
          places?.left === 0 ? null : (
            <ButtonLink to="/founding" hash="apply">
              {FOUNDING_HERO.action}
            </ButtonLink>
          )
        }
        visual={<PlacesVisual places={places} />}
      >
        {/* The real count only (lane R decision 2): nothing while it is unknown. */}
        {places && (
          <p className="mt-4 text-body font-bold" data-qa-mask>
            {places.left > 0
              ? `${places.left} of ${places.total} places left.`
              : "All 25 places are taken."}
          </p>
        )}
      </PageHero>

      <section
        aria-label="Who, what and what Kabsi asks"
        className="border-t border-line bg-surface-1"
      >
        <div className="container-kb section-y grid gap-10 lg:grid-cols-3 lg:gap-12">
          <List title="Who can apply" items={WHO} />
          <List title="What you get" items={GET} />
          <List title="What Kabsi asks" items={GIVE} />
        </div>
      </section>

      <section
        id="apply"
        aria-labelledby="founding-form-h"
        className="scroll-mt-20 border-t border-line"
      >
        <div className="container-kb section-y max-w-3xl">
          {state === "open" && <Application onSent={() => setState("sent")} />}
          {state !== "open" && <Outcome state={state} />}
        </div>
      </section>

      <section aria-labelledby="founding-faq" className="border-t border-line bg-surface-1">
        <div className="container-kb section-y grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <h2 id="founding-faq" className="text-h2">
            Questions about Founding 25
          </h2>
          <Faq items={FOUNDING_FAQ} />
        </div>
      </section>
    </>
  );
}

/** The 25 places by group as rings, with Rashid. A ring fills only for a place the real count says is taken. */
function PlacesVisual({ places }: { places: FoundingPlaces | null }) {
  let n = 0;
  return (
    <figure className="theme-dark relative rounded-panel bg-band p-5 text-text-1 shadow-float sm:p-7">
      <div className="flex items-center gap-3">
        <img
          src={FOUNDER.small}
          width={FOUNDER.w}
          height={FOUNDER.h}
          alt=""
          decoding="async"
          className="size-12 shrink-0 rounded-full object-cover"
        />
        <p className="text-small text-text-2">
          Rashid Abou Hamzy, founder of Kabsi, reads every application himself.
        </p>
      </div>
      <ul className="mt-6 space-y-4" data-qa-mask>
        {MIX.map((m) => {
          const t = places?.by_trade[m.trade];
          const cap = t?.cap ?? m.cap;
          const taken = t ? Math.min(cap, t.taken) : 0;
          return (
            <li key={m.group}>
              <p className="flex items-baseline justify-between gap-3 text-small">
                <span className="font-bold">{m.group}</span>
                <span className="text-text-2">
                  {t ? `${Math.max(0, cap - taken)} of ${cap} left` : `${cap} places`}
                </span>
              </p>
              <p className="mt-2 flex flex-wrap gap-1.5" aria-hidden>
                {Array.from({ length: cap }, (_, k) => ({ i: n++, full: k < taken })).map((r) => (
                  <span
                    key={r.i}
                    className={cn(
                      "size-5 rounded-full border-2 border-kb-paper/70",
                      r.full && "bg-kb-paper/70",
                      popCls,
                    )}
                    style={stagger(r.i, 200, 30)}
                  />
                ))}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="mt-5 text-label text-text-2">
        A place still open after 30 days goes to the next good applicant of any trade.
      </p>
      <figcaption className="sr-only">
        The 25 Founding places: 10 for beauty and hair, 5 for food and drink, 5 for health and 5 for
        other trades.
      </figcaption>
    </figure>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2 className="text-h3">{title}</h2>
      <ul className="mt-5 space-y-3">
        {items.map((i) => (
          <li key={i} className="flex gap-3 text-body text-text-2">
            <CheckCircle2 className="mt-1 size-4 shrink-0 text-ok" aria-hidden />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Select({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-small font-bold text-text-1">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={cn(
          "h-13 w-full rounded-input border bg-surface-2 px-4 text-body text-text-1",
          error ? "border-bad ring-1 ring-bad" : "border-stroke",
        )}
      >
        <option value="">Choose one</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      {error && (
        <p id={`${id}-err`} className="mt-2 text-small font-semibold text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

function Tick({
  checked,
  onChange,
  error,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string | null;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 text-body">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          className="mt-1 size-5 shrink-0 accent-kb-green"
        />
        <span className="text-text-1">{children}</span>
      </label>
      {error && (
        <p id={`${id}-err`} className="mt-1 ms-8 text-small font-semibold text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

type Errors = Partial<
  Record<"business" | "country" | "trade" | "phone" | "why" | "checkIn", string>
>;

function Application({ onSent }: { onSent: () => void }) {
  const [f, setF] = useState({
    business: "",
    country: "",
    trade: "",
    phone: "",
    why: "",
    // UX 1: the owner picks named or anonymous here; anonymous unless they choose named.
    caseStudy: "anonymous" as "anonymous" | "named",
    checkIn: false,
  });
  // The visitor's country preselects the field and picks the example number (lane R decision 4).
  const geo = useVisitorCountry();
  useEffect(() => {
    const c = COUNTRIES.find((x) => x.code === geo);
    if (c) setF((x) => (x.country ? x : { ...x, country: c.label }));
  }, [geo]);
  const example = COUNTRIES.find((c) => c.label === f.country)?.example ?? DEFAULT_EXAMPLE;
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const whyId = useId();
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };
  // The bot check loads on the form's first touch, not at page start (Fix 1); Send waits for its token.
  const check = useLazyTurnstile();
  const [failure, setFailure] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const err: Errors = {};
    if (!f.business.trim()) err.business = "Type your business name as it shows on Google.";
    if (!f.country) err.country = "Choose the country your business is in.";
    if (!f.trade) err.trade = "Choose the kind of business.";
    if (f.phone.replace(/\D/g, "").length < 8)
      err.phone = "Type your WhatsApp number with its country code.";
    if (f.why.trim().length < 10) err.why = "Please tell us in a line or two why now.";
    if (!f.checkIn)
      err.checkIn = "Founding places come with the check-ins and a case study. Tick to agree.";
    setErrors(err);
    setFailure(null);
    if (Object.values(err).some(Boolean)) return;
    setSending(true);
    const t = await check.take();
    if (!t) {
      setSending(false);
      return;
    }
    try {
      await applyFounding({
        business_name: f.business.trim(),
        country: COUNTRIES.find((c) => c.label === f.country)!.code,
        trade: TRADES.find(([l]) => l === f.trade)![1],
        business_kind: f.trade,
        whatsapp: f.phone.trim(),
        why_now: f.why.trim(),
        case_study: f.caseStudy,
        checkin_consent: true,
        turnstile: t,
      });
      onSent();
    } catch (x) {
      const map: Record<string, keyof Errors> = {
        business_name: "business",
        country: "country",
        trade: "trade",
        business_kind: "trade",
        whatsapp: "phone",
        why_now: "why",
        checkin_consent: "checkIn",
      };
      const field = x instanceof ApiError && x.field ? map[x.field] : undefined;
      const message =
        x instanceof Error ? x.message : "Something went wrong. Please try again in a minute.";
      if (field) setErrors({ [field]: message });
      else setFailure(message);
    }
    setSending(false);
  };
  return (
    <form ref={check.area} onSubmit={(e) => void submit(e)} noValidate className="space-y-5">
      <h2 id="founding-form-h" className="text-h2">
        Apply for a place
      </h2>
      <p className="text-body text-text-2">Two minutes. Rashid answers within 2 working days.</p>
      <Field
        label="Business name"
        value={f.business}
        onChange={(e) => set("business", e.target.value)}
        error={errors.business || null}
        autoComplete="organization"
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Country"
          options={COUNTRIES.map((c) => c.label)}
          value={f.country}
          onChange={(v) => set("country", v)}
          error={errors.country || null}
        />
        <Select
          label="Kind of business"
          options={TRADES.map(([l]) => l)}
          value={f.trade}
          onChange={(v) => set("trade", v)}
          error={errors.trade || null}
        />
      </div>
      <Field
        label="WhatsApp number"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder={example}
        hint={`With the country code, for example ${example}.`}
        value={f.phone}
        onChange={(e) => set("phone", e.target.value)}
        error={errors.phone || null}
      />
      <div>
        <label htmlFor={whyId} className="mb-2 block text-small font-bold text-text-1">
          Why now?
        </label>
        <textarea
          id={whyId}
          rows={4}
          value={f.why}
          onChange={(e) => set("why", e.target.value)}
          placeholder="What takes your time on Google today?"
          aria-invalid={errors.why ? true : undefined}
          aria-describedby={errors.why ? `${whyId}-err` : undefined}
          className={cn(
            "w-full rounded-input border bg-surface-2 p-4 text-body text-text-1 placeholder:text-text-3",
            errors.why ? "border-bad ring-1 ring-bad" : "border-stroke",
          )}
        />
        {errors.why && (
          <p id={`${whyId}-err`} className="mt-2 text-small font-semibold text-bad">
            {errors.why}
          </p>
        )}
      </div>
      <div>
        <p aria-hidden className="mb-2 text-small font-bold text-text-1">
          Named or anonymous case study
        </p>
        <Segmented
          label="Named or anonymous case study"
          value={f.caseStudy}
          onChange={(v) =>
            // The tick agrees to the words shown for one choice: a new choice needs a new tick.
            setF((x) => ({ ...x, caseStudy: v, checkIn: false }))
          }
          options={[
            { value: "anonymous", label: "Anonymous" },
            { value: "named", label: "Named" },
          ]}
        />
      </div>
      {/* One tick with the exact words the server stores as proof (programs.ts FOUNDING_CONSENT), for the choice above. */}
      <Tick checked={f.checkIn} onChange={(v) => set("checkIn", v)} error={errors.checkIn || null}>
        {FOUNDING_CONSENT[f.caseStudy]}
      </Tick>
      {check.widget}
      {failure && <Banner tone="bad" title={failure} />}
      <Button type="submit" loading={sending} full>
        Send my application
      </Button>
      <p className="text-small text-text-2">{FOUNDING25_UNDER}</p>
    </form>
  );
}

function Outcome({ state }: { state: Exclude<State, "open"> }) {
  if (state === "sent")
    return (
      <Box pill={<StatusPill tone="ok">Sent</StatusPill>} title="Application sent.">
        Rashid reads every application and answers within 2 working days. Nothing changes on your
        Google profile until you say yes.
      </Box>
    );
  if (state === "reviewing")
    return (
      <Box
        pill={<StatusPill tone="info">Reviewing</StatusPill>}
        title="Rashid is reading your application."
      >
        Rashid is looking at your public Google profile. Nothing is needed from you, and nothing
        changes on Google.
      </Box>
    );
  if (state === "accepted")
    return (
      <Box pill={<StatusPill tone="ok">Accepted</StatusPill>} title="You have a Founding 25 place.">
        <p>
          Next, add Kabsi as a Manager on Google. Your 90 days of Pro start the day access works.
        </p>
        <div className="mt-6" data-main-cta>
          <ButtonLink to="/manager-steps">Add Kabsi on Google</ButtonLink>
        </div>
      </Box>
    );
  if (state === "waitlist")
    return (
      <Box
        pill={<StatusPill tone="warn">Waitlist</StatusPill>}
        title="The places for your kind of business are taken for now."
      >
        A place still open after 30 days goes to the next good applicant of any trade. You are on
        the list, and Rashid writes to you if one opens.
      </Box>
    );
  return (
    <div>
      <Banner tone="info" title="All 25 places are taken.">
        You can still start: the free check needs nothing, and Kabsi is free for 14 days once it is
        connected.
      </Banner>
      <div className="mt-6" data-main-cta>
        <ButtonLink to="/scan">Check my business free</ButtonLink>
      </div>
    </div>
  );
}

function Box({ pill, title, children }: { pill: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-panel border border-line bg-surface-1 p-6 sm:p-8" role="status">
      {pill}
      <h2 id="founding-form-h" className="mt-4 text-h3">
        {title}
      </h2>
      <div className="mt-2 text-body text-text-2">{children}</div>
    </div>
  );
}
