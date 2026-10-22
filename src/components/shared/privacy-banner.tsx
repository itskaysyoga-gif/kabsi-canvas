import { useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  CONSENT_VERSION,
  CONSENT_WORDING,
  OPEN_EVENT,
  getConsent,
  initConsent,
  needsChoice,
  onConsentChange,
  saveChoice,
  type ConsentState,
} from "@/lib/consent";
import { sentences } from "@/lib/consent-text";
import { isPrivatePath } from "@/lib/telemetry";

// The one privacy banner (P0.6-01, R-04): a small first-party sheet at the foot of the screen, no third-party tool.
// It opens by itself on public pages while there is no choice for the current wording, and from "Privacy choices"
// in the footer at any time. The site works the same whatever the visitor picks.
export function PrivacyBanner({ onMounted }: { onMounted?: () => void } = {}) {
  const pathname = useLocation({ select: (l) => l.pathname });
  const [consent, setConsent] = useState<ConsentState>(getConsent());
  const [reopened, setReopened] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [advertising, setAdvertising] = useState(false);
  const mounted = useRef(onMounted);
  mounted.current = onMounted;

  useEffect(() => {
    const off = onConsentChange(setConsent);
    // The root component starts the consent check as the page hydrates (initConsent runs once); this call is a no-op
    // then, and the banner reads the state that is already there.
    void initConsent();
    setConsent(getConsent());
    const open = () => {
      const s = getConsent();
      setAnalytics(s.choice ? s.choice.analytics : s.rule !== "opt_in");
      setAdvertising(s.choice ? s.choice.advertising : s.rule === "notice");
      setChoosing(true);
      setReopened(true);
    };
    window.addEventListener(OPEN_EVENT, open);
    mounted.current?.();
    return () => {
      off();
      window.removeEventListener(OPEN_EVENT, open);
    };
  }, []);

  const show = reopened || (needsChoice(consent) && !isPrivatePath(pathname));
  if (!show) return null;

  const rule = consent.rule;
  const wording = CONSENT_WORDING[CONSENT_VERSION]![rule];
  const close = () => {
    setReopened(false);
    setChoosing(false);
  };
  const decide = (
    action: "accept" | "decline" | "save" | "ok",
    choices: { analytics: boolean; advertising: boolean },
  ) => {
    void saveChoice(action, choices, pathname);
    close();
  };

  return (
    <section
      role="region"
      aria-label="Privacy choices"
      data-testid="privacy-banner"
      data-rule={rule}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-kb-hairline bg-kb-white px-5 py-5 shadow-kb sm:inset-x-auto sm:bottom-5 sm:left-5 sm:max-w-md sm:rounded-card sm:border"
    >
      <h2 className="text-base font-bold text-kb-ink">Your privacy choices</h2>
      <div className="mt-2 grid gap-1.5 text-sm leading-6 text-kb-stone">
        {sentences(wording).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      {choosing ? (
        <div className="mt-4 grid gap-3">
          <label className="flex items-center justify-between gap-4 text-sm font-medium text-kb-ink">
            <span>Statistics (PostHog)</span>
            <Switch
              checked={analytics}
              onCheckedChange={setAnalytics}
              aria-label="Statistics (PostHog)"
            />
          </label>
          <label className="flex items-center justify-between gap-4 text-sm font-medium text-kb-ink">
            <span>Advertising (Meta)</span>
            <Switch
              checked={advertising}
              onCheckedChange={setAdvertising}
              aria-label="Advertising (Meta)"
            />
          </label>
          <Button
            variant="secondary"
            size="compact"
            className="mt-1"
            onClick={() => decide("save", { analytics, advertising })}
          >
            Save choices
          </Button>
          {reopened ? (
            <Button variant="tertiary" size="compact" className="h-11" onClick={close}>
              Close without changes
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          {rule === "notice" ? (
            <Button
              variant="secondary"
              size="compact"
              onClick={() => decide("ok", { analytics: true, advertising: true })}
            >
              OK
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                size="compact"
                onClick={() => decide("accept", { analytics: true, advertising: true })}
              >
                Accept
              </Button>
              <Button
                variant="secondary"
                size="compact"
                onClick={() => decide("decline", { analytics: false, advertising: false })}
              >
                Decline
              </Button>
            </>
          )}
          <Button
            variant="tertiary"
            size="compact"
            className="h-11"
            onClick={() => {
              setAnalytics(rule !== "opt_in");
              setAdvertising(rule === "notice");
              setChoosing(true);
            }}
          >
            Choose
          </Button>
        </div>
      )}
    </section>
  );
}
