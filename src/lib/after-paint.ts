// Run something after the first paint and the page's own work (lane R, 22 Oct 2026, performance). The callback runs once,
// `delayMs` after the load event (then at the browser's next idle moment), or at once when the visitor touches the page.
// A tool the visitor did not ask for yet (the privacy banner, Nora's launcher, statistics) must not compete with the page
// for the phone's processor while the page is still being drawn and made ready. On the server it never runs. Returns a
// function that cancels.
export function afterPaint(run: () => void, delayMs = 1500): () => void {
  if (typeof window === "undefined") return () => {};
  let done = false;
  let timer = 0;
  let idle = 0;
  const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
  function cleanup() {
    window.removeEventListener("load", arm);
    for (const e of events) window.removeEventListener(e, go);
    if (timer) window.clearTimeout(timer);
    if (idle && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
  }
  function go() {
    if (done) return;
    done = true;
    cleanup();
    run();
  }
  function arm() {
    window.removeEventListener("load", arm);
    timer = window.setTimeout(() => {
      if (typeof window.requestIdleCallback === "function")
        idle = window.requestIdleCallback(go, { timeout: 1000 });
      else go();
    }, delayMs);
  }
  for (const e of events) window.addEventListener(e, go, { passive: true, once: true });
  if (document.readyState === "complete") arm();
  else window.addEventListener("load", arm, { once: true });
  return () => {
    done = true;
    cleanup();
  };
}
