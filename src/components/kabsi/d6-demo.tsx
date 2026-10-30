// The Design 6 demonstration (master plan 30.20 section 3, lane R round 2): one phone, in the hero. A review has
// arrived and Kabsi's reply is ready; the owner taps Yes, Edit or Skip. After Yes the reply waits 10 seconds with
// Undo, then "Sent to Google", then "Live on Google" with a link. The status card beside the phone and the five
// steps on the dark band below follow the same state. Approved, sent and live are always three separate steps.
// One failure state. No backend: every message is fixed Example data, so the same taps always give the same story.
// It never shows an empty chat: it starts at the review and the ready reply, also with reduced motion.
import { AlertTriangle, Check, ExternalLink, RotateCcw } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { Bubble, PhoneFrame, TypingBubble, WaComposer, WaHeader, WaStatusBar } from "./whatsapp";
import { usePrefersReducedMotion } from "./use-in-view";
import { useSearchFlag } from "./page-signals";
import { DEMO } from "./d6-data";

/* ---------- The story as a list of events, so any state is a replay of taps ---------- */

type Ev = "ask" | "yes" | "edit" | "edited" | "skip" | "undo" | "sent" | "live" | "failed";

/** The first frame, on the server and in the browser: the review and the ready reply. */
const READY: Ev[] = ["ask"];

/** Links for screenshots: ?demo=ask, approved, sent, live, failed, edit, skipped, undone. */
const FLAGS: Record<string, Ev[]> = {
  ask: ["ask"],
  approved: ["ask", "yes"],
  undone: ["ask", "yes", "undo"],
  sent: ["ask", "yes", "sent"],
  live: ["ask", "yes", "sent", "live"],
  failed: ["ask", "yes", "sent", "failed"],
  edit: ["ask", "edit", "edited"],
  skipped: ["ask", "skip"],
};

/** The Undo window after Yes, as on the real card (lane R, 26 Oct 2026). Never shortened. */
const UNDO_MS = 10_000;

const STEPS = [
  { title: "A review arrives", text: "A customer leaves a review on your Google profile." },
  { title: "Kabsi prepares a reply", text: "In your voice, using only what the review says." },
  { title: "You say Yes on WhatsApp", text: "You see the exact words. Yes, Edit or Skip." },
  { title: "Sent to Google", text: "Kabsi sends it the moment you say yes." },
  { title: "Live on Google", text: "Kabsi checks it shows, then tells you, with the link." },
] as const;

/** Where the story is, read from the events. Step is the one in progress; 5 means every step is done. */
function read(evs: Ev[]) {
  const last = evs[evs.length - 1];
  const has = (e: Ev) => evs.includes(e);
  const skipped = has("skip");
  const approved = !skipped && evs.lastIndexOf("yes") > evs.lastIndexOf("undo");
  const sent = has("sent");
  const live = has("live");
  const failed = has("failed");
  const step = live ? 5 : sent ? 4 : approved ? 3 : 2;
  return {
    evs,
    last,
    step,
    waiting: last === "ask" || last === "edited" || last === "undo",
    approved,
    sent,
    live,
    failed,
    skipped,
    edited: has("edited"),
  };
}

type DemoState = ReturnType<typeof read> & {
  failMode: boolean;
  setFailMode: (v: boolean) => void;
  onYes: () => void;
  onEdit: () => void;
  onSkip: () => void;
  onUndo: () => void;
  restart: () => void;
};

const DemoCtx = createContext<DemoState | null>(null);

function useDemo() {
  const d = useContext(DemoCtx);
  if (!d) throw new Error("useDemo needs a DemoProvider");
  return d;
}

