// The real free check (Web 2, master plan 30.15 3.10, 30.16 section 4): the visitor's business on Google first, then
// where it comes up nearby, before Kabsi asks for anything. Public profile facts come from the profile-snapshot function
// (Places, never stored), the nearby check from V4's POST and GET /visibility/check. Nothing here is a fixture: a part
// the server did not return is not shown, and the waiting list shows while the nearby check is closed.
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronDown, LoaderCircle, Mail, MapPin, SearchX, Star } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Turnstile } from "@/components/turnstile";
import { cn } from "@/lib/utils";
import { SCAN_LINE, TRIAL_LINE, WHATSAPP_DIGITS, WHATSAPP_ON } from "@/lib/site";
import {
  CheckError,
  TIPS_CONSENT_TEXT,
  WHATSAPP_CONSENT_TEXT,
  emailCheck,
  findBusinesses,
  runCheck,
  whatsappCheck,
  type FoundBusiness,
  type Snapshot,
} from "@/lib/profile-check";
import {
  ApiError,
  countryOfAddress,
  getFreeCheck,
  joinWaitlist,
  startFreeCheck,
  type FreeCheck,
  type StartedCheck,
} from "@/lib/public-api";
import { track } from "@/lib/telemetry";
import { pixelCustom, pixelEvent } from "@/lib/meta-pixel";
import { AccessSteps } from "./d5-access";
import { WAITLIST_LINE, WAITLIST_WHATSAPP_LINE } from "@/lib/waitlist-copy";
import { NEARBY_SAMPLE, type NearbyCheck, type NearbyPlace } from "./map-data";
import { NearbyPlaces } from "./nearby-places";
import { ScanBox } from "./scan-box";
import {
  Banner,
  Button,
  Card,
  ErrorState,
  Field,
  StatusPill,
  WhatsAppGlyph,
  buttonClass,
} from "./ui";

/* ---------- Turnstile tokens, one per call ---------- */

/** Each Turnstile token works once. `take()` waits for the next token and then asks the widget for a fresh one. */
function useTokens() {
  const [round, setRound] = useState(0);
  const token = useRef("");
  const waiters = useRef<((t: string) => void)[]>([]);
  const onToken = useCallback((t: string) => {
    token.current = t;
    if (t && waiters.current.length) {
      const w = waiters.current.shift()!;
      token.current = "";
      setRound((n) => n + 1);
      w(t);
    }
  }, []);
  const take = useCallback(
    () =>
      new Promise<string>((resolve) => {
        if (token.current) {
          const t = token.current;
          token.current = "";
          setRound((n) => n + 1);
          resolve(t);
          return;
        }
        waiters.current.push(resolve);
        // A check that never finishes still lets the call go out; the server answers with its plain message.
        window.setTimeout(() => {
          const i = waiters.current.indexOf(resolve);
          if (i >= 0) {
            waiters.current.splice(i, 1);
            resolve("");
          }
        }, 15_000);
      }),
    [],
  );
  const widget = <Turnstile key={round} onToken={onToken} />;
  return { take, widget };
}

/* ---------- Searching ---------- */

const STEPS = [
  "Finding your business on Google",
  "Checking where you come up near your address",
  "Asking an AI assistant about you",
];

