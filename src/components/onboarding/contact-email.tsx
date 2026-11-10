import { useState, type FormEvent } from "react";
import { Button, Field } from "@/components/kabsi/ui";
import { ErrorNote, StepTitle } from "@/components/onboarding/onboarding-shell";
import { friendlyError } from "@/lib/onboarding";
import { setContactEmail } from "@/lib/wa-signin";

const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/**
 * Signup 1 (master plan 30.50 item 3e): asked once, only of an owner who signed up with WhatsApp (their account has no
 * email). Optional now; it is needed before a card payment. Skip moves on and the question does not come back in setup.
 */
export function ContactEmailStage({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event?: FormEvent) {
    event?.preventDefault();
    setError("");
    setFieldError("");
    const v = email.trim().toLowerCase();
    if (!looksLikeEmail(v))
      return setFieldError("Check the email. It needs a full address, like name@shop.com.");
    setBusy(true);
    try {
      if (await setContactEmail(v)) onDone();
      else setFieldError("Check the email. It needs a full address, like name@shop.com.");
    } catch (e) {
      setError(friendlyError(e));
    }
    setBusy(false);
  }

  return (
    <form onSubmit={save} noValidate>
      <StepTitle
        title="Where should receipts go?"
        sub="Kabsi sends your weekly receipt and account emails here. It is optional now, and needed before a card payment."
      />
      <Field
        id="contact-email"
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setFieldError("");
        }}
        placeholder="name@shop.com"
        error={fieldError || undefined}
      />
      <ErrorNote message={error} />
      <div className="mt-8 flex flex-col items-stretch gap-3" data-main-cta>
        <Button full type="submit" loading={busy} disabled={busy}>
          Save
        </Button>
        <Button full variant="tertiary" onClick={onDone} disabled={busy}>
          Skip for now
        </Button>
      </div>
    </form>
  );
}
