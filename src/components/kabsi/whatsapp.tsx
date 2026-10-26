import { Camera, Check, CheckCheck, ChevronLeft, Mic, Plus, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Iphone } from "@/components/magicui/iphone";
import { cn } from "@/lib/utils";
import { ExampleBadge, KabsiMark, TypingDots } from "./ui";
import { NearbyPlaces } from "./nearby-places";
import type { NearbyCheck } from "./map-data";
import { usePrefersReducedMotion } from "./use-in-view";

/** The phone clock and every chat time agree (lane R, round 2). */
export const CLOCK = "11:40";

/* ---------- Frame ---------- */

/** A plain phone (Magic UI iPhone frame, no brand mark) with the Example badge on it. */
export function PhoneFrame({
  children,
  className,
  example = true,
}: {
  children: ReactNode;
  className?: string | undefined;
  example?: boolean | undefined;
}) {
  return (
    <div className={cn("dark relative mx-auto w-full max-w-[21.5rem]", className)}>
      <div className="rounded-[3.25rem] shadow-phone">
        <Iphone>{children}</Iphone>
      </div>
      {example && (
        <ExampleBadge className="absolute -start-1 -top-2 z-20 bg-surface-1 text-text-1 shadow-rest sm:-start-3" />
      )}
    </div>
  );
}

export function WaStatusBar({ dark = false }: { dark?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex h-[2.6rem] shrink-0 items-end justify-between px-[11%] pb-1 text-chat-meta font-bold",
        dark ? "text-kb-white" : "text-wa-ink",
      )}
    >
      <span>{CLOCK}</span>
      <span className="flex items-center gap-1">
        <span className="flex items-end gap-[2px]">
          {[4, 6, 8, 10].map((h) => (
            <span key={h} className="w-[3px] rounded-[1px] bg-current" style={{ height: h }} />
          ))}
        </span>
        <span className="ms-1 h-[9px] w-[18px] rounded-[3px] border border-current p-[1px]">
          <span className="block h-full w-3/4 rounded-[1px] bg-current" />
        </span>
      </span>
    </div>
  );
}

export function WaHeader() {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-wa-divider bg-wa-header px-2 pb-2 text-wa-ink">
      <ChevronLeft className="size-6 shrink-0 text-wa-link" aria-hidden />
      <KabsiMark ring={false} className="size-8" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-chat font-bold">Kabsi</p>
        <p className="truncate text-chat-meta text-wa-time">Business account</p>
      </div>
    </div>
  );
}

export function WaComposer() {
  return (
    <div className="flex shrink-0 items-center gap-2 border-t border-wa-divider bg-wa-header px-3 pt-2 pb-5 text-wa-link">
      <Plus className="size-5 shrink-0" aria-hidden />
      <div className="h-8 min-w-0 flex-1 rounded-full border border-wa-divider bg-wa-in" />
      <Camera className="size-5 shrink-0" aria-hidden />
      <Mic className="size-5 shrink-0" aria-hidden />
    </div>
  );
}

/* ---------- Messages ---------- */

export function Ticks({ read }: { read: boolean }) {
  return (
    <CheckCheck
      className={cn(
        "size-4 transition-colors duration-200",
        read ? "text-wa-tick" : "text-wa-time",
      )}
      aria-label={read ? "Read" : "Delivered"}
    />
  );
}

