import { lazy, Suspense, useEffect, useState } from "react";

// Nora's code (and the Supabase client it needs to read a session) is not part of the page. Polish 4 (master plan 30.25
// item 4): her button is drawn by the page shell from the first paint (site-chrome.tsx), and her code loads only when
// she is opened (or when a finger or pointer reaches her button, so the panel is ready a moment sooner). A request to
// open her that arrives before her code is there is kept and replayed once she is.
const load = () => import("@/components/assistant/assistant-widget");
const Widget = lazy(() => load().then((m) => ({ default: m.AssistantWidget })));
const OPEN = "kabsi:open-nora";

/** Start loading Nora's code early (pointer over or touch on her button); opening still waits for the click. */
export function prefetchNora() {
  void load().catch(() => undefined);
}

export function DeferredAssistant({ surface }: { surface: "site" | "app" }) {
  const [on, setOn] = useState(false);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<CustomEventInit | null>(null);

  useEffect(() => {
    if (on) return;
    const early = (e: Event) => {
      setPending({ detail: (e as CustomEvent).detail });
      setOn(true);
    };
    window.addEventListener(OPEN, early);
    return () => window.removeEventListener(OPEN, early);
  }, [on]);
  useEffect(() => {
    if (ready && pending) {
      window.dispatchEvent(new CustomEvent(OPEN, pending));
      setPending(null);
    }
  }, [ready, pending]);

  if (!on) return null;
  return (
    <Suspense fallback={null}>
      {/* The shell draws her button, so the widget draws none of its own. */}
      <Widget surface={surface} launcher={false} />
      <Ready onReady={() => setReady(true)} />
    </Suspense>
  );
}

// Rendered after the widget inside the same Suspense boundary, so it mounts only once the widget has loaded and its
// own listener is attached.
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}
