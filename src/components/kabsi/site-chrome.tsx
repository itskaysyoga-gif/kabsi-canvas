import { useEffect, useRef, useState, type ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAIN_CTA } from "@/lib/site";
import { ButtonLink } from "./ui";
import { setChrome, useChrome, useConsentOpen, usePhoneBarShown } from "./page-signals";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { DeferredAssistant, prefetchNora } from "@/components/assistant/deferred-assistant";
import { SIGNED_OUT_EVENT, SIGNED_OUT_LINE, takeSignedOutReason } from "@/lib/signed-out";

/** "You are signed out." under the header, once, after Log out in this tab or another (App 4, 30.31 item 1). */
function SignedOutLine() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const read = () => {
      if (takeSignedOutReason(["you"])) setShown(true);
    };
    read();
    window.addEventListener(SIGNED_OUT_EVENT, read);
    return () => window.removeEventListener(SIGNED_OUT_EVENT, read);
  }, []);
  if (!shown) return null;
  return (
    <p
      role="status"
      data-signed-out
      className="border-b border-line bg-surface-2 py-3 text-center text-small font-semibold text-text-1"
    >
      {SIGNED_OUT_LINE}
    </p>
  );
}

/**
 * Every public page: the sticky header, main, footer and the phone bar. Design 6 (Web 3) made the site light-led;
 * Design 8 (Web 4, lane R 1 Nov 2026) put Nora in the phone bar on phones; Founding 1 (R-151, master plan 30.51) removed
 * the Founding 25 line above the header, and nothing replaces it (no promo bar, no empty bar); Design 9 (Web 5 part A, master plan 30.24) simplifies the header, the phone menu and the
 * footer, and the phone bar keeps one action and Nora. The consent bar and "Your privacy choices"
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
      <SiteHeader />
      <SignedOutLine />
      <main id="main">{children}</main>
      <div className={light ? "theme-dark" : undefined}>
        <SiteFooter />
      </div>
      <PhoneBar />
      <NoraLauncher />
      <DeferredAssistant surface="site" />
    </div>
  );
}

/* ---------- Phone bar: the one action, and Nora beside it (Design 8; Design 9 drops WhatsApp from the bar) ---------- */

/**
 * Below 640 px Nora never floats over the page: her button sits in the phone bar, beside "Check my business free", so
 * she covers neither content nor the action. The bar shows once the visitor is past the hero, with no other main
 * action on screen, the menu and the consent bar closed; it steps aside while Nora is open. From 640 px the bar is
 * gone and Nora's own launcher sits in the corner. Signed-in screens keep Polish 1's rule (no floating button).
 */
export function PhoneBar() {
  const { noraOpen } = useChrome();
  useEffect(() => {
    setChrome({ phoneBarMounted: true });
    return () => setChrome({ phoneBarMounted: false });
  }, []);
  // Closing Nora returns focus to her button here when the bar shows (NoraLauncher below).
  const show = usePhoneBarShown() && !noraOpen;
  return (
    <div
      data-phone-bar
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
        <button
          type="button"
          data-nora-bar
          onPointerEnter={prefetchNora}
          onTouchStart={prefetchNora}
          onClick={openNora}
          className="press grid size-14 shrink-0 place-items-center rounded-full border border-line-strong bg-surface-1 text-text-1"
        >
          <MessageCircle className="size-5" aria-hidden />
          <span className="sr-only">Ask Nora, Kabsi's assistant</span>
        </button>
      </div>
    </div>
  );
}

/* ---------- Nora's own button (Polish 4, master plan 30.25 item 4) ---------- */

const openNora = () => window.dispatchEvent(new CustomEvent("kabsi:open-nora"));

/**
 * What Nora's lone button must never cover. From 640 px (the wide launcher): the consent bar (it is lifted above it
 * instead), a form's submit button and the footer's legal row (Polish 4). On a phone (the round button, Fix 6, R-162):
 * every button, field and tappable box, so nothing the visitor may want to press is ever under her; the last lines of
 * a page are kept clear by the footer's bottom space (the legal row is `data-nora-avoid` and the footer ends with room
 * for her and for the phone bar). A word inside a sentence is not a box: a link counts only when it is not inline.
 */
const AVOID_WIDE = "form button[type=submit], form input[type=submit], [data-nora-avoid]";
const AVOID_PHONE =
  "button, input:not([type=hidden]), select, textarea, summary, a[href], [role=button], [role=combobox], [role=tab], [role=switch], [role=checkbox], [role=radio], [data-nora-avoid]";

/**
 * Her own two buttons and the whole phone bar never count: the bar has her button beside its one action by design, and
 * while the bar shows her round button is not drawn at all (reading the bar would also leave her hidden for a moment
 * after the bar steps aside, because its `inert` is not watched).
 */
function isHers(el: Element) {
  return !!el.closest("[data-nora-launcher], [data-nora-bar], [data-phone-bar]");
}

/** On a phone, a link that is a box (a button, a card, a row) counts; a link inside a sentence does not. */
function isBoxLink(el: Element) {
  return (
    !el.matches("a[href]") ||
    el.matches("[data-nora-avoid]") ||
    getComputedStyle(el).display !== "inline"
  );
}

function overlaps(a: DOMRect, b: DOMRect, pad = 8) {
  return (
    a.left < b.right + pad &&
    a.right > b.left - pad &&
    a.top < b.bottom + pad &&
    a.bottom > b.top - pad
  );
}

