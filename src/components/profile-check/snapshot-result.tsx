import { useState, type FormEvent } from "react";
import { Globe, Image as ImageIcon, Phone, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { Turnstile } from "@/components/turnstile";
import { SaveSnapshotButton } from "@/components/auth/signup-sheet";
import {
  CheckError,
  emailCheck,
  LEVEL_LABEL,
  TIPS_CONSENT_TEXT,
  type Level,
  type Snapshot,
} from "@/lib/profile-check";
import { CTA_PRIMARY, GOOGLE_NOTICE } from "@/lib/site";
import { track } from "@/lib/telemetry";

const TONE: Record<Level, StatusTone> = { urgent: "red", recommended: "amber", nice: "grey" };

/** The free snapshot (step 2, "Here's what customers see"): public facts, findings with labels (never a score),
 * the R-02 button, the email form and Google Maps attribution. */
export function SnapshotResult({
  snapshot: s,
  page,
  onAnother,
}: {
  snapshot: Snapshot;
  page: "/google-profile-check" | "/get-started";
  onAnother: () => void;
}) {
  return (
    <div data-testid="snapshot">
      <div className="min-w-0">
        <h2 className="font-display text-3xl leading-tight sm:text-4xl">{s.name}</h2>
        <p className="mt-1 text-kb-stone">{s.address}</p>
        {s.category ? <p className="mt-1 text-sm text-kb-stone">{s.category}</p> : null}
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

      <div className="mt-3 rounded-card bg-kb-sand p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold">Opening hours</p>
          {s.open_now !== null ? (
            <StatusPill tone={s.open_now ? "green" : "grey"}>
              {s.open_now ? "Open now" : "Closed now"}
            </StatusPill>
          ) : null}
        </div>
        {s.hours.length ? (
          <ul className="mt-2 space-y-0.5 text-sm text-kb-stone">
            {s.hours.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-kb-stone">No opening hours shown on Google.</p>
        )}
      </div>

      <h3 className="mt-8 font-display text-2xl leading-tight">What Kabsi would take care of</h3>
      <ul className="mt-4 space-y-3" aria-label="Findings">
        {s.findings.map((f) => (
          <li key={f.title} className="rounded-card border-2 border-kb-hairline p-4">
            <StatusPill tone={TONE[f.level]}>{LEVEL_LABEL[f.level]}</StatusPill>
            <p className="mt-2 font-bold">{f.title}</p>
            <p className="mt-1 text-sm leading-6 text-kb-stone">{f.detail}</p>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-large bg-kb-carbon p-6 text-kb-white">
        <p className="text-lg font-bold">
          Kabsi can take care of {s.findings.length === 1 ? "this" : `these ${s.findings.length}`}.
          You approve each one.
        </p>
        <SaveSnapshotButton
          snapshot={{ place_id: s.place_id, name: s.name, address: s.address }}
          label={page === "/get-started" ? "Save your snapshot and continue" : CTA_PRIMARY}
        />
      </div>

      <EmailForm placeId={s.place_id} page={page} />

      <button
        type="button"
        onClick={onAnother}
        className="mt-6 min-h-11 text-sm font-bold underline underline-offset-4"
      >
        Check another business
      </button>

      <p className="mt-4 text-xs leading-5 text-kb-stone" data-testid="attribution">
        Business details come from Google Maps and are public information, shown as they were in the
        last 24 hours. This check is not a score and does not compare you with other businesses.{" "}
        {GOOGLE_NOTICE}
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
    <div className="flex items-start gap-3 rounded-card border-2 border-kb-hairline p-4">
      <span className="mt-0.5 text-kb-stone [&_svg]:size-5" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-bold uppercase tracking-wider text-kb-stone">{label}</dt>
        <dd className="mt-0.5 text-sm">{children}</dd>
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
  page: "/google-profile-check" | "/get-started";
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
      <p className="mt-6 rounded-card bg-kb-sand p-4 text-sm" role="status">
        Done. We sent your check to <span className="font-bold">{sentTo}</span>.
      </p>
    );

  return (
    <form onSubmit={send} className="mt-6 rounded-large border-2 border-kb-hairline p-5">
      <h3 className="font-bold">Email me this check</h3>
      <p className="mt-1 text-sm text-kb-stone">
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
        className="mt-3 h-[52px] rounded-card px-4 text-base"
      />
      <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm leading-6">
        <Checkbox
          checked={tips}
          onCheckedChange={(v) => setTips(v === true)}
          className="mt-0.5 size-5 rounded-md border-2 border-kb-black"
          data-testid="tips-box"
        />
        <span>{TIPS_CONSENT_TEXT}</span>
      </label>
      <div className="mt-3">
        <Turnstile key={round} onToken={setToken} />
      </div>
      {err ? (
        <p className="mt-2 text-sm text-kb-red" role="alert">
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
