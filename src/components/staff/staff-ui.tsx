import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Button as KabsiButton } from "@/components/kabsi/ui";
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
