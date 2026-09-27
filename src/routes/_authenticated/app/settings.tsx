import { useEffect, useState, type FormEvent } from "react";
import { fmtDate } from "@/lib/format";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { myLatestLocation } from "@/lib/onboarding";
import { Mail as PageGlyph } from "lucide-react";
import { PageIcon } from "@/components/shared/page-icon";

// Email settings: extra alert addresses, daily digest hour, time zone, pause (D220).
// Saved through the membership-checked update_notification_settings RPC.
export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({ meta: [{ title: "Settings | Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

type Settings = {
  alert_emails: string[];
  digest_hour: number;
  time_zone: string;
  emails_paused_until: string | null;
  deletion_requested_at: string | null;
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? "am" : "pm"}`;

async function loadSettings(id: string): Promise<Settings> {
  const { data, error } = await supabase
    .from("locations")
    .select("alert_emails, digest_hour, time_zone, emails_paused_until, deletion_requested_at")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as Settings;
}

function SettingsPage() {
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const settings = useQuery({
    queryKey: ["settings", loc?.id],
    queryFn: () => loadSettings(loc!.id),
    enabled: !!loc,
  });
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 sm:py-12">
      <PageIcon icon={<PageGlyph />} />
      <p className="text-sm font-bold uppercase tracking-wider text-kb-stone">Settings</p>
      <h1 className="mt-1 font-display text-4xl leading-none sm:text-5xl">Emails</h1>
      {loc ? <p className="mt-2 text-kb-stone">{loc.name}</p> : null}
      {location.isLoading || settings.isLoading ? (
        <p className="mt-6 text-kb-stone">Loading…</p>
      ) : null}
      {!location.isLoading && !loc ? (
        <Button asChild className="mt-6">
          <Link to="/start">Add your business</Link>
        </Button>
      ) : null}
      {loc && settings.data ? (
        <SettingsForm
          locationId={loc.id}
          initial={settings.data}
          onSaved={() => settings.refetch()}
        />
      ) : null}
      <AccountCard />
      {loc && settings.data ? (
        <DeleteBusiness
          locationId={loc.id}
          name={loc.name}
          requestedAt={settings.data.deletion_requested_at}
          onChanged={() => settings.refetch()}
        />
      ) : null}
    </div>
  );
}

// Owner-requested deletion (migration 019): 7 days to change your mind, then everything is deleted.
// Who is signed in, and a sign-out that's easy to find on a phone too.
function AccountCard() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [err, setErr] = useState("");
  async function out() {
    setErr("");
    try {
      await signOut();
      await queryClient.cancelQueries();
      queryClient.clear();
      await navigate({ to: "/", replace: true });
    } catch {
      setErr("Couldn't sign out. Check your connection and try again.");
    }
  }
  return (
    <section className="mt-8 rounded-large bg-kb-white p-6 shadow-kb sm:p-7">
      <h2 className="text-xl font-bold">Your account</h2>
      <p className="mt-2 text-sm text-kb-stone">Signed in as</p>
      <p className="break-all font-medium">{user?.email ?? "-"}</p>
      <p className="mt-2 text-sm leading-6 text-kb-stone">
        You sign in with a 6-digit code sent to this email. There's no password to remember.
      </p>
      <Button variant="outline" size="compact" className="mt-4" onClick={() => void out()}>
        <LogOut /> Sign out
      </Button>
      {err ? (
        <p className="mt-2 text-sm text-kb-red" role="alert">
          {err}
        </p>
      ) : null}
    </section>
  );
}

function DeleteBusiness({
  locationId,
  name,
  requestedAt,
  onChanged,
}: {
  locationId: string;
  name: string;
  requestedAt: string | null;
  onChanged: () => unknown;
}) {
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const due = requestedAt ? fmtDate(Date.parse(requestedAt) + 7 * 86_400_000) : null;
  async function run(kind: "request" | "cancel") {
    setBusy(true);
    setErr("");
    const { error } = await supabase.rpc(
      kind === "request" ? "request_location_deletion" : "cancel_location_deletion",
      { p_location: locationId },
    );
    setBusy(false);
    if (error) return setErr("Something went wrong. Email hello@kabsi.co and we'll do it for you.");
    setConfirm("");
    onChanged();
  }
  return (
    <section className="mt-12 rounded-large border-2 border-kb-hairline p-6">
      <h2 className="text-xl font-bold">Delete this business from Kabsi</h2>
      {due ? (
        <>
          <p className="mt-2 text-sm leading-6 text-kb-stone">
            Deletion is scheduled for <b className="text-kb-ink">{due}</b>. Until then everything
            keeps working and you can cancel.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            disabled={busy}
            onClick={() => void run("cancel")}
          >
            {busy ? "Cancelling…" : "Cancel deletion"}
          </Button>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm leading-6 text-kb-stone">
            After 7 days we delete its reviews, drafts, posts, photos, reports and settings, and
            your NFC cards stop opening your review page. Payment records are kept where the law
            requires. To stop Kabsi reaching your Google profile, also remove hello@kabsi.co under
            People and access.
          </p>
          <Label htmlFor="confirm-delete" className="mt-4 block text-sm">
            Type the business name to confirm
          </Label>
          <Input
            id="confirm-delete"
            className="mt-2"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={name}
          />
          <Button
            variant="outline"
            className="mt-4 border-kb-red text-kb-red"
            disabled={busy || confirm.trim().toLowerCase() !== name.trim().toLowerCase()}
            onClick={() => void run("request")}
          >
            {busy ? "Scheduling…" : "Delete in 7 days"}
          </Button>
        </>
      )}
      {err ? (
        <p className="mt-3 text-sm text-kb-red" role="alert">
          {err}
        </p>
      ) : null}
    </section>
  );
}

function SettingsForm({
  locationId,
  initial,
  onSaved,
}: {
  locationId: string;
  initial: Settings;
  onSaved: () => unknown;
}) {
  const [emails, setEmails] = useState(initial.alert_emails.join(", "));
  const [hour, setHour] = useState(initial.digest_hour);
  const [zone, setZone] = useState(initial.time_zone);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const paused =
    initial.emails_paused_until && Date.parse(initial.emails_paused_until) > Date.now();
  const [zones, setZones] = useState<string[]>([initial.time_zone]);
  useEffect(() => {
    try {
      const all = (
        Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
      ).supportedValuesOf?.("timeZone");
      if (all?.length)
        setZones(all.includes(initial.time_zone) ? all : [initial.time_zone, ...all]);
    } catch {
      /* keep the current zone only */
    }
  }, [initial.time_zone]);

  async function save(pauseDays: number | null, event?: FormEvent) {
    event?.preventDefault();
    setErr("");
    setMsg("");
    const list = emails
      .split(/[,\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (list.length > 3) return setErr("Up to 3 extra email addresses.");
    const bad = list.find((e) => !EMAIL_RE.test(e));
    if (bad) return setErr(`"${bad}" doesn't look like an email address.`);
    setBusy(true);
    const { error } = await supabase.rpc("update_notification_settings", {
      p_location: locationId,
      p_alert_emails: list,
      p_digest_hour: hour,
      p_time_zone: zone,
      p_pause_days: pauseDays,
    });
    setBusy(false);
    if (error) return setErr("Couldn't save. Please try again.");
    setMsg(
      pauseDays === 7
        ? "Emails paused for 7 days."
        : pauseDays === 0
          ? "Emails are back on."
          : "Saved.",
    );
    onSaved();
  }

  return (
    <form
      onSubmit={(e) => void save(null, e)}
      className="mt-7 rounded-large bg-kb-white p-6 shadow-kb sm:p-8"
    >
      <h2 className="text-xl font-bold">Review emails</h2>
      <p className="mt-1 text-sm leading-6 text-kb-stone">
        Reviews of 3 stars or less, and anything sensitive, are emailed right away. 4 and 5 star
        reviews come together in one daily email.
      </p>

      <Label htmlFor="hour" className="mt-6 block">
        Daily email time
      </Label>
      <select
        id="hour"
        value={hour}
        onChange={(e) => setHour(Number(e.target.value))}
        className="mt-2 h-[52px] w-full rounded-card border border-kb-hairline bg-kb-white px-4 text-base"
      >
        {Array.from({ length: 24 }, (_, h) => (
          <option key={h} value={h}>
            {hourLabel(h)}
          </option>
        ))}
      </select>

      <Label htmlFor="zone" className="mt-5 block">
        Time zone
      </Label>
      <select
        id="zone"
        value={zone}
        onChange={(e) => setZone(e.target.value)}
        className="mt-2 h-[52px] w-full rounded-card border border-kb-hairline bg-kb-white px-4 text-base"
      >
        {zones.map((z) => (
          <option key={z} value={z}>
            {z.replace(/_/g, " ")}
          </option>
        ))}
      </select>

      <Label htmlFor="emails" className="mt-5 block">
        Also send review alerts to <span className="text-kb-stone">(optional, up to 3)</span>
      </Label>
      <Input
        id="emails"
        value={emails}
        onChange={(e) => setEmails(e.target.value)}
        placeholder="manager@yourbusiness.com"
        className="mt-2 h-[52px] rounded-card px-4 text-base"
      />
      <p className="mt-2 text-sm text-kb-stone">
        These people see new reviews by email. Only you can post replies.
      </p>

      {err ? (
        <p className="mt-4 text-sm text-kb-red" role="alert">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="mt-4 text-sm text-kb-green" role="status">
          {msg}
        </p>
      ) : null}
      <Button type="submit" className="mt-6 w-full" disabled={busy}>
        {busy ? "Saving…" : "Save"}
      </Button>

      <div className="mt-8 border-t border-kb-hairline pt-6">
        <h2 className="text-xl font-bold">Pause emails</h2>
        <p className="mt-1 text-sm leading-6 text-kb-stone">
          {paused
            ? `Paused until ${fmtDate(initial.emails_paused_until)}. Reviews still arrive in your inbox.`
            : "Going on holiday? Pause review emails for a week. Reviews still arrive in your Kabsi inbox."}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          disabled={busy}
          onClick={() => void save(paused ? 0 : 7)}
        >
          {paused ? "Turn emails back on" : "Pause for 7 days"}
        </Button>
      </div>
    </form>
  );
}
