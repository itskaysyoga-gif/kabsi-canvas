import * as React from "react";
import { cn } from "@/lib/utils";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";

// The Kabsi card: the approval card used in the hero, emails and the app, one design everywhere.
// What is waiting, why, what Kabsi suggests, and what happens when the owner approves. One primary action only.
export interface KabsiCardProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Small line above the title, for example "New review, 4 stars". */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  status?: { label: React.ReactNode; tone: StatusTone };
  /** The text Kabsi prepared, shown in a quote box. */
  draft?: React.ReactNode;
  /** One sentence on what happens next, for example "Nothing is published until you approve it." */
  note?: React.ReactNode;
  /** Buttons. Pass one primary button and at most one secondary or tertiary. */
  actions?: React.ReactNode;
  /** Highlight a card that needs the owner now. This is the only place yellow appears outside a primary button. */
  needsYou?: boolean;
}

function KabsiCard({
  eyebrow,
  title,
  status,
  draft,
  note,
  actions,
  needsYou,
  className,
  children,
  ...props
}: KabsiCardProps) {
  return (
    <article
      className={cn(
        "rounded-card border bg-surface-1 p-5 shadow-rest",
        needsYou ? "border-kb-yellow ring-2 ring-kb-yellow" : "border-line",
        className,
      )}
      {...props}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? <p className="text-small font-semibold text-text-2">{eyebrow}</p> : null}
          <h3 className="text-lead font-bold leading-snug">{title}</h3>
        </div>
        {status ? <StatusPill tone={status.tone}>{status.label}</StatusPill> : null}
      </header>
      {draft ? (
        <blockquote className="mt-4 rounded-lg bg-surface-2 p-4 text-body text-text-1">
          {draft}
        </blockquote>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
      {note ? <p className="mt-3 text-small text-text-2">{note}</p> : null}
      {actions ? <div className="mt-4 flex flex-wrap items-center gap-3">{actions}</div> : null}
    </article>
  );
}

export { KabsiCard };
