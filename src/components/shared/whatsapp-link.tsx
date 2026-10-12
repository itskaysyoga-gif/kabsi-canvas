import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { whatsappHref, type WhatsappKind } from "@/lib/site";
import { cn } from "@/lib/utils";

type Props = { kind?: WhatsappKind; children: ReactNode; className?: string; button?: boolean };

/** A click-to-chat link to Kabsi's WhatsApp number with a short prefilled message (K-122). A person answers it. */
export function WhatsappLink({ kind = "general", children, className, button = false }: Props) {
  const external = { target: "_blank", rel: "noopener noreferrer" };
  if (button) {
    return (
      <Button asChild variant="outline" className={className}>
        <a href={whatsappHref(kind)} {...external}>
          {children}
        </a>
      </Button>
    );
  }
  return (
    <a
      href={whatsappHref(kind)}
      {...external}
      className={cn("whitespace-nowrap font-bold underline underline-offset-4", className)}
    >
      {children}
    </a>
  );
}