/** One state for the hero phone, its status card and the steps on the dark band. */
export function DemoProvider({ children }: { children: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  const flag = useSearchFlag("demo");
  const [evs, setEvs] = useState<Ev[]>(READY);
  const [failMode, setFailMode] = useState(false);
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  const later = useCallback(
    (ms: number, fn: () => void) => {
      timers.current.push(window.setTimeout(fn, reduced ? Math.min(ms, 400) : ms));
    },
    [reduced],
  );
  const push = useCallback((e: Ev) => setEvs((v) => [...v, e]), []);

  // A ?demo= link shows that state and holds still.
  useEffect(() => {
    if (flag && FLAGS[flag]) {
      clear();
      setEvs(FLAGS[flag]!);
      if (flag === "failed") setFailMode(true);
    }
  }, [flag]);
  useEffect(() => clear, []);

  const s = read(evs);
  // The failure toggle is read when the reply reaches Google, so it can change during the Undo window.
  const failRef = useRef(failMode);
  failRef.current = failMode;

  const value = useMemo<DemoState>(
    () => ({
      ...s,
      failMode,
      setFailMode,
      onYes: () => {
        if (!s.waiting) return;
        clear();
        push("yes");
        // The Undo window is real time, also with reduced motion.
        timers.current.push(
          window.setTimeout(() => {
            push("sent");
            later(2200, () => push(failRef.current ? "failed" : "live"));
          }, UNDO_MS),
        );
      },
      onEdit: () => {
        if (!s.waiting) return;
        clear();
        push("edit");
        later(1600, () => push("edited"));
      },
      onSkip: () => {
        if (!s.waiting) return;
        clear();
        push("skip");
      },
      onUndo: () => {
        if (!s.approved || s.sent) return;
        clear();
        push("undo");
      },
      restart: () => {
        clear();
        setEvs(READY);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [evs, failMode, later, push],
  );

  return <DemoCtx.Provider value={value}>{children}</DemoCtx.Provider>;
}

/* ---------- The hero: the phone and the status card ---------- */

export function HeroDemo({ cardClassName }: { cardClassName?: string }) {
  const d = useDemo();
  return (
    <>
      <figure className="relative mx-auto w-[min(86%,18.5rem)] pt-2 lg:w-[20rem] xl:ms-[4%]">
        <figcaption className="sr-only">
          Example of Kabsi on WhatsApp for {DEMO.business}. The buttons in the chat work.
        </figcaption>
        <PhoneFrame>
          <div className="flex size-full flex-col bg-wa-header">
            <WaStatusBar />
            <WaHeader />
            <Chat />
            <WaComposer />
          </div>
        </PhoneFrame>
      </figure>
      <StatusCard d={d} className={cardClassName} />
    </>
  );
}

function Chat() {
  const d = useDemo();
  const scroller = useRef<HTMLDivElement>(null);
  // Keep the newest message in view inside the phone (the page itself never scrolls).
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [d.evs]);
  return (
    <div
      ref={scroller}
      aria-live="polite"
      tabIndex={0}
      role="log"
      aria-label="The chat with Kabsi"
      className="wa-ground flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pt-2 pb-2 [scrollbar-width:none]"
    >
      <div className="mt-auto" />
      <p className="mx-auto mb-1 rounded-md bg-wa-in/90 px-2 py-0.5 text-chat-meta font-semibold text-wa-time shadow-bubble">
        Today
      </p>
      <Thread />
    </div>
  );
}

/** The three states, never merged: Approved, Sent to Google, Live on Google. Undo for 10 seconds after Yes. */
function StatusCard({ d, className }: { d: DemoState; className?: string | undefined }) {
  type Mark = "done" | "now" | "later" | "bad";
  const rows: { label: string; mark: Mark }[] = [
    { label: "Approved", mark: d.approved ? "done" : "later" },
    {
      label: "Sent to Google",
      mark: d.failed ? "bad" : d.sent ? "done" : d.approved ? "now" : "later",
    },
    {
      label: "Live on Google",
      mark: d.live ? "done" : d.sent && !d.failed ? "now" : "later",
    },
  ];
  return (
    <div
      className={cn(
        "theme-light rounded-card border border-line bg-surface-1 p-3.5 text-text-1 shadow-float",
        className,
      )}
    >
      <p className="text-label font-bold text-text-2">Your reply to {DEMO.reviewer}</p>
      {/* A row of three under the phone; a list beside it from 1280 px. */}
      <ol
        className="mt-2 grid grid-cols-3 gap-2 xl:block xl:space-y-1.5"
        aria-label="Where the reply is"
        aria-live="polite"
      >
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex flex-col items-start gap-1 text-small leading-tight font-semibold xl:flex-row xl:items-center xl:gap-2"
          >
            <span
              aria-hidden
              className={cn(
                "grid size-4.5 shrink-0 place-items-center rounded-full transition-colors duration-200 ease-kb",
                r.mark === "done" && "bg-kb-green",
                r.mark === "bad" && "bg-kb-amber",
                r.mark === "now" && "border-2 border-text-1",
                r.mark === "later" && "border-2 border-dashed border-text-3",
              )}
            >
              {r.mark === "done" && <Check className="size-3 text-kb-white" strokeWidth={3.5} />}
              {r.mark === "bad" && <AlertTriangle className="size-2.5 text-kb-white" />}
            </span>
            <span
              className={cn(r.mark === "later" && "text-text-2", r.mark === "bad" && "text-bad")}
            >
              {r.label}
            </span>
            <span className="sr-only">
              {r.mark === "done"
                ? ", done"
                : r.mark === "bad"
                  ? ", did not go through"
                  : r.mark === "now"
                    ? ", now"
                    : ", not yet"}
            </span>
          </li>
        ))}
      </ol>
      {d.approved && !d.sent && (
        <button
          type="button"
          onClick={d.onUndo}
          className="press mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-line-strong text-small font-bold hover:bg-surface-2"
        >
          <RotateCcw className="size-4" aria-hidden />
          Undo
        </button>
      )}
    </div>
  );
}

