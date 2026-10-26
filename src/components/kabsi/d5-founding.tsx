// Founding 25 (master plan 30.17 section 1, COPY.md "Founding 25"): the banner on Home, Pricing and every industry
// page, and /founding with the application. The count of places left is the real one (GET programs/founding); while it
// has not loaded, or did not load, no number shows. The application posts to programs/founding (Partners session).
import { CheckCircle2, Sparkles } from "lucide-react";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Turnstile } from "@/components/turnstile";
import {
  ApiError,
  applyFounding,
  useFoundingPlaces,
  type FoundingApplication,
  type FoundingPlaces,
  type FoundingTrade,
} from "@/lib/public-api";
import { PageTop, useFlagState } from "./d2-parts";
import { FOUNDER } from "./photos";
import { Banner, Button, ButtonLink, Faq, Field, SectionHead, StatusPill } from "./ui";

export const FOUNDING25_TOTAL = 25;
export const FOUNDING25_LINE =
  "Founding 25: three months of Kabsi Pro, free, for 25 businesses. We do the Google work; you tell us what to make better.";
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
            Three months of Kabsi Pro, free, for 25 businesses. We do the Google work; you tell us
            what to make better.
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

/** The four groups of the 25 places; the numbers come from GET programs/founding. */
const MIX: { group: string; trade: FoundingTrade }[] = [
  { group: "Beauty and hair", trade: "beauty_hair" },
  { group: "Food and drink", trade: "food" },
  { group: "Health", trade: "health" },
  { group: "Auto, fitness, home services and hotels", trade: "other" },
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
const COUNTRIES: [string, FoundingApplication["country"]][] = [
  ["United Arab Emirates", "AE"],
  ["United Kingdom", "GB"],
  ["United States", "US"],
];

const FAQS = [
  {
    q: "What happens after 90 days?",
    a: "You choose a plan at the founding price, kept while your subscription stays paid, or you stop. Nothing is charged by itself.",
  },
  {
    q: "What goes in a case study?",
    a: "Your words, the work Kabsi did from its own records (replies published, posts, details fixed) and only the numbers you choose to share from your own Google screens. Named or anonymous, and you approve the final text.",
  },
  {
    q: "Why by application?",
    a: "So the 25 cover the kinds of business Kabsi serves, and every place goes to someone who will use it every week.",
  },
  {
    q: "Can I leave before the 90 days end?",
    a: "Any time. Remove Kabsi from your Google profile and tell us on WhatsApp.",
  },
];

export function FoundingPage() {
  const [flagged, setState] = useFlagState<State>("open", STATES);
  const places = useFoundingPlaces();
  // All 25 taken: the form gives way to the "full" state (the server refuses past 25 in any case).
  const state: State = places?.left === 0 && flagged === "open" ? "full" : flagged;
  return (
    <>
      <PageTop
        title="Founding 25: three months of Kabsi Pro, free."
        lead="For 25 businesses. We do the Google work; you tell us what to make better."
      >
        {places && (
          <p className="mt-6 text-body font-bold">
            {places.left} of {places.total} places left.
          </p>
        )}
      </PageTop>

      <section className="container-kb mt-12 grid gap-10 pb-6 lg:grid-cols-3 lg:gap-12">
        <List title="Who can apply" items={WHO} />
        <List title="What you get" items={GET} />
        <List title="What Kabsi asks" items={GIVE} />
      </section>

      <section
        aria-labelledby="founding-form-h"
        className="container-kb section-y grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-16"
      >
        <div>
          {state === "open" && <Application onSent={() => setState("sent")} />}
          {state !== "open" && <Outcome state={state} />}
        </div>
        <aside className="space-y-6">
          <Mix places={places} />
          <div className="flex items-center gap-4">
            <img
              src={FOUNDER.small}
              width={FOUNDER.w}
              height={FOUNDER.h}
              alt={FOUNDER.alt}
              loading="lazy"
              decoding="async"
              className="size-14 shrink-0 rounded-full object-cover"
            />
            <p className="text-small text-text-2">
              Rashid Abou Hamzy, founder of Kabsi, reads every application himself.
            </p>
          </div>
        </aside>
      </section>

      <section aria-labelledby="founding-faq" className="border-t border-line">
        <div className="container-kb section-y grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <SectionHead id="founding-faq" title="Questions about Founding 25" />
          <Faq items={FAQS} />
        </div>
      </section>
    </>
  );
}

function Mix({ places }: { places: FoundingPlaces | null }) {
  return (
    <div className="rounded-card border border-line p-5">
      <p className="text-small font-bold">The 25 places</p>
      <ul className="mt-4 space-y-3">
        {MIX.map((m) => {
          const t = places?.by_trade[m.trade];
          return (
            <li key={m.group} className="flex items-baseline justify-between gap-4">
              <span className="text-small text-text-2">{m.group}</span>
              {t && (
                <span className="shrink-0 text-small font-bold">
                  {Math.max(0, t.cap - t.taken)} of {t.cap} left
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-label text-text-3">
        A place still open after 30 days goes to the next good applicant of any trade.
      </p>
    </div>
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
  Record<"business" | "country" | "trade" | "phone" | "why" | "caseStudy" | "checkIn", string>
>;

function Application({ onSent }: { onSent: () => void }) {
  const [f, setF] = useState({
    business: "",
    country: "",
    trade: "",
    phone: "",
    why: "",
    caseStudy: false,
    checkIn: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const whyId = useId();
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };
  const [token, setToken] = useState("");
  const [round, setRound] = useState(0);
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
    if (!f.caseStudy) err.caseStudy = "Founding places come with a case study. Tick to agree.";
    if (!f.checkIn) err.checkIn = "Founding places come with the check-ins. Tick to agree.";
    setErrors(err);
    setFailure(null);
    if (Object.values(err).some(Boolean)) return;
    setSending(true);
    const t = token;
    setToken("");
    setRound((n) => n + 1);
    try {
      await applyFounding({
        business_name: f.business.trim(),
        country: COUNTRIES.find(([l]) => l === f.country)![1],
        trade: TRADES.find(([l]) => l === f.trade)![1],
        business_kind: f.trade,
        whatsapp: f.phone.trim(),
        why_now: f.why.trim(),
        // The owner chooses named or anonymous when Rashid writes the case study with them; until then, anonymous.
        case_study: "anonymous",
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
    <form onSubmit={(e) => void submit(e)} noValidate className="space-y-5" data-main-cta>
      <h2 id="founding-form-h" className="text-h2">
        Apply for a place
      </h2>
      <p className="text-body text-text-2">Two minutes. Rashid answers on WhatsApp.</p>
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
          options={COUNTRIES.map(([l]) => l)}
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
        placeholder="+971 50 000 0000"
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
      <Tick
        checked={f.caseStudy}
        onChange={(v) => set("caseStudy", v)}
        error={errors.caseStudy || null}
      >
        Kabsi may write a case study about my business, named or anonymous. I approve the final text
        before it is published.
      </Tick>
      <Tick checked={f.checkIn} onChange={(v) => set("checkIn", v)} error={errors.checkIn || null}>
        I can give a 2-minute check-in every two weeks.
      </Tick>
      <Turnstile key={round} onToken={setToken} />
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
        Rashid reads every application and answers on WhatsApp within 2 working days. Nothing
        changes on your Google profile until you say yes.
      </Box>
    );
  if (state === "reviewing")
    return (
      <Box
        pill={<StatusPill tone="info">Reviewing</StatusPill>}
        title="We are reading your application."
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
        the list, and Rashid writes on WhatsApp if one opens.
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
