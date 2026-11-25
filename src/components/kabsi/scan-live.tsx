// The real free check (Web 2, master plan 30.15 3.10, 30.16 section 4): the visitor's business on Google first, then
// where it comes up nearby, before Kabsi asks for anything. Public profile facts come from the profile-snapshot function
// (Places, never stored), the nearby check from V4's POST and GET /visibility/check. Nothing here is a fixture: a part
// the server did not return is not shown, and the waiting list shows while the nearby check is closed.
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CircleSlash,
  LoaderCircle,
  Mail,
  RotateCcw,
  Star,
  Store,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Turnstile } from "@/components/turnstile";
import {
  BOT_CHECK_WAIT_MS,
  BotCheckTimeout,
  requireToken,
  CHECKING_LINE,
  SLOW_LINE,
  sendButtonState,
} from "@/lib/bot-check";
import { cn } from "@/lib/utils";
import { CONTACT_EMAIL, SCAN_LINE, TRIAL_LINE, WHATSAPP_DIGITS, WHATSAPP_ON } from "@/lib/site";
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
import { elapsedSeconds, track } from "@/lib/telemetry";
import { pixelCustom, pixelEvent } from "@/lib/meta-pixel";
import { WAITLIST_LINE, WAITLIST_WHATSAPP_LINE } from "@/lib/waitlist-copy";
import { NEARBY_SAMPLE, type NearbyCheck, type NearbyPlace } from "./map-data";
import { ownName, shownTerm } from "../../../supabase/functions/_shared/visibility/area.ts";
import { NearbyPlaces } from "./nearby-places";
import { ScanBox } from "./scan-box";
import { FreeCheckFrame } from "./d4-free-check";
import {
  BasicsList,
  LinksNow,
  MonthlyDo,
  NearbyTable,
  ReplyWould,
  StartCard,
  type ResultExtras,
} from "./scan-result";
import { SiteLink } from "./site-link";
import { Banner, Button, Field, Skeleton, StatusPill, WhatsAppGlyph, buttonClass } from "./ui";
import { Highlight, Marked, YellowNumber } from "./highlight";
import {
  ACCESS_LINES,
  ACCESS_TITLE,
  AI_QUESTION,
  AI_SAMPLE,
  CANNOT_PROMISE,
  TRIAL_BUTTON,
  TRIAL_LINES,
  WHY_VARIES,
  aiAskedLines,
  aiVerdict,
  mainFinding,
  SAVED_NOT_KEPT,
  nearbyCount,
  nearbyLead,
  nearbyWords,
  ord,
  reportHolds,
  wouldDo,
  type MainFinding,
} from "@/lib/scan-words";

/* ---------- Turnstile tokens, one per call ---------- */

/** Each Turnstile token works once. `take()` waits for the next token and then asks the widget for a fresh one.
 * FIX-5: `waiting` is true while a call waits for the token (the button then says "Checking your connection"), and
 * `take()` answers "" after 15 seconds or when the check fails, so nothing waits for ever; `slow` says the widget
 * already shows its own "taking longer" line. */
function useTokens() {
  const [round, setRound] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const token = useRef("");
  const waiters = useRef<((t: string) => void)[]>([]);
  const slow = useRef(false);
  const onToken = useCallback((t: string) => {
    token.current = t;
    if (t) slow.current = false;
    if (t && waiters.current.length) {
      const w = waiters.current.shift()!;
      token.current = "";
      setRound((n) => n + 1);
      w(t);
    }
  }, []);
  const onFail = useCallback(() => {
    slow.current = true;
    for (const w of waiters.current.splice(0)) w("");
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
        setWaiting(true);
        // eslint-disable-next-line prefer-const -- `done` needs the timer, and the timer needs `done`
        let timer: number | undefined;
        const done = (t: string) => {
          window.clearTimeout(timer);
          if (!waiters.current.length) setWaiting(false);
          resolve(t);
        };
        waiters.current.push(done);
        // A check that never finishes ends the wait; the caller shows the plain "taking longer" line and Try again.
        timer = window.setTimeout(() => {
          const i = waiters.current.indexOf(done);
          if (i >= 0) {
            waiters.current.splice(i, 1);
            done("");
          }
        }, BOT_CHECK_WAIT_MS);
      }),
    [],
  );
  const widget = <Turnstile key={round} surface="free_check" onToken={onToken} onFail={onFail} />;
  return { take, widget, waiting, slow };
}

