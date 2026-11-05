import { Link } from "@tanstack/react-router";
import { Headline } from "@/components/kabsi/highlight";
import {
  AlertTriangle,
  Check,
  CircleAlert,
  Info,
  LoaderCircle,
  Plus,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { TRIAL_LINE, WHATSAPP_ON, WHATSAPP_URL } from "@/lib/site";

/* ---------- Buttons ---------- */

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "whatsapp" | "quiet" | "dark";
export type ButtonSize = "lg" | "md";

const base =
  "press inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-sans font-bold disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50";
const sizes: Record<ButtonSize, string> = {
  lg: "h-13 px-6 text-body",
  md: "h-11 px-5 text-small",
};
const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-kb-yellow text-kb-black shadow-glow hover:bg-kb-yellow-pressed active:bg-kb-yellow-pressed",
  secondary:
    "border border-line-strong bg-transparent text-text-1 hover:border-text-3 hover:bg-surface-2 active:bg-surface-3",
  whatsapp:
    "border border-line-strong bg-transparent text-text-1 hover:border-text-3 hover:bg-surface-2 active:bg-surface-3",
  quiet: "bg-surface-2 text-text-1 hover:bg-surface-3 active:bg-surface-3",
  /** The header's Free check (Design 9, master plan 30.24): charcoal with ivory text, never yellow. */
  dark: "bg-kb-ink text-kb-sand hover:bg-kb-carbon active:bg-kb-carbon",
  tertiary:
    "h-auto min-h-11 px-1 text-text-1 underline decoration-text-3 decoration-1 underline-offset-4 hover:decoration-text-1",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "lg",
  full = false,
) {
  return cn(base, variant !== "tertiary" && sizes[size], variants[variant], full && "w-full");
}

type CommonProps = {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  full?: boolean | undefined;
  icon?: ReactNode | undefined;
  className?: string | undefined;
  children: ReactNode;
};

export const Button = forwardRef<
  HTMLButtonElement,
  CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }
>(function Button(
  { variant = "primary", size = "lg", full, icon, loading, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      aria-busy={loading || undefined}
      disabled={rest.disabled || loading}
      className={cn(buttonClass(variant, size, full), loading && "disabled:opacity-80", className)}
    >
      {loading ? (
        <LoaderCircle className="size-5 animate-[kb-spin_0.9s_linear_infinite]" aria-hidden />
      ) : (
        icon
      )}
      {children}
    </button>
  );
});

export function ButtonLink({
  variant = "primary",
  size = "lg",
  full,
  icon,
  className,
  children,
  to,
  hash,
  onClick,
}: CommonProps & { to: string; hash?: string | undefined; onClick?: () => void }) {
  return (
    <Link
      to={to as "/"}
      {...(hash ? { hash } : {})}
      onClick={onClick}
      className={cn(buttonClass(variant, size, full), className)}
    >
      {icon}
      {children}
    </Link>
  );
}

/** "Try it on WhatsApp" / "Chat on WhatsApp". The glyph only ever means WhatsApp. */
export function WhatsAppLink({
  label = "Chat on WhatsApp",
  size = "lg",
  full,
  className,
}: {
  label?: string | undefined;
  size?: ButtonSize | undefined;
  full?: boolean | undefined;
  className?: string | undefined;
}) {
  // No WhatsApp number in the one setting yet: no WhatsApp button (hello@kabsi.co is on every page).
  if (!WHATSAPP_ON) return null;
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noreferrer"
      className={cn(buttonClass("whatsapp", size, full), className)}
    >
      <WhatsAppGlyph className={size === "lg" ? "size-5" : "size-4.5"} />
      {label}
    </a>
  );
}

/** The line under every main button. */
export function TrialLine({ className }: { className?: string }) {
  return <p className={cn("text-small text-text-2", className)}>{TRIAL_LINE}</p>;
}

/* ---------- Brand ---------- */

/** Kabsi's mark, exactly. On dark grounds it gets a 2 px light ring so the black circle stays visible. */
export function KabsiMark({
  className,
  ring = true,
  title,
}: {
  className?: string | undefined;
  ring?: boolean | undefined;
  title?: string | undefined;
}) {
  return (
    <span
      className={cn("block size-8 shrink-0 rounded-full", ring && "bg-kb-paper p-[2px]", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" className="block size-full">
        <circle cx="60" cy="60" r="58" fill="#000" />
        <circle cx="60" cy="60" r="42.0036" fill="#FFD60A" />
        <circle cx="63.5032" cy="64.9996" r="15.9964" fill="#000" />
      </svg>
    </span>
  );
}

export function Logo({
  className,
  onClick,
}: {
  className?: string | undefined;
  onClick?: () => void;
}) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className={cn("press inline-flex min-h-11 items-center gap-2.5 rounded-full", className)}
      aria-label="Kabsi, home"
    >
      <KabsiMark className="size-8" />
      <span className="font-display text-[1.375rem] font-bold tracking-[-0.02em]">Kabsi</span>
    </Link>
  );
}

