import type { ReactNode } from "react";
import { buttonClass } from "@/components/kabsi/ui";
import {
  BOOKING_EMAIL_HELPER,
  BOOKING_READY,
  bookingHref,
  bookingLabel,
  type BookingKind,
} from "@/lib/site";
import { cn } from "@/lib/utils";

type Props = { kind: BookingKind; children: ReactNode; className?: string; button?: boolean };

/** While the calendar is not set (BOOKING_READY false) the helper under every booking button (R-126, CONV-01). */
export function BookingHelper({ className }: { className?: string }) {
  if (BOOKING_READY) return null;
  return <span className={cn("block text-small text-text-2", className)}>{BOOKING_EMAIL_HELPER}</span>;
}

/**
 * A link to the one Calendly event with the right answer preselected (P0.1-V3). A plain underlined link, or a button.
 * While the calendar link is not set it is an email, reads "Email us to arrange a call", and a button carries its helper.
 */
export function BookingLink({ kind, children, className, button = false }: Props) {
  const external = BOOKING_READY ? { target: "_blank", rel: "noopener noreferrer" } : {};
  const text = BOOKING_READY ? children : bookingLabel("");
  if (button) {
    return (
      <>
        <a
          href={bookingHref(kind)}
          {...external}
          className={cn(buttonClass("secondary", "lg"), className)}
        >
          {text}
        </a>
        <BookingHelper className="mt-2" />
      </>
    );
  }
  return (
    <a
      href={bookingHref(kind)}
      {...external}
      className={cn("font-bold underline underline-offset-4", className)}
    >
      {text}
    </a>
  );
}
