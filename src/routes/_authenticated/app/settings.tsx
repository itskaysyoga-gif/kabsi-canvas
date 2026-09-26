import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { myLatestLocation } from "@/lib/onboarding";

// Email settings: extra alert addresses, daily digest hour, time zone, pause (D220).
// Saved through the membership-checked update_notification_settings RPC.
export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({ meta: [{ title: "Settings — Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

type Settings = {
  alert_emails: string[];
  digest_hour: number;
  time_zone: string;
  emails_paused_until: string | null;
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? "am" : "pm"}`;

async function loadSettings(id: string): Promise<Settings> {
  const { data, error } = await supabase
    .from("locations")
    .select("alert_emails, digest_hour, time_zone, emails_paused_until")
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
      <h1 className="font-display text-4xl leading-none sm:text-5xl">Emails</h1>
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
    </div>
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
            ? `Paused until ${new Date(initial.emails_paused_until!).toLocaleDateString()}. Reviews still arrive in your inbox.`
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
