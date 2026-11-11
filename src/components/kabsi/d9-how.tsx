// Design 9 How it works (Web 5 part C, master plan 30.24): the demonstration in three cases (Hours changed, Photo to
// post, New review), each through Approved, Sent to Google and Live on Google, or Did not go through. Deterministic
// Example data, no backend: nothing here calls Kabsi or Google. CSS only; the 10 second Undo window is real time, as
// on the real card. Any state has a link for screenshots: ?case=hours|photo|review and ?state=approved|sent|live|failed.
import { CircleAlert, CircleCheck, RotateCcw } from "lucide-react";
import { StateTrack as SharedTrack } from "./state-track";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ExampleBadge, KabsiMark, Switch } from "./ui";
import { Img, PHOTOS } from "./photos";
import { useSearchFlag } from "./page-signals";
import {
  D9_BUSINESS,
  D9_CASES,
  D9_FAILED_TEXT,
  D9_STATES,
  D9_UNDO_SECONDS,
  d9NextState,
  d9OtherLine,
  type CaseId,
  type DemoCase,
  type DemoState,
} from "./d9-data";
import { Marked } from "@/components/kabsi/highlight";

type Outcome = { state: DemoState; other?: string | undefined };
/** How long "Sent to Google" shows before the answer, in the demonstration only. */
const SENT_MS = 2200;

