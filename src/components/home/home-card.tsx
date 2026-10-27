import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// The frame of one task on Home (Design 3's Kabsi card, master plan 30.17 section 4): an icon, the title, when, then the
// body, then the buttons under a line. The same look as the review cards on Reviews.
export function HomeCard({
  icon: Icon,
  title,
  when,
  children,
  foot,
  tone = "plain",
  className,
}: {
  icon: LucideIcon;
  title: ReactNode;
  when?: ReactNode;
  children?: ReactNode;
  foot?: ReactNode;
  tone?: "plain" | "warn";
  className?: string;
}) {
  return (
    <article
      className={cn(
        "rounded-card border bg-surface-1 p-4 shadow-rest sm:p-5",
        tone === "warn" ? "border-warn/40" : "border-line",
        className,
      )}
    >
      <header className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-text-2">
          <Icon className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-title font-bold">{title}</h3>
          {when ? <p className="text-small text-text-3">{when}</p> : null}
        </div>
      </header>
      {children ? <div className="mt-3">{children}</div> : null}
      {foot ? <div className="mt-5 border-t border-line pt-4">{foot}</div> : null}
    </article>
  );
}
