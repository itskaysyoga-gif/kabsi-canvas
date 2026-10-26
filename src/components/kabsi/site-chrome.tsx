import { useEffect, useState, type ReactNode } from "react";
import { getConsent, needsChoice, onConsentChange } from "@/lib/consent";
import { cn } from "@/lib/utils";
import { MAIN_CTA, WHATSAPP_ON, WHATSAPP_URL } from "@/lib/site";
import { ButtonLink, WhatsAppGlyph, buttonClass } from "./ui";
import { useChrome, useMainCtaInView, useScrolledPast } from "./page-signals";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { DeferredAssistant } from "@/components/assistant/deferred-assistant";

/**
 * Every public page: header, main, footer and the phone bar, on the dark ground (.theme-dark). The consent bar and
 * "Your privacy choices" are the site-wide ones (src/components/shared/privacy-banner.tsx, P0.6-01), loaded after the
 * first paint from the root, so the proof and the country rules stay in one place.
 */
export function SiteShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("theme-dark min-h-dvh overflow-x-clip", className)}>
      <a
        href="#main"
        className="press fixed start-3 top-3 z-[60] -translate-y-20 rounded-full bg-kb-yellow px-4 py-3 text-small font-bold text-kb-black focus:translate-y-0"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <PhoneBar />
      <DeferredAssistant surface="site" />
    </div>
  );
}

/* ---------- Sticky phone bar (after the first scroll) ---------- */

export function PhoneBar() {
  const past = useScrolledPast(360);
  const mainInView = useMainCtaInView();
  const { menuOpen } = useChrome();
  // The consent bar sits where the phone bar would, so the phone bar waits for the visitor's choice.
  const [consentOpen, setConsentOpen] = useState(false);
  useEffect(() => {
    setConsentOpen(needsChoice(getConsent()));
    return onConsentChange((s) => setConsentOpen(needsChoice(s)));
  }, []);
  const show = past && !mainInView && !menuOpen && !consentOpen;
  return (
    <div
      aria-hidden={!show}
      inert={!show}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-line glass pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 transition-[transform,opacity] duration-200 ease-kb md:hidden",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
      )}
    >
      <div className="container-kb flex items-center gap-3">
        <ButtonLink to="/scan" full className="flex-1">
          {MAIN_CTA}
        </ButtonLink>
        {WHATSAPP_ON && (
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Chat on WhatsApp"
            className={cn(buttonClass("whatsapp"), "w-13 shrink-0 px-0")}
          >
            <WhatsAppGlyph className="size-6" />
          </a>
        )}
      </div>
    </div>
  );
}