export function DemoThreeCases() {
  const caseFlag = useSearchFlag("case");
  const stateFlag = useSearchFlag("state");
  const [caseId, setCaseId] = useState<CaseId>("hours");
  const [out, setOut] = useState<Outcome>({ state: "ask" });
  const [failMode, setFailMode] = useState(false);
  const [left, setLeft] = useState(D9_UNDO_SECONDS);
  const timers = useRef<number[]>([]);
  const failRef = useRef(false);
  failRef.current = failMode;

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clear, []);

  useEffect(() => {
    if (caseFlag === "hours" || caseFlag === "photo" || caseFlag === "review") setCaseId(caseFlag);
    if (
      stateFlag === "approved" ||
      stateFlag === "sent" ||
      stateFlag === "live" ||
      stateFlag === "failed"
    ) {
      setOut({ state: stateFlag });
      if (stateFlag === "failed") setFailMode(true);
    }
  }, [caseFlag, stateFlag]);

  const c = D9_CASES.find((x) => x.id === caseId)!;

  const reset = () => {
    clear();
    setOut({ state: "ask" });
    setLeft(D9_UNDO_SECONDS);
  };
  const pick = (id: CaseId) => {
    setCaseId(id);
    reset();
  };
  const approve = () => {
    clear();
    setOut({ state: "approved" });
    setLeft(D9_UNDO_SECONDS);
    for (let i = 1; i <= D9_UNDO_SECONDS; i++)
      timers.current.push(window.setTimeout(() => setLeft(D9_UNDO_SECONDS - i), i * 1000));
    timers.current.push(
      window.setTimeout(() => {
        setOut({ state: d9NextState("approved", failRef.current) });
        timers.current.push(
          window.setTimeout(() => setOut({ state: d9NextState("sent", failRef.current) }), SENT_MS),
        );
      }, D9_UNDO_SECONDS * 1000),
    );
  };

  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const onTabKey = (e: KeyboardEvent, i: number) => {
    const n = D9_CASES.length;
    const j =
      e.key === "ArrowRight"
        ? (i + 1) % n
        : e.key === "ArrowLeft"
          ? (i - 1 + n) % n
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? n - 1
              : -1;
    if (j < 0) return;
    e.preventDefault();
    pick(D9_CASES[j]!.id);
    tabs.current[j]?.focus();
  };

  return (
    <section aria-labelledby="demo-h" className="border-t border-line bg-surface-1">
      <div className="container-kb section-y">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="demo-h" className="text-h2">
            <Marked text="What you approve." mark="you approve." />
          </h2>
          <ExampleBadge />
        </div>
        <p className="mt-3 max-w-[40rem] text-body text-text-2">
          Pick a case and tap the main button. Each state shows as it happens.
        </p>
        <div
          role="tablist"
          aria-label="Example cases"
          className="mt-6 grid w-full grid-cols-3 gap-1 rounded-card border border-line-strong bg-surface-0 p-1 sm:inline-flex sm:w-auto sm:rounded-full"
        >
          {D9_CASES.map((x, i) => (
            <button
              key={x.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${x.id}`}
              aria-selected={x.id === caseId}
              aria-controls="demo-panel"
              tabIndex={x.id === caseId ? 0 : -1}
              onClick={() => pick(x.id)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={cn(
                "press min-h-11 shrink-0 rounded-inner px-2 text-small leading-tight font-bold sm:rounded-full sm:px-5 sm:whitespace-nowrap",
                x.id === caseId ? "bg-text-1 text-surface-0" : "text-text-2 hover:text-text-1",
              )}
            >
              {x.tab}
            </button>
          ))}
        </div>
        <div
          id="demo-panel"
          role="tabpanel"
          aria-labelledby={`tab-${caseId}`}
          className="mt-8 grid gap-8 lg:grid-cols-[auto_1fr] lg:items-start lg:gap-16"
        >
          <DemoPhone
            c={c}
            out={out}
            left={left}
            onApprove={approve}
            onUndo={reset}
            onOther={(o) => setOut({ state: "ask", other: o })}
          />
          <div className="max-w-[32rem]">
            <StateTrack state={out.state} />
            <p className="mt-6 min-h-12 text-body text-text-2" aria-live="polite">
              {out.state === "live"
                ? c.summary
                : out.state === "ask"
                  ? "Nothing has happened yet. Nothing goes to Google before your yes."
                  : ""}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Switch
                checked={failMode}
                onChange={setFailMode}
                label="Show what happens when Google says no"
              />
              {out.state !== "ask" && (
                <button
                  type="button"
                  onClick={reset}
                  className="press inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-small font-bold text-text-1 underline underline-offset-4"
                >
                  <RotateCcw className="size-4" aria-hidden />
                  Start again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Approved, Sent to Google, Live on Google: never merged. Did not go through replaces Live when Google says no. The
 * shared track (state-track.tsx), the same one the signed-in website uses. */
function StateTrack({ state }: { state: DemoState }) {
  return (
    <SharedTrack
      layout="column"
      state={state === "ask" ? "none" : state}
      steps={D9_STATES}
      failedText={D9_FAILED_TEXT}
    />
  );
}

function Out({ children }: { children: string }) {
  return (
    <li className="ms-auto max-w-[80%] rounded-bubble rounded-se-none bg-wa-out px-2.5 py-1.5 text-chat text-wa-ink shadow-bubble">
      {children}
    </li>
  );
}
function In({ children, tone }: { children: ReactNode; tone?: "ok" | "bad" }) {
  return (
    <li className="me-auto max-w-[92%] animate-pop rounded-bubble rounded-ss-none bg-wa-in px-2.5 py-1.5 text-chat text-wa-ink shadow-bubble">
      {tone && (
        <span
          className={cn(
            "me-1 inline-block align-[-2px]",
            tone === "ok" ? "text-kb-green-ink" : "text-kb-red-ink",
          )}
        >
          {tone === "ok" ? (
            <CircleCheck className="size-3.5" aria-hidden />
          ) : (
            <CircleAlert className="size-3.5" aria-hidden />
          )}
        </span>
      )}
      {children}
    </li>
  );
}

function DemoPhone({
  c,
  out,
  left,
  onApprove,
  onUndo,
  onOther,
}: {
  c: DemoCase;
  out: Outcome;
  left: number;
  onApprove: () => void;
  onUndo: () => void;
  onOther: (label: string) => void;
}) {
  const s = out.state;
  const after = s !== "ask";
  return (
    <div className="mx-auto w-[18.5rem] sm:w-[20rem] lg:mx-0">
      <div className="rounded-[2.4rem] bg-kb-black p-[0.55rem] shadow-float">
        <div className="flex min-h-[15rem] flex-col overflow-hidden rounded-[1.9rem] bg-wa-chat">
          <div className="flex items-center gap-2 border-b border-wa-divider bg-wa-header px-3 pt-4 pb-2 text-wa-ink">
            <KabsiMark ring={false} className="size-8" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-chat font-bold">Kabsi</p>
              <p className="truncate text-chat-meta text-wa-time-out">For {D9_BUSINESS}</p>
            </div>
            <ExampleBadge className="shrink-0" />
          </div>
          <ol
            className="flex flex-1 flex-col justify-end gap-2 overflow-y-auto px-2.5 py-3"
            aria-label="Messages, Example"
            aria-live="polite"
          >
            {c.ownerFirst && (
              <li className="ms-auto w-[78%] rounded-bubble rounded-se-none bg-wa-out p-1.5 text-chat text-wa-ink shadow-bubble">
                <Img
                  photo={PHOTOS.salonStudio}
                  sizes="160px"
                  decorative
                  className="aspect-[4/3] w-full rounded-[0.375rem] object-cover object-[50%_30%]"
                />
                <span className="block px-1 pt-1">{c.ownerFirst}</span>
              </li>
            )}
            <li className="me-auto max-w-[92%] rounded-bubble rounded-ss-none bg-wa-in px-2.5 py-1.5 text-chat text-wa-ink shadow-bubble">
              <span className={cn(c.photo && "flex gap-2")}>
                {c.photo && (
                  <Img
                    photo={PHOTOS.salonStudio}
                    sizes="48px"
                    decorative
                    className="h-14 w-10 shrink-0 rounded-[0.375rem] object-cover"
                  />
                )}
                <span>
                  {c.ask}
                  {c.quote && <span className="mt-0.5 block italic">'{c.quote}'</span>}
                </span>
              </span>
            </li>
            {!after && !out.other && (
              <li
                className="grid gap-1"
                style={{ gridTemplateColumns: `repeat(${1 + c.others.length}, minmax(0,1fr))` }}
              >
                <button
                  type="button"
                  onClick={onApprove}
                  className="press min-h-11 rounded-bubble bg-wa-in px-1 text-chat font-bold text-wa-link shadow-bubble ring-2 ring-wa-link/40"
                >
                  {c.yes}
                </button>
                {c.others.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => onOther(o)}
                    className="press min-h-11 rounded-bubble bg-wa-in px-1 text-chat font-semibold text-wa-link shadow-bubble"
                  >
                    {o}
                  </button>
                ))}
              </li>
            )}
            {out.other && (
              <>
                <Out>{out.other}</Out>
                <In>{d9OtherLine(out.other)}</In>
                <li className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={onUndo}
                    className="press min-h-11 rounded-full bg-wa-in px-4 text-chat font-bold text-wa-link shadow-bubble"
                  >
                    Try again
                  </button>
                </li>
              </>
            )}
            {after && <Out>{c.yes}</Out>}
            {after && <In tone="ok">{c.approved}</In>}
            {s === "approved" && (
              <li className="me-auto">
                <button
                  type="button"
                  onClick={onUndo}
                  className="press min-h-11 rounded-bubble bg-wa-in px-4 text-chat font-bold text-wa-link shadow-bubble"
                >
                  Undo ({left} s)
                </button>
              </li>
            )}
            {(s === "sent" || s === "live" || s === "failed") && <In tone="ok">{c.sent}</In>}
            {s === "live" && <In tone="ok">{c.live}</In>}
            {s === "failed" && <In tone="bad">{c.failed}</In>}
          </ol>
        </div>
      </div>
    </div>
  );
}

/** The hero's visual: the three cases and the one path they share. */
export function HowVisual() {
  return (
    <figure className="rounded-panel border border-line bg-surface-1 p-5 shadow-lift sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-title font-bold">Three cases, one path</p>
        <ExampleBadge />
      </div>
      <ul className="mt-4 divide-y divide-line">
        {D9_CASES.map((c) => (
          <li key={c.id} className="py-3">
            <p className="text-small font-bold">{c.tab}</p>
            <p className="text-small text-text-2">{c.summary}</p>
          </li>
        ))}
      </ul>
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-label font-semibold">
        {D9_STATES.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-1">
            <CircleCheck className="size-4 text-ok" aria-hidden />
            {s.label}
          </span>
        ))}
      </p>
    </figure>
  );
}