/**
 * WhatsApp's own glyph, Meta's file (WhatsApp Brand Resource Center, Digital_Glyph_Green_RGB_2026.svg, fetched from
 * meta.com/brand/resources on 4 Nov 2026, master plan 30.24), unaltered, in #25d366 (or white with tone="white"). It is
 * only ever used beside the word WhatsApp, never in its place.
 */
export function WhatsAppGlyph({
  className,
  tone = "brand",
}: {
  className?: string | undefined;
  tone?: "brand" | "white";
}) {
  return (
    <svg
      viewBox="0 0 720 720"
      aria-hidden="true"
      className={cn(
        "size-5 shrink-0",
        tone === "brand" ? "fill-whatsapp" : "fill-kb-white",
        className,
      )}
    >
      <path d={WA_RING} />
      <path d={WA_HANDSET} />
    </svg>
  );
}
/**
 * The glyph inside a short line that names the WhatsApp approval (Site 2, master plan 30.34 item 4): sized to the text
 * beside the word WhatsApp, never on its own as decoration.
 */
export function WhatsAppInline({ className }: { className?: string | undefined }) {
  return (
    <WhatsAppGlyph
      className={cn("ms-[0.3em] inline-block size-[0.9em] align-[-0.1em]", className)}
    />
  );
}
/** Splits a line at its first "WhatsApp" and sets the glyph right after the word. */
export function WithWhatsAppMark({ text }: { text: string }) {
  const i = text.indexOf("WhatsApp");
  if (i < 0) return <>{text}</>;
  const end = i + "WhatsApp".length;
  return (
    <>
      {text.slice(0, end)}
      <WhatsAppInline />
      {text.slice(end)}
    </>
  );
}
const WA_RING =
  "M360,0C161.18,0,0,161.18,0,360c0,65.41,17.45,126.75,47.94,179.61L0,720l187.02-44.21c51.34,28.18,110.28,44.21,172.98,44.21,198.82,0,360-161.18,360-360S558.82,0,360,0ZM360,655.52c-60.17,0-116.13-17.98-162.82-48.87l-110.49,28.14,30.99-105.61c-33.53-47.93-53.2-106.26-53.2-169.19,0-163.21,132.31-295.52,295.52-295.52s295.52,132.31,295.52,295.52-132.31,295.52-295.52,295.52Z";
const WA_HANDSET =
  "M444.35,407.52l87.1,41.06c4,1.88,6.56,5.94,6.2,10.34-.94,11.46-5.54,34.43-26.13,55.02-58.12,58.12-162.49-7.64-166.74-10.18-25.67-13.79-50.06-32.24-73.19-55.36-23.12-23.12-41.58-47.52-55.37-73.19-2.55-4.24-68.31-108.61-10.18-166.74,20.59-20.59,43.56-25.19,55.02-26.13,4.41-.36,8.46,2.2,10.34,6.2l41.07,87.1c1.94,4.12,1.09,9.02-2.13,12.24l-30.61,30.61c-6.62,6.62-8.56,16.93-4,25.11,11.17,20.03,26.19,39.32,43.59,57.07,17.75,17.4,37.04,32.43,57.07,43.59,8.18,4.56,18.48,2.62,25.11-4l30.61-30.61c3.22-3.22,8.12-4.08,12.24-2.13Z";

/* ---------- Labels ---------- */

/** On everything that is not real. */
export function ExampleBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        // Quiet (master plan 30.15 section 10): a thin outline in the text colour, never the action yellow.
        "inline-flex h-6 items-center rounded-full border border-current/30 px-2.5 text-label font-semibold",
        className,
      )}
    >
      Example
    </span>
  );
}

export type Tone = "ok" | "warn" | "bad" | "info";
const toneCls: Record<Tone, string> = {
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  info: "bg-info-soft text-text-2",
};
const toneIcon: Record<Tone, LucideIcon> = {
  ok: Check,
  warn: CircleAlert,
  bad: AlertTriangle,
  info: Info,
};

/** A state always carries a word and an icon, never colour alone. */
export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: ReactNode;
  className?: string | undefined;
}) {
  const I = toneIcon[tone];
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-label font-bold",
        toneCls[tone],
        className,
      )}
    >
      <I className="size-4" strokeWidth={2.25} aria-hidden />
      {children}
    </span>
  );
}

