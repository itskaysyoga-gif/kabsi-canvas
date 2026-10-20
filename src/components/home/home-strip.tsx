import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { PlanState } from "@/lib/home";
import type { Strip, StripTone } from "@/lib/home-state";

const DOT: Record<StripTone, string> = {
  green: "bg-kb-green",
  amber: "bg-kb-amber",
  red: "bg-kb-red",
  grey: "bg-kb-hairline",
};

// The strip that is on Home whatever the state (K-06): the Google connection, the last successful check and the plan.
// Amber when the last check is older than 6 hours, red when access is lost, so Home never looks healthy while sync fails.
export function HomeStrip({ strip, plan }: { strip: Strip; plan: PlanState | null }) {
  return (
    <div
      className={cn(
        "mt-4 flex flex-wrap items-center gap-x-4 gap-y-0.5 rounded-card border px-4 py-2 text-kb-small",
        strip.tone === "amber"
          ? "border-kb-amber bg-kb-amber-soft text-kb-amber"
          : strip.tone === "red"
            ? "border-kb-red bg-kb-red/10 text-kb-red"
            : "border-kb-hairline bg-kb-white text-kb-stone",
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
          className="ml-auto inline-flex min-h-10 items-center underline-offset-4 hover:underline"
        >
          {plan.name}
          {plan.line ? `, ${plan.line}` : ""}
        </Link>
      ) : null}
    </div>
  );
}
