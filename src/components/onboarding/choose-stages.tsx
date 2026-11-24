// GATE-2: step 3 (WhatsApp or email) and the trial with a card after it. Phone first at 390 px; design tokens only.
// The prices and the trial line come from src/lib/offer.ts; the plan's four lines from PLAN_COPY.
import { useState } from "react";
import { Check, Mail } from "lucide-react";
import { Button, WhatsAppGlyph } from "@/components/kabsi/ui";
import { ErrorNote, StepTitle } from "@/components/onboarding/onboarding-shell";
import { PLAN_COPY, billingAction } from "@/lib/plans";
import { PRICE_MONTHLY_USD, TRIAL_LINE } from "@/lib/offer";
import type { TrialState } from "@/lib/onboarding-flow";

/** Step 3: where approvals and reports go. WhatsApp opens the connect screen; email is saved at once. */
export function ChannelStage({
  whatsappOn,
  busy,
  error,
  onWhatsApp,
  onEmail,
}: {
  whatsappOn: boolean;
  busy: boolean;
  error: string;
  onWhatsApp: () => void;
  onEmail: () => void;
}) {
  return (
    <>
      <StepTitle
        title="Where should Kabsi send your approvals?"
        sub="Each reply, fix and post waits for your yes. Choose where you want to give it. You can change this in Settings."
      />
      <div className="grid gap-3">
        <Button
          full
          variant="whatsapp"
          icon={<WhatsAppGlyph className="size-5" />}
          disabled={!whatsappOn || busy}
          onClick={onWhatsApp}
          data-main-cta
        >
          WhatsApp
        </Button>
        {!whatsappOn ? (
          <p className="text-small text-text-2">WhatsApp is not open yet. Choose email for now.</p>
        ) : null}
        <Button
          full
          variant="secondary"
          icon={<Mail className="size-5" aria-hidden />}
          loading={busy}
          onClick={onEmail}
        >
          Email
        </Button>
      </div>
      <p className="mt-4 text-small text-text-2">
        On WhatsApp you approve with one tap. By email you approve from the message or in Kabsi.
      </p>
      <ErrorNote message={error} />
    </>
  );
}

/** The 14-day trial starts at the Creem checkout with a card. Nothing starts without one. */
export function TrialStage({
  locationId,
  trial,
  onLater,
}: {
  locationId: string;
  trial: TrialState | undefined;
  onLater: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function start() {
    setBusy(true);
    setError("");
    try {
      const r = await billingAction("checkout", locationId, {
        plan: "essentials",
        period: "month",
      });
      if (r.url) {
        window.location.assign(r.url);
        return;
      }
      setError("Something went wrong. Please try again.");
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }
  if (!trial)
    return (
      <p className="text-text-2" role="status">
        Loading…
      </p>
    );
  return (
    <>
      <StepTitle title="Start your 14 days free" sub={TRIAL_LINE} />
      <div className="rounded-card bg-surface-1 p-4 shadow-rest">
        <p className="font-display text-h3 font-bold">
          {PLAN_COPY.oneName}
          <span className="ml-2 text-body font-semibold text-text-2">
            ${PRICE_MONTHLY_USD} a month per location
          </span>
        </p>
        <ul className="mt-3 space-y-2">
          {PLAN_COPY.work.map((w) => (
            <li key={w} className="flex gap-2 text-body">
              <Check className="mt-1 size-4 shrink-0 text-ok" strokeWidth={3} aria-hidden />
              {w}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-small font-bold">{PLAN_COPY.nothingWithoutYes}</p>
      </div>
      <div className="mt-8" data-main-cta>
        {trial === "needed" ? (
          <Button full loading={busy} onClick={() => void start()}>
            {PLAN_COPY.start}
          </Button>
        ) : (
          <Button full variant="secondary" onClick={onLater}>
            Continue
          </Button>
        )}
      </div>
      {trial === "needed" ? (
        <p className="mt-3 text-small text-text-2">
          Creem&apos;s page shows the exact price before you pay. {PLAN_COPY.creem}
        </p>
      ) : (
        <p className="mt-3 text-small text-text-2">
          {PLAN_COPY.openSoon}. Kabsi tells you when you can start. Nothing has been charged.
        </p>
      )}
      <ErrorNote message={error} />
    </>
  );
}
