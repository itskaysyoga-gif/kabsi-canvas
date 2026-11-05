import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Button as KabsiButton } from "@/components/kabsi/ui";
import { AccountTop, ChoiceChips } from "@/components/kabsi/d3-account";
import { Marked } from "@/components/kabsi/highlight";
import type { StaffPage } from "@/lib/staff-nav";
import { cn } from "@/lib/utils";

// The staff page's parts on the light system (Design 3 tokens). The staff page has no main action, so no staff button
// is yellow: the old variants map to the outlined and quiet buttons of src/components/kabsi/ui.tsx.

/** Every staff panel: a white card with the panel's H2 inside. */
export const STAFF_CARD =
  "scroll-mt-24 rounded-card border border-line bg-surface-1 p-4 shadow-rest sm:p-5";
/** A card inside a staff panel (an application, a business, a task). */
export const STAFF_ITEM = "rounded-inner border border-line bg-surface-1 p-4";
/** The H2 of a staff panel. */
export const STAFF_H2 = "font-display text-h3 font-bold";

type OldVariant = "default" | "primary" | "outline" | "secondary" | "ghost" | "link" | "tertiary";

export const Button = forwardRef<
  HTMLButtonElement,
  {
    variant?: OldVariant | null | undefined;
    size?: "default" | "compact" | "icon" | null | undefined;
    children: ReactNode;
  } & ButtonHTMLAttributes<HTMLButtonElement>
>(function StaffButton({ variant, size: _size, className, children, ...rest }, ref) {
  const v =
    variant === "ghost"
      ? "quiet"
      : variant === "link" || variant === "tertiary"
        ? "tertiary"
        : "secondary";
  return (
    <KabsiButton
      ref={ref}
      variant={v}
      size="md"
      className={cn("[&_svg]:size-4.5 [&_svg]:shrink-0", className)}
      {...rest}
    >
      {children}
    </KabsiButton>
  );
});

// ─── App 5 (master plan 30.33 item 3): the parts every staff page shares ────────────────────────────────────────────

/** The staff page's H1 with its one phrase on the highlight bar, and the one line that says what the page is for. */
export function StaffTop({ page, action }: { page: StaffPage; action?: ReactNode }) {
  return (
    <AccountTop
      tabs={false}
      title={<Marked text={page.title} mark={page.mark} />}
      lead={page.purpose}
      action={action}
    />
  );
}

/**
 * Chips that choose which of a page's panels show ("All" first), kept in the address as ?show= so a link from Today
 * opens the right one. Every panel stays on the page; a chip only hides the others.
 */
export function usePanelChips<T extends string>(ids: readonly T[]) {
  const navigate = useNavigate();
  const raw = useRouterState({
    select: (s) => (s.location.search as Record<string, unknown>)["show"],
  });
  const show = typeof raw === "string" && (ids as readonly string[]).includes(raw) ? (raw as T) : "all";
  const set = (v: string) =>
    void navigate({
      to: ".",
      search: (v === "all" ? {} : { show: v }) as never,
      replace: true,
      resetScroll: false,
    });
  const on = (id: T) => show === "all" || show === id;
  return { show, set, on };
}

export function PanelChips({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <ChoiceChips
      name="staff-show"
      legend="Show"
      legendClassName="sr-only"
      className="mb-5"
      value={value}
      onChange={onChange}
      options={[{ value: "all", label: "All" }, ...options]}
    />
  );
}

/** Loading, error and empty, the same on every staff page. */
export function StaffLoading({ what }: { what: string }) {
  return (
    <p className="text-small text-text-2" role="status">
      Loading {what}
    </p>
  );
}
