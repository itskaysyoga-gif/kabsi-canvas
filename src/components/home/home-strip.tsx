import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { PlanState } from "@/lib/home";
import type { Strip, StripTone } from "@/lib/home-state";

const DOT: Record<StripTone, string> = {
  green: "bg-kb-green",
  amber: "bg-warn",
  red: "bg-bad",
  grey: "bg-line-strong",
};

// The strip that is on Home whatever the state (K-06): the Google connection, the last successful check and the plan.
// Amber when the last check is older than 6 hours, red when access is lost, so Home never looks healthy while sync fails.
export function HomeStrip({ strip, plan }: { strip: Strip; plan: PlanState | null }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-0.5 rounded-card border px-4 py-2 text-small",
        strip.tone === "amber"
          ? "border-warn/40 bg-warn-soft text-warn"
          : strip.tone === "red"
            ? "border-bad/40 bg-bad-soft text-bad"
            : "border-line bg-surface-1 text-text-2",
      )}
      role={strip.tone === "red" || strip.tone === "amber" ? "status" : undefined}
      data-tone={strip.tone}
    >
      <span className="flex items-center gap-2 font-medium">
        <span
          aria-hidden="true"
          className={cn("size-2.5 shrink-0 rounded-full", DOT[strip.tone])}
        />
        {strip.connection}
      </span>
      {strip.checked ? <span>{strip.checked}</span> : null}
      {plan ? (
        <Link
          to="/app/plan"
          className="ms-auto inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline"
        >
          {plan.name}
          {plan.line ? `, ${plan.line}` : ""}
        </Link>
      ) : null}
    </div>
  );
}
