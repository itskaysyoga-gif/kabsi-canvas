import { lazy, Suspense, useEffect, useState } from "react";
import { afterPaint } from "@/lib/after-paint";

// Nora's launcher is not part of the first paint. Her code (and the Supabase client it needs to read a session) loads
// after the page has painted and the browser is idle, or at the first touch of the page, so a visitor's first view is
// the page itself (lane R, 22 Oct 2026, performance). A request to open her that arrives before then is kept and
// replayed once she is there.
const Widget = lazy(() =>
  import("@/components/assistant/assistant-widget").then((m) => ({ default: m.AssistantWidget })),
);
const OPEN = "kabsi:open-nora";

export function DeferredAssistant({ surface }: { surface: "site" | "app" }) {
  const [on, setOn] = useState(false);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<CustomEventInit | null>(null);

  useEffect(() => afterPaint(() => setOn(true), 3000), []);
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
      <Widget surface={surface} />
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
