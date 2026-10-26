// Parts shared by Design 2's pages: tool tabs, the business search, QR code, copy field, contact form, flow
// progress, long-text pages and the quiet shell for single-purpose pages. Built from the Design 1 tokens only.
import { Check, ChevronDown, Copy, Mail, Search } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { NOT_AFFILIATED } from "@/lib/site";
import { useSearchFlag } from "./page-signals";
import { SiteLink } from "./site-link";
import { Banner, Button, Field, Logo, SectionHead, Skeleton } from "./ui";

/* ---------- Prototype states ---------- */

/**
 * A screen state that has a link of its own: ?state=NAME. Buttons inside the page move it on as well. On kabsi.co the
 * ?state= links are off (a visitor must never see "Kabsi accepted your invite" or a made-up result): they work only in
 * development, for the screenshot checks. Other flags (?biz= on Home) choose an example and stay on.
 */
export function useFlagState<T extends string>(initial: T, allowed: readonly T[], name = "state") {
  const raw = useSearchFlag(name);
  const flag = name === "state" && !import.meta.env.DEV ? null : raw;
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    if (flag && (allowed as readonly string[]).includes(flag)) setValue(flag as T);
  }, [flag, allowed]);
  return [value, setValue] as const;
}

/* ---------- Page top ---------- */

export function PageTop({
  title,
  lead,
  children,
  className,
}: {
  title: ReactNode;
  lead?: ReactNode | undefined;
  children?: ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <section className={cn("container-kb pt-28 lg:pt-36", className)}>
      <SectionHead as="h1" title={title} lead={lead} />
      {children}
    </section>
  );
}

/* ---------- Free tools ---------- */

// Two free tools at launch (master plan 30.16 section 4): the review link and QR maker, and one free check
// that shows the public profile facts and the nearby check together (/google-profile-check opens it too).
const TOOLS = [
  { to: "/scan", label: "Free check" },
  { to: "/google-review-link", label: "Review link and QR code" },
] as const;

