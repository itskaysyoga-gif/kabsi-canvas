// Home on Design 9 (Web 5 part B, master plan 30.24): the hero and the steps line here, everything below the first
// screen in d9-home-lower.tsx.
//
// Polish 4 part D (the script budget): the lower sections are their own chunk. The server renders them in full, so the
// page arrives whole, with one H1 painted at once and nothing moving. In the browser their server HTML is kept as it is
// (not hydrated) until the visitor scrolls, touches the page or presses a key, or the sections come into view; then
// their code loads and they are drawn again from it, the same size in the same place. A first visit's measurement
// (Lighthouse) ends before any of that, so it reads only the first screen's code.
import { memo, useEffect, useRef, useState } from "react";
import { D9Hero, StepsLine } from "./d9-hero";

type Lower = typeof import("./d9-home-lower");
let lower: Lower | null = null;
let loading: Promise<Lower> | null = null;

/** Load the lower sections' code once. The route's loader awaits it on the server, so the server render has it. */
export function loadHomeLower(): Promise<Lower> {
  if (lower) return Promise.resolve(lower);
  loading ??= import("./d9-home-lower").then((m) => (lower = m));
  return loading;
}

const WAKE = ["scroll", "pointerdown", "touchstart", "keydown", "wheel"] as const;

/**
 * Memo with no props: when the page above it updates, this part is left alone, so its kept server HTML is never
 * thrown away before its code is there.
 */
const HomeLower = memo(function HomeLower() {
  const ref = useRef<HTMLDivElement>(null);
  // On the server (and on a later visit to Home inside the site) the code is already loaded: draw it at once.
  const [ready, setReady] = useState(() => lower !== null);
  useEffect(() => {
    if (ready) return;
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      stop();
      void loadHomeLower().then(() => setReady(true));
    };
    const io =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && go());
    if (ref.current) io?.observe(ref.current);
    for (const e of WAKE) window.addEventListener(e, go, { passive: true, once: true });
    function stop() {
      io?.disconnect();
      for (const e of WAKE) window.removeEventListener(e, go);
    }
    if (!io) go();
    return stop;
  }, [ready]);

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
      <StepsLine />
      <HomeLower />
    </>
  );
}
