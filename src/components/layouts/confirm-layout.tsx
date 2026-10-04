import type { ReactNode } from "react";
import { KabsiLogo } from "@/components/shared/kabsi-logo";
import { TestModeBanner } from "@/components/shared/test-mode-banner";
import { ExampleBadge } from "@/components/ui/example-badge";
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
    <>
      <TestModeBanner concierge={concierge} mode={mode} />
      <main className="grid min-h-screen place-items-center bg-kb-sand px-5 py-10">
        <div className="w-full max-w-xl">
          <div className="mb-7 flex items-center justify-center gap-3">
            <KabsiLogo />
            {demo ? <ExampleBadge>Demo data</ExampleBadge> : null}
          </div>
          <div className="rounded-large bg-kb-white p-7 shadow-kb sm:p-10">{children}</div>
        </div>
      </main>
    </>
  );
}
