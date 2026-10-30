// The screens of onboarding in four stages (master plan 30.16 section 3, Design 3's d3-onboarding): the claimed free
// check, "Is this your business?", Connect WhatsApp, Add Kabsi as a Manager with its three states, "Access works." with
// the trial dates, the first task, and the rest of setup (only after the first task is done). Real data and real calls
// only: onboarding_status, confirm_business, the WhatsApp connect code, the access steps and the task queue.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  Clock,
  KeyRound,
  LifeBuoy,
  LoaderCircle,
  Lock,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import { AccessSteps, PENDING_LINE } from "@/components/kabsi/d5-access";
import { CopyField, QrCode } from "@/components/kabsi/d2-parts";
import {
  Banner,
  Button,
  ButtonLink,
  StatusPill,
  TrialLine,
  WhatsAppGlyph,
  buttonClass,
} from "@/components/kabsi/ui";
import { ErrorNote, StepTitle } from "@/components/onboarding/onboarding-shell";
import { ScenarioPicker } from "@/components/onboarding/scenario-picker";
import { accessPill } from "@/lib/access-status";
import {
  LATER,
  accessOf,
  longDate,
  resumePath,
  trialStartedToday,
  type OnboardingStatus,
} from "@/lib/onboarding-flow";
import {
  CONSENT_TEXT,
  friendlyError,
  loadAccessState,
  loadGoogleLive,
  saveConsent,
  type Location,
} from "@/lib/onboarding";
import type { ScenarioId } from "@/lib/scenarios";
import {
  FREE_FROM_GOOGLE,
  OPERATOR_NAME,
  SITE_URL,
  THIRD_PARTY_HELP_URL,
  WHATSAPP_URL,
  bookingHref,
  BOOKING_READY,
} from "@/lib/site";
import { loadTasks } from "@/lib/tasks";
import { track } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import {
  WHATSAPP_CONSENT_TEXT,
  whatsappConnect,
  whatsappStatus,
  type WhatsappStatus,
} from "@/lib/whatsapp-owner";

/** The founder's first name: "Rashid, the founder, can help." */
const FOUNDER = OPERATOR_NAME.split(" ")[0]!;

/** One yellow button per screen, marked for the checks. */
function MainCta({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mt-8", className)} data-main-cta>
      {children}
    </div>
  );
}

/* ---------- Who looks after the Google profile (stage 2) ---------- */

export type Who = "owner" | "other" | "unsure";
const WHO: [Who, string][] = [
  ["owner", "I do. I am the owner or I can add people."],
  ["other", "Someone else does it for me."],
  ["unsure", "I am not sure."],
];

