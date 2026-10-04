import * as React from "react";
import { cn } from "@/lib/utils";

// Guardrail 23: anything that is not a real customer, review or result is labelled. Put this on every example.
function ExampleBadge({
  className,
  children = "Example",
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill border border-kb-stone px-2.5 py-0.5 text-kb-caption font-semibold uppercase tracking-wide text-kb-stone",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export { ExampleBadge };
