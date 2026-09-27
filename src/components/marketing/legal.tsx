import type { ReactNode } from "react";
import { FileText, Scale, ShieldCheck } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { IconBadge } from "@/components/marketing/parts";

const ICONS = { privacy: <ShieldCheck />, terms: <Scale />, other: <FileText /> };

// Plain, readable legal pages (KABSI-LEGAL-COPY.md, corrected to the system as built on 26 Sep 2026).
export function LegalPage({
  title,
  updated,
  kind = "other",
  children,
}: {
  title: string;
  updated: string;
  kind?: keyof typeof ICONS;
  children: ReactNode;
}) {
  return (
    <PublicLayout>
      <header className="border-b border-kb-hairline bg-kb-sand">
        <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
          <IconBadge icon={ICONS[kind]} className="size-14 [&_svg]:size-6" />
          <h1 className="mt-6 font-display text-[clamp(2.6rem,6vw,4rem)] leading-none">{title}</h1>
          <p className="mt-3 text-sm text-kb-stone">Last updated {updated}</p>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="space-y-10 text-[17px] leading-8 text-kb-ink [&_a]:font-bold [&_a]:underline [&_a]:underline-offset-4 [&_h2]:text-2xl [&_h2]:font-bold [&_li]:mt-2 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
          {children}
        </div>
      </div>
    </PublicLayout>
  );
}
