import { Link, useLocation } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Switch } from "@/components/kabsi/ui";
import {
  CONSENT_VERSION,
  CONSENT_WORDING,
  OPEN_EVENT,
  advertisingAllowed,
  getConsent,
  initConsent,
  needsChoice,
  onConsentChange,
  saveChoice,
  type ConsentState,
} from "@/lib/consent";
import { isPrivatePath } from "@/lib/telemetry";

// The privacy bar and "Your privacy choices" (P0.6-01, master plan 20.4, docs/COPY.md shared pieces). First party, no
// outside consent tool, no categories, no vendor list.
// - The bar: one small line at the foot of the screen, only where the rule asks first (the EU, the EEA, the UK,
//   Switzerland, the UAE and Saudi Arabia), on public pages, while there is no live choice. "Accept" or "Only necessary"; "Details" opens /privacy.
// - The panel: opened from "Your privacy choices" in the footer, under every rule. One switch, saved the moment it moves.
// The site works the same whatever the visitor picks.
export function PrivacyBanner({ onMounted }: { onMounted?: () => void } = {}) {
  const pathname = useLocation({ select: (l) => l.pathname });
  const [consent, setConsent] = useState<ConsentState>(getConsent());
  const [panel, setPanel] = useState(false);
  const mounted = useRef(onMounted);
  mounted.current = onMounted;

  useEffect(() => {
    const off = onConsentChange(setConsent);
    // The root component starts the consent check as the page hydrates (initConsent runs once); this call is a no-op
    // then, and the banner reads the state that is already there.
    void initConsent();
    setConsent(getConsent());
    const open = () => setPanel(true);
    window.addEventListener(OPEN_EVENT, open);
    mounted.current?.();
    return () => {
      off();
      window.removeEventListener(OPEN_EVENT, open);
    };
  }, []);

  const wording = CONSENT_WORDING[CONSENT_VERSION]!;

  if (panel) {
    const on = advertisingAllowed(consent);
    return (
      <section
        role="region"
        aria-label="Your privacy choices"
        data-testid="privacy-panel"
        data-rule={consent.rule}
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line-strong bg-surface-1 px-5 py-4 text-text-1 shadow-float sm:inset-x-auto sm:bottom-5 sm:start-5 sm:w-[26rem] sm:rounded-panel sm:border"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-title font-bold text-text-1">Your privacy choices</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setPanel(false)}
            className="-me-2 inline-flex size-11 items-center justify-center rounded-full text-text-1"
          >
            <X className="size-5" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
        <div className="mt-2" />
        <Switch
          checked={on}
          onChange={(v) =>
            void saveChoice("switch", { analytics: v, advertising: v }, pathname, "panel")
          }
          label={wording.panel!}
        />
        <Link
          to="/privacy"
          className="mt-2 inline-flex min-h-11 items-center text-small font-bold text-text-1 underline"
        >
          Details
        </Link>
      </section>
    );
  }

  if (!needsChoice(consent) || isPrivatePath(pathname)) return null;

  const decide = (action: "accept" | "decline") => {
    const yes = action === "accept";
    void saveChoice(action, { analytics: yes, advertising: yes }, pathname);
  };

  return (
    <section
      role="region"
      aria-label="Cookies"
      data-testid="privacy-banner"
      data-rule={consent.rule}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line-strong bg-surface-1 p-5 text-text-1 shadow-float pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:bottom-5 sm:start-5 sm:max-w-md sm:rounded-panel sm:border"
    >
      <p className="text-body text-text-1">
        {wording.opt_in}{" "}
        <Link to="/privacy" className="font-bold underline">
          Details
        </Link>
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button variant="secondary" size="md" onClick={() => decide("accept")}>
          Accept
        </Button>
        <Button variant="secondary" size="md" onClick={() => decide("decline")}>
          Only necessary
        </Button>
      </div>
    </section>
  );
}
