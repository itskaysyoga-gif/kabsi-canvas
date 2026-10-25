import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { WHATSAPP_ON, whatsappHref, type WhatsappKind } from "@/lib/site";
import { track } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

type Props = { kind?: WhatsappKind; children: ReactNode; className?: string; button?: boolean };

/**
 * A click-to-chat link to Kabsi's WhatsApp number with a short prefilled message (K-122). A person answers it.
 * Renders nothing while the WhatsApp setting is empty, so no page ever shows a dead link.
 */
export function WhatsappLink({ kind = "general", children, className, button = false }: Props) {
  if (!WHATSAPP_ON) return null;
  const external = {
    target: "_blank",
    rel: "noopener noreferrer",
    onClick: () => track("whatsapp_button_clicked", { source: kind }),
  };
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
