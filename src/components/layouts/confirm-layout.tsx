import type { ReactNode } from "react";
import { KabsiLogo } from "@/components/shared/kabsi-logo";
import { TestModeBanner } from "@/components/shared/test-mode-banner";
import { ExampleBadge } from "@/components/ui/example-badge";
export function ConfirmLayout({
  children,
  concierge = false,
  demo = false,
}: {
  children: ReactNode;
  concierge?: boolean;
  /** Demo workspace (P0.1-06): an invented business, labelled on screen. */
  demo?: boolean;
}) {
  return (
    <>
      <TestModeBanner concierge={concierge} />
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
