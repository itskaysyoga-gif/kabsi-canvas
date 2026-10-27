import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { BookingLink } from "@/components/shared/booking-link";
import { CopyButton } from "@/components/shared/copy-button";
import { StepClip } from "@/components/onboarding/step-clip";
import { Button } from "@/components/ui/button";
import { guideCards, listingUrl, SCREENSHOT_DATE, type Device } from "@/lib/manager-guide";
import { KABSI_GROUP_ID, SETUP_CALL_MINUTES } from "@/lib/site";
import { cn } from "@/lib/utils";

/** Phones and tablets get the phone version first; the owner can switch with "Show me the other version". */
function usePreferredDevice(): Device {
  const [device, setDevice] = useState<Device>("computer");
  useEffect(() => {
    try {
      if (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 640)
        setDevice("phone");
    } catch {
      /* keep the computer version */
    }
  }, []);
  return device;
}

/**
 * The guide for adding Kabsi as a Manager (K-93): the group ID large with Copy, then one card per step with a
 * screenshot on a computer and plain text on a phone, tapped or swiped forward, and a switch to the other version.
 * It is used on onboarding step 3 and on the public /manager-steps page, and asks for nothing: no password, no code.
 */
export function ManagerGuide({
  businessName,
  start = 1,
  onStep,
}: {
  businessName?: string;
  /** The card to open on, 1 to 5 (the link in the email). */
  start?: number;
  onStep?: (step: number) => void;
}) {
  const preferred = usePreferredDevice();
  const [chosen, setChosen] = useState<Device | null>(null);
  const device = chosen ?? preferred;
  const cards = guideCards(device);
  const [index, setIndex] = useState(Math.min(Math.max(start, 1), cards.length) - 1);
  const card = cards[index]!;
  const touch = useRef<number | null>(null);

  function go(next: number) {
    const i = Math.min(Math.max(next, 0), cards.length - 1);
    setIndex(i);
    onStep?.(i + 1);
  }

  return (
    <div>
      <div className="rounded-card bg-surface-2 p-4 text-center">
        <p className="text-small font-bold text-text-2">Kabsi group ID</p>
        <p className="mt-1 font-display text-5xl leading-none tracking-wide" data-testid="group-id">
          {KABSI_GROUP_ID}
        </p>
        <div className="mt-3 flex justify-center">
          <CopyButton text={KABSI_GROUP_ID} label="Copy group ID" />
        </div>
      </div>

      <div className="mt-5">
        <StepClip clip="access" label="The five steps, in 20 seconds" />
      </div>

      <section
        aria-label={`Step ${index + 1} of ${cards.length}`}
        className="mt-5 rounded-card border-2 border-line p-4 sm:p-5"
        onTouchStart={(e) => (touch.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const from = touch.current;
          touch.current = null;
          const to = e.changedTouches[0]?.clientX;
          if (from == null || to == null || Math.abs(to - from) < 60) return;
          go(index + (to < from ? 1 : -1));
        }}
      >
        <p className="text-small font-bold uppercase text-text-2">
          Step {index + 1} of {cards.length}
        </p>
        <h3 className="mt-1 text-title font-bold leading-snug">{card.title}</h3>
        <p className="mt-2 leading-7">{card.text}</p>
        {card.images?.map((img) => (
          <img
            key={img.src}
            src={img.src}
            alt={img.alt}
            width={1600}
            height={885}
            loading="lazy"
            className="mt-4 h-auto w-full rounded-card border border-line"
          />
        ))}
        {card.images ? (
          <p className="mt-2 text-small text-text-2">
            Screens as of {SCREENSHOT_DATE}. Screens look different?{" "}
            <BookingLink kind="setup" className="text-text-1">
              Book a free setup call
            </BookingLink>
            .
          </p>
        ) : null}
        {card.opensListing ? (
          <Button asChild variant="outline" className="mt-4 w-full sm:w-auto">
            <a href={listingUrl(device, businessName)} target="_blank" rel="noopener noreferrer">
              Open my Google profile <ExternalLink />
            </a>
          </Button>
        ) : null}
        {card.showsId ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-card bg-surface-2 px-4 py-3">
            <span className="font-bold">Group ID {KABSI_GROUP_ID}</span>
            <CopyButton text={KABSI_GROUP_ID} label="Copy group ID" />
          </div>
        ) : null}

        <ol className="mt-4 flex items-center justify-center" aria-label="Steps">
          {cards.map((c, i) => (
            <li key={c.title}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to step ${i + 1}`}
                aria-current={i === index ? "step" : undefined}
                className="grid size-11 place-items-center"
              >
                <span
                  className={cn("size-2.5 rounded-full", i === index ? "bg-kb-black" : "bg-line")}
                />
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-1 grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            size="compact"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Previous step"
          >
            <ArrowLeft /> Back
          </Button>
          <Button
            type="button"
            variant="outline"
            size="compact"
            onClick={() => go(index + 1)}
            disabled={index === cards.length - 1}
            aria-label="Next step"
          >
            Next <ArrowRight />
          </Button>
        </div>
      </section>

      <button
        type="button"
        className="mt-3 min-h-11 text-small font-medium text-text-1 underline underline-offset-4"
        onClick={() => {
          const other: Device = device === "phone" ? "computer" : "phone";
          setChosen(other);
          setIndex((i) => Math.min(i, guideCards(other).length - 1));
        }}
      >
        {device === "phone" ? "Show me the computer version" : "Show me the phone version"}
      </button>
      <p className="mt-1 text-small leading-6 text-text-2">
        Kabsi can&apos;t see your password. You can remove Kabsi at any time in People and access.{" "}
        Stuck?{" "}
        <BookingLink kind="setup" className="text-text-1">
          Book a free {SETUP_CALL_MINUTES}-minute setup call
        </BookingLink>
        .
      </p>
    </div>
  );
}