export function Bubble({
  out,
  time = CLOCK,
  read,
  children,
  buttons,
  pressed,
  media,
  className,
  enter = true,
}: {
  out?: boolean | undefined;
  time?: string | undefined;
  read?: boolean | undefined;
  children?: ReactNode | undefined;
  buttons?: string[] | undefined;
  pressed?: string | undefined;
  media?: ReactNode | undefined;
  className?: string | undefined;
  enter?: boolean | undefined;
}) {
  return (
    <div
      className={cn(
        "flex",
        out ? "justify-end" : "justify-start",
        enter && "animate-pop",
        className,
      )}
    >
      <div className={cn("relative max-w-[86%]", out ? "me-2" : "ms-2", media && "w-[86%]")}>
        <span
          aria-hidden
          className={cn(
            "absolute top-0 size-2.5",
            out
              ? "-end-2 bg-wa-out [clip-path:polygon(0_0,100%_0,0_100%)]"
              : "-start-2 bg-wa-in [clip-path:polygon(0_0,100%_0,100%_100%)]",
          )}
        />
        <div
          className={cn(
            "rounded-bubble text-chat text-wa-ink shadow-bubble",
            out ? "rounded-se-none bg-wa-out" : "rounded-ss-none bg-wa-in",
            media ? "p-1" : "px-2 pt-1.5 pb-1",
          )}
        >
          {media && <div className="overflow-hidden rounded-[0.375rem]">{media}</div>}
          <div className={cn(media && "px-1.5 pt-1.5 pb-0.5")}>
            {children}
            <span
              className={cn(
                "float-end ms-2 mt-1 inline-flex translate-y-0.5 items-center gap-0.5 text-chat-meta",
                out ? "text-wa-time-out" : "text-wa-time",
              )}
            >
              {time}
              {out && <Ticks read={!!read} />}
            </span>
            <span className="block clear-both" />
          </div>
        </div>
        {buttons && (
          <div className="mt-1 grid grid-cols-3 gap-1">
            {buttons.map((b) => (
              <span
                key={b}
                className={cn(
                  "grid h-8 place-items-center rounded-bubble text-chat font-semibold text-wa-link shadow-bubble transition-colors duration-150",
                  pressed === b ? "bg-wa-divider" : "bg-wa-in",
                )}
              >
                {b}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function PublishedBubble({ enter = true }: { enter?: boolean }) {
  return (
    <Bubble enter={enter}>
      <span className="inline-flex items-center gap-1.5">
        <span className="grid size-4 shrink-0 place-items-center rounded-full bg-kb-green">
          <Check className="size-3 text-kb-white" strokeWidth={3.5} aria-hidden />
        </span>
        Published on your Google profile.
      </span>
    </Bubble>
  );
}

export function TypingBubble() {
  return (
    <div className="flex animate-pop justify-start">
      <div className="ms-2 rounded-bubble rounded-ss-none bg-wa-in px-3 py-2.5 text-wa-time shadow-bubble">
        <TypingDots />
      </div>
    </div>
  );
}

/** The nearby check as Kabsi sends it on WhatsApp: the shared cards (nearby-places.tsx), image variant. */
export function MapImage({ check }: { check?: NearbyCheck }) {
  return <NearbyPlaces variant="image" check={check} />;
}

/* ---------- The hero scene (brief section 5) ---------- */

// One story only (brief section 14.4): a review arrives, the reply is ready, Yes, published. No map in the hero.
const SCENE = {
  notify: 0,
  open: 1200,
  tapYes: 2500,
  yes: 2800,
  read: 3150,
  typing: 3300,
  published: 3900,
  done: 4400,
} as const;
const FINAL = 99999;

// Rose Lane Salon (Example). The reply uses only what the review and the owner said: no invented promises.
export type SceneReview = { business: string; intro: string; quote: string; draft: string };
export const SCENE_REVIEW: SceneReview = {
  business: "Rose Lane Salon",
  intro: "new 5-star review from Layla K.",
  quote: "'Hana did my colour and it is exactly what I asked for.'",
  draft: "'Thank you, Layla. We will pass this on to Hana. See you at your next visit.'",
};

/** Plays once when it comes into view, then rests on its last frame with "Play again". */
export function HeroScene({
  className,
  autoPlay = true,
  review = SCENE_REVIEW,
}: {
  className?: string | undefined;
  autoPlay?: boolean;
  /** Home's "Pick your business" row swaps the example (brief section 16, item 1). */
  review?: SceneReview | undefined;
}) {
  const reduced = usePrefersReducedMotion();
  const [t, setT] = useState(-1);
  const [running, setRunning] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };
  const play = useCallback(() => {
    clear();
    setT(-1);
    setRunning(true);
    const marks = Object.values(SCENE);
    // Small lead-in so the notification visibly slides down from the top.
    for (const m of marks) timers.current.push(window.setTimeout(() => setT(m), m + 250));
    timers.current.push(window.setTimeout(() => setRunning(false), SCENE.done + 300));
  }, []);

  useEffect(() => {
    if (reduced) {
      clear();
      setT(FINAL);
      setRunning(false);
      return;
    }
    if (!autoPlay) {
      setT(FINAL);
      return;
    }
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          play();
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clear();
    };
  }, [reduced, autoPlay, play]);

  const at = (m: number) => t >= m;
  const chatOpen = at(SCENE.open);
  const done = t >= SCENE.done;

  return (
    <figure ref={host} className={cn("relative", className)}>
      <figcaption className="sr-only">
        Example of Kabsi on WhatsApp. A notification: Kabsi, {review.intro} Kabsi writes:{" "}
        {review.business}: {review.intro} {review.quote} Reply ready: {review.draft} Reply Yes to
        publish. The owner replies Yes. Kabsi: Published on your Google profile.
      </figcaption>
      <PhoneFrame>
        <div aria-hidden className="relative flex size-full flex-col">
          {/* Lock screen under the notification */}
          <div
            className={cn(
              "absolute inset-0 flex flex-col bg-kb-black transition-opacity duration-300 ease-kb",
              chatOpen ? "pointer-events-none opacity-0" : "opacity-100",
            )}
            style={{
              backgroundImage:
                "radial-gradient(120% 70% at 50% 0%, rgb(255 214 10 / 0.18), transparent 60%), radial-gradient(90% 60% at 50% 110%, rgb(95 211 155 / 0.12), transparent 60%)",
            }}
          >
            <WaStatusBar dark />
            <p className="mt-[16%] text-center font-display text-[3.5rem] leading-none font-semibold text-kb-white/90">
              {CLOCK}
            </p>
            <p className="mt-1 text-center text-chat-meta font-semibold text-kb-white/70">
              Saturday 25 October
            </p>
          </div>

          {/* Notification: drops in, then steps aside when the chat opens */}
          {at(SCENE.notify) && (
            <div
              className={cn(
                "absolute inset-x-[4%] top-[6.2%] z-10 transition-[opacity,transform] duration-300 ease-kb",
                chatOpen && "pointer-events-none -translate-y-3 opacity-0",
              )}
            >
              <div className="flex animate-drop items-center gap-2 rounded-[1.1rem] bg-kb-white/90 p-2.5 text-wa-ink shadow-lift backdrop-blur-md">
                <KabsiMark ring={false} className="size-8" />
                <p className="min-w-0 flex-1 text-chat leading-snug">
                  <span className="font-bold">Kabsi:</span> {review.intro}
                </p>
                <span className="self-start text-chat-meta text-wa-time">now</span>
              </div>
            </div>
          )}

          {/* Chat */}
          <div
            className={cn(
              "flex size-full flex-col bg-wa-header transition-opacity duration-300 ease-kb",
              chatOpen ? "opacity-100" : "opacity-0",
            )}
          >
            <WaStatusBar />
            <WaHeader />
            <div className="wa-ground flex min-h-0 flex-1 flex-col justify-end gap-1.5 overflow-hidden pt-2 pb-2">
              {chatOpen && (
                <>
                  <p className="mx-auto mb-1 rounded-md bg-wa-in/90 px-2 py-0.5 text-chat-meta font-semibold text-wa-time shadow-bubble">
                    Today
                  </p>
                  <Bubble
                    enter={t !== FINAL}
                    buttons={["Yes", "Edit", "Skip"]}
                    pressed={
                      at(SCENE.tapYes) && t !== FINAL
                        ? at(SCENE.yes)
                          ? undefined
                          : "Yes"
                        : undefined
                    }
                  >
                    <span className="font-bold">{review.business}:</span> {review.intro}{" "}
                    <span className="italic">{review.quote}</span>
                    <span className="mt-1 block">
                      Reply ready: {review.draft} Reply Yes to publish.
                    </span>
                  </Bubble>
                </>
              )}
              {at(SCENE.yes) && (
                <Bubble out read={at(SCENE.read)} enter={t !== FINAL}>
                  Yes
                </Bubble>
              )}
              {at(SCENE.typing) && !at(SCENE.published) && <TypingBubble />}
              {at(SCENE.published) && <PublishedBubble enter={t !== FINAL} />}
            </div>
            <WaComposer />
          </div>
        </div>
      </PhoneFrame>
      <div className="mt-4 flex h-11 justify-center">
        {!reduced && done && !running && (
          <button
            type="button"
            onClick={play}
            className="press inline-flex min-h-11 animate-fade items-center gap-2 rounded-full px-3 text-small font-semibold text-text-2 hover:text-text-1"
          >
            <RotateCcw className="size-4" aria-hidden />
            Play again
          </button>
        )}
      </div>
    </figure>
  );
}