/** A plain label chip (plan badge, category). Not tappable. */
export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full border border-line-strong px-3 text-label font-bold text-text-1",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Tappable chip: the "Things you can say to Kabsi" row and filters. */
export function Chip({
  selected,
  children,
  className,
  ...rest
}: { selected?: boolean | undefined; children: ReactNode; className?: string } & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
>) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "press min-h-11 shrink-0 rounded-full border px-4 py-2 text-small font-semibold",
        selected
          ? "border-text-1 bg-text-1 text-surface-0"
          : "border-line-strong bg-transparent text-text-1 hover:border-text-3 hover:bg-surface-2",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ---------- Text ---------- */

export function SectionHead({
  title,
  lead,
  className,
  center,
  as: H = "h2",
  id,
  leadClassName,
}: {
  title: ReactNode;
  lead?: ReactNode | undefined;
  /** For example "hidden sm:block", where a phone shows the heading alone (Design 6). */
  leadClassName?: string | undefined;
  className?: string | undefined;
  center?: boolean | undefined;
  as?: "h1" | "h2";
  id?: string | undefined;
}) {
  return (
    <div className={cn("max-w-[40rem]", center && "mx-auto text-center", className)}>
      <H id={id} className={H === "h1" ? "text-display" : "text-h2"}>
        {title}
      </H>
      {lead && <p className={cn("mt-4 text-lead text-text-2", leadClassName)}>{lead}</p>}
    </div>
  );
}

/* ---------- Fields ---------- */

export const Field = forwardRef<
  HTMLInputElement,
  {
    label: string;
    hint?: ReactNode | undefined;
    error?: ReactNode | undefined;
    className?: string | undefined;
    inputClassName?: string | undefined;
    leading?: ReactNode | undefined;
  } & InputHTMLAttributes<HTMLInputElement>
