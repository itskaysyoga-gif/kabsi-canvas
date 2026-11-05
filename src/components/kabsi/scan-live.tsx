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
  LoaderCircle,
  Mail,
  RotateCcw,
  Star,
  Store,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Turnstile } from "@/components/turnstile";
import { cn } from "@/lib/utils";
import { CONTACT_EMAIL, SCAN_LINE, WHATSAPP_DIGITS, WHATSAPP_ON } from "@/lib/site";
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
  useFoundingPlaces,
  type FreeCheck,
  type StartedCheck,
} from "@/lib/public-api";
import { track } from "@/lib/telemetry";
import { pixelCustom, pixelEvent } from "@/lib/meta-pixel";
import { WAITLIST_LINE, WAITLIST_WHATSAPP_LINE } from "@/lib/waitlist-copy";
import { NEARBY_SAMPLE, type NearbyCheck, type NearbyPlace } from "./map-data";
import { ownName, shownTerm } from "../../../supabase/functions/_shared/visibility/area.ts";
import { NearbyPlaces } from "./nearby-places";
import { ScanBox } from "./scan-box";
import { FreeCheckFrame } from "./d4-free-check";
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
  nearbyCount,
  nearbyLead,
  ord,
  wouldDo,
  type MainFinding,
} from "@/lib/scan-words";

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

/* ---------- The states, each a card in the hero where the search box was (Design 8) ---------- */

const cardCls = "rounded-panel border border-line bg-surface-1 p-5 shadow-rest sm:p-6";
export const resultLinkCls =
  "press inline-flex min-h-11 items-center gap-1.5 font-semibold text-text-1 underline decoration-text-3 decoration-1 underline-offset-4 hover:decoration-text-1";

// The real steps, ticked as each call returns (no step is shown that the check does not do).
const STEPS = [
  "Finding your business on Google",
  "Checking where you come up near your address",
  "Asking an AI assistant about you",
];

