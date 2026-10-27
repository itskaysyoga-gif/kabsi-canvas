import type { ReactNode } from "react";
import { TestModeBanner } from "@/components/shared/test-mode-banner";
import { QuietCard, QuietShell } from "@/components/kabsi/d2-quiet";
import { Badge } from "@/components/kabsi/ui";

// The pages an email, a staff link or a card opens (/a, /h, /u, /activate, /unsubscribe, /billing/done): Design 2's
// quiet shell, light, the Kabsi mark, one card, one action. The Test mode line stays on top while Google is in mock mode.
export function ConfirmLayout({
  children,
  concierge = false,
  demo = false,
  mode,
}: {
  children: ReactNode;
  concierge?: boolean;
  /** Google mode from the page's own endpoint; signed-out visitors cannot ask google_mode() (P0.1-08). */
  mode?: "mock" | "live" | undefined;
  /** Demo workspace (P0.1-06): an invented business, labelled on screen. */
  demo?: boolean;
}) {
  return (
    <QuietShell top={<TestModeBanner concierge={concierge} mode={mode} />}>
      <QuietCard badge={demo ? <Badge>Demo data</Badge> : undefined}>{children}</QuietCard>
    </QuietShell>
  );
}
