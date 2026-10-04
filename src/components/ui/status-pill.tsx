import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// K-108 status pill. Green is done or calm, amber needs attention, red is a real problem only, grey is neutral.
// Yellow is not a pill colour: it is kept for the one action and the "needs you" highlight.
const statusPillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-kb-caption font-semibold",
  {
    variants: {
      tone: {
        green: "bg-kb-green/10 text-kb-green",
        amber: "bg-kb-amber-soft text-kb-amber",
        red: "bg-kb-red/10 text-kb-red",
        grey: "bg-kb-sand text-kb-stone",
      },
    },
    defaultVariants: { tone: "grey" },
  },
);
export type StatusTone = NonNullable<VariantProps<typeof statusPillVariants>["tone"]>;
export interface StatusPillProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof statusPillVariants> {}

function StatusPill({ className, tone, children, ...props }: StatusPillProps) {
  return (
    <span className={cn(statusPillVariants({ tone }), className)} {...props}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export { StatusPill, statusPillVariants };