export function ScanSearching({ query, progress = 1 }: { query: string; progress?: number }) {
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
      <p className="mt-4 text-small text-text-2">About 10 seconds. Nothing changes on Google.</p>
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
  | { kind: "error"; message: string; theirs?: boolean };

/** The error phase: a 4xx from profile-snapshot is the visitor's to fix (B-018). */
const errorPhase = (e: unknown): Phase => ({
  kind: "error",
  message: plainError(e),
  theirs: e instanceof CheckError && e.status !== undefined && e.status >= 400 && e.status < 500,
});

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
        if (placeId) return void pick({ place_id: placeId, name: query, address: "" });
        const places = await findBusinesses(query, await take());
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
    try {
      const snapshot = await runCheck(
        place.place_id,
        await take(),
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
      track("free_scan_completed", { source: "tool" });
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
          {phase.kind === "searching" && <ScanSearching query={query} progress={0} />}
          {phase.kind === "checking" && (
            <ScanSearching query={phase.place.name} progress={progress} />
          )}
          {phase.kind === "none" && (
            <NotFound query={query} keyword={keyword} industry={industry} />
          )}
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

/** Scan 2 (30.29, docs/COPY.md 49): what is missing to look at, and what Google shows. Shown is never called right. */
export const foundCount = (look: number, shown: number) =>
  `${look === 0 ? "Nothing" : look} to look at, ${shown} shown on Google`;

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

/** Scan 3 (30.34 item 2): a part of the result opened on request, with its one-line answer showing while it is closed. */
function Detail({
  id,
  title,
  mark,
  summary,
  children,
}: {
  id: string;
  title: string;
  mark: string;
  summary?: string | null | undefined;
  children: ReactNode;
}) {
  return (
    <details
      data-detail={id}
      className="group rounded-panel border border-line bg-surface-1 px-5 sm:px-7"
    >
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <h3 className="text-h3">
            <Marked text={title} mark={mark} />
          </h3>
          {summary && <span className="mt-1 block text-body text-text-2">{summary}</span>}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-small font-semibold">
          <span className="group-open:hidden">Show</span>
          <span className="hidden group-open:inline">Hide</span>
          <ChevronDown
            className="size-5 transition-transform duration-200 ease-kb group-open:rotate-180"
            aria-hidden
          />
        </span>
      </summary>
      <div className="pb-6">{children}</div>
    </details>
  );
}

/** Scan 2 (30.29): who comes up at the business's own address. Scan 3: their positions, in plain words. */
function AtAddress({ check }: { check: FreeCheck }) {
  const rows = check.fast.competitors;
  if (!rows.length) return null;
  return (
    <div>
      <h4 className="text-title font-bold">Who came first at your address</h4>
      <ol className="mt-3 divide-y divide-line rounded-inner border border-line bg-surface-2 px-4">
        {rows.map((x, i) => (
          <li key={x.name} className="flex min-h-14 items-center gap-3 py-2">
            <span className="w-9 shrink-0 text-body font-bold">{ord(i + 1)}</span>
            <span className="min-w-0 flex-1 break-words text-body font-semibold">{x.name}</span>
            {x.rating !== null && (
              <span className="flex shrink-0 items-center gap-1 text-small text-text-2">
                <Star className="size-4 fill-current text-warn" aria-hidden />
                {x.rating}
                {x.reviews !== null && <span>({x.reviews} reviews)</span>}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The nearby details: the plain lines, who came first, the cards with the diagram and the 49 points, why it varies. */
function NearbyDetails({ check, handoff }: { check: FreeCheck; handoff: string | null }) {
  const nearby = toNearbyCheck(check);
  const done = check.map.state === "done" ? check.map : null;
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-body">
        {done && nearby && (
          <p>
            {nearbyCount(
              done.top3,
              done.points,
              nearby.ranks.map((r) => r || null),
            )}
          </p>
        )}
        <p className="text-text-2">{NEARBY_SAMPLE}</p>
      </div>
      <AtAddress check={check} />
      {done?.rivals?.length ? (
        <div>
          <h4 className="text-title font-bold">Who came up most around you</h4>
          <ul className="mt-3 divide-y divide-line rounded-inner border border-line bg-surface-2 px-4">
            {done.rivals.map((r) => (
              <li
                key={r.name}
                className="flex min-h-14 flex-wrap items-center justify-between gap-x-3 py-2 text-body"
              >
                <span className="min-w-0 break-words font-semibold">{r.name}</span>
                <span className="text-text-2">
                  In the results at {r.places} of {done.points} points
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {nearby ? (
        <NearbyPlaces check={nearby} example={false} title="p" diagram />
      ) : check.map.state === "mapping" ? (
        <div>
          <StatusPill tone="info">Searching</StatusPill>
          <p className="mt-3 text-body">
            This was the quick check, from your address. The full check from 49 places around you
            takes a few minutes.
          </p>
          {handoff && (
            <a
              href={handoff}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonClass("whatsapp"), "mt-4")}
            >
              <WhatsAppGlyph />
              Send the full map to my WhatsApp
            </a>
          )}
        </div>
      ) : null}
      <p className="text-body text-text-2">{WHY_VARIES}</p>
    </div>
  );
}

/** "Did ChatGPT name your business?": the verdict, the question, model and date, the sources, the sample note. */
function AiDetails({ ai }: { ai: NonNullable<FreeCheck["ai"]> }) {
  const sources = ai.sources ?? [];
  const asked = aiAskedLines(ai);
  return (
    <div className="space-y-3">
      {asked.length > 0 && (
        <ul className="space-y-1 text-body break-words text-text-2">
          {asked.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
      {ai.question &&
        (sources.length ? (
          <div>
            <p className="text-body font-bold">Sources cited</p>
            <ul className="mt-1 space-y-1 text-body text-text-2">
              {sources.map((x) => (
                <li key={`${x.domain}|${x.title}`} className="break-words">
                  <span className="font-semibold text-text-1">{x.domain}</span>
                  {x.title ? `, ${x.title}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : ai.sources_line ? (
          <p className="text-body text-text-2">{ai.sources_line}</p>
        ) : null)}
      {ai.accuracy ? (
        <>
          <p className="text-body font-semibold">{ai.accuracy.line}</p>
          <p
            dir="auto"
            data-long-ok
            className="border-s-2 border-line-strong ps-3 text-body text-text-2"
          >
            &ldquo;{ai.accuracy.sentence}&rdquo;
          </p>
          <p className="text-body">
            Make sure your Google profile and website say this. AI assistants read them.
          </p>
        </>
      ) : null}
      <p className="text-small text-text-2">{ai.question ? AI_SAMPLE : ai.label}</p>
    </div>
  );
}

/** A quiet drawing of places around a business (no numbers: nothing is checked there yet). */
function NearbyMark() {
  return (
    <svg viewBox="0 0 64 64" className="size-16 shrink-0 text-text-3" aria-hidden>
      <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeDasharray="3 4" />
      <circle cx="32" cy="32" r="16" fill="none" stroke="currentColor" strokeDasharray="3 4" />
      {[
        [32, 4],
        [60, 32],
        [32, 60],
        [4, 32],
        [48, 20],
        [16, 44],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="currentColor" />
      ))}
      <circle cx="32" cy="32" r="5" className="fill-text-1" />
    </svg>
  );
}

/** The full trial terms, on request (Polish 2, decision 6; facts 4.3 and 5). */
const START_STEPS = [
  { dt: "Free", dd: "This check, and your first 14 days of Pro. No card." },
  {
    dt: "To start",
    dd: "Add Kabsi as a Manager on your Google profile. It takes about two minutes, and you stay the owner.",
  },
  {
    dt: "Your first days",
    dd: "Kabsi checks your details on Google and prepares a reply for each new review. Each one waits for your yes.",
  },
  {
    dt: "When the 14 days start",
    dd: "Only once Kabsi's access works, so waiting for Google costs you nothing. Nothing is charged by itself.",
  },
] as const;

/** The main finding: one fact, why it matters, one next step (30.34 item 2). */
function MainFindingCard({ f }: { f: MainFinding }) {
  return (
    <section
      aria-labelledby="first-h"
      className="animate-enter rounded-panel border border-line bg-surface-1 p-5 sm:p-8"
    >
      <h2 id="first-h" className="text-h3">
        <Marked text="The main thing we found" mark="main thing" />
      </h2>
      <p className="mt-3 text-h3 font-bold">{f.fact}</p>
      <p className="mt-2 text-lead text-text-2">{f.why}</p>
      <p className="mt-4 flex gap-3 rounded-inner bg-surface-2 p-4 text-body">
        <ArrowRight className="mt-1 size-4 shrink-0" aria-hidden />
        <span>
          <span className="font-bold">Next step: </span>
          {f.next}
        </span>
      </p>
    </section>
  );
}

/** What Kabsi would do: three short lines, each saying who does what, then what Kabsi cannot promise. */
function WouldDoCard({ lines }: { lines: { who: string; line: string }[] }) {
  return (
    <section
      aria-labelledby="day1-h"
      className="rounded-panel border border-line bg-surface-1 p-5 sm:p-8"
    >
      <h2 id="day1-h" className="text-h3">
        <Marked text="What Kabsi would do" mark="would do" />
      </h2>
      <ol className="mt-4 space-y-4">
        {lines.map((l, i) => (
          <li key={l.line} className="flex gap-3">
            <YellowNumber n={i + 1} className="mt-0.5" />
            <div className="min-w-0">
              <p className="text-small font-bold text-text-2">{l.who}</p>
              <p className="text-body">{l.line}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-body text-text-2">{CANNOT_PROMISE}</p>
    </section>
  );
}

/** The one primary button, when the trial starts, the full terms on request, Founding 25 as a quiet line. */
function TrialCard({
  onStart,
  handoff,
  founding,
}: {
  onStart: () => void;
  handoff: string | null;
  founding: boolean;
}) {
  return (
    <section
      aria-labelledby="trial-h"
      data-main-cta
      className="rounded-panel border border-text-1 bg-surface-1 p-5 shadow-lift sm:p-7"
    >
      <h2 id="trial-h" className="text-h3">
        <Marked text="Your next step" mark="next step" />
      </h2>
      <button type="button" onClick={onStart} className={cn(buttonClass("primary"), "mt-4 w-full")}>
        {TRIAL_BUTTON}
      </button>
      <ul className="mt-3 space-y-1 text-body text-text-2">
        {TRIAL_LINES.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      {handoff && (
        <a
          href={handoff}
          target="_blank"
          rel="noreferrer"
          className={cn(resultLinkCls, "mt-2 text-body")}
        >
          <WhatsAppGlyph />
          Get this on WhatsApp
        </a>
      )}
      <details className="group mt-3 border-t border-line pt-2">
        <summary className="press flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-body font-semibold [&::-webkit-details-marker]:hidden">
          The full trial terms
          <ChevronDown
            className="size-5 transition-transform duration-200 ease-kb group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <dl className="space-y-3 pb-2 text-body">
          {START_STEPS.map((x) => (
            <div key={x.dt}>
              <dt className="font-bold">{x.dt}</dt>
              <dd className="text-text-2">{x.dd}</dd>
            </div>
          ))}
        </dl>
      </details>
      {founding && (
        <p className="mt-2 text-small text-text-2">
          <SiteLink
            to="/founding"
            className="inline-flex min-h-11 items-center underline decoration-text-3 underline-offset-4 hover:decoration-text-1"
          >
            Or apply for Founding 25: three months of Pro, free
          </SiteLink>
        </p>
      )}
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
  // Founding 25 shows only while places remain (the real count; nothing while it is unknown). Polish 2 review.
  const f25 = useFoundingPlaces();
  const check = useCheck(started);
  // Only the mock mode's waiting list; "unavailable" (30.28) shows neither part.
  const waitlist = !!started && "state" in started && started.state === "waitlist";
  const term = check?.term ?? keyword ?? s.category?.toLowerCase() ?? null;
  // 30.30 item 3: the search shown back follows the Latin rule (another script reads as the Google category).
  const shownSearch = term ? (shownTerm(term, s.category ?? null, null)?.term ?? null) : null;
  const rows = foundRows(s);
  const fix = rows.filter((r) => !r.ok).length;
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
    // Signed in already (App 4, 30.31 item 1): straight to /start, which claims the kept check; no log in page.
    const { hasSessionKey } = await import("@/lib/stored-session");
    if (hasSessionKey()) void navigate({ to: "/start" as never });
    else void navigate({ to: "/login", search: { next: "/start" } as never });
  };
  const ai = check?.ai ?? null;

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
          <MainFindingCard f={mainFinding(s.flags)} />
          <WouldDoCard lines={wouldDo(s.flags)} />

          <h2 className="pt-4 text-h3">
            <Marked text="The details, when you want them" mark="details" />
          </h2>
          <Detail
            id="google"
            title="What Google shows about you"
            mark="Google shows"
            summary={foundCount(fix, rows.length - fix)}
          >
            <ul className="divide-y divide-line">
              {rows.map((r) => (
                <li key={r.label} className="flex gap-3 py-3">
                  {r.ok ? (
                    <CircleCheck className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden />
                  ) : (
                    <CircleAlert className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline justify-between gap-x-4 text-body">
                      <span className="font-semibold">{r.label}</span>
                      <span className="min-w-0 break-words font-semibold">
                        {r.value ?? "Missing"}
                      </span>
                    </p>
                    <p className="text-body text-text-2">{r.why}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-small text-text-2">
              Shown live from Google. Kabsi does not store it.
            </p>
            <PlacesAttribution className="mt-1" />
          </Detail>

          {check ? (
            <Detail
              id="nearby"
              title="Where you come up nearby"
              mark="nearby"
              summary={nearbyLead(check.term, check.fast.rank)}
            >
              <NearbyDetails check={check} handoff={handoff} />
            </Detail>
          ) : waitlist ? (
            <section
              aria-labelledby="near-h"
              className="rounded-panel border border-dashed border-line-strong p-5 sm:p-8"
            >
              <div className="flex gap-4">
                <NearbyMark />
                <div>
                  <h3 id="near-h" className="text-h3">
                    Where you come up nearby
                  </h3>
                  <p className="mt-2 text-body text-text-2">
                    Kabsi will search Google Maps from places around you, like a customer standing
                    there.
                  </p>
                </div>
              </div>
              <Waitlist
                business={s.name}
                country={countryOfAddress(s.address)}
                placeId={s.place_id}
                term={term}
              />
            </section>
          ) : null}

          {ai ? (
            <Detail id="ai" title={AI_QUESTION} mark="ChatGPT" summary={aiVerdict(ai).line}>
              <AiDetails ai={ai} />
            </Detail>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1">
          <TrialCard
            onStart={() => void startWeb()}
            handoff={handoff}
            founding={!!f25 && f25.left > 0}
          />
          <AccessCard />
          <SendReport
            placeId={s.place_id}
            code={check?.code ?? null}
            parts={{ nearby: check?.map.state === "done", ai: !!ai }}
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
          <Button type="submit" variant="secondary" loading={state === "sending"}>
            Save my place
          </Button>
        </form>
      )}
    </div>
  );
}

/* ---------- Send me this report (the profile-snapshot function's email and WhatsApp actions) ---------- */

/** Scan 3 (30.34 item 2): what the report holds, said before it is asked for. */
export function reportHolds(parts: { nearby: boolean; ai: boolean }): string {
  const extra = [parts.nearby ? "the nearby check" : null, parts.ai ? "the ChatGPT answer" : null]
    .filter(Boolean)
    .join(" and ");
  return `You get the summary of what Google shows${extra ? `, ${extra}` : ""}, and the link to this result.`;
}

function SendReport({
  placeId,
  code,
  parts,
}: {
  placeId: string;
  code: string | null;
  parts: { nearby: boolean; ai: boolean };
}) {
  const { take, widget } = useTokens();
  // Scan 3 (30.34 item 2): one delivery choice at a time. Without Kabsi's WhatsApp number there is only email.
  const [via, setVia] = useState<"email" | "whatsapp">("email");
  const [email, setEmail] = useState("");
  const [tips, setTips] = useState(false);
  const [phone, setPhone] = useState("");
  const [waOk, setWaOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const byWhatsapp = WHATSAPP_ON && via === "whatsapp";
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
      if (!byWhatsapp)
        await emailCheck({
          placeId,
          email,
          tips,
          page: "/google-profile-check",
          turnstile: await take(),
          code,
        });
      else
        await whatsappCheck({
          placeId,
          phone,
          page: "/google-profile-check",
          turnstile: await take(),
          code,
        });
      track("free_tool_used", { source: "profile_check_email" });
      // Scan 2 (30.29): Lead is a contact given, once, when the report was sent (consent rules unchanged in meta-pixel).
      pixelEvent("Lead", { content_name: "free_check_report" });
      setState("sent");
    } catch (x) {
      setErr(plainError(x));
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
          <Button type="submit" variant="secondary" loading={state === "sending"}>
            Send me this report
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
  const done = live.map.state === "done" ? live.map : null;
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
          <section
            aria-labelledby="first-h"
            className="rounded-panel border border-line bg-surface-1 p-5 sm:p-8"
          >
            <h2 id="first-h" className="text-h3">
              <Marked text="The main thing we found" mark="main thing" />
            </h2>
            <p className="mt-3 text-h3 font-bold">{nearbyLead(live.term, live.fast.rank)}</p>
            {done && (
              <p className="mt-2 text-lead text-text-2">
                {nearbyCount(
                  done.top3,
                  done.points,
                  done.dots.map((d) => d.rank),
                )}
              </p>
            )}
          </section>
          <WouldDoCard lines={wouldDo([])} />
          <h2 className="pt-4 text-h3">
            <Marked text="The details, when you want them" mark="details" />
          </h2>
          <Detail
            id="nearby"
            title="Where you come up nearby"
            mark="nearby"
            summary={nearbyLead(live.term, live.fast.rank)}
          >
            <NearbyDetails check={live} handoff={null} />
          </Detail>
          {live.ai && (
            <Detail id="ai" title={AI_QUESTION} mark="ChatGPT" summary={aiVerdict(live.ai).line}>
              <AiDetails ai={live.ai} />
            </Detail>
          )}
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
            <ScanBox className="mt-4" />
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
