import { useEffect, useRef, type ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAIN_CTA, WHATSAPP_ON, WHATSAPP_URL } from "@/lib/site";
import { ButtonLink, WhatsAppGlyph, buttonClass } from "./ui";
import { setChrome, useChrome, usePhoneBarShown } from "./page-signals";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { FoundingLine } from "./founding-line";
import { DeferredAssistant } from "@/components/assistant/deferred-assistant";

/**
 * Every public page: the Founding 25 line, the sticky header, main, footer and the phone bar. Design 6 (Web 3) made
 * the site light-led; Design 8 (Web 4, lane R 1 Nov 2026) adds the Founding 25 line above the header, the Businesses
 * menu, the three-group footer, and puts Nora in the phone bar on phones. The consent bar and "Your privacy choices"
 * are the site-wide ones (src/components/shared/privacy-banner.tsx, P0.6-01), loaded after the first paint.
 */
export function SiteShell({
  children,
  className,
  theme = "light",
}: {
  children: ReactNode;
  className?: string;
  /** "dark" keeps a page on the dark ground until its own pull request moves it. */
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
      <FoundingLine />
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

/* ---------- Phone bar: the one action, and Nora beside it (lane R decision 5, Design 8) ---------- */

/**
 * Below 640 px Nora never floats over the page: her button sits in the phone bar, beside "Check my business free", so
 * she covers neither content nor the action. The bar shows once the visitor is past the hero, with no other main
 * action on screen, the menu and the consent bar closed; it steps aside while Nora is open. From 640 px the bar is
 * gone and Nora's own launcher sits in the corner. Signed-in screens keep Polish 1's rule (no floating button).
 */
export function PhoneBar() {
  const { noraOpen } = useChrome();
  const nora = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    setChrome({ phoneBarMounted: true });
    return () => setChrome({ phoneBarMounted: false });
  }, []);
  const show = usePhoneBarShown() && !noraOpen;
  // Closing Nora returns focus to her button here (the panel's close falls back to the page when the bar is hidden).
  useEffect(() => {
    if (wasOpen.current && !noraOpen && window.innerWidth < 640) {
      nora.current?.focus();
      if (document.activeElement !== nora.current) {
        const main = document.getElementById("main");
        main?.setAttribute("tabindex", "-1");
        main?.focus({ preventScroll: true });
      }
    }
    wasOpen.current = noraOpen;
  }, [noraOpen]);
  return (
    <div
      aria-hidden={!show}
      inert={!show}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-line glass pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 transition-[transform,opacity] duration-200 ease-kb sm:hidden",
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
        <button
          ref={nora}
          type="button"
          data-nora-bar
          onClick={() => window.dispatchEvent(new CustomEvent("kabsi:open-nora"))}
          className="press grid size-13 shrink-0 place-items-center rounded-full bg-kb-black text-kb-white"
        >
          <MessageCircle className="size-5" aria-hidden />
          <span className="sr-only">Ask Nora, Kabsi's assistant</span>
        </button>
      </div>
    </div>
  );
}
