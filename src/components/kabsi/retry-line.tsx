import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// Its own file, not ui.tsx, so the public pages' script (Home's 205 KB budget) does not carry it: only signed-in and staff
// screens use it.
/**
 * APP-1: the short line a failed read shows inside a card, never the raw error. What did not load, that nothing changed,
 * and Try again.
 */
export function RetryLine({
  what = "This did not load.",
  onRetry,
  className,
}: {
  what?: string | undefined;
  onRetry?: (() => void) | undefined;
  className?: string | undefined;
}) {
  return (
    <p
      role="alert"
      className={cn("flex flex-wrap items-center gap-x-2 text-small text-text-2", className)}
    >
      <AlertTriangle className="size-4 shrink-0 text-warn" aria-hidden />
      <span>{what} Nothing changed.</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-11 items-center font-bold text-text-1 underline underline-offset-4"
        >
          Try again
        </button>
      ) : null}
    </p>
  );
}
