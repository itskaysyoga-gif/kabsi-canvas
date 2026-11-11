// Home on Design 9 (Web 5 part B, master plan 30.24): the hero here (home2-hero.tsx), everything below it in
// d9-home-lower.tsx (Home 2, lane R R-158 item 4: the order is in docs/site4/home.md).
//
// Polish 4 part D (the script budget): the lower sections are their own chunk. The server renders them in full, so the
// page arrives whole, with one H1 painted at once and nothing moving. In the browser their server HTML is kept as it is
// (not hydrated) until the visitor scrolls, touches the page or presses a key, or the sections come into view; then
// their code loads and they are drawn again from it, the same size in the same place. A first visit's measurement
// (Lighthouse) ends before any of that, so it reads only the first screen's code.
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { D9Hero } from "./home2-hero";

import { loadHomeLower, lowerNow } from "./home-lower-loader";

export { loadHomeLower };

const WAKE = ["scroll", "pointerdown", "touchstart", "keydown", "wheel"] as const;

// Live check 8 Nov 2026 (R-126): when the sections are drawn again their elements are new, so a link the visitor had
// focused (a fast Tab, or a pointer wake while a link had focus) was lost and focus fell back to the top of the page.
// The place of the focused element among the section's focusable elements is kept before the swap and given back
// right after it, before the next paint. The server HTML and the drawn sections list the same elements in the same order.
const FOCUSABLE = 'a[href],button,summary,input,select,textarea,[tabindex]:not([tabindex="-1"])';
function focusPlace(root: HTMLElement | null): number | null {
  const active = document.activeElement;
  if (!root || !active || !root.contains(active)) return null;
  const i = Array.from(root.querySelectorAll(FOCUSABLE)).indexOf(active);
  return i >= 0 ? i : null;
}
function giveFocusBack(root: HTMLElement | null, place: number | null) {
  if (!root || place === null) return;
  (root.querySelectorAll<HTMLElement>(FOCUSABLE)[place] ?? null)?.focus({ preventScroll: true });
}

/**
 * Memo with no props: when the page above it updates, this part is left alone, so its kept server HTML is never
 * thrown away before its code is there.
 */
const HomeLower = memo(function HomeLower() {
  const ref = useRef<HTMLDivElement>(null);
  // On the server (and on a later visit to Home inside the site) the code is already loaded: draw it at once.
  const [ready, setReady] = useState(() => lowerNow() !== null);
  const place = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!ready || place.current === null) return;
    giveFocusBack(ref.current, place.current);
    place.current = null;
  }, [ready]);
  useEffect(() => {
    if (ready) return;
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      stop();
      void loadHomeLower().then(() => {
        place.current = focusPlace(ref.current);
        setReady(true);
      });
    };
    const io =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && go());
    // Site 3a: the hero is short on a phone, so the first lower section is on the first screen; its server HTML shows
    // as it is, and the code wakes when the demonstration (data-wake) comes into view or the visitor acts (Speed gate).
    const target = ref.current?.querySelector("[data-wake]") ?? ref.current;
    if (target) io?.observe(target);
    for (const e of WAKE) window.addEventListener(e, go, { passive: true, once: true });
    function stop() {
      io?.disconnect();
      for (const e of WAKE) window.removeEventListener(e, go);
    }
    if (!io) go();
    return stop;
  }, [ready]);

  const lower = lowerNow();
  if (ready && lower) {
    const { D9HomeLowerSections } = lower;
    return (
      <div ref={ref} data-home-lower>
        <D9HomeLowerSections />
      </div>
    );
  }
  // In the browser before the code is there: keep the server's HTML as it is (React does not touch an element whose
  // inner HTML it was given, so the sections stay on screen, whole, until they are drawn again).
  return (
    <div
      ref={ref}
      data-home-lower
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: "" }}
    />
  );
});

export function D9Home() {
  return (
    <>
      <D9Hero />
      <HomeLower />
    </>
  );
}