>(function Field({ label, hint, error, className, inputClassName, leading, id, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  const describedBy = [error ? `${fid}-err` : null, hint ? `${fid}-hint` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={className}>
      <label htmlFor={fid} className="mb-2 block text-small font-bold text-text-1">
        {label}
      </label>
      <div
        className={cn(
          "flex h-13 items-center gap-3 rounded-input border bg-surface-2 px-4 transition-[border-color,box-shadow] duration-150 ease-kb focus-within:border-text-1 focus-within:ring-1 focus-within:ring-text-1",
          error ? "border-bad ring-1 ring-bad" : "border-stroke",
          rest.disabled && "opacity-60",
        )}
      >
        {leading}
        <input
          ref={ref}
          id={fid}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          {...rest}
          className={cn(
            "h-full w-full min-w-0 bg-transparent text-body text-text-1 outline-none placeholder:text-text-3 focus-visible:outline-none disabled:cursor-not-allowed",
            inputClassName,
          )}
        />
      </div>
      {error && (
        <p
          id={`${fid}-err`}
          className="mt-2 flex items-start gap-1.5 text-small font-semibold text-bad"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${fid}-hint`} className="mt-2 text-small text-text-2">
          {hint}
        </p>
      )}
    </div>
  );
});

/* ---------- Toggles ---------- */

/** Switch: immediate settings only. Green and a word when on. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange?: ((v: boolean) => void) | undefined;
  label: string;
  description?: string | undefined;
  disabled?: boolean | undefined;
}) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-start justify-between gap-4">
      <div>
        <p id={`${id}-l`} className="text-body font-semibold text-text-1">
          {label}
        </p>
        {description && <p className="mt-0.5 text-small text-text-2">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          "press relative mt-0.5 inline-flex h-8 w-13 shrink-0 items-center rounded-full border p-0.5 disabled:cursor-not-allowed disabled:opacity-60",
          checked ? "border-kb-green bg-kb-green" : "border-stroke bg-surface-2",
        )}
      >
        <span
          className={cn(
            "grid size-6 place-items-center rounded-full bg-kb-white shadow-rest transition-transform duration-200 ease-kb",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        >
          {checked && <Check className="size-3.5 text-kb-green" strokeWidth={3} aria-hidden />}
        </span>
      </button>
    </div>
  );
}

/** Two or three choices side by side (Monthly / Yearly). Radio semantics. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string | undefined;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex rounded-full border border-line-strong bg-surface-1 p-1",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "press min-h-11 rounded-full px-4 text-small font-bold sm:px-5",
            value === o.value ? "bg-text-1 text-surface-0" : "text-text-2 hover:text-text-1",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Blocks ---------- */

export function Card({
  children,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string | undefined;
  as?: "div" | "article" | "li" | "section";
}) {
  return (
    <As
      className={cn(
        "rounded-card border border-line bg-surface-1 p-5 shadow-rest sm:p-6",
        className,
      )}
    >
      {children}
    </As>
  );
}

const bannerIcon: Record<Tone, LucideIcon> = toneIcon;
export function Banner({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: Tone | undefined;
  title: ReactNode;
  children?: ReactNode | undefined;
  action?: ReactNode | undefined;
  className?: string | undefined;
}) {
  const I = bannerIcon[tone];
  return (
    <div
      role={tone === "bad" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-card p-4",
        toneCls[tone],
        tone === "info" && "border border-line",
        className,
      )}
    >
      <I className="mt-0.5 size-5 shrink-0" strokeWidth={2} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-body font-bold">{title}</p>
        {children && <div className="mt-1 text-small text-text-2">{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

/** Native details, plus turns into minus. */
export function Faq({
  items,
  className,
}: {
  items: { q: string; a: ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn("divide-y divide-line border-y border-line", className)}>
      {items.map((f) => (
        <details key={f.q} className="group">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-title font-bold text-text-1 [&::-webkit-details-marker]:hidden">
            {f.q}
            <span className="relative grid size-8 shrink-0 place-items-center rounded-full border border-line-strong transition-colors duration-150 group-open:bg-text-1 group-open:text-surface-0">
              <Plus
                className="size-4 transition-transform duration-200 ease-kb group-open:rotate-45"
                aria-hidden
              />
            </span>
          </summary>
          <div className="measure pb-5 pe-12 text-body text-text-2">{f.a}</div>
        </details>
      ))}
    </div>
  );
}

/** Steps: done green with a tick, current with a ring, later grey. Never yellow. */
export function StepList({
  steps,
  current = -1,
  className,
}: {
  steps: { title: string; text?: string }[];
  current?: number | undefined;
  className?: string | undefined;
}) {
  return (
    <ol className={cn("relative grid gap-0", className)}>
      {steps.map((s, i) => {
        const state =
          i < current ? "done" : i === current ? "now" : current < 0 ? "plain" : "later";
        return (
          <li key={s.title} className="relative flex gap-4 pb-7 last:pb-0">
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute start-[1.1875rem] top-11 bottom-1 w-px",
                  state === "done" ? "bg-kb-green" : "bg-line-strong",
                )}
              />
            )}
            <span
              className={cn(
                "relative grid size-10 shrink-0 place-items-center rounded-full font-display text-title font-bold",
                state === "done" && "bg-kb-green text-kb-white",
                state === "now" && "border-2 border-text-1 text-text-1",
                state === "plain" && "border border-line-strong bg-surface-1 text-text-1",
                state === "later" && "border border-line text-text-3",
              )}
            >
              {state === "done" ? (
                <Check className="size-5" strokeWidth={2.5} aria-hidden />
              ) : (
                i + 1
              )}
              <span className="sr-only">
                {state === "done" ? ", done" : state === "now" ? ", now" : ""}
              </span>
            </span>
            <div className="pt-1.5">
              <p className={cn("text-title font-bold", state === "later" && "text-text-2")}>
                {s.title}
              </p>
              {s.text && <p className="mt-1 text-body text-text-2">{s.text}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- States ---------- */

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton h-4", className)} />;
}

export function EmptyState({
  icon: I = Info,
  title,
  children,
  action,
  className,
}: {
  icon?: LucideIcon | undefined;
  title: string;
  children?: ReactNode | undefined;
  action?: ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-card border border-dashed border-line-strong px-6 py-10 text-center",
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-text-2">
        <I className="size-6" strokeWidth={1.75} aria-hidden />
      </span>
      <p className="mt-4 text-h3">{title}</p>
      {children && <div className="measure mt-2 text-body text-text-2">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** What happened, what Kabsi did, Try again. */
export function ErrorState({
  title,
  children,
  onRetry,
  retryLabel = "Try again",
  className,
  page = false,
}: {
  title: string;
  /** The error takes the whole page's place: its title is the page's H1 (App 4 audit). */
  page?: boolean | undefined;
  children?: ReactNode | undefined;
  onRetry?: (() => void) | undefined;
  retryLabel?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <div role="alert" className={cn("rounded-card border border-line bg-surface-1 p-6", className)}>
      <span className="grid size-11 place-items-center rounded-full bg-bad-soft text-bad">
        <AlertTriangle className="size-5" aria-hidden />
      </span>
      {page ? (
        <h1 className="mt-4 text-h3">
          <Headline text={title} />
        </h1>
      ) : (
        <p className="mt-4 text-h3">{title}</p>
      )}
      {children && <div className="mt-2 text-body text-text-2">{children}</div>}
      {onRetry && (
        <Button
          variant="secondary"
          size="md"
          className="mt-5"
          onClick={onRetry}
          icon={<RotateCcw className="size-4" aria-hidden />}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

/** "Kabsi is typing" dots. */
export function TypingDots({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Typing"
      className={cn("inline-flex items-center gap-1", className)}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-current"
          style={{ animation: `kb-dot 1s ${i * 0.15}s var(--ease-kb) infinite` }}
        />
      ))}
    </span>
  );
}
