import { useEffect, useState, type ReactNode } from "react";
import { getConsent, needsChoice, onConsentChange } from "@/lib/consent";
import { cn } from "@/lib/utils";
import { MAIN_CTA, WHATSAPP_ON, WHATSAPP_URL } from "@/lib/site";
import { ButtonLink, WhatsAppGlyph, buttonClass } from "./ui";
import { useChrome, useHeroPast, useMainCtaInView } from "./page-signals";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { DeferredAssistant } from "@/components/assistant/deferred-assistant";

/**
 * Every public page: header, main, footer and the phone bar. Design 6 (Web 3, master plan 30.20 section 3) made the
 * site light-led: ivory reading areas (.theme-light .page-light), near-black bands where a page puts .theme-dark, and
 * the footer on the dark band. The consent bar and "Your privacy choices" are the site-wide ones
 * (src/components/shared/privacy-banner.tsx, P0.6-01), loaded after the first paint from the root.
 */
export function SiteShell({
  children,
  className,
  theme = "light",
}: {
  children: ReactNode;
  className?: string;
  /** "dark" keeps a page on the dark ground until its own Web 3 pull request moves it. */
  theme?: "light" | "dark";
}) {
  const light = theme === "light";
  return (
    <div
      className={cn(
        "min-h-dvh overflow-x-clip",
        light ? "theme-light page-light" : "theme-dark",
        className,
      )}
    >
      <a
        href="#main"
        className="press fixed start-3 top-3 z-[60] -translate-y-20 rounded-full bg-kb-yellow px-4 py-3 text-small font-bold text-kb-black focus:translate-y-0"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">{children}</main>
      <div className={light ? "theme-dark" : undefined}>
        <SiteFooter />
      </div>
      <PhoneBar />
      <DeferredAssistant surface="site" />
    </div>
  );
}

/* ---------- Sticky phone bar (once the visitor is past the hero) ---------- */

/** True while the consent bar waits for the visitor's choice (it sits where the phone bar and Nora would). */
export function useConsentOpen() {
  const [consentOpen, setConsentOpen] = useState(false);
  useEffect(() => {
    setConsentOpen(needsChoice(getConsent()));
    return onConsentChange((s) => setConsentOpen(needsChoice(s)));
  }, []);
  return consentOpen;
}

/**
 * When the phone bar shows: past the hero (Design 6, the same rule as Nora), no other main action on screen, the
 * menu and the consent bar closed. Nora's launcher reads it to sit above the bar.
 */
export function usePhoneBarShown() {
  const past = useHeroPast(360);
  const mainInView = useMainCtaInView();
  const { menuOpen } = useChrome();
  const consentOpen = useConsentOpen();
  return past && !mainInView && !menuOpen && !consentOpen;
}

export function PhoneBar() {
  const { noraOpen } = useChrome();
  // The phone bar steps aside while Nora's panel is open.
  const show = usePhoneBarShown() && !noraOpen;
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
