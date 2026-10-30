// The access steps (brief section 16, item 6, and 16.1): one component for /manager-steps, onboarding and the free
// check. The ID on its own line with "Copy the ID", the five written steps with Kabsi's own drawings, Rashid's
// recording in a plain phone frame (Play and Pause, the current step's line under it in HTML and highlighted in
// the written steps), the three states, and "Send these steps to whoever looks after your Google profile".
import { Check, Clock, Copy, Mail, Pause, Play, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { KABSI_GROUP_ID } from "@/lib/site";
import { ADD_KABSI, ADD_KABSI_DESKTOP, REMOVE_KABSI, type AccessVideo } from "./access-video";
import { Button, WhatsAppGlyph, buttonClass } from "./ui";
import { usePrefersReducedMotion } from "./use-in-view";

/** Kabsi Clients, Kabsi's business group on Google (master plan 30.17 section 3). The one value lives in src/lib/site.ts. */
export { KABSI_GROUP_ID };

/** The approved line (brief section 16.1). */
export const ACCESS_LINE = `On Google, open your profile (search your business name while signed in), then Menu, Business Profile settings, People and access, Add. Paste ${KABSI_GROUP_ID}, choose Manager, then Add (on some screens, Invite).`;
export const ID_LINE = `${KABSI_GROUP_ID} is Kabsi Clients, Kabsi's business group on Google. Never send us a password or a code.`;
export const PENDING_LINE =
  "It shows as Pending until a person at Kabsi accepts it, within one working day.";

export const ACCESS_STEPS = [
  "On Google, open your profile: search your business name while signed in.",
  "Tap Menu, then Business Profile settings.",
  "Tap People and access, then Add.",
  `Paste ${KABSI_GROUP_ID} and choose Manager.`,
  "Tap Add. On some screens the button says Invite.",
] as const;

/** Which written step each line of the add recording belongs to (access-video.ts). */
const VIDEO_TO_STEP = [0, 1, 2, 2, 3, 3, 4, 4];

const SEND_TEXT = `Please add Kabsi as a Manager on our Google Business Profile. ${ACCESS_LINE} ${ID_LINE}`;

export type AccessState = "steps" | "pending" | "accepted" | "checked";

export function AccessSteps({
  state = "steps",
  className,
  headingLevel = "h2",
  belowFold = true,
  states = true,
}: {
  state?: AccessState;
  className?: string | undefined;
  headingLevel?: "h2" | "h3";
  /** preload="none" when the video starts below the fold. */
  belowFold?: boolean;
  /** Onboarding draws its own three states above. */
  states?: boolean;
}) {
  const [videoStep, setVideoStep] = useState(-1);
  const current = videoStep >= 0 ? VIDEO_TO_STEP[videoStep]! : -1;
  const H = headingLevel;

  // Brief section 17.1: the recording right under the ID, before the written steps. The phone recording on
  // phones, the computer one from 768 px in a plain browser frame of our own. Both are in the HTML; the hidden one
  // never loads (preload none, and it never comes into view).
  return (
    <div className={cn("max-w-3xl", className)}>
      <div className="min-w-0">
        <IdBlock />
        <VideoPlayer
          video={ADD_KABSI}
          onStep={setVideoStep}
          belowFold={belowFold}
          className="mt-8 md:hidden"
        />
        <VideoPlayer
          video={ADD_KABSI_DESKTOP}
          onStep={setVideoStep}
          belowFold={belowFold}
          frame="browser"
          className="mt-8 hidden md:block"
        />

        <H className={cn("mt-10", H === "h2" ? "text-h3" : "text-title")}>Five steps on Google</H>
        <p className="mt-2 text-small text-text-2">{ACCESS_LINE}</p>
        <ol className="mt-6 space-y-3">
          {ACCESS_STEPS.map((s, i) => (
            <li
              key={s}
              aria-current={i === current ? "step" : undefined}
              className={cn(
                "grid grid-cols-[2rem_1fr] items-center gap-4 rounded-card border p-3 transition-colors duration-200 sm:grid-cols-[2rem_1fr_9rem]",
                i === current ? "border-text-1 bg-surface-2" : "border-line",
              )}
            >
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full font-display text-small font-bold",
                  i === current ? "bg-text-1 text-surface-0" : "border border-line-strong",
                )}
                aria-hidden
              >
                {i + 1}
              </span>
              <span className="text-body font-semibold text-text-1">{s}</span>
              <span className="col-span-2 sm:col-span-1">
                <StepDrawing step={i} />
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-label text-text-3">
          Our own drawings of each step, not screens from Google.
        </p>

        {states && <AccessStates state={state} />}
        <SendSteps />
      </div>
    </div>
  );
}

/* ---------- The ID, on its own line ---------- */

export function IdBlock({ className }: { className?: string | undefined }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(KABSI_GROUP_ID);
    } catch {
      /* clipboard blocked: the number is selectable */
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div
      className={cn("rounded-panel border border-line-strong bg-surface-1 p-5 sm:p-6", className)}
    >
      <p className="text-small font-bold text-text-2">Kabsi's ID on Google</p>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="select-all font-display text-h2 font-bold tracking-wide text-text-1 tabular-nums">
          {KABSI_GROUP_ID}
        </p>
        <Button
          variant="secondary"
          onClick={copy}
          icon={
            copied ? (
              <Check className="size-5" aria-hidden />
            ) : (
              <Copy className="size-5" aria-hidden />
            )
          }
        >
          {copied ? "Copied" : "Copy the ID"}
        </Button>
      </div>
      <p className="mt-4 text-small text-text-2">{ID_LINE}</p>
      <span className="sr-only" role="status">
        {copied ? "Copied" : ""}
      </span>
    </div>
  );
}

/* ---------- The three states ---------- */

export function AccessStates({ state }: { state: AccessState }) {
  const rows = [
    { label: "Invite pending", line: PENDING_LINE },
    {
      label: "Accepted by Kabsi",
      line: "Kabsi accepted the invite and is checking it can read your profile.",
    },
    {
      label: "Access checked",
      line: "Kabsi can see your Google profile. Nothing has been published.",
    },
  ];
  const at = state === "steps" ? -1 : state === "pending" ? 0 : state === "accepted" ? 1 : 2;
  return (
    <div className="mt-10 rounded-card border border-line p-5">
      <p className="text-small font-bold">After you tap Add</p>
      <ol className="mt-4 space-y-4" aria-label="Google access">
        {rows.map((r, i) => {
          const done = i < at || (i === 2 && at === 2);
          const now = i === at && !done;
          return (
            <li key={r.label} className="grid grid-cols-[2rem_1fr] gap-3">
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full",
                  done
                    ? "bg-kb-green text-kb-white"
                    : now
                      ? "border-2 border-text-1"
                      : "border border-line-strong",
                )}
              >
                {done ? (
                  <Check className="size-4" strokeWidth={3} aria-hidden />
                ) : now ? (
                  <Clock className="size-4" aria-hidden />
                ) : null}
              </span>
              <div>
                <p className={cn("text-body font-bold", !done && !now && "text-text-2")}>
                  {r.label}
                  <span className="sr-only">{done ? ", done" : now ? ", now" : ""}</span>
                </p>
                <p className="mt-0.5 text-small text-text-2">{r.line}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------- Send the steps on ---------- */

export function SendSteps() {
  return (
    <div className="mt-8">
      <p className="text-body font-bold">
        Send these steps to whoever looks after your Google profile
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <a
          // Opens WhatsApp with the steps ready; the owner picks who gets them (no number of Kabsi's in the link).
          href={`https://wa.me/?text=${encodeURIComponent(SEND_TEXT)}`}
          target="_blank"
          rel="noreferrer"
          className={buttonClass("whatsapp", "md")}
        >
          <WhatsAppGlyph className="size-4.5" />
          Send on WhatsApp
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent("Please add Kabsi as a Manager")}&body=${encodeURIComponent(SEND_TEXT)}`}
          className={buttonClass("secondary", "md")}
        >
          <Mail className="size-5" aria-hidden />
          Send by email
        </a>
      </div>
    </div>
  );
}

/* ---------- The recording, in a plain phone frame of our own ---------- */

export function VideoPlayer({
  video,
  onStep,
  belowFold = true,
  showLine = true,
  frame = "phone",
  className,
}: {
  video: AccessVideo;
  /** A plain phone or a plain browser window, both Kabsi's own (no device or browser brand). */
  frame?: "phone" | "browser";
  onStep?: (i: number) => void;
  belowFold?: boolean;
  showLine?: boolean;
  className?: string | undefined;
}) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);

  // Plays muted when it comes into view, never under reduced motion.
  useEffect(() => {
    const v = ref.current;
    if (!v || reduced) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) void v.play().catch(() => undefined);
        else v.pause();
      },
      { threshold: 0.5 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [reduced]);

  const onTime = () => {
    const t = ref.current?.currentTime ?? 0;
    let i = 0;
    video.steps.forEach((s, n) => {
      if (t >= s.at) i = n;
    });
    if (i !== step) {
      setStep(i);
      onStep?.(i);
    }
  };
  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  };

  return (
    <figure
      className={cn("w-full", frame === "phone" ? "mx-auto max-w-[16rem]" : "max-w-3xl", className)}
    >
      <div
        className={cn(
          "border border-line-strong bg-kb-black shadow-phone",
          frame === "phone" ? "rounded-phone p-2.5" : "overflow-hidden rounded-card",
        )}
      >
        {frame === "browser" && (
          <div aria-hidden className="flex h-9 items-center gap-1.5 border-b border-line px-3">
            {[0, 1, 2].map((n) => (
              <span key={n} className="size-2.5 rounded-full bg-text-3" />
            ))}
            <span className="ms-3 h-5 flex-1 rounded-full bg-surface-2" />
          </div>
        )}
        <div
          className={cn("relative overflow-hidden bg-kb-ink", frame === "phone" && "rounded-panel")}
        >
          <video
            ref={ref}
            src={video.src}
            poster={video.poster}
            width={video.w}
            height={video.h}
            muted
            playsInline
            loop
            preload={belowFold ? "none" : "metadata"}
            aria-label={video.label}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={onTime}
            className="block h-auto w-full"
          />
        </div>
      </div>
      <div className="mt-4 flex items-start gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause the recording" : "Play the recording"}
          className="press grid size-11 shrink-0 place-items-center rounded-full border border-line-strong text-text-1 hover:bg-surface-2"
        >
          {playing ? (
            <Pause className="size-5" aria-hidden />
          ) : (
            <Play className="size-5" aria-hidden />
          )}
        </button>
        {showLine && (
          <figcaption className="min-h-11 pt-2.5 text-small font-semibold text-text-1">
            {step >= 0
              ? video.steps[step]!.line
              : `A ${Math.round(video.seconds)} second recording, on a real profile.`}
          </figcaption>
        )}
      </div>
    </figure>
  );
}

/* ---------- Removing Kabsi: the second recording ---------- */

export function RemoveKabsi({
  className,
  title = "You can remove Kabsi any time.",
  children,
  list = true,
}: {
  className?: string | undefined;
  title?: string;
  children?: ReactNode;
  /** Home shows the recording with its caption line only, to stay short. */
  list?: boolean;
}) {
  const [step, setStep] = useState(-1);
  return (
    <div
      className={cn(
        "grid gap-8 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-start sm:gap-10",
        className,
      )}
    >
      <div>
        <p className="flex items-center gap-2 text-title">
          <ShieldCheck className="size-5 text-ok" aria-hidden />
          {title}
        </p>
        {children ?? (
          <p className="mt-2 text-body text-text-2">
            On Google: your profile, Business Profile settings, People and access, Kabsi Clients,
            Remove. Kabsi loses access at once.
          </p>
        )}
        {list && (
          <ol className="mt-5 space-y-2">
            {REMOVE_KABSI.steps.map((s, i) => (
              <li
                key={s.line}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "rounded-inner px-3 py-2 text-small transition-colors duration-200",
                  i === step ? "bg-surface-2 font-semibold text-text-1" : "text-text-2",
                )}
              >
                {s.line}
              </li>
            ))}
          </ol>
        )}
      </div>
      <VideoPlayer video={REMOVE_KABSI} onStep={setStep} showLine={!list} />
    </div>
  );
}

/* ---------- Kabsi's own drawings of each step (never Google's screens or colours) ---------- */

function Sheet({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="block rounded-inner border border-kb-stone/30 bg-kb-white p-2 text-chat-meta leading-tight text-kb-ink"
    >
      {children}
    </span>
  );
}

function StepDrawing({ step }: { step: number }) {
  const row = (label: string, on = false) => (
    <span
      key={label}
      className={cn(
        "block truncate rounded-input px-1.5 py-1",
        on ? "bg-kb-ink font-bold text-kb-white" : "text-kb-stone",
      )}
    >
      {label}
    </span>
  );
  if (step === 0)
    return (
      <Sheet>
        <span className="block truncate rounded-full border border-kb-stone px-2 py-1">
          Your business name
        </span>
        <span className="mt-1.5 block h-2 w-3/4 rounded-full bg-kb-stone/20" />
        <span className="mt-1 block h-2 w-1/2 rounded-full bg-kb-stone/20" />
      </Sheet>
    );
  if (step === 1)
    return (
      <Sheet>
        {row("Menu")}
        {row("Business Profile settings", true)}
      </Sheet>
    );
  if (step === 2)
    return (
      <Sheet>
        {row("People and access", true)}
        <span className="mt-1 block text-end">
          <span className="inline-block rounded-full border border-kb-ink px-2 py-0.5 font-bold">
            Add
          </span>
        </span>
      </Sheet>
    );
  if (step === 3)
    return (
      <Sheet>
        <span className="block rounded-input border border-kb-stone px-1.5 py-1 tabular-nums">
          {KABSI_GROUP_ID}
        </span>
        <span className="mt-1 inline-flex items-center gap-1 rounded-input border-2 border-kb-ink px-1.5 py-0.5 font-bold">
          <Check className="size-3" strokeWidth={3} /> Manager
        </span>
      </Sheet>
    );
  return (
    <Sheet>
      <span className="block text-end">
        <span className="inline-block rounded-full bg-kb-ink px-2.5 py-0.5 font-bold text-kb-white">
          Add
        </span>
      </span>
      <span className="mt-1 flex items-center justify-between gap-1 text-kb-stone">
        Kabsi Clients <span className="font-bold text-kb-ink">Pending</span>
      </span>
    </Sheet>
  );
}
