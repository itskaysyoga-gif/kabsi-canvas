import { useState, type FormEvent } from "react";
import { Globe, Image as ImageIcon, Phone, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { Turnstile } from "@/components/turnstile";
import { SaveSnapshotButton } from "@/components/auth/signup-sheet";
import { CoachList } from "@/components/coach/coach-list";
import {
  CheckError,
  emailCheck,
  TIPS_CONSENT_TEXT,
  TONE_LABEL,
  WHATSAPP_CONSENT_TEXT,
  whatsappCheck,
  type Snapshot,
  type Tone,
} from "@/lib/profile-check";
import { CTA_PRIMARY, GOOGLE_NOTICE, WHATSAPP_ON } from "@/lib/site";
import { track } from "@/lib/telemetry";

// The design tokens' states: danger is red (a real problem), warning is amber (needs attention), neutral is grey.
const TONE: Record<Tone, StatusTone> = { danger: "red", warning: "amber", neutral: "grey" };

/** The free snapshot (step 2, "Here's what customers see"): public facts, status flags (a plain fact and what Kabsi
 * would do, never a score), the R-02 button, the email form, the WhatsApp form while Kabsi has a number, and Google Maps
 * attribution. */
export function SnapshotResult({
  snapshot: s,
  page,
  onAnother,
}: {
  snapshot: Snapshot;
  page: "/google-profile-check" | "/get-started" | "/";
  onAnother: () => void;
}) {
  const todo = s.flags.filter((f) => f.tone !== "neutral").length;
  return (
    <div data-testid="snapshot">
      <div className="min-w-0">
        <h2 className="font-display text-h3 leading-tight sm:text-h2">{s.name}</h2>
        <p className="mt-1 text-text-2">{s.address}</p>
        {s.category ? <p className="mt-1 text-small text-text-2">{s.category}</p> : null}
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        <Fact icon={<Star />} label="Rating">
          {s.rating !== null ? (
            <>
              <span className="font-bold">{s.rating}</span>
              {s.review_count !== null ? ` from ${s.review_count} reviews` : null}
            </>
          ) : (
            "No rating yet"
          )}
        </Fact>
        <Fact icon={<Phone />} label="Phone">
          {s.phone ?? "Not shown"}
        </Fact>
        <Fact icon={<Globe />} label="Website">
          <span className="break-all">{s.website ?? "Not shown"}</span>
        </Fact>
        <Fact icon={<ImageIcon />} label="Photos">
          {s.has_photos ? "This profile has photos" : "No photos shown"}
        </Fact>
      </dl>

      <div className="mt-3 rounded-card bg-surface-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-small font-bold">Opening hours</p>
          {s.open_now !== null ? (
            <StatusPill tone={s.open_now ? "green" : "grey"}>
              {s.open_now ? "Open now" : "Closed now"}
            </StatusPill>
          ) : null}
        </div>
        {s.hours.length ? (
          <ul className="mt-2 space-y-0.5 text-small text-text-2">
            {s.hours.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-small text-text-2">No opening hours shown on Google.</p>
        )}
      </div>

      <h3 className="mt-8 font-display text-h3 leading-tight">
        What needs fixing, and what Kabsi would do
      </h3>
      <ul className="mt-4 space-y-3" aria-label="Status flags">
        {s.flags.map((f) => (
          <li key={f.fact} className="rounded-card border-2 border-line p-4" data-tone={f.tone}>
            <StatusPill tone={TONE[f.tone]}>{TONE_LABEL[f.tone]}</StatusPill>
            <p className="mt-2 font-bold">{f.fact}</p>
            <p className="mt-1 text-small leading-6 text-text-2">{f.action}</p>
          </li>
        ))}
      </ul>

      {s.checklist?.length ? (
        <>
          <h3 className="mt-8 font-display text-h3 leading-tight">What a complete profile has</h3>
          <p className="mt-1 text-small text-text-2">
            Google does not show the rest to the public. Kabsi checks it once you connect.
          </p>
          <div className="mt-4">
            <CoachList rows={s.checklist} label="Complete profile checklist" />
          </div>
        </>
      ) : null}

      <div className="mt-6 rounded-panel bg-kb-carbon p-6 text-kb-white">
        <p className="text-title font-bold">
          Kabsi can take care of{" "}
          {todo === 1 ? "this" : todo === 0 ? "what comes up" : `these ${todo}`}. You approve each
          one.
        </p>
        <SaveSnapshotButton
          snapshot={{ place_id: s.place_id, name: s.name, address: s.address }}
          label={page === "/get-started" ? "Save your snapshot and continue" : CTA_PRIMARY}
        />
      </div>

      <EmailForm placeId={s.place_id} page={page} />
      {WHATSAPP_ON ? <WhatsappForm placeId={s.place_id} page={page} /> : null}

      <button
        type="button"
        onClick={onAnother}
        className="mt-6 min-h-11 text-small font-bold underline underline-offset-4"
      >
        Check another business
      </button>

      <p className="mt-4 text-label leading-5 text-text-2" data-testid="attribution">
        Business details come from Google Maps and are public information, read from Google for this
        check and not kept. This check is not a score and does not compare you with other
        businesses. {GOOGLE_NOTICE}
      </p>
    </div>
  );
}

function Fact({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-card border-2 border-line p-4">
      <span className="mt-0.5 text-text-2 [&_svg]:size-5" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-label font-bold uppercase tracking-wider text-text-2">{label}</dt>
        <dd className="mt-0.5 text-small">{children}</dd>
      </div>
    </div>
  );
}

/** "Email me this check", with the unticked "Send me tips" box. The server stores the words, the choice, the page and
 * the time (G-21, G-24). The check itself goes to the address either way; tips only if the box is ticked. */
function EmailForm({
  placeId,
  page,
}: {
  placeId: string;
  page: "/google-profile-check" | "/get-started" | "/";
}) {
  const [email, setEmail] = useState("");
  const [tips, setTips] = useState(false);
  const [token, setToken] = useState("");
  const [round, setRound] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [err, setErr] = useState("");

  async function send(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const t = token;
    try {
      await emailCheck({ placeId, email, tips, page, turnstile: t });
      setSentTo(email.trim());
      track("free_tool_used", { source: "profile_check_email" });
    } catch (x) {
      setErr(x instanceof CheckError ? x.message : "That didn't work. Please try again.");
    }
    setToken("");
    setRound((n) => n + 1);
    setBusy(false);
  }

  if (sentTo)
    return (
      <p className="mt-6 rounded-card bg-surface-2 p-4 text-small" role="status">
        Done. We sent your check to <span className="font-bold">{sentTo}</span>.
      </p>
    );

  return (
    <form onSubmit={send} className="mt-6 rounded-panel border-2 border-line p-5">
      <h3 className="font-bold">Email me this check</h3>
      <p className="mt-1 text-small text-text-2">
        We will send the check to your inbox so you can keep it.
      </p>
      <label htmlFor="check-email" className="sr-only">
        Your email address
      </label>
      <Input
        id="check-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@yourbusiness.com"
        className="mt-3 h-[52px] rounded-card px-4 text-body"
      />
      <label className="mt-3 flex cursor-pointer items-start gap-3 text-small leading-6">
        <Checkbox
          checked={tips}
          onCheckedChange={(v) => setTips(v === true)}
          className="mt-0.5 size-5 rounded-md border-2 border-text-1"
          data-testid="tips-box"
        />
        <span>{TIPS_CONSENT_TEXT}</span>
      </label>
      <div className="mt-3">
        <Turnstile key={round} onToken={setToken} />
      </div>
      {err ? (
        <p className="mt-2 text-small text-bad" role="alert">
          {err}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="secondary"
        className="mt-3 w-full sm:w-auto"
        disabled={busy || !token || !email}
      >
        {busy ? "Sending" : "Email me this check"}
      </Button>
    </form>
  );
}

/** "Send my check to WhatsApp": shown only while Kabsi has a WhatsApp number. One message after the unticked box is
 * ticked; the server stores the words, the page and the time (G-21) and a hash of the number, never the number. There
 * is no follow-up: the words say so. The email form above stays exactly as it is. */
function WhatsappForm({
  placeId,
  page,
}: {
  placeId: string;
  page: "/google-profile-check" | "/get-started" | "/";
}) {
  const [phone, setPhone] = useState("");
  const [ok, setOk] = useState(false);
  const [token, setToken] = useState("");
  const [round, setRound] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [err, setErr] = useState("");

  async function send(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const t = token;
    try {
      await whatsappCheck({ placeId, phone, page, turnstile: t });
      setSentTo(phone.trim());
      track("free_tool_used", { source: "profile_check_whatsapp" });
    } catch (x) {
      setErr(x instanceof CheckError ? x.message : "That didn't work. Please try again.");
    }
    setToken("");
    setRound((n) => n + 1);
    setBusy(false);
  }

  if (sentTo)
    return (
      <p className="mt-4 rounded-card bg-surface-2 p-4 text-small" role="status">
        Done. We sent your check to WhatsApp on <span className="font-bold">{sentTo}</span>.
      </p>
    );

  return (
    <form
      onSubmit={send}
      className="mt-4 rounded-panel border-2 border-line p-5"
      data-testid="whatsapp-form"
    >
      <h3 className="font-bold">Send my check to WhatsApp</h3>
      <p className="mt-1 text-small text-text-2">
        One message with this check. Nothing else after it.
      </p>
      <label htmlFor="check-whatsapp" className="sr-only">
        Your WhatsApp number with the country code
      </label>
      <Input
        id="check-whatsapp"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+1 201 555 0100"
        className="mt-3 h-[52px] rounded-card px-4 text-body"
      />
      <label className="mt-3 flex cursor-pointer items-start gap-3 text-small leading-6">
        <Checkbox
          checked={ok}
          onCheckedChange={(v) => setOk(v === true)}
          className="mt-0.5 size-5 rounded-md border-2 border-text-1"
          data-testid="whatsapp-box"
        />
        <span>{WHATSAPP_CONSENT_TEXT}</span>
      </label>
      <div className="mt-3">
        <Turnstile key={round} onToken={setToken} />
      </div>
      {err ? (
        <p className="mt-2 text-small text-bad" role="alert">
          {err}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="secondary"
        className="mt-3 w-full sm:w-auto"
        disabled={busy || !token || !phone || !ok}
      >
        {busy ? "Sending" : "Send my check to WhatsApp"}
      </Button>
    </form>
  );
}
