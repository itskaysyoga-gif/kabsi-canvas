// Run something after the first paint and the page's own work (lane R, 22 Oct 2026, performance). The callback runs once,
// `delayMs` after the load event (then at the browser's next idle moment), or at once when the visitor touches the page.
// A tool the visitor did not ask for yet (the privacy banner, Nora's launcher, statistics) must not compete with the page
// for the phone's processor while the page is still being drawn and made ready. On the server it never runs. Returns a
// function that cancels.
// `quiet` is for heavy third-party scripts (statistics, the Meta Pixel, Speed Insights). They start at the visitor's first
// scroll, tap or key press, or `delayMs` after load, whichever comes first (Polish 1, 1 Nov 2026: Lean 1 waited for an idle
// moment after the touch, so a visitor who acted fast and left sent nothing, which the Meta ads need). On a touch they start
// in the next task, after the touch has been handled, so the page still answers it first.
export function afterPaint(
  run: () => void,
  delayMs = 1500,
  opts: { quiet?: boolean } = {},
): () => void {
  if (typeof window === "undefined") return () => {};
  let done = false;
  let timer = 0;
  let idle = 0;
  let soon = 0;
  const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
  function cleanup() {
    window.removeEventListener("load", arm);
    for (const e of events) window.removeEventListener(e, onTouch);
    if (timer) window.clearTimeout(timer);
    if (idle && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
  }
  function go(alreadyIdle = false) {
    if (done) return;
    done = true;
    cleanup();
    if (opts.quiet && !alreadyIdle) soon = window.setTimeout(run, 0);
    else run();
  }
  function arm() {
    window.removeEventListener("load", arm);
    timer = window.setTimeout(() => {
      if (typeof window.requestIdleCallback === "function")
        idle = window.requestIdleCallback(() => go(true), { timeout: 1000 });
      else go(true);
    }, delayMs);
  }
  const onTouch = () => go();
  for (const e of events) window.addEventListener(e, onTouch, { passive: true, once: true });
  if (document.readyState === "complete") arm();
  else window.addEventListener("load", arm, { once: true });
  return () => {
    done = true;
    cleanup();
    if (soon) window.clearTimeout(soon);
  };
}