/* ---------- The states, each a card in the hero where the search box was (Design 8) ---------- */

const cardCls = "rounded-panel border border-line bg-surface-1 p-5 shadow-rest sm:p-6";
export const resultLinkCls =
  "press inline-flex min-h-11 items-center gap-1.5 font-semibold text-text-1 underline decoration-text-3 decoration-1 underline-offset-4 hover:decoration-text-1";

// The real steps, ticked as each call returns (no step is shown that the check does not do).
const STEPS = [
  "Finding your business on Google",
  "Reading your profile on Google",
  "Reading 3 nearby businesses",
];

export function ScanSearching({
  query,
  progress = 1,
  waiting = false,
}: {
  query: string;
  progress?: number;
  /** FIX-5: the call is waiting for the bot check. */
  waiting?: boolean;
}) {
  return (
    <div className={cardCls} role="status">
      <p className="text-label font-bold text-text-2">
        {progress === 0 ? "Free check" : "Checking"}
      </p>
      <h2 className="mt-1 text-h3 break-words">
        {progress === 0 ? `Searching for ${query}` : query}
      </h2>
      {/* After a pick the name is Places data, so it carries Google's attribution. */}
      {progress > 0 && <PlacesAttribution className="mt-1" />}
      <ol className="mt-4 space-y-2.5">
        {STEPS.map((s, i) => {
          const state = i < progress ? "done" : i === progress ? "now" : "later";
          return (
            <li
              key={s}
              className={cn(
                "flex min-h-8 items-center gap-3 text-body",
                state === "later" && "text-text-3",
                state === "now" && "font-semibold",
              )}
            >
              {state === "done" && (
                <CircleCheck className="size-5 shrink-0 animate-pop text-ok" aria-hidden />
              )}
              {state === "now" && (
                <LoaderCircle
                  className="size-5 shrink-0 animate-[kb-spin_0.9s_linear_infinite] motion-reduce:animate-none"
                  aria-hidden
                />
              )}
              {state === "later" && (
                <span aria-hidden className="size-5 shrink-0 rounded-full border-2 border-line" />
              )}
              {s}
              <span className="sr-only">
                {state === "done" ? ", done" : state === "now" ? ", working" : ""}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-small text-text-2">
        {waiting ? `${CHECKING_LINE}. ` : ""}About 30 seconds. Nothing changes on Google.
      </p>
    </div>
  );
}

function NotFound({
  query,
  keyword,
  industry,
}: {
  query: string;
  keyword: string | null;
  industry: string | null;
}) {
  return (
    <div className={cardCls}>
      <h2 className="text-h3">We could not find that business.</h2>
      <p className="mt-2 text-body text-text-2">
        Check the name and city, or type the name exactly as it shows on Google.
      </p>
      <p className="mt-2 text-small break-words text-text-2">You searched: '{query}'.</p>
      <ScanBox
        defaultValue={query}
        keyword={keyword ?? undefined}
        industry={industry ?? undefined}
        className="mt-5"
      />
    </div>
  );
}

/** Check 2: the way back to the search with the text kept ("Not here? Search again", "Not your business? Change it"). */
function changeSearch(q: string, keyword: string | null, industry: string | null) {
  return {
    q,
    change: true,
    ...(keyword ? { keyword } : {}),
    ...(industry ? { industry } : {}),
  };
}

/** /scan?change: the search box again, with the text the visitor typed, before anything is looked up. */
export function FreeCheckAgain({
  query,
  keyword,
  industry,
}: {
  query: string;
  keyword: string | null;
  industry: string | null;
}) {
  return (
    <FreeCheckFrame>
      <div className={cardCls}>
        <h2 className="text-h3">Find your business again</h2>
        <p className="mt-2 text-body text-text-2">
          Add the city, or type the name exactly as it shows on Google.
        </p>
        <ScanBox
          defaultValue={query}
          keyword={keyword ?? undefined}
          industry={industry ?? undefined}
          className="mt-5"
        />
      </div>
    </FreeCheckFrame>
  );
}

/** Check 2: Kabsi never picks for the visitor. One match is shown like several, and the visitor says yes. */
function PickBusiness({
  places,
  query,
  keyword,
  industry,
  onPick,
}: {
  places: FoundBusiness[];
  query: string;
  keyword: string | null;
  industry: string | null;
  onPick: (p: FoundBusiness) => void;
}) {
  const one = places.length === 1;
  return (
    <div className={cardCls}>
      <h2 className="text-h3">{one ? "Is this your business?" : "Pick your business"}</h2>
      <ul className="mt-4 space-y-3">
        {places.map((p) => (
          <li key={p.place_id} className="rounded-inner bg-surface-2 p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-1">
                <Store className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-title font-bold break-words">{p.name}</p>
                {p.address && <p className="text-small text-text-2">{p.address}</p>}
                {p.category && <p className="text-small text-text-3">{p.category}</p>}
              </div>
            </div>
            <Button
              type="button"
              variant={one ? "primary" : "secondary"}
              className="mt-4 w-full"
              onClick={() => onPick(p)}
            >
              This is my business
            </Button>
          </li>
        ))}
      </ul>
      {/* Google's Places policy: Places results shown without a Google map carry the words "Google Maps". */}
      <PlacesAttribution className="mt-3" />
      <Link
        to="/scan"
        search={changeSearch(query, keyword, industry) as never}
        className={cn(resultLinkCls, "mt-2 text-small")}
      >
        Not here? Search again
      </Link>
      <p className="mt-1 text-small text-text-2">{SCAN_LINE}</p>
    </div>
  );
}

/** Go live 1 (B-018): a 4xx is about what the visitor sent, so only the server's own message shows; a 5xx or no
 * answer keeps "Something went wrong on our side." above it. */
/** FIX-5: no bot check token in 15 seconds. One line and a button that tries again; nothing is sent. */
function SlowCheck() {
  return (
    <div className={cardCls} role="alert">
      <h2 className="text-h3">{SLOW_LINE}</h2>
      <Button
        type="button"
        className="mt-5"
        onClick={() => window.location.reload()}
        icon={<RotateCcw className="size-4" aria-hidden />}
      >
        Try again
      </Button>
    </div>
  );
}

function Failed({ message, theirs = false }: { message: string; theirs?: boolean }) {
  return (
    <div className={cardCls} role="alert">
      <p className="flex items-center gap-2 text-label font-bold text-bad">
        <CircleAlert className="size-4" aria-hidden />
        The check did not run
      </p>
      {theirs ? (
        <p className="mt-2 text-body text-text-1">{message}</p>
      ) : (
        <>
          <h2 className="mt-2 text-h3">Something went wrong on our side.</h2>
          <p className="mt-2 text-body text-text-2">{message}</p>
        </>
      )}
      <Button
        type="button"
        className="mt-5"
        onClick={() => window.location.reload()}
        icon={<RotateCcw className="size-4" aria-hidden />}
      >
        Try again
      </Button>
      <p className="mt-3 text-small text-text-2">
        Still not working? Write to {CONTACT_EMAIL} and a person answers.
      </p>
    </div>
  );
}

/* ---------- The flow on /scan ---------- */

type Phase =
  | { kind: "searching" }
  | { kind: "pick"; places: FoundBusiness[] }
  | { kind: "none" }
  | { kind: "checking"; place: FoundBusiness }
  | { kind: "result"; snapshot: Snapshot; check: StartedCheck | null }
  | { kind: "error"; message: string; theirs?: boolean }
  | { kind: "slow" };

/** The error phase: a 4xx from profile-snapshot is the visitor's to fix (B-018). */
const errorPhase = (e: unknown): Phase =>
  e instanceof BotCheckTimeout
    ? { kind: "slow" }
    : {
        kind: "error",
        message: plainError(e),
        theirs:
          e instanceof CheckError && e.status !== undefined && e.status >= 400 && e.status < 500,
      };

const plainError = (e: unknown) =>
  e instanceof CheckError || e instanceof ApiError
    ? e.message
    : "Nothing you did. Try again in a minute.";

/** /scan?q=...: find the business, let the visitor pick it, then the result. */
export function LiveFreeCheck({
  query,
  keyword,
  industry,
  placeId = null,
  sessionToken = null,
}: {
  query: string;
  keyword: string | null;
  industry: string | null;
  /** Check 2: the visitor chose a suggestion in the scan box; its Place ID goes straight to the check. */
  placeId?: string | null;
  /** The suggestions' session token: Place Details with it ends the Autocomplete session. */
  sessionToken?: string | null;
}) {
  const { take, widget, waiting } = useTokens();
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
        if (placeId) return void pick({ place_id: placeId, name: query, address: "" });
        const places = await findBusinesses(query, requireToken(await take()));
        // Never pick for the visitor, not even the only match (Check 2).
        if (!places.length) setPhase({ kind: "none" });
        else setPhase({ kind: "pick", places });
      } catch (e) {
        setPhase(errorPhase(e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pick(place: FoundBusiness) {
    setPhase({ kind: "checking", place });
    setProgress(1);
    const startedAt = Date.now();
    try {
      const snapshot = await runCheck(
        place.place_id,
        requireToken(await take()),
        place.place_id === placeId ? (sessionToken ?? undefined) : undefined,
      );
      setProgress(2);
      const term = keyword ?? snapshot.category?.toLowerCase() ?? null;
      // The address Google returned for the chosen place (a suggestion carries only a short one).
      const country = countryOfAddress(snapshot.address);
      let check: StartedCheck | null = null;
      if (country && (term || industry)) {
        check = await startFreeCheck({
          name: snapshot.name,
          address: snapshot.address,
          place_id: place.place_id,
          country,
          // Scan 2 (30.29): the town, so the AI question names where the business is.
          city: snapshot.area ?? null,
          term,
          industry,
          turnstile: await take(),
        }).catch(() => null);
      }
      setProgress(3);
      track("free_scan_completed", {
        source: "tool",
        seconds: elapsedSeconds(startedAt, Date.now()),
      });
      // Scan 2 (30.29): a finished check is the custom FreeScanCompleted; Lead is a contact given.
      pixelCustom("FreeScanCompleted");
      setPhase({ kind: "result", snapshot, check });
    } catch (e) {
      setPhase(errorPhase(e));
    }
  }

  // Every state but the result stays inside one frame, so the hero does not paint again between states.
  return (
    <>
      {phase.kind === "result" ? (
        <LiveResult
          snapshot={phase.snapshot}
          started={phase.check}
          keyword={keyword}
          change={{ q: query, keyword, industry }}
        />
      ) : (
        <FreeCheckFrame>
          {phase.kind === "searching" && (
            <ScanSearching query={query} progress={0} waiting={waiting} />
          )}
          {phase.kind === "checking" && (
            <ScanSearching query={phase.place.name} progress={progress} waiting={waiting} />
          )}
          {phase.kind === "none" && (
            <NotFound query={query} keyword={keyword} industry={industry} />
          )}
          {phase.kind === "slow" && <SlowCheck />}
          {phase.kind === "error" && (
            <Failed message={phase.message} theirs={phase.theirs ?? false} />
          )}
          {phase.kind === "pick" && (
            <PickBusiness
              places={phase.places}
              query={query}
              keyword={keyword}
              industry={industry}
              onPick={(p) => void pick(p)}
            />
          )}
        </FreeCheckFrame>
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
    // Scan 2 (30.29): a name not in Latin letters comes back hidden from the server and reads "Another business came first."
    first: card.firstIsYou ? c.business : (card.first ?? "Another business"),
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

/** One row of "What Kabsi found": only what Google's public data holds (K-82), with why it matters. */
type FoundRow = { label: string; value: string | null; ok: boolean; why: string };

export function foundRows(s: Snapshot): FoundRow[] {
  const hours = s.hours.length > 0;
  const reviews =
    s.review_count === null
      ? null
      : s.rating !== null && s.review_count > 0
        ? `${s.review_count}, rated ${s.rating}`
        : String(s.review_count);
  const rows: FoundRow[] = [
    {
      label: "Opening hours",
      value: hours ? "Shown" : null,
      ok: hours,
      // Scan 2 (30.29): shown is not right. Kabsi can only check the hours are right once connected.
      why: hours
        ? "Customers see your hours. Once connected, Kabsi checks they are right."
        : "Customers cannot see when you are open.",
    },
    {
      label: "Reviews",
      value: reviews,
      // The same line as the free check's own finding: fewer than 10 reviews is worth fixing.
      ok: s.review_count !== null && s.review_count >= 10,
      why: "People read your reviews before they choose.",
    },
    {
      label: "Photos",
      // Google returns at most 10 photos, so 10 means 10 or more.
      value: !s.has_photos
        ? null
        : s.photo_count >= 10
          ? "10 or more"
          : String(s.photo_count || "Shown"),
      ok: s.has_photos,
      why: "Photos show customers what to expect.",
    },
    {
      label: "Website",
      value: s.website ? "Shown" : null,
      ok: !!s.website,
      why: s.website
        ? "Customers can open your site from your profile."
        : "Customers cannot open your site from your profile.",
    },
    {
      label: "Phone",
      value: s.phone ? "Shown" : null,
      ok: !!s.phone,
      why: s.phone
        ? "Customers can call you from your profile."
        : "Customers cannot call you from your profile.",
    },
    {
      label: "Category",
      value: s.category,
      ok: !!s.category,
      why: "What Google calls your business.",
    },
  ];
  return [...rows.filter((r) => !r.ok), ...rows.filter((r) => r.ok)];
}

/** "What Kabsi would do from day one": the free check's own actions, what it found first, then what it checks once
 * connected (never a finding about this business). */
export function dayOne(s: Snapshot): string[] {
  const found = s.flags.filter((f) => f.tone !== "neutral");
  const connected = s.flags.filter((f) => f.tone === "neutral");
  return [...found, ...connected].map((f) => f.action).slice(0, 4);
}

function ResultHead({
  date,
  name,
  line,
  change,
}: {
  date: Date;
  name: string;
  line: string;
  change: { q: string; keyword: string | null; industry: string | null };
}) {
  return (
    <section aria-labelledby="hero-title" data-hero className="container-kb pt-6 md:pt-12">
      <p className="text-small font-bold text-text-2">Free check, {longDate(date)}</p>
      {/* Scan 3 (30.34): the business first, its name on the highlight bar. */}
      <h1 id="hero-title" className="mt-2 text-h2 break-words sm:text-display">
        <Highlight>{name}</Highlight>
      </h1>
      <p className="mt-2 text-body text-text-2">{line}</p>
      <Link
        to="/scan"
        search={changeSearch(change.q, change.keyword, change.industry) as never}
        className="inline-flex min-h-11 items-center font-semibold text-text-1 underline underline-offset-4"
      >
        Not your business? Change it
      </Link>
    </section>
  );
}

/** Manager access in three lines; the full steps stay in onboarding (30.34 item 2). */
function AccessCard() {
  return (
    <section
      aria-labelledby="access-h"
      className="rounded-panel border border-line bg-surface-1 p-5 sm:p-7"
    >
      <h2 id="access-h" className="text-title font-bold">
        {ACCESS_TITLE}
      </h2>
      <ul className="mt-3 space-y-2">
        {ACCESS_LINES.map((l) => (
          <li key={l} className="flex gap-3 text-body">
            <Check className="mt-1 size-4 shrink-0 text-ok" strokeWidth={2.5} aria-hidden />
            {l}
          </li>
        ))}
      </ul>
      <SiteLink
        to="/guides/add-manager-google-business-profile"
        className={cn(resultLinkCls, "mt-2 text-body")}
      >
        See the setup steps
        <ArrowRight className="size-4" aria-hidden />
      </SiteLink>
    </section>
  );
}

export function LiveResult({
  snapshot: s,
  started,
  keyword,
  change,
}: {
  snapshot: Snapshot;
  started: StartedCheck | null;
  keyword: string | null;
  /** Where "Not your business? Change it" goes back to: the search with the text kept. */
  change: { q: string; keyword: string | null; industry: string | null };
}) {
  const navigate = useNavigate();
  const check = useCheck(started);
  // Only the mock mode's waiting list; "unavailable" (30.28) shows neither part.
  const term = check?.term ?? keyword ?? s.category?.toLowerCase() ?? null;
  // 30.30 item 3: the search shown back follows the Latin rule (another script reads as the Google category).
  const shownSearch = term ? (shownTerm(term, s.category ?? null, null)?.term ?? null) : null;
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
    // Signed in already (App 4, 30.31 item 1): straight to /start, which claims the kept check; no log in page.
    const { hasSessionKey } = await import("@/lib/stored-session");
    if (hasSessionKey()) void navigate({ to: "/start" as never });
    else void navigate({ to: "/login", search: { next: "/start" } as never });
  };
  const extras = s as Snapshot & ResultExtras;

  return (
    <>
      <ResultHead
        date={check?.created_at ? new Date(check.created_at) : new Date()}
        name={ownName(s.name)}
        line={[
          [s.area, s.category].filter(Boolean).join(", ") || s.address,
          shownSearch ? `Searched as '${shownSearch}'.` : "",
        ]
          .filter(Boolean)
          .map((x) => (x.endsWith(".") ? x : `${x}.`))
          .join(" ")}
        change={change}
      />
      {/* Google's Places policies (read 1 Nov 2026, Check 2): Places data shown without a Google map carries the
          words "Google Maps", exactly and not translated. The name, address and facts on this screen are Places data. */}
      <div className="container-kb">
        <PlacesAttribution />
      </div>

      {/* Scan 3 (master plan 30.34 item 2): a progressive result. The business, one main finding, what Kabsi would do in
          three lines, the details on request, then one primary button with the trial lines, Manager access in three lines
          and the report. On a computer the action column sits beside the finding; the order in the page stays the same. */}
      <div className="container-kb mt-6 grid gap-4 pb-16 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start lg:gap-x-8 lg:pb-24">
        <div className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-1">
          <NearbyTable
            you={{ name: ownName(s.name), rating: s.rating, reviews: s.review_count }}
            nearby={check?.fast.competitors ?? null}
          />
          <BasicsList
            rows={foundRows(s)
              .filter((r) => r.label !== "Reviews")
              .map((r) => ({ label: r.label, value: r.value }))}
          />
          <LinksNow hasWebsite={!!s.website} links={extras.links} />
          <ReplyWould latest={extras.latest_review} industry={change.industry} />
          <MonthlyDo />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1">
          <StartCard onStart={() => void startWeb()} />
          <AccessCard />
          <SendReport
            placeId={s.place_id}
            code={check?.code ?? null}
            parts={{ nearby: false, ai: false }}
          />
        </aside>
      </div>
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
  const { take, widget, waiting, slow } = useTokens();
  const [email, setEmail] = useState("");
  const [tips, setTips] = useState(false);
  const [phone, setPhone] = useState("");
  const [waOk, setWaOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "saved">("idle");
  const btn = sendButtonState({
    busy: state === "sending" && !waiting,
    waiting: state === "sending" && waiting,
    label: "Save my place",
  });
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
      const turnstile = requireToken(await take());
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
        turnstile,
      });
      track("free_tool_used", { source: "free_check_waitlist" });
      setState("saved");
    } catch (x) {
      // No token in 15 seconds: the check's own line and Try again are right above the button, so say it once.
      setErr(x instanceof BotCheckTimeout ? (slow.current ? null : SLOW_LINE) : plainError(x));
      setState("idle");
    }
  };
  return (
    <div className="mt-5 max-w-xl border-t border-line pt-5">
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
          <Button type="submit" variant="secondary" loading={btn.loading}>
            {btn.label}
          </Button>
        </form>
      )}
    </div>
  );
}

/* ---------- Send me this report (the profile-snapshot function's email and WhatsApp actions) ---------- */

function SendReport({
  placeId,
  code,
  parts,
}: {
  placeId: string;
  code: string | null;
  parts: { nearby: boolean; ai: boolean };
}) {
  const { take, widget, waiting, slow } = useTokens();
  // Scan 3 (30.34 item 2): one delivery choice at a time. Without Kabsi's WhatsApp number there is only email.
  const [via, setVia] = useState<"email" | "whatsapp">("email");
  const [email, setEmail] = useState("");
  const [tips, setTips] = useState(false);
  const [phone, setPhone] = useState("");
  const [waOk, setWaOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const byWhatsapp = WHATSAPP_ON && via === "whatsapp";
  const btn = sendButtonState({
    busy: state === "sending" && !waiting,
    waiting: state === "sending" && waiting,
    label: "Send me this report",
  });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!byWhatsapp && !/@/.test(email)) {
      setErr("Type your email address.");
      return;
    }
    if (byWhatsapp && phone.replace(/\D/g, "").length < 7) {
      setErr("Type your WhatsApp number with its country code.");
      return;
    }
    if (byWhatsapp && !waOk) {
      setErr("Tick the box to get the report on WhatsApp.");
      return;
    }
    setErr(null);
    setState("sending");
    try {
      const turnstile = requireToken(await take());
      if (!byWhatsapp)
        await emailCheck({
          placeId,
          email,
          tips,
          page: "/google-profile-check",
          turnstile,
          code,
        });
      else
        await whatsappCheck({
          placeId,
          phone,
          page: "/google-profile-check",
          turnstile,
          code,
        });
      track("free_tool_used", { source: "profile_check_email" });
      // Scan 2 (30.29): Lead is a contact given, once, when the report was sent (consent rules unchanged in meta-pixel).
      pixelEvent("Lead", { content_name: "free_check_report" });
      setState("sent");
    } catch (x) {
      setErr(x instanceof BotCheckTimeout ? (slow.current ? null : SLOW_LINE) : plainError(x));
      setState("idle");
    }
  };
  return (
    <section
      aria-labelledby="report-h"
      className="rounded-panel border border-line bg-surface-1 p-5 sm:p-7"
    >
      <h2 id="report-h" className="flex items-center gap-2 text-title font-bold">
        <Mail className="size-5" aria-hidden /> Send me this report
      </h2>
      <p className="mt-2 text-body text-text-2">{reportHolds(parts)}</p>
      {state === "sent" ? (
        <Banner tone="ok" title="Sent." className="mt-4" />
      ) : (
        <form onSubmit={(e) => void submit(e)} noValidate className="mt-4 space-y-4">
          {WHATSAPP_ON && (
            <fieldset>
              <legend className="text-small font-bold">Send it by</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    ["email", "Email"],
                    ["whatsapp", "WhatsApp"],
                  ] as const
                ).map(([v, label]) => (
                  <label
                    key={v}
                    className={cn(
                      "press inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-small font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]",
                      via === v
                        ? "border-text-1 bg-text-1 text-surface-1"
                        : "border-stroke bg-surface-1 text-text-1 hover:bg-surface-2",
                    )}
                  >
                    <input
                      type="radio"
                      name="report-via"
                      value={v}
                      checked={via === v}
                      onChange={() => {
                        setVia(v);
                        setErr(null);
                      }}
                      className="sr-only"
                    />
                    {v === "whatsapp" && <WhatsAppGlyph />}
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {!byWhatsapp ? (
            <>
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
            </>
          ) : (
            <>
              <Field
                label="WhatsApp number"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (err) setErr(null);
                }}
                error={err}
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
          <Button type="submit" variant="secondary" loading={btn.loading}>
            {btn.label}
          </Button>
        </form>
      )}
    </section>
  );
}

/** /scan/CODE: a free check opened again from its code (the WhatsApp hand-off and shared links). Places facts are not
 * kept, so it shows what the code holds: the nearby check and the AI answer, in Scan 3's order. */
export function SavedFreeCheck({ code }: { code: string }) {
  const [c, setC] = useState<FreeCheck | null | "missing">(null);
  useEffect(() => {
    void getFreeCheck(code)
      .then(setC)
      .catch(() => setC("missing"));
  }, [code]);
  const live = useCheck(c && c !== "missing" ? c : null);
  if (c === null)
    return (
      <section className="container-kb pt-6 pb-16 md:pt-12" aria-busy="true">
        <p className="text-label font-bold text-text-2">Free check</p>
        <h1 className="sr-only">Your free check</h1>
        <Skeleton className="mt-3 h-12 w-2/3" />
        <Skeleton className="mt-6 h-64 w-full" />
      </section>
    );
  if (c === "missing" || !live)
    return (
      <section className="container-kb pt-6 pb-16 md:pt-12">
        <h1 className="max-w-2xl text-h2 sm:text-display">
          This report has <Highlight>expired.</Highlight>
        </h1>
        <ScanBox className="mt-8 max-w-xl" />
      </section>
    );
  return (
    <>
      <ResultHead
        date={live.created_at ? new Date(live.created_at) : new Date()}
        name={live.business}
        line={`Searched as '${live.term}'.`}
        change={{ q: live.business, keyword: null, industry: null }}
      />
      <div className="container-kb">
        <PlacesAttribution />
      </div>
      <div className="container-kb mt-6 grid gap-4 pb-16 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start lg:gap-x-8 lg:pb-24">
        <div className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-1">
          <NearbyTable
            you={{ name: live.business, rating: null, reviews: null }}
            nearby={live.fast.competitors}
            hideYou
          />
          <MonthlyDo />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1">
          <section
            aria-labelledby="again-h"
            data-main-cta
            className="rounded-panel border border-text-1 bg-surface-1 p-5 shadow-lift sm:p-7"
          >
            <h2 id="again-h" className="text-h3">
              Start with a <Highlight>free check.</Highlight>
            </h2>
            {/* Site 3a: the side column is narrow from 1024 px, so the box and its button stack there. */}
            <ScanBox className="mt-4" stacked note={TRIAL_LINE} />
          </section>
          <AccessCard />
        </aside>
      </div>
    </>
  );
}

/** The words Google's Places policies require where Places data is shown without a Google map (Check 2, Web 4). */
export function PlacesAttribution({ className }: { className?: string }) {
  return (
    <p
      className={cn("text-label font-semibold text-text-3", className)}
      data-testid="places-attribution"
    >
      <span translate="no">Google Maps</span>
    </p>
  );
}
