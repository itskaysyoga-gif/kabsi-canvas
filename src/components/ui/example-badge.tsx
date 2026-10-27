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
        "inline-flex items-center rounded-pill border border-stroke px-2.5 py-0.5 text-small font-semibold uppercase tracking-wide text-text-2",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export { ExampleBadge };
