import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// One banner for every notice. Yellow appears only as the "needs you" highlight; amber is "needs your attention";
// red is for real problems only.
const bannerVariants = cva(
  "flex w-full items-start gap-3 rounded-card border px-4 py-3 text-kb-small",
  {
    variants: {
      tone: {
        info: "border-kb-hairline bg-kb-sand text-kb-ink",
        needsYou: "border-kb-yellow bg-kb-yellow/20 text-kb-ink",
        attention: "border-kb-amber/30 bg-kb-amber-soft text-kb-amber",
        success: "border-kb-green/30 bg-kb-green/10 text-kb-green",
        problem: "border-kb-red/30 bg-kb-red/10 text-kb-red",
      },
    },
    defaultVariants: { tone: "info" },
  },
);
export interface BannerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">, VariantProps<typeof bannerVariants> {
  title?: React.ReactNode;
  action?: React.ReactNode;
}

function Banner({ className, tone, title, action, children, ...props }: BannerProps) {
  return (
    <div
      role={tone === "problem" ? "alert" : "status"}
      className={cn(bannerVariants({ tone }), className)}
      {...props}
    >
      <div className="min-w-0 flex-1">
        {title ? <p className="font-bold">{title}</p> : null}
        {children ? <div className={title ? "mt-0.5" : undefined}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export { Banner, bannerVariants };
