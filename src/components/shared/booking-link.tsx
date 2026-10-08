import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { BOOKING_READY, bookingHref, type BookingKind } from "@/lib/site";
import { cn } from "@/lib/utils";

type Props = { kind: BookingKind; children: ReactNode; className?: string; button?: boolean };

/** A link to the one Calendly event with the right answer preselected (P0.1-V3). A plain underlined link, or a button. */
export function BookingLink({ kind, children, className, button = false }: Props) {
  const external = BOOKING_READY ? { target: "_blank", rel: "noopener noreferrer" } : {};
  if (button) {
    return (
      <Button asChild variant="outline" className={className}>
        <a href={bookingHref(kind)} {...external}>
          {children}
        </a>
      </Button>
    );
  }
  return (
    <a
      href={bookingHref(kind)}
      {...external}
      className={cn("font-bold underline underline-offset-4", className)}
    >
      {children}
    </a>
  );
}
