import type { ReactNode } from "react";
import { PublicLayout } from "@/components/layouts/public-layout";

// Plain, readable legal pages (KABSI-LEGAL-COPY.md, corrected to the system as built on 26 Sep 2026).
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
        <h1 className="font-display text-[clamp(2.6rem,6vw,4rem)] leading-none">{title}</h1>
        <p className="mt-3 text-sm text-kb-stone">Last updated {updated}</p>
        <div className="mt-10 space-y-10 text-[17px] leading-8 text-kb-ink [&_h2]:text-2xl [&_h2]:font-bold [&_li]:mt-2 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
          {children}
        </div>
      </div>
    </PublicLayout>
  );
}