export function ScanSearching({ query, progress = 1 }: { query: string; progress?: number }) {
  return (
    <section className="container-kb pt-28 pb-20 lg:pt-36" aria-live="polite">
      <p className="text-label font-bold text-text-3">Free check</p>
      <h1 className="mt-3 text-h2 sm:text-display">Searching for {query}</h1>
      <ol className="mt-10 max-w-lg space-y-4">
        {STEPS.map((s, i) => {
          const done = i < progress;
          const now = i === progress;
          return (
            <li key={s} className="flex items-center gap-3 text-body">
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full",
                  done ? "bg-kb-green text-kb-white" : "border border-line-strong text-text-3",
                )}
              >
                {done ? (
                  <Check className="size-4" strokeWidth={3} aria-hidden />
                ) : now ? (
                  <LoaderCircle
                    className="size-4 animate-[kb-spin_0.9s_linear_infinite]"
                    aria-hidden
                  />
                ) : null}
              </span>
              <span className={cn(done || now ? "text-text-1" : "text-text-3")}>{s}</span>
              <span className="sr-only">{done ? ", done" : now ? ", working" : ""}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-8 text-small text-text-2">{SCAN_LINE}</p>
    </section>
  );
}

function NotFound({ query }: { query: string }) {
  return (
    <section className="container-kb pt-28 pb-20 lg:pt-36">
      <span className="grid size-14 place-items-center rounded-full bg-surface-2 text-text-2">
        <SearchX className="size-7" aria-hidden />
      </span>
      <h1 className="mt-6 max-w-2xl text-display">We could not find that business.</h1>
      <p className="mt-4 max-w-xl text-lead text-text-2">
        Check the name and city, or type the name exactly as it shows on Google.
      </p>
      <ScanBox defaultValue={query} className="mt-8 max-w-xl" />
    </section>
  );
}

function Failed({ message }: { message: string }) {
  return (
    <section className="container-kb pt-28 pb-20 lg:pt-36">
      <h1 className="sr-only">Free check</h1>
      <ErrorState
        className="max-w-xl"
        title="Something went wrong on our side."
        onRetry={() => window.location.reload()}
      >
        {message}
      </ErrorState>
    </section>
  );
}

/* ---------- The flow on /scan ---------- */

type Phase =
  | { kind: "searching" }
  | { kind: "pick"; places: FoundBusiness[] }
  | { kind: "none" }
  | { kind: "checking"; place: FoundBusiness }
  | { kind: "result"; snapshot: Snapshot; check: StartedCheck | null }
  | { kind: "error"; message: string };

const plainError = (e: unknown) =>
  e instanceof CheckError || e instanceof ApiError
    ? e.message
    : "Nothing you did. Try again in a minute.";

/** /scan?q=...: find the business, let the visitor pick it, then the result. */
export function LiveFreeCheck({
  query,
  keyword,
  industry,
}: {
  query: string;
  keyword: string | null;
  industry: string | null;
}) {
  const { take, widget } = useTokens();
  const [phase, setPhase] = useState<Phase>({ kind: "searching" });
  const [progress, setProgress] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    track("free_scan_started", { source: "tool" });
    pixelCustom("FreeScanStarted");
    void (async () => {
      try {
        const places = await findBusinesses(query, await take());
        if (!places.length) setPhase({ kind: "none" });
        else if (places.length === 1) void pick(places[0]!);
        else setPhase({ kind: "pick", places });
      } catch (e) {
        setPhase({ kind: "error", message: plainError(e) });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pick(place: FoundBusiness) {
    setPhase({ kind: "checking", place });
    setProgress(1);
    try {
      const snapshot = await runCheck(place.place_id, await take());
      setProgress(2);
      const term = keyword ?? snapshot.category?.toLowerCase() ?? null;
      const country = countryOfAddress(place.address);
      let check: StartedCheck | null = null;
      if (country && (term || industry)) {
        check = await startFreeCheck({
          name: place.name,
          address: place.address,
          place_id: place.place_id,
          country,
          term,
          industry,
          turnstile: await take(),
        }).catch(() => null);
      }
      setProgress(3);
      track("free_scan_completed", { source: "tool" });
      pixelEvent("Lead", { content_name: "free_scan" });
      setPhase({ kind: "result", snapshot, check });
    } catch (e) {
      setPhase({ kind: "error", message: plainError(e) });
    }
  }

  return (
    <>
      {phase.kind === "searching" && <ScanSearching query={query} progress={0} />}
      {phase.kind === "checking" && <ScanSearching query={phase.place.name} progress={progress} />}
      {phase.kind === "none" && <NotFound query={query} />}
      {phase.kind === "error" && <Failed message={phase.message} />}
      {phase.kind === "pick" && (
        <section className="container-kb pt-28 pb-20 lg:pt-36">
          <p className="text-label font-bold text-text-3">Free check</p>
          <h1 className="mt-3 text-h2 sm:text-display">Pick your business</h1>
          <ul className="mt-8 max-w-2xl space-y-3">
            {phase.places.map((p) => (
              <li key={p.place_id}>
                <button
                  type="button"
                  onClick={() => void pick(p)}
                  className="press flex w-full items-start gap-4 rounded-card border border-line bg-surface-1 p-5 text-start hover:border-line-strong hover:bg-surface-2"
                >
                  <MapPin className="mt-0.5 size-5 shrink-0 text-text-2" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-title">{p.name}</span>
                    <span className="mt-1 block text-small text-text-2">{p.address}</span>
                  </span>
                  <span className="shrink-0 self-center text-small font-bold text-text-1">
                    This one
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {phase.kind === "result" && (
        <LiveResult snapshot={phase.snapshot} started={phase.check} keyword={keyword} />
      )}
      <div className="container-kb">{widget}</div>
    </>
  );
}

/* ---------- The result ---------- */

const longDate = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(d);

/** V4's nearby cards and dots, drawn by the design studio's NearbyPlaces. */
export function toNearbyCheck(c: FreeCheck): NearbyCheck | null {
  if (c.map.state !== "done" || !c.map.nearby || c.map.nearby.cards.length < 3) return null;
  const ranks = Array.from({ length: 49 }, () => 0);
  for (const d of c.map.dots) ranks[d.row * 7 + d.col] = d.rank ?? 0;
  const letters = ["A", "B", "C"] as const;
  const places = c.map.nearby.cards.slice(0, 3).map((card, i): NearbyPlace => ({
    letter: letters[i]!,
    name: card.place,
    rank: card.rank ?? 0,
    first: card.firstIsYou ? c.business : (card.first ?? ""),
    point: card.row * 7 + card.col,
    where: card.kind === "home" ? "at the business" : "",
  })) as NearbyCheck["places"];
  return {
    business: c.business,
    kind: "business",
    keyword: c.term,
    date: longDate(c.created_at ? new Date(c.created_at) : new Date()),
    ranks,
    places,
  };
}

function Fold({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-card border border-line bg-surface-1 px-5 sm:px-7">
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 text-title font-bold [&::-webkit-details-marker]:hidden">
        <h2 className="text-title">{title}</h2>
        <ChevronDown
          className="size-5 shrink-0 transition-transform duration-200 ease-kb group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="pb-6">{children}</div>
    </details>
  );
}

function useCheck(started: StartedCheck | null) {
  const [check, setCheck] = useState<FreeCheck | null>(
    started && "code" in started ? started : null,
  );
  // The saved check (/scan/CODE) arrives after the first render: take it when it comes.
  useEffect(() => {
    if (started && "code" in started) setCheck(started);
  }, [started]);
  useEffect(() => {
    if (!check || check.map.state !== "mapping") return;
    // The 49 places come in over a few minutes; the page asks again every 15 seconds for up to 15 minutes.
    let n = 0;
    const id = window.setInterval(() => {
      n++;
      if (n > 60) return window.clearInterval(id);
      void getFreeCheck(check.code)
        .then((c) => {
          if (c.map.state !== "mapping") window.clearInterval(id);
          setCheck(c);
        })
        .catch(() => undefined);
    }, 15_000);
    return () => window.clearInterval(id);
  }, [check?.code, check?.map.state]); // eslint-disable-line react-hooks/exhaustive-deps
  return check;
}

export function LiveResult({
  snapshot: s,
  started,
  keyword,
}: {
  snapshot: Snapshot;
  started: StartedCheck | null;
  keyword: string | null;
}) {
  const navigate = useNavigate();
  const check = useCheck(started);
  const waitlist = !!started && "state" in started && !("code" in started);
  const term = check?.term ?? keyword ?? s.category?.toLowerCase() ?? null;
  const first =
    s.flags.find((f) => f.tone === "danger") ?? s.flags.find((f) => f.tone === "warning");
  const nearby = check ? toNearbyCheck(check) : null;
  const handoff =
    WHATSAPP_ON && check?.whatsapp_text
      ? `https://wa.me/${WHATSAPP_DIGITS}?text=${encodeURIComponent(check.whatsapp_text)}`
      : null;
  const startWeb = async () => {
    // lib/signup loads the Supabase client, so it comes only when the visitor starts.
    const { keepSnapshot } = await import("@/lib/signup");
    keepSnapshot({
      place_id: s.place_id,
      name: s.name,
      address: s.address,
      // V4: /start claims this free check for the business it makes (claim_free_check).
      ...(check?.code ? { check: check.code } : {}),
    });
    track("signup_started", { source: "snapshot" });
    void navigate({ to: "/login", search: { next: "/start" } as never });
  };
  const facts: [string, string | null][] = [
    ["Rating", s.rating !== null ? String(s.rating) : null],
    ["Reviews", s.review_count !== null ? String(s.review_count) : null],
    ["Hours", s.hours.length ? s.hours.join(", ") : null],
    ["Photos", s.has_photos ? String(s.photo_count || "Yes") : null],
    ["Website or booking link", s.website],
    ["Phone", s.phone],
    ["Categories", s.category],
  ];

  return (
    <>
      <section className="container-kb pt-28 lg:pt-36">
        <p className="text-label font-bold text-text-3">
          Free check, {longDate(check?.created_at ? new Date(check.created_at) : new Date())}
        </p>
        <h1 className="mt-3 text-h2 sm:text-display">
          {s.name}
          {term ? `, for '${term}'` : ""}
        </h1>
        <p className="mt-2 text-small text-text-2">{s.address}</p>

        {/* One finding, one action, one button (brief section 14.7). */}
        <div
          data-main-cta
          className="mt-8 rounded-panel border border-line bg-surface-1 p-6 shadow-rest sm:p-8"
        >
          {first && (
            <div className="mb-6">
              <p className="text-label font-bold text-text-3">What to do first</p>
              <p className="mt-2 max-w-2xl text-h3">{first.fact}</p>
              <p className="mt-3 max-w-2xl text-body text-text-2">{first.action}</p>
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {handoff ? (
              <>
                <a
                  href={handoff}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClass("primary")}
                >
                  Get this on WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => void startWeb()}
                  className={buttonClass("tertiary")}
                >
                  Start free on the web
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void startWeb()}
                className={buttonClass("primary")}
              >
                Start free on the web
              </button>
            )}
          </div>
          <p className="mt-3 text-small text-text-2">{TRIAL_LINE}</p>
        </div>
      </section>

      <section className="container-kb mt-4">
        <div className="grid gap-6 rounded-panel border border-line bg-surface-1 p-5 sm:p-7 lg:grid-cols-[minmax(0,30rem)_1fr] lg:items-start">
          {nearby ? (
            <>
              <NearbyPlaces check={nearby} example={false} title="h2" />
              <div>
                <h2 className="text-h3">How to read it</h2>
                <p className="mt-3 text-body text-text-2">
                  Kabsi searched '{nearby.keyword}' on Google Maps from 49 places around you, like a
                  customer standing there. A, B and C are three of them: near you, and the two
                  places with the most different results. Your position changes with where someone
                  searches.
                </p>
              </div>
            </>
          ) : check ? (
            <>
              <div className="rounded-panel bg-kb-white p-5 text-kb-ink shadow-lift">
                <h2 className="font-display text-title font-bold">
                  '{check.term}' near {check.business}
                </h2>
                <p className="mt-3 text-body">{check.fast.line}</p>
                <p className="mt-3 text-small text-kb-stone">{NEARBY_SAMPLE}</p>
              </div>
              <div>
                {check.map.state === "mapping" ? (
                  <>
                    <StatusPill tone="info">Searching</StatusPill>
                    <p className="mt-4 text-h3">
                      This was the quick check, from your address. The full check from 49 places
                      around you takes a few minutes.
                    </p>
                    {handoff && (
                      <a
                        href={handoff}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(buttonClass("whatsapp"), "mt-6")}
                      >
                        <WhatsAppGlyph />
                        Send the full map to my WhatsApp
                      </a>
                    )}
                  </>
                ) : null}
              </div>
            </>
          ) : (
            <div className="lg:col-span-2">
              <h2 className="text-h3">Where you come up nearby</h2>
              {waitlist ? (
                <Waitlist
                  business={s.name}
                  country={countryOfAddress(s.address)}
                  placeId={s.place_id}
                  term={term}
                />
              ) : (
                <p className="mt-3 text-body text-text-2">{SCAN_LINE}</p>
              )}
            </div>
          )}
        </div>
      </section>

      {check?.ai && (
        <section className="container-kb mt-4">
          <Card as="section" className="sm:p-7">
            <h2 className="text-h3">An answer customers might see</h2>
            {check.ai.line && <p className="mt-4 text-body font-semibold">{check.ai.line}</p>}
            <p className="mt-4 text-label font-semibold text-text-3">{check.ai.label}</p>
          </Card>
        </section>
      )}

      <section className="container-kb mt-4 grid gap-4">
        <Fold title="Your public Google profile, in full">
          <dl className="divide-y divide-line">
            {facts.map(([k, v]) => (
              <div key={k} className="flex min-h-12 items-center justify-between gap-4 py-2">
                <dt className="text-small text-text-2">{k}</dt>
                <dd className="min-w-0 break-words text-end text-small font-semibold">
                  {v ?? <StatusPill tone="warn">Missing</StatusPill>}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-small text-text-3">
            Shown live from Google. Kabsi does not store it.
          </p>
        </Fold>
        {check && check.fast.competitors.length > 0 && (
          <Fold title="Who shows up around you">
            <ol className="divide-y divide-line">
              {check.fast.competitors.map((x, i) => (
                <li key={x.name} className="flex min-h-14 items-center gap-3 py-2">
                  <span className="w-5 text-small font-bold text-text-3">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-body font-semibold">{x.name}</span>
                  {x.rating !== null && (
                    <span className="flex items-center gap-1 text-small text-text-2">
                      <Star className="size-4 fill-current text-warn" aria-hidden />
                      {x.rating}
                      {x.reviews !== null && (
                        <span className="text-text-3">({x.reviews} reviews)</span>
                      )}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </Fold>
        )}
        <Fold title="What Kabsi sees once connected">
          <p className="text-body text-text-2">
            Reviews without a reply, posts, changes others made to your Google profile, and Google's
            own warnings. Calls and direction requests come from your Google Business Profile and
            are shown on their own, labelled with where they come from.
          </p>
        </Fold>
        <Fold title="When you start: add Kabsi on Google">
          <p className="mb-8 max-w-[40rem] text-body text-text-2">
            This check needed no access. To start your 14 free days, add Kabsi as a Manager on your
            Google profile. You stay the owner.
          </p>
          <AccessSteps headingLevel="h3" />
        </Fold>
      </section>

      <section className="container-kb mt-10 pb-20">
        <SendReport placeId={s.place_id} />
      </section>
    </>
  );
}

/* ---------- Save my place (UX 1): the waiting list while the free check is closed ---------- */

function Waitlist({
  business,
  country,
  placeId,
  term,
}: {
  business: string;
  country: string | null;
  placeId: string;
  term: string | null;
}) {
  const { take, widget } = useTokens();
  const [email, setEmail] = useState("");
  const [tips, setTips] = useState(false);
  const [phone, setPhone] = useState("");
  const [waOk, setWaOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "saved">("idle");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const byEmail = /@/.test(email);
    const byPhone = WHATSAPP_ON && phone.replace(/\D/g, "").length >= 7;
    if (!byEmail && !byPhone) {
      setErr("Type an email address or a WhatsApp number with its country code.");
      return;
    }
    if (byPhone && !waOk) {
      setErr("Tick the box to get the message on WhatsApp.");
      return;
    }
    setErr(null);
    setState("sending");
    try {
      await joinWaitlist({
        business,
        country,
        place_id: placeId,
        term,
        email: byEmail ? email.trim() : null,
        phone: byPhone ? phone.trim() : null,
        whatsapp_consent: byPhone && waOk,
        tips: byEmail && tips,
        page: "/scan",
        turnstile: await take(),
      });
      track("free_tool_used", { source: "free_check_waitlist" });
      setState("saved");
    } catch (x) {
      setErr(x instanceof ApiError || x instanceof Error ? x.message : plainError(x));
      setState("idle");
    }
  };
  return (
    <div className="mt-3 max-w-xl">
      <p className="text-body text-text-2">{WAITLIST_LINE}</p>
      {state === "saved" ? (
        <Banner tone="ok" title="Saved. You are on the list." className="mt-4" />
      ) : (
        <form onSubmit={(e) => void submit(e)} noValidate className="mt-4 space-y-4">
          <Field
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (err) setErr(null);
            }}
            error={err}
          />
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-small text-text-1">
            <input
              type="checkbox"
              checked={tips}
              onChange={(e) => setTips(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-kb-green"
            />
            {TIPS_CONSENT_TEXT}
          </label>
          {WHATSAPP_ON && (
            <>
              <Field
                label="WhatsApp number"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <label className="flex min-h-11 cursor-pointer items-start gap-3 text-small text-text-1">
                <input
                  type="checkbox"
                  checked={waOk}
                  onChange={(e) => setWaOk(e.target.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-kb-green"
                />
                {WAITLIST_WHATSAPP_LINE}
              </label>
            </>
          )}
          {widget}
          <Button type="submit" variant="secondary" loading={state === "sending"}>
            Save my place
          </Button>
        </form>
      )}
    </div>
  );
}

/* ---------- Send me this report (the profile-snapshot function's email and WhatsApp actions) ---------- */

function SendReport({ placeId }: { placeId: string }) {
  const { take, widget } = useTokens();
  const [email, setEmail] = useState("");
  const [tips, setTips] = useState(false);
  const [phone, setPhone] = useState("");
  const [waOk, setWaOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const byEmail = /@/.test(email);
    const byPhone = WHATSAPP_ON && phone.replace(/\D/g, "").length >= 7 && waOk;
    if (!byEmail && !byPhone) {
      setErr("Type an email address or a WhatsApp number with its country code.");
      return;
    }
    setErr(null);
    setState("sending");
    try {
      if (byEmail)
        await emailCheck({
          placeId,
          email,
          tips,
          page: "/google-profile-check",
          turnstile: await take(),
        });
      if (byPhone)
        await whatsappCheck({
          placeId,
          phone,
          page: "/google-profile-check",
          turnstile: await take(),
        });
      track("free_tool_used", { source: "profile_check_email" });
      setState("sent");
    } catch (x) {
      setErr(plainError(x));
      setState("idle");
    }
  };
  return (
    <div className="mt-12 max-w-xl border-t border-line pt-8">
      <h2 className="flex items-center gap-2 text-h3">
        <Mail className="size-5" aria-hidden /> Send me this report
      </h2>
      {state === "sent" ? (
        <Banner tone="ok" title="Sent." className="mt-4" />
      ) : (
        <form onSubmit={(e) => void submit(e)} noValidate className="mt-4 space-y-4">
          <Field
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (err) setErr(null);
            }}
            error={err}
          />
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-small text-text-1">
            <input
              type="checkbox"
              checked={tips}
              onChange={(e) => setTips(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-kb-green"
            />
            {TIPS_CONSENT_TEXT}
          </label>
          {WHATSAPP_ON && (
            <>
              <Field
                label="WhatsApp number"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <label className="flex min-h-11 cursor-pointer items-start gap-3 text-small text-text-1">
                <input
                  type="checkbox"
                  checked={waOk}
                  onChange={(e) => setWaOk(e.target.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-kb-green"
                />
                {WHATSAPP_CONSENT_TEXT}
              </label>
            </>
          )}
          {widget}
          <Button type="submit" variant="secondary" loading={state === "sending"}>
            Send me this report
          </Button>
        </form>
      )}
    </div>
  );
}

/** /scan/CODE: a free check opened again from its code (the WhatsApp hand-off and shared links). */
export function SavedFreeCheck({ code }: { code: string }) {
  const [c, setC] = useState<FreeCheck | null | "missing">(null);
  useEffect(() => {
    void getFreeCheck(code)
      .then(setC)
      .catch(() => setC("missing"));
  }, [code]);
  const live = useCheck(c && c !== "missing" ? c : null);
  if (c === null) return <ScanSearching query={`KAB-${code}`} progress={1} />;
  if (c === "missing" || !live)
    return (
      <section className="container-kb pt-28 pb-20 lg:pt-36">
        <h1 className="max-w-2xl text-display">This report has expired.</h1>
        <ScanBox className="mt-8 max-w-xl" />
      </section>
    );
  const nearby = toNearbyCheck(live);
  return (
    <>
      <section className="container-kb pt-28 lg:pt-36">
        <p className="text-label font-bold text-text-3">Free check</p>
        <h1 className="mt-3 text-h2 sm:text-display">
          {live.business}, for '{live.term}'
        </h1>
      </section>
      <section className="container-kb mt-8 pb-20">
        <div className="grid gap-6 rounded-panel border border-line bg-surface-1 p-5 sm:p-7 lg:grid-cols-[minmax(0,30rem)_1fr] lg:items-start">
          {nearby ? (
            <NearbyPlaces check={nearby} example={false} title="h2" />
          ) : (
            <div className="rounded-panel bg-kb-white p-5 text-kb-ink shadow-lift">
              <h2 className="font-display text-title font-bold">
                '{live.term}' near {live.business}
              </h2>
              <p className="mt-3 text-body">{live.fast.line}</p>
              <p className="mt-3 text-small text-kb-stone">{NEARBY_SAMPLE}</p>
            </div>
          )}
          <div>
            {live.map.state === "mapping" && (
              <>
                <StatusPill tone="info">Searching</StatusPill>
                <p className="mt-4 text-h3">
                  This was the quick check, from your address. The full check from 49 places around
                  you takes a few minutes.
                </p>
              </>
            )}
            <div className="mt-6" data-main-cta>
              <ScanBox />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