export function WhoQuestion({ value, onChange }: { value: Who; onChange: (w: Who) => void }) {
  return (
    <>
      <fieldset className="mt-8">
        <legend className="text-title font-bold">Who looks after its Google profile?</legend>
        <div className="mt-3 grid gap-2">
          {WHO.map(([v, label]) => (
            <label
              key={v}
              className={cn(
                "flex min-h-13 cursor-pointer items-center gap-3 rounded-inner border px-4 py-3 text-body",
                value === v ? "border-text-1 bg-surface-1" : "border-line-strong",
              )}
            >
              <input
                type="radio"
                name="who"
                value={v}
                checked={value === v}
                onChange={() => onChange(v)}
                className="size-5 shrink-0 accent-text-1"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {value !== "owner" ? <WhoBanner className="mt-4" /> : null}
    </>
  );
}

function WhoBanner({ className }: { className?: string }) {
  return (
    <Banner tone="info" title="That is fine. Kabsi helps you find out." className={className}>
      Only an owner can invite Kabsi. On the last step, Kabsi gives you a message to send to whoever
      looks after Google for you.
    </Banner>
  );
}

/* ---------- Stage 1: the free check this business came from ---------- */

export function CheckStage({ status, onNext }: { status: OnboardingStatus; onNext: () => void }) {
  const check = status.check!;
  return (
    <>
      <StepTitle
        title={`Your free check for ${status.business}`}
        sub="Here is your free check. Nothing has changed on Google, and Kabsi has no access yet."
      />
      <div className="rounded-card border border-line bg-surface-1 p-5 shadow-rest">
        <p className="text-small font-bold text-text-2">Free check</p>
        <p className="mt-1 text-title font-bold">
          {status.business}, for &lsquo;{check.term}&rsquo;
        </p>
        <ButtonLink to={`/scan/${check.code}`} variant="secondary" size="md" className="mt-4">
          See your free check
        </ButtonLink>
      </div>
      <MainCta>
        <Button full onClick={onNext}>
          Set up Kabsi for {status.business}
        </Button>
        <TrialLine className="mt-3" />
      </MainCta>
    </>
  );
}

/* ---------- Stage 2: is this your business? ---------- */

export function BusinessCard({ name, address }: { name: string; address: string | null }) {
  return (
    <div className="flex items-center gap-4 rounded-card border border-line bg-surface-1 p-4">
      <span
        aria-hidden
        className="grid size-12 shrink-0 place-items-center rounded-full bg-text-1 font-display text-h3 font-bold text-surface-0"
      >
        {name.trim().charAt(0).toUpperCase() || "K"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-title font-bold break-words">{name}</p>
        {address ? <p className="text-small text-text-2 break-words">{address}</p> : null}
      </div>
    </div>
  );
}

export function ConfirmStage({
  location,
  who,
  onWho,
  busy,
  error,
  onConfirm,
}: {
  location: Location;
  who: Who;
  onWho: (w: Who) => void;
  busy: boolean;
  error: string;
  onConfirm: () => void;
}) {
  return (
    <>
      <StepTitle title="Is this your business?" />
      <BusinessCard name={location.name} address={location.address} />
      <WhoQuestion value={who} onChange={onWho} />
      <ErrorNote message={error} />
      <MainCta>
        <Button full onClick={onConfirm} loading={busy}>
          Yes, this is my business
        </Button>
      </MainCta>
    </>
  );
}

/* ---------- Stage 3: Connect WhatsApp ---------- */

export function WhatsAppStage({
  status,
  on,
  preview,
  hold,
  onConnected,
  onNext,
}: {
  status: OnboardingStatus;
  /** WHATSAPP_ON (or the development preview). */
  on: boolean;
  preview?: "notyet" | undefined;
  /** Connected on this visit: show "Connected" until the owner moves on. */
  hold: boolean;
  onConnected: () => void;
  onNext: () => void;
}) {
  if (!on) {
    // What Settings shows while Kabsi has no WhatsApp number (src/components/app/whatsapp-channel.tsx).
    return (
      <>
        <StepTitle title="Connect WhatsApp" />
        <div className="rounded-card bg-surface-2 p-4" data-testid="whatsapp-coming-soon">
          <p className="font-bold">WhatsApp: coming soon</p>
          <p className="mt-1 text-small text-text-2">
            Review alerts and Approve on WhatsApp start when Kabsi&apos;s WhatsApp number is ready.
            Until then everything comes by email and in the bell on Home.
          </p>
        </div>
        <MainCta>
          <Button full onClick={onNext}>
            Next: add Kabsi on Google
          </Button>
        </MainCta>
      </>
    );
  }
  return (
    <WhatsAppConnect
      status={status}
      preview={preview}
      hold={hold}
      onConnected={onConnected}
      onNext={onNext}
    />
  );
}

function WhatsAppConnect({
  status,
  preview,
  hold,
  onConnected,
  onNext,
}: {
  status: OnboardingStatus;
  preview?: "notyet" | undefined;
  hold: boolean;
  onConnected: () => void;
  onNext: () => void;
}) {
  const [waiting, setWaiting] = useState(false);
  const [notYet, setNotYet] = useState(preview === "notyet");
  const [checking, setChecking] = useState(false);
  const wa = useQuery({
    queryKey: ["whatsapp-status"],
    queryFn: whatsappStatus,
    // While waiting for the message, look every 4 seconds: "This page updates by itself when it arrives."
    refetchInterval: waiting || notYet ? 4_000 : false,
  });
  const connected = status.whatsapp || wa.data?.state === "active";
  // A code asked for before this visit (state pending): the owner already opened WhatsApp once.
  const firstState = useRef<WhatsappStatus["state"] | null>(null);
  useEffect(() => {
    if (!wa.data || firstState.current) return;
    firstState.current = wa.data.state;
    if (wa.data.state === "pending" && !notYet) setWaiting(true);
  }, [wa.data, notYet]);
  // The one-time code, typed into the message for the owner (whatsapp_connect_start; it works for 30 minutes).
  const code = useQuery({
    queryKey: ["whatsapp-code"],
    queryFn: whatsappConnect,
    enabled: wa.isSuccess && !connected,
    staleTime: 25 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  useEffect(() => {
    if (connected) {
      setWaiting(false);
      setNotYet(false);
      onConnected();
    }
  }, [connected]); // eslint-disable-line react-hooks/exhaustive-deps

  async function checkNow() {
    setChecking(true);
    const r = await wa.refetch();
    setChecking(false);
    if (r.data?.state !== "active") {
      setWaiting(false);
      setNotYet(true);
    }
  }

  if (connected && hold) {
    return (
      <>
        <StatusPill tone="ok">Connected</StatusPill>
        <div className="mt-4">
          <StepTitle
            title={
              wa.data?.phone_last4
                ? `Connected to the phone ending in ${wa.data.phone_last4}.`
                : "Connected"
            }
            sub={
              status.check
                ? "Kabsi sent your free check there, and asked if it can send your setup steps and approvals."
                : undefined
            }
          />
        </div>
        <MainCta className="mt-2">
          <Button full onClick={onNext}>
            Next: add Kabsi on Google
          </Button>
        </MainCta>
      </>
    );
  }

  return (
    <>
      <StepTitle
        title="Connect WhatsApp"
        sub="Send Kabsi one message. Kabsi answers with your free check, and asks before it sends anything else."
      />
      <div className="grid gap-4 sm:grid-cols-[12rem_1fr] sm:items-center">
        <div className="hidden sm:block">
          {code.data ? (
            <QrCode
              value={code.data.href}
              label="QR code that opens a WhatsApp chat with Kabsi"
              className="border border-line"
            />
          ) : (
            <div className="aspect-square w-full rounded-card bg-surface-2" aria-hidden />
          )}
          <p className="mt-2 text-center text-small text-text-2">Scan this code with your phone.</p>
        </div>
        <div className="space-y-3" data-main-cta>
          {code.data ? (
            <a
              href={code.data.href}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                setNotYet(false);
                setWaiting(true);
              }}
              className={buttonClass("whatsapp", "lg", true)}
            >
              <WhatsAppGlyph className="size-5" />
              Open WhatsApp
            </a>
          ) : (
            <Button
              variant="whatsapp"
              full
              loading={code.isLoading || wa.isLoading}
              disabled
              icon={<WhatsAppGlyph className="size-5" />}
            >
              Open WhatsApp
            </Button>
          )}
          {code.data ? (
            <p className="text-small text-text-2">
              The message is written for you: it says KABSI and your code, {code.data.code}. Just
              tap send.
            </p>
          ) : null}
        </div>
      </div>
      <ErrorNote message={code.isError || wa.isError ? "Couldn't start. Please try again." : ""} />
      {waiting ? (
        <div
          className="mt-6 flex flex-wrap items-center gap-3 rounded-inner bg-surface-1 p-4 shadow-rest"
          role="status"
        >
          <LoaderCircle
            className="size-5 shrink-0 animate-[kb-spin_0.9s_linear_infinite]"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-body font-bold">Waiting for your message</p>
            <p className="text-small text-text-2">This page updates by itself when it arrives.</p>
          </div>
          <Button variant="tertiary" onClick={() => void checkNow()} loading={checking}>
            Check now
          </Button>
        </div>
      ) : null}
      {notYet ? (
        <Banner
          tone="bad"
          title="Kabsi has not received your message yet."
          className="mt-6"
          action={
            <Button
              size="md"
              variant="secondary"
              onClick={() => {
                setNotYet(false);
                setWaiting(true);
                void wa.refetch();
              }}
            >
              Check again
            </Button>
          }
        >
          Check that you sent it from the phone you use for the business, and that it says KABSI and
          your code. Then send it again.
        </Banner>
      ) : null}
      <p className="mt-6 text-small text-text-2">
        Kabsi only messages you about your business. Reply Stop any time.
      </p>
      <details className="mt-2 text-small text-text-2">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-text-1 underline underline-offset-4">
          What Kabsi sends on WhatsApp
        </summary>
        <p className="mt-1">{WHATSAPP_CONSENT_TEXT}</p>
      </details>
    </>
  );
}

/* ---------- Stage 4: add Kabsi as a Manager ---------- */

/** "Your invite on Google", "Accepted by Kabsi", "Access checked". */
export function AccessTrack({ status }: { status: OnboardingStatus }) {
  const a = accessOf(status);
  const rows = [
    {
      label: "Your invite on Google",
      done: a === "accepted" || a === "checked",
      now: !status.accepted,
    },
    { label: "Accepted by Kabsi", done: a === "checked", now: a === "accepted" },
    { label: "Access checked", done: a === "checked", now: false },
  ];
  return (
    <ol
      className="grid gap-2 rounded-card border border-line bg-surface-1 p-4"
      aria-label="Google access"
    >
      {rows.map((t) => (
        <li key={t.label} className="flex min-h-11 items-center gap-3">
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-full",
              t.done
                ? "bg-kb-green text-kb-white"
                : t.now
                  ? "border-2 border-text-1"
                  : "border border-line-strong",
            )}
          >
            {t.done ? (
              <Check className="size-4" strokeWidth={3} aria-hidden />
            ) : t.now ? (
              <Clock className="size-4" aria-hidden />
            ) : null}
          </span>
          <span className={cn("text-body font-semibold", !t.done && !t.now && "text-text-2")}>
            {t.label}
            <span className="sr-only">{t.done ? ", done" : t.now ? ", waiting" : ""}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function ManagerStage({
  location,
  status,
  who,
  busy,
  onPickScenario,
  onChanged,
}: {
  location: Location;
  status: OnboardingStatus;
  who: Who;
  busy: boolean;
  onPickScenario: (id: ScenarioId) => void;
  onChanged: () => Promise<unknown>;
}) {
  const [agreed, setAgreed] = useState(status.consent);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<"cannot" | "help" | null>(null);
  const state = useQuery({
    queryKey: ["access-state", location.id],
    queryFn: () => loadAccessState(location.id),
    refetchInterval: 30_000,
  });
  const live = useQuery({
    queryKey: ["google-live"],
    queryFn: loadGoogleLive,
    staleTime: Infinity,
  });
  const pill = accessPill({
    state: state.data ?? "none",
    consented: status.consent,
    live: live.data === true && !location.concierge,
  });
  const failing = state.data === "lost" || state.data === "error";

  async function saveAgreement(value: boolean) {
    setAgreed(value);
    if (!value || status.consent) return;
    setError("");
    try {
      await saveConsent(location.id);
      // G-44: the owner starts giving Kabsi access. Only the manual Manager invite exists today (route "manual").
      track("connect_started", { location_id: location.id, route: "manual" });
      await onChanged();
    } catch (e) {
      setAgreed(false);
      setError(friendlyError(e));
    }
  }

  return (
    <>
      <StepTitle
        title="Add Kabsi as a Manager on Google."
        sub="On Google, add Kabsi as a Manager. You stay the owner and can remove Kabsi any time."
      />
      <AccessTrack status={status} />

      {status.accepted ? (
        <div
          className="mt-6 flex items-center gap-3 rounded-inner bg-surface-1 p-4 shadow-rest"
          role="status"
        >
          <ShieldCheck className="size-5 shrink-0 text-ok" aria-hidden />
          <p className="text-small">
            <span className="font-bold">Kabsi accepted your invite.</span> It is checking that it
            can read your profile. This takes about a minute.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {who !== "owner" ? <WhoBanner /> : null}
          {!status.consent ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-card border border-line-strong p-4">
              <input
                type="checkbox"
                checked={agreed}
                disabled={status.consent}
                onChange={(e) => void saveAgreement(e.target.checked)}
                className="mt-0.5 size-5 shrink-0 accent-text-1"
              />
              <span className="text-small">{CONSENT_TEXT}</span>
            </label>
          ) : null}
          <ErrorNote message={error} />
          {status.consent ? (
            <div
              className="flex items-start gap-3 rounded-inner bg-surface-1 p-4 shadow-rest"
              role="status"
              data-testid="access-pill"
            >
              <LoaderCircle
                className="mt-0.5 size-5 shrink-0 animate-[kb-spin_0.9s_linear_infinite]"
                aria-hidden
              />
              <p className="text-small">
                <span className="font-bold">Waiting for your invite.</span>{" "}
                {pill?.detail && !failing
                  ? pill.detail
                  : `${PENDING_LINE} This page updates by itself.`}
              </p>
            </div>
          ) : null}
          {failing && pill ? (
            <Banner tone="warn" title={pill.text}>
              {pill.detail}
            </Banner>
          ) : null}
          <AccessSteps states={false} headingLevel="h2" belowFold={false} className="max-w-none" />
          <p className="text-small text-text-2">
            Manager access lets Kabsi make changes, and Kabsi publishes only what you approve. Never
            send us a password or a code.
          </p>
          <ManagerMeaning />

          <div className="flex flex-col items-start gap-1 border-t border-line pt-4">
            <Button
              variant="tertiary"
              aria-expanded={open === "cannot"}
              onClick={() => setOpen(open === "cannot" ? null : "cannot")}
            >
              Cannot find People and access?
            </Button>
            {open === "cannot" ? (
              <div className="w-full">
                <Banner
                  tone="warn"
                  title="You may be signed in to another Google account, or you may be a manager yourself."
                >
                  Only an owner can invite Kabsi. Does someone else look after Google for{" "}
                  {location.name}?
                </Banner>
                <ScenarioPicker busy={busy} onPick={onPickScenario} />
              </div>
            ) : null}
            <Button
              variant="tertiary"
              aria-expanded={open === "help"}
              icon={<LifeBuoy className="size-4" aria-hidden />}
              onClick={() => setOpen(open === "help" ? null : "help")}
            >
              Get help from {FOUNDER}
            </Button>
            {open === "help" ? <FounderHelp /> : null}
          </div>
        </div>
      )}

      <p className="mt-8 text-small text-text-2">
        Your trial starts only when access is checked. {FREE_FROM_GOOGLE}{" "}
        <a
          href={THIRD_PARTY_HELP_URL}
          target="_blank"
          rel="noreferrer"
          className="text-text-1 underline underline-offset-4"
        >
          Google&apos;s guide to working with a third party
        </a>
      </p>
    </>
  );
}

/** "Rashid, the founder, can help.": WhatsApp only when Kabsi has a number, and the booking link. */
export function FounderHelp() {
  const external = BOOKING_READY ? { target: "_blank", rel: "noopener noreferrer" } : {};
  return (
    <div className="mt-2 w-full rounded-card border border-line bg-surface-1 p-4">
      <p className="text-title font-bold">{FOUNDER}, the founder, can help.</p>
      <p className="mt-1 text-small text-text-2">
        Steps on WhatsApp, or a short call. You make every change on your own phone.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {WHATSAPP_URL.startsWith("https://") ? (
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className={buttonClass("whatsapp", "md")}
          >
            <WhatsAppGlyph className="size-4.5" />
            Help on WhatsApp
          </a>
        ) : null}
        <a href={bookingHref("setup")} {...external} className={buttonClass("secondary", "md")}>
          Book a short call
        </a>
      </div>
    </div>
  );
}

/* ---------- Access works: the trial starts ---------- */

export function CheckedStage({
  status,
  busy,
  onNext,
}: {
  status: OnboardingStatus;
  busy: boolean;
  onNext: () => void;
}) {
  const ends = status.trial_ends_at;
  const startedToday = trialStartedToday(ends);
  return (
    <>
      <StepTitle
        title="Access works."
        sub={`Kabsi now has Manager access to ${status.business}. Nothing has been published.`}
      />
      <AccessTrack status={status} />
      {ends ? (
        <Banner
          tone="ok"
          className="mt-6"
          title={
            startedToday
              ? `Your free trial starts today and ends on ${longDate(ends, status.time_zone)}.`
              : `Your free trial ends on ${longDate(ends, status.time_zone)}.`
          }
        >
          No card, and no charge unless you choose a plan.
        </Banner>
      ) : null}
      <MainCta>
        <Button full onClick={onNext} loading={busy}>
          See your first task
        </Button>
      </MainCta>
    </>
  );
}

/* ---------- The first task, then the rest of setup ---------- */

export function FirstTaskStage({
  location,
  status,
  showRest,
}: {
  location: Location;
  status: OnboardingStatus;
  showRest?: boolean;
}) {
  const [rest, setRest] = useState(!!showRest);
  const tasks = useQuery({
    queryKey: ["first-task", location.id],
    queryFn: () => loadTasks(location.id),
    // Kabsi prepares the first task within minutes of access: look again until it is there.
    refetchInterval: (q) => ((q.state.data?.tasks.length ?? 0) === 0 ? 15_000 : false),
  });
  const task = tasks.data?.tasks[0];
  return (
    <>
      <StepTitle
        title="Your first task"
        sub={
          task
            ? task.kind === "review_reply"
              ? "This review has no reply yet. Kabsi wrote one from what the customer said. Publish it on Google?"
              : task.why
            : tasks.isLoading
              ? undefined
              : "Kabsi is preparing your first task."
        }
      />
      {tasks.isLoading ? (
        <div className="skeleton h-32 rounded-card" aria-hidden />
      ) : task ? (
        <div className="rounded-card border border-line bg-surface-1 p-5 shadow-rest">
          <p className="text-title font-bold">{task.title}</p>
          {task.kind === "review_reply" ? (
            <p className="mt-1 text-small text-text-2">{task.why}</p>
          ) : task.recommendation ? (
            <p className="mt-1 text-small text-text-2">{task.recommendation}</p>
          ) : null}
          <div className="mt-5" data-main-cta>
            <a href={task.path} className={buttonClass("primary", "lg", true)}>
              Open it
            </a>
          </div>
        </div>
      ) : (
        <ButtonLink to="/app" variant="secondary">
          Go to your account
        </ButtonLink>
      )}
      {task && status.whatsapp ? (
        <p className="mt-4 text-small text-text-2">
          The same task is on WhatsApp. Answer wherever you are.
        </p>
      ) : null}
      {!rest ? (
        <Button variant="tertiary" className="mt-4" onClick={() => setRest(true)}>
          What comes after this
        </Button>
      ) : (
        <section className="mt-12" aria-labelledby="rest-h">
          <h2 id="rest-h" className="font-display text-h3 font-bold">
            The rest of setup
          </h2>
          <p className="mt-2 text-body text-text-2">
            These open after your first task is done. One thing at a time.
          </p>
          <RestList locked className="mt-5" />
        </section>
      )}
    </>
  );
}

function RestList({ locked, className }: { locked: boolean; className?: string }) {
  return (
    <ul className={cn("grid gap-2", className)}>
      {LATER.map((item) => (
        <li
          key={item.key}
          className={cn(
            "flex items-center gap-4 rounded-inner border p-4",
            locked ? "border-dashed border-line-strong bg-surface-0" : "border-line bg-surface-1",
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="text-body font-bold">{item.title}</p>
            <p className="text-small text-text-2">{item.line}</p>
          </div>
          {locked ? (
            <Lock
              className="size-5 shrink-0 text-text-2"
              aria-label="Opens after your first task"
            />
          ) : (
            <ButtonLink to={item.to} variant="secondary" size="md">
              Set up
            </ButtonLink>
          )}
        </li>
      ))}
    </ul>
  );
}

export function LaterStage() {
  return (
    <>
      <StepTitle
        title="Next, when you are ready"
        sub="Your first task is done. Pick any of these when you have a minute."
      />
      <RestList locked={false} />
      <MainCta>
        <ButtonLink to="/app" full>
          Go to your account
        </ButtonLink>
      </MainCta>
    </>
  );
}

/* ---------- One resume link, from any device ---------- */

export function ResumeLink({ code, emailed = false }: { code: string; emailed?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-12 border-t border-line pt-6">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="press inline-flex min-h-11 items-center gap-2 text-small font-bold text-text-2 underline underline-offset-4 hover:text-text-1"
      >
        <Smartphone className="size-4" aria-hidden />
        Finish on another device
      </button>
      {open ? (
        <div className="mt-3">
          <CopyField label="Your setup link" value={`${SITE_URL}${resumePath(code)}`} />
          <p className="mt-2 text-small text-text-2">
            It opens the next step you have not finished, on any phone or computer.
            {/* Email 1: said only once a setup email with this link really went to this person. */}
            {emailed ? " Kabsi also sent it to your email." : null}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- What Manager access means (Design 6, Web 3; the six lines are lane R's, approved 30 Oct 2026) ---------- */

const CAN = [
  "Read your reviews and your details on Google",
  "Send a reply, post or change after your yes",
  "Tell you when something on your profile changes",
];
const CANNOT = [
  "See your Google password",
  "Remove you as the owner",
  "Publish anything without your yes",
];

export function ManagerMeaning() {
  return (
    <section
      aria-labelledby="manager-meaning-h"
      className="rounded-panel border border-line bg-surface-1 p-5 shadow-rest"
    >
      <h2 id="manager-meaning-h" className="flex items-center gap-2 text-title">
        <KeyRound className="size-5" aria-hidden />
        What Manager access means
      </h2>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <div>
          <p className="text-label font-bold text-text-2">Kabsi can</p>
          <ul className="mt-2 space-y-2">
            {CAN.map((c) => (
              <li key={c} className="flex gap-2.5 text-small">
                <Check className="mt-0.5 size-4 shrink-0 text-ok" strokeWidth={2.5} aria-hidden />
                {c}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-label font-bold text-text-2">Kabsi cannot</p>
          <ul className="mt-2 space-y-2">
            {CANNOT.map((c) => (
              <li key={c} className="flex gap-2.5 text-small">
                <X className="mt-0.5 size-4 shrink-0 text-text-2" strokeWidth={2.5} aria-hidden />
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-5 flex gap-2.5 border-t border-line pt-4 text-small text-text-2">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden />
        Your trial starts when access works. Waiting costs you nothing.
      </p>
    </section>
  );
}
