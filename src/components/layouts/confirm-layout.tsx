import type { ReactNode } from "react";
import { KabsiLogo } from "@/components/shared/kabsi-logo";
export function ConfirmLayout({ children }: { children: ReactNode }) {
  return <main className="grid min-h-screen place-items-center bg-kb-sand px-5 py-10"><div className="w-full max-w-xl"><div className="mb-7 flex justify-center"><KabsiLogo /></div><div className="rounded-large bg-kb-white p-7 shadow-kb sm:p-10">{children}</div></div></main>;
}