/** The free tools, side by side. A row of links, so every tool keeps its own address. */
export function ToolTabs({ current }: { current: string }) {
  return (
    <nav aria-label="Free tools" className="-mx-5 mb-8 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
        {TOOLS.map((t) => (
          <li key={t.to}>
            <SiteLink
              to={t.to}
              className={cn(
                "press inline-flex min-h-11 items-center rounded-full border px-4 text-small font-semibold",
                t.to === current
                  ? "border-text-1 bg-text-1 text-surface-0"
                  : "border-line-strong text-text-1 hover:border-text-3 hover:bg-surface-2",
              )}
            >
              {t.label}
            </SiteLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ---------- The business search (free tools and Find your business) ---------- */

export function SearchForm({
  label = "Find your business on Google",
  button,
  query,
  setQuery,
  error,
  setError,
  onSubmit,
  loading,
  id,
}: {
  label?: string;
  button: string;
  query: string;
  setQuery: (v: string) => void;
  error: string | null;
  setError: (v: string | null) => void;
  onSubmit: (e: FormEvent) => void;
  loading?: boolean;
  id?: string;
}) {
  return (
    <form
      onSubmit={onSubmit}
      noValidate
      data-main-cta
      className="flex flex-col gap-3 sm:flex-row sm:items-start"
    >
      <Field
        id={id}
        className="min-w-0 flex-1"
        label={label}
        placeholder="Business name and city"
        autoComplete="organization"
        enterKeyHint="search"
        value={query}
        disabled={loading}
        onChange={(e) => {
          setQuery(e.target.value);
          if (error) setError(null);
        }}
        error={error}
        leading={<Search className="size-5 shrink-0 text-text-3" aria-hidden />}
      />
      <Button type="submit" loading={loading ?? false} className="sm:mt-[1.875rem]">
        {button}
      </Button>
    </form>
  );
}

/** Lines that tick off one by one while a search runs. */
export function SearchingSteps({
  steps,
  progress,
  className,
}: {
  steps: string[];
  progress: number;
  className?: string | undefined;
}) {
  return (
    <ol className={cn("space-y-4", className)} aria-live="polite">
      {steps.map((s, i) => {
        const done = i < progress;
        const now = i === progress;
        return (
          <li key={s} className="flex items-center gap-3 text-body">
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full",
                done ? "bg-kb-green text-kb-white" : "border border-line-strong text-text-3",
              )}
            >
              {done ? (
                <Check className="size-4" strokeWidth={3} aria-hidden />
              ) : now ? (
                <span className="size-3 animate-[kb-spin_0.9s_linear_infinite] rounded-full border-2 border-text-1 border-t-transparent" />
              ) : null}
            </span>
            <span className={cn(done || now ? "text-text-1" : "text-text-3")}>{s}</span>
            <span className="sr-only">{done ? ", done" : now ? ", working" : ""}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- Copy field ---------- */

export function CopyField({
  label,
  value,
  copyLabel = "Copy link",
  className,
}: {
  label: string;
  value: string;
  copyLabel?: string;
  className?: string | undefined;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* clipboard blocked: the text is selectable below */
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className={className}>
      <p className="mb-2 text-small font-bold text-text-1">{label}</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="min-h-13 min-w-0 flex-1 select-all break-all rounded-input border border-stroke bg-surface-2 px-4 py-3.5 text-small text-text-1">
          {value}
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
          {copied ? "Copied" : copyLabel}
        </Button>
      </div>
      <span role="status" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </div>
  );
}

/* ---------- QR code (src/lib/qr.ts, Kabsi's own encoder, loaded only where a code shows) ---------- */

export function useQrMatrix(value: string) {
  const [matrix, setMatrix] = useState<boolean[][] | null>(null);
  useEffect(() => {
    let live = true;
    import("@/lib/qr").then(({ qrMatrix }) => {
      if (live) setMatrix(qrMatrix(value));
    });
    return () => {
      live = false;
    };
  }, [value]);
  return matrix;
}

const QUIET = 4;

/** A real, scannable code on a white ground (a code needs light around it, in any theme). */
export function QrCode({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string | undefined;
}) {
  const matrix = useQrMatrix(value);
  if (!matrix) return <Skeleton className={cn("aspect-square w-full rounded-card", className)} />;
  const n = matrix.length;
  const size = n + QUIET * 2;
  let d = "";
  matrix.forEach((row, r) =>
    row.forEach((on, c) => {
      if (on) d += `M${c + QUIET} ${r + QUIET}h1v1h-1z`;
    }),
  );
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className={cn("aspect-square w-full rounded-card bg-kb-white", className)}
    >
      <path d={d} fill="#000" />
    </svg>
  );
}

/** Draws the code to a PNG and starts a download. */
export async function downloadQrPng(value: string, filename: string) {
  const { qrMatrix } = await import("@/lib/qr");
  const m = qrMatrix(value);
  const n = m.length;
  const q = { isDark: (r: number, c: number) => m[r]![c]! };
  const scale = 16;
  const px = (n + QUIET * 2) * scale;
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, px, px);
  ctx.fillStyle = "#000";
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (q.isDark(r, c)) ctx.fillRect((c + QUIET) * scale, (r + QUIET) * scale, scale, scale);
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/png"));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Progress through a short flow ---------- */

export function FlowProgress({
  steps,
  current,
  className,
}: {
  steps: string[];
  /** 0 based */
  current: number;
  className?: string | undefined;
}) {
  return (
    <div className={className}>
      <ol className="flex gap-2" aria-hidden>
        {steps.map((s, i) => (
          <li
            key={s}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i < current ? "bg-kb-green" : i === current ? "bg-text-1" : "bg-line-strong",
            )}
          />
        ))}
      </ol>
      <p className="mt-3 text-small font-bold text-text-2">
        Step {current + 1} of {steps.length}: <span className="text-text-1">{steps[current]}</span>
      </p>
    </div>
  );
}

/* ---------- Long text ---------- */

/** Reading width, spacing and list style for articles and legal text. */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "measure text-body text-text-2 [&_a]:text-text-1 [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-12 [&_h2]:scroll-mt-24 [&_h2]:text-h3 [&_h2]:text-text-1 [&_h3]:mt-8 [&_h3]:text-title [&_h3]:font-bold [&_h3]:text-text-1 [&_li]:mt-2 [&_ol]:ms-5 [&_ol]:mt-4 [&_ol]:list-decimal [&_p]:mt-4 [&_strong]:font-bold [&_strong]:text-text-1 [&_ul]:ms-5 [&_ul]:mt-4 [&_ul]:list-disc [&>:first-child]:mt-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
