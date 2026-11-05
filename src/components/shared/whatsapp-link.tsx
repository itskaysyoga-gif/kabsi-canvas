import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { WHATSAPP_ON, whatsappHref, type WhatsappKind } from "@/lib/site";
import { track } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { WhatsAppGlyph } from "@/components/kabsi/ui";

type Props = {
  kind?: WhatsappKind;
  children: ReactNode;
  className?: string;
  button?: boolean;
  /** Site 2 (master plan 30.34 item 4): the WhatsApp glyph before the words, on the public site. */
  glyph?: boolean;
};

/**
 * A click-to-chat link to Kabsi's WhatsApp number with a short prefilled message (K-122). A person answers it.
 * Renders nothing while the WhatsApp setting is empty, so no page ever shows a dead link.
 */
export function WhatsappLink({
  kind = "general",
  children,
  className,
  button = false,
  glyph = false,
}: Props) {
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
      className={cn(
        "whitespace-nowrap font-bold underline underline-offset-4",
        glyph && "inline-flex items-center gap-1.5",
        className,
      )}
    >
      {glyph && <WhatsAppGlyph className="size-[1.1em]" />}
      {children}
    </a>
  );
}
