import { useEffect, useRef, useState, type FormEvent } from "react";
import { HelpCircle, MessageCircle, Phone, Play } from "lucide-react";
import { BookingLink } from "@/components/shared/booking-link";
import { StepClip } from "@/components/onboarding/step-clip";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CHIP_LABEL,
  HELP,
  STUCK_AFTER_MS,
  STUCK_LINE,
  askNora,
  claimStuck,
  type HelpStep,
} from "@/lib/onboarding-help";
import { STEP_CLIPS } from "@/lib/onboarding-clips";
import { SETUP_CALL_MINUTES } from "@/lib/site";

export type HelpState = {
  step: HelpStep;
  /** The business, once there is one: the stuck prompt is remembered per business and step. */
  locationId?: string;
  agreed?: boolean;
  accessWorking?: boolean;
  accessState?: string | null;
};

/**
 * The "Need a hand?" chip, in the same place on every onboarding step: under the main button, never covering the screen
 * and never opening on its own. Nora steps in once per step, with one line above the chip, only when the owner is stuck.
 */
export function NeedAHand({ help }: { help: HelpState }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [showStuck, setShowStuck] = useState(false);
  const [wide, setWide] = useState(false);
  const since = useRef(Date.now());
  const cfg = HELP[help.step];

  useEffect(() => {
    try {
      const mq = window.matchMedia("(min-width: 640px)");
      setWide(mq.matches);
      const on = () => setWide(mq.matches);
      mq.addEventListener("change", on);
      return () => mq.removeEventListener("change", on);
    } catch {
      return undefined;
    }
  }, []);

  // The 3 minute clock restarts, and the line goes, when the step changes (not on first render, which keeps the line the
  // first check just raised).
  const lastStep = useRef(help.step);
  useEffect(() => {
    if (lastStep.current === help.step) return;
    lastStep.current = help.step;
    since.current = Date.now();
    setShowStuck(false);
  }, [help.step]);

  // Stuck: once per step per business. Checked now and again when the 3 minutes are up.
  useEffect(() => {
    if (!help.locationId) return undefined;
    const check = () => {
      const stuck = claimStuck(help.locationId!, help.step, {
        agreed: !!help.agreed,
        accessWorking: !!help.accessWorking,
        accessState: help.accessState ?? null,
        elapsedMs: Date.now() - since.current,
      });
      if (stuck) setShowStuck(true);
    };
    check();
    const id = window.setTimeout(
      check,
      Math.max(1_000, STUCK_AFTER_MS - (Date.now() - since.current) + 500),
    );
    return () => window.clearTimeout(id);
  }, [help.step, help.locationId, help.agreed, help.accessWorking, help.accessState]);

  function ask(text: string) {
    const t = text.trim();
    if (!t) return;
    setOpen(false);
    setQuestion("");
    askNora(help.step, t);
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    ask(question);
  }

  return (
    <div className="mt-6 border-t border-kb-hairline pt-4" data-testid="need-a-hand">
      {showStuck ? (
        <p
          className="mb-3 rounded-card bg-kb-sand p-3 text-sm leading-6"
          role="status"
          data-testid="stuck-line"
        >
          {STUCK_LINE}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="mx-auto flex min-h-11 items-center gap-2 rounded-pill px-4 text-sm font-bold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kb-black"
      >
        <HelpCircle className="size-5" aria-hidden="true" /> {CHIP_LABEL}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={wide ? "right" : "bottom"}
          className="max-h-[90vh] overflow-y-auto rounded-t-large sm:max-h-none sm:rounded-none"
        >
          <SheetHeader>
            <SheetTitle className="font-display text-3xl leading-none">{CHIP_LABEL}</SheetTitle>
            <SheetDescription>
              Nora is Kabsi&apos;s assistant, with a small AI tag. She never asks for your Google
              password or a code.
            </SheetDescription>
          </SheetHeader>

          <section className="mt-5" aria-labelledby="hand-ask">
            <h3 id="hand-ask" className="flex items-center gap-2 text-base font-bold">
              <span
                className="grid size-6 place-items-center rounded-full bg-kb-yellow text-kb-black"
                aria-hidden="true"
              >
                <MessageCircle className="size-3.5" />
              </span>
              Ask Nora{" "}
              <span className="rounded-pill border border-kb-hairline px-1.5 text-kb-caption font-medium text-kb-stone">
                AI
              </span>
            </h3>
            <ul className="mt-3 space-y-2">
              {cfg.questions.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => ask(q)}
                    className="flex min-h-11 w-full items-center rounded-card border border-kb-hairline px-3 py-2 text-left text-sm font-medium hover:border-kb-black"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={submit} className="mt-3 flex gap-2">
              <label htmlFor="hand-question" className="sr-only">
                Ask Nora your own question
              </label>
              <input
                id="hand-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={300}
                placeholder="Or ask your own question"
                className="min-h-11 min-w-0 flex-1 rounded-card border border-kb-hairline px-3 text-base"
              />
              <Button type="submit" variant="outline" size="compact" disabled={!question.trim()}>
                Ask
              </Button>
            </form>
          </section>

          {cfg.clip && STEP_CLIPS[cfg.clip] ? (
            <section className="mt-6" aria-labelledby="hand-watch">
              <h3 id="hand-watch" className="mb-2 flex items-center gap-2 text-base font-bold">
                <Play className="size-4" aria-hidden="true" /> Watch it
              </h3>
              <StepClip clip={cfg.clip} label="This step, in 20 seconds" />
            </section>
          ) : null}

          {cfg.call ? (
            <section className="mt-6" aria-labelledby="hand-call">
              <h3 id="hand-call" className="flex items-center gap-2 text-base font-bold">
                <Phone className="size-4" aria-hidden="true" /> Book a free {SETUP_CALL_MINUTES}
                -minute setup call
              </h3>
              <p className="mt-1 text-sm leading-6 text-kb-stone">
                Screen share, no camera needed. A real person does it with you.
              </p>
              <BookingLink kind="setup" button className="mt-3 w-full">
                Book the call
              </BookingLink>
            </section>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