/* ---------- The dark band: the five steps follow the hero ---------- */

export function DemoSteps({ className }: { className?: string }) {
  const d = useDemo();
  return (
    <div className={className}>
      <ol className="grid gap-1 lg:grid-cols-5 lg:gap-4" aria-label="The steps" aria-live="polite">
        {STEPS.map((st, i) => {
          const done = i < d.step;
          const bad = i === 3 && d.failed;
          const skippedHere = i === 2 && d.skipped;
          const now = i === d.step && !bad;
          const text = bad
            ? "Google did not accept it. Nothing was changed."
            : skippedHere
              ? "Skipped. Nothing is posted."
              : st.text;
          return (
            <li
              key={st.title}
              aria-current={now ? "step" : undefined}
              className={cn(
                "flex gap-4 rounded-card px-3 py-2.5 transition-colors duration-200 ease-kb lg:flex-col lg:gap-3 lg:border-t-2 lg:p-4",
                now && "bg-surface-2",
                done ? "lg:border-kb-green" : bad ? "lg:border-bad" : "lg:border-line-strong",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full border text-label font-bold transition-colors duration-200",
                  bad
                    ? "border-bad bg-bad-soft text-bad"
                    : done
                      ? "border-kb-green bg-kb-green text-kb-white"
                      : now
                        ? "border-text-1 text-text-1"
                        : "border-line-strong text-text-3",
                )}
              >
                {bad ? (
                  <AlertTriangle className="size-4" />
                ) : done ? (
                  <Check className="size-4" strokeWidth={3} />
                ) : (
                  i + 1
                )}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className={cn("text-title", !done && !now && !bad && "text-text-2")}>
                  {st.title}
                  <span className="sr-only">
                    {bad ? ", did not go through" : done ? ", done" : now ? ", now" : ""}
                  </span>
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-small text-text-2",
                    !now && !bad && !skippedHere && "hidden lg:block",
                  )}
                >
                  {text}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
        <button
          type="button"
          onClick={d.restart}
          className="press inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-small font-semibold text-text-1 underline decoration-text-3 underline-offset-4 hover:decoration-text-1"
        >
          <RotateCcw className="size-4" aria-hidden />
          Start again
        </button>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-small font-semibold text-text-1">
          <input
            type="checkbox"
            checked={d.failMode}
            onChange={(e) => d.setFailMode(e.target.checked)}
            className="size-5 accent-kb-yellow"
          />
          Show what happens if Google says no
        </label>
      </div>
      <p className="mt-3 text-small text-text-3">
        A sample conversation. This preview publishes nothing, and it moves faster than real time.
      </p>
    </div>
  );
}

/* ---------- The chat ---------- */

function QuickReplies() {
  const d = useDemo();
  const b =
    "press grid min-h-10 place-items-center rounded-bubble bg-wa-in text-chat font-bold text-wa-link shadow-bubble";
  return (
    <div className="ms-2 me-[12%] grid grid-cols-3 gap-1" role="group" aria-label="Your answer">
      <button type="button" className={b} onClick={d.onYes}>
        Yes
      </button>
      <button type="button" className={b} onClick={d.onEdit}>
        Edit
      </button>
      <button type="button" className={b} onClick={d.onSkip}>
        Skip
      </button>
    </div>
  );
}

function Tick({ tone = "ok" }: { tone?: "ok" | "bad" }) {
  return (
    <span
      className={cn(
        "me-1 inline-grid size-4 translate-y-0.5 place-items-center rounded-full",
        tone === "ok" ? "bg-kb-green" : "bg-kb-amber",
      )}
    >
      {tone === "ok" ? (
        <Check className="size-3 text-kb-white" strokeWidth={3.5} aria-hidden />
      ) : (
        <AlertTriangle className="size-2.5 text-kb-white" strokeWidth={3} aria-hidden />
      )}
    </span>
  );
}

/** The chat, replayed from the events in order. The answer buttons show only under the newest question. */
function Thread() {
  const d = useDemo();
  const out: ReactNode[] = [];
  d.evs.forEach((e, i) => {
    const isLast = i === d.evs.length - 1;
    const k = `${e}-${i}`;
    switch (e) {
      case "ask":
        out.push(
          <div key={k} className="space-y-1">
            <Bubble enter={i > 0}>
              <span className="font-bold">{DEMO.business}:</span> new {DEMO.stars}-star review from{" "}
              {DEMO.reviewer} <span className="italic">'{DEMO.quote}'</span>
              <span className="mt-1 block">Reply ready: '{DEMO.reply}' Reply Yes to publish.</span>
            </Bubble>
            {isLast && <QuickReplies />}
          </div>,
        );
        break;
      case "edit":
        out.push(
          <Bubble key={k} out read>
            Edit
          </Bubble>,
          <Bubble key={`${k}-k`}>
            Send the words you want. I show you the new reply before anything is published.
          </Bubble>,
        );
        if (isLast) out.push(<TypingBubble key={`${k}-t`} />);
        break;
      case "edited":
        out.push(
          <Bubble key={k} out read>
            {DEMO.ownerEdit}
          </Bubble>,
          <div key={`${k}-k`} className="space-y-1">
            <Bubble>New reply ready: '{DEMO.edited}' Reply Yes to publish.</Bubble>
            {isLast && <QuickReplies />}
          </div>,
        );
        break;
      case "skip":
        out.push(
          <Bubble key={k} out read>
            Skip
          </Bubble>,
          <Bubble key={`${k}-k`}>Skipped. Nothing is posted.</Bubble>,
        );
        break;
      case "yes":
        out.push(
          <Bubble key={k} out read>
            Yes
          </Bubble>,
          <div key={`${k}-k`} className="space-y-1">
            <Bubble>
              <Tick />
              Approved. It goes to Google in 10 seconds.
            </Bubble>
            {isLast && (
              <div className="ms-2 me-[48%]">
                <button
                  type="button"
                  onClick={d.onUndo}
                  className="press grid min-h-10 w-full place-items-center rounded-bubble bg-wa-in text-chat font-bold text-wa-link shadow-bubble"
                >
                  Undo
                </button>
              </div>
            )}
          </div>,
        );
        break;
      case "undo":
        out.push(
          <Bubble key={k} out read>
            Undo
          </Bubble>,
          <div key={`${k}-k`} className="space-y-1">
            <Bubble>Undone. Nothing was sent. The reply waits for your yes.</Bubble>
            {isLast && <QuickReplies />}
          </div>,
        );
        break;
      case "sent":
        out.push(
          <Bubble key={k}>
            <Tick />
            Sent to Google. I will tell you when it is live.
          </Bubble>,
        );
        if (isLast) out.push(<TypingBubble key={`${k}-t`} />);
        break;
      case "live":
        out.push(
          <Bubble key={k}>
            <Tick />
            Live on Google: your reply to {DEMO.reviewer}{" "}
            <a
              href="https://www.google.com/maps"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 font-semibold text-wa-link underline underline-offset-2"
            >
              See it on Google
              <ExternalLink className="size-3" aria-hidden />
            </a>
          </Bubble>,
        );
        break;
      case "failed":
        out.push(
          <Bubble key={k}>
            <Tick tone="bad" />
            Google did not accept it. Nothing was changed. Kabsi will tell you what to do.
          </Bubble>,
        );
        break;
    }
  });
  if (d.live || d.failed || d.skipped) {
    out.push(
      <div key="again" className="flex justify-center pt-1">
        <button
          type="button"
          onClick={d.restart}
          className="press inline-flex min-h-10 items-center gap-1.5 rounded-full bg-wa-in px-3 text-chat font-semibold text-wa-link shadow-bubble"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Start again
        </button>
      </div>,
    );
  }
  return <>{out}</>;
}
