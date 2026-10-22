import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { afterPaint } from "@/lib/after-paint";
import { OPEN_EVENT, openPrivacyChoices } from "@/lib/consent";

// The privacy banner is not part of the first paint (lane R, 22 Oct 2026, performance). Its code loads after the page has
// painted and the browser has had a moment to settle (1.5 seconds after load), or at the first touch of the page, or at once
// when the visitor opens "Privacy choices" from the footer. What the choice does is unchanged and does not wait for the
// banner: initConsent runs from the root component as soon as the page hydrates, so the country rule is known, PostHog
// stays cookieless and no advertising tag loads until the visitor chooses, exactly as in P0.6-01.
const Banner = lazy(() =>
  import("@/components/shared/privacy-banner").then((m) => ({ default: m.PrivacyBanner })),
);

export function DeferredPrivacyBanner() {
  const [on, setOn] = useState(false);
  const wantsOpen = useRef(false);

  useEffect(() => afterPaint(() => setOn(true), 1500), []);
  useEffect(() => {
    if (on) return;
    const early = () => {
      wantsOpen.current = true;
      setOn(true);
    };
    window.addEventListener(OPEN_EVENT, early);
    return () => window.removeEventListener(OPEN_EVENT, early);
  }, [on]);

  if (!on) return null;
  return (
    <Suspense fallback={null}>
      <Banner
        onMounted={() => {
          // The footer link was pressed before the banner existed: open it now that it listens.
          if (wantsOpen.current) {
            wantsOpen.current = false;
            openPrivacyChoices();
          }
        }}
      />
    </Suspense>
  );
}
