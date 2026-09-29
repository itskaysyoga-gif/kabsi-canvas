import type { ReactNode } from "react";
import { KabsiLogo } from "@/components/shared/kabsi-logo";
import { TestModeBanner } from "@/components/shared/test-mode-banner";
export function ConfirmLayout({
  children,
  concierge = false,
}: {
  children: ReactNode;
  concierge?: boolean;
}) {
  return (
    <>
      <TestModeBanner concierge={concierge} />
      <main className="grid min-h-screen place-items-center bg-kb-sand px-5 py-10">
        <div className="w-full max-w-xl">
          <div className="mb-7 flex justify-center">
            <KabsiLogo />
          </div>
          <div className="rounded-large bg-kb-white p-7 shadow-kb sm:p-10">{children}</div>
        </div>
      </main>
    </>
  );
}