function shown(el: Element | null): el is HTMLElement {
  return !!el && el.getClientRects().length > 0 && !el.closest("[inert]");
}

/**
 * Nora's button on every public page from the first paint (it is part of the server-drawn page, her code is not):
 * below 640 px a round 56 px button alone at the bottom right, inside the safe area, wherever the phone bar does not
 * show (where it shows, her button is in the bar); from 640 px the launcher as before. It steps aside while the menu or
 * Nora is open, or when it would cover a button, a field or another tappable box (AVOID_PHONE; from 640 px AVOID_WIDE),
 * and sits above the consent bar while that waits for a choice. While it waits, "Ask Nora" is in the menu and the phone
 * bar's button takes over once the visitor is past the hero; it comes back as soon as nothing is under it.
 * Closing Nora gives focus back to whichever of her buttons shows.
 */
export function NoraLauncher() {
  const { noraOpen, menuOpen } = useChrome();
  const barShown = usePhoneBarShown();
  const consentOpen = useConsentOpen();
  const solo = useRef<HTMLButtonElement>(null);
  const wide = useRef<HTMLButtonElement>(null);
  const [blocked, setBlocked] = useState({ solo: false, wide: false });
  const [lift, setLift] = useState(0);

  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const banner = document.querySelector(
        "[data-testid=privacy-banner], [data-testid=privacy-panel]",
      );
      const phone = window.innerWidth < 640;
      setLift(phone && shown(banner) ? Math.ceil(banner.getBoundingClientRect().height) : 0);
      const hit = (btn: HTMLButtonElement | null, list: Element[], box: boolean) => {
        if (!btn) return false;
        const z = btn.getBoundingClientRect();
        if (!z.width) return false;
        return list.some(
          (el) => overlaps(z, el.getBoundingClientRect()) && (!box || isBoxLink(el)),
        );
      };
      // The round button only shows below 640 px and the wide one from it, so each reads its own list.
      const wideList = phone ? [] : [...document.querySelectorAll(AVOID_WIDE)].filter(shown);
      const phoneList = phone
        ? [...document.querySelectorAll(AVOID_PHONE)].filter((e) => shown(e) && !isHers(e))
        : [];
      setBlocked({
        solo: hit(solo.current, phoneList, true),
        wide: hit(wide.current, wideList, false),
      });
    };
    const soon = () => {
      if (!raf) raf = window.requestAnimationFrame(check);
    };
    soon();
    window.addEventListener("scroll", soon, { passive: true });
    window.addEventListener("resize", soon);
    const mo = new MutationObserver(soon);
    mo.observe(document.body, { childList: true, subtree: true });
    // A page can move under her without a scroll or a change in the page (a picture or a font arriving): read again then.
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(soon);
    ro?.observe(document.body);
    window.addEventListener("load", soon);
    void document.fonts?.ready.then(soon);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", soon);
      window.removeEventListener("resize", soon);
      window.removeEventListener("load", soon);
      mo.disconnect();
      ro?.disconnect();
    };
  }, [consentOpen, lift]);

  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !noraOpen) {
      window.requestAnimationFrame(() => {
        const target = [document.querySelector("[data-nora-bar]"), solo.current, wide.current].find(
          shown,
        );
        if (target) return target.focus();
        const main = document.getElementById("main");
        main?.setAttribute("tabindex", "-1");
        main?.focus({ preventScroll: true });
      });
    }
    wasOpen.current = noraOpen;
  }, [noraOpen]);

  const showSolo = !noraOpen && !menuOpen && !barShown && !blocked.solo;
  const showWide = !noraOpen && !menuOpen && !blocked.wide;
  return (
    <>
      <button
        ref={solo}
        type="button"
        data-nora-launcher="phone"
        aria-hidden={!showSolo}
        inert={!showSolo}
        onTouchStart={prefetchNora}
        onClick={openNora}
        // Lifted above the consent bar with a transform, not with bottom, so the move is not a layout shift.
        style={{
          bottom: "max(1rem, env(safe-area-inset-bottom))",
          transform: lift ? `translateY(-${lift}px)` : undefined,
        }}
        className={cn(
          "press fixed end-[max(1rem,env(safe-area-inset-right))] z-40 grid size-14 place-items-center rounded-full bg-kb-black text-kb-white shadow-float transition-opacity duration-200 ease-kb sm:hidden",
          showSolo ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <span className="grid size-9 place-items-center rounded-full bg-kb-sand text-kb-black">
          <MessageCircle className="size-5" aria-hidden />
        </span>
        <span className="sr-only">Ask Nora, Kabsi's assistant</span>
      </button>
      <button
        ref={wide}
        type="button"
        data-nora-launcher="wide"
        aria-hidden={!showWide}
        inert={!showWide}
        onPointerEnter={prefetchNora}
        onClick={openNora}
        aria-label="Chat with Nora, Kabsi's assistant"
        className={cn(
          "fixed right-6 bottom-6 z-40 hidden h-14 items-center gap-2 rounded-full bg-kb-black pr-5 pl-4 text-sm font-bold text-kb-white shadow-[0_12px_32px_rgba(0,0,0,.28)] transition-[transform,opacity] hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-kb-yellow focus-visible:outline-none sm:flex",
          showWide ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <span className="grid size-8 place-items-center rounded-full bg-kb-sand text-kb-black">
          <MessageCircle className="size-4" aria-hidden="true" />
        </span>
        <span>Chat with Nora</span>
      </button>
    </>
  );
}
