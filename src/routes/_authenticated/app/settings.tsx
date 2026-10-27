import { useEffect, useState, type FormEvent } from "react";
import { fmtDate } from "@/lib/format";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AccountTop, Panel, useAccountRole } from "@/components/kabsi/d3-account";
import { HeldBack, useFirstTaskDone } from "@/components/kabsi/d3-settings-parts";
import { Button, Field, Segmented, buttonClass } from "@/components/kabsi/ui";
import { MessageSwitches, NotificationChoices } from "@/components/app/notification-choices";
import { WhatsappChannel } from "@/components/app/whatsapp-channel";
import { ToneSetting } from "@/components/app/knowledge-form";
import { supabase } from "@/lib/supabase";
import { myLatestLocation } from "@/lib/onboarding";
import { clearAssistantChat } from "@/lib/assistant-storage";
import { KABSI_GROUP_ID, WHATSAPP_ON } from "@/lib/site";
import {
  aiPromptMessage,
  asSentence,
  loadAiQuestions,
  loadSearches,
  removeAiPrompt,
  saveAiPrompt,
} from "@/lib/insights";
import { choice, loadPrefs, savePref } from "@/lib/notifications";
import { whatsappPrefs, whatsappStatus } from "@/lib/whatsapp-owner";

// Settings (UX 1, Design 3; COPY.md 19): the business and the email, where routine messages go and the four switches, the
// email timing (D220, through the membership-checked update_notification_settings RPC), WhatsApp, the tone and the AI
// questions (both after the first task, V4), the account, Disconnect (K-41) and deleting the business.
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
  disconnect_requested_at: string | null;
  access_removed_at: string | null;
  is_demo: boolean;
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? "am" : "pm"}`;
const selectClass =
  "h-13 w-full rounded-input border border-stroke bg-surface-2 px-4 text-body text-text-1";

async function loadSettings(id: string): Promise<Settings> {
  const { data, error } = await supabase
    .from("locations")
    .select(
      "alert_emails, digest_hour, time_zone, emails_paused_until, deletion_requested_at, disconnect_requested_at, access_removed_at, is_demo",
    )
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  const s = data as Partial<Settings>;
  return {
    alert_emails: s.alert_emails ?? [],
    digest_hour: s.digest_hour ?? 18,
    time_zone: s.time_zone ?? "UTC",
    emails_paused_until: s.emails_paused_until ?? null,
    deletion_requested_at: s.deletion_requested_at ?? null,
    disconnect_requested_at: s.disconnect_requested_at ?? null,
    access_removed_at: s.access_removed_at ?? null,
    is_demo: s.is_demo ?? false,
  };
}

function SettingsPage() {
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const role = useAccountRole();
  const open = useFirstTaskDone(loc?.id);
  const settings = useQuery({
    queryKey: ["settings", loc?.id],
    queryFn: () => loadSettings(loc!.id),
    enabled: !!loc,
  });
  const ready = loc && settings.data;
  return (
    <>
      <AccountTop title="Settings" />
      {location.isLoading || settings.isLoading ? (
        <p className="text-body text-text-2" role="status">
          Loading...
        </p>
      ) : null}
      {!location.isLoading && !loc ? (
        <Link to="/start" className={buttonClass()} data-main-cta>
          Add your business
        </Link>
      ) : null}
      {settings.isError ? (
        <p className="text-body text-bad" role="alert">
          Couldn&apos;t load your settings. Refresh the page.
        </p>
      ) : null}
      {loc && ready ? (
        <div className="space-y-4">
          <BusinessPanel locationId={loc.id} name={loc.name} />
          <Panel title="Where your routine messages go" id="routine">
            <p className="text-small text-text-2">
              Reports and reminders go to one place. Kabsi does not send the same thing twice.
            </p>
            <RoutineChannel locationId={loc.id} />
            <div className="mt-5 border-t border-line pt-5">
              <MessageSwitches locationId={loc.id} />
            </div>
            <details className="group border-t border-line pt-1">
              <summary className="press flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-small font-bold [&::-webkit-details-marker]:hidden">
                Choose how each one reaches you
                <ChevronDown
                  className="size-5 transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="pb-2">
                <NotificationChoices locationId={loc.id} />
              </div>
            </details>
          </Panel>
          <EmailSettings
            locationId={loc.id}
            initial={settings.data}
            onSaved={() => settings.refetch()}
          />
          <Panel title="WhatsApp" id="whatsapp">
            <WhatsappChannel />
          </Panel>
          {open === false ? (
            <Panel title="Your voice and AI questions" id="held-back">
              <HeldBack />
            </Panel>
          ) : null}
          {open ? (
            <Panel title="Your voice" id="voice">
              <p className="mb-3 text-small text-text-2">How replies sound.</p>
              <ToneSetting locationId={loc.id} />
            </Panel>
          ) : null}
          {open ? <AiQuestions locationId={loc.id} /> : null}
          <AccountCard />
          <DisconnectGoogle
            locationId={loc.id}
            settings={settings.data}
            owner={role === "owner"}
            onChanged={() => settings.refetch()}
          />
          {role === "owner" ? (
            <DeleteBusiness
              locationId={loc.id}
              name={loc.name}
              requestedAt={settings.data.deletion_requested_at}
              onChanged={() => settings.refetch()}
            />
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/** "Your business": the name, the email the owner signs in with, and the searches Kabsi checks on Google Maps. */
function BusinessPanel({ locationId, name }: { locationId: string; name: string }) {
  const { user } = useAuth();
  const searches = useQuery({
    queryKey: ["searches", locationId],
    queryFn: () => loadSearches(locationId),
  });
  const list = searches.data ?? [];
  return (
    <Panel title="Your business" id="business">
      <dl className="divide-y divide-line">
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2.5">
          <dt className="text-small text-text-2">Business</dt>
          <dd className="text-small font-semibold">{name}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2.5">
          <dt className="text-small text-text-2">Your email</dt>
          <dd className="min-w-0 break-all text-small font-semibold">{user?.email ?? "-"}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2.5">
          <dt className="text-small text-text-2">Search Kabsi checks</dt>
          <dd className="text-small font-semibold">
            {list.length
              ? list
                  .map((s) => `'${s.keyword}', ${s.cadence === "weekly" ? "weekly" : "monthly"}`)
                  .join("; ")
              : searches.isLoading
                ? "..."
                : "None yet"}
          </dd>
        </div>
      </dl>
    </Panel>
  );
}

/**
 * One place for routine messages (new reviews and the Results Report): WhatsApp or email, never both. Built from the
 * existing choices: WhatsApp turns the WhatsApp alerts and report on and those two emails off; email does the opposite.
 * Shown only once WhatsApp is connected; until then everything comes by email.
 */
function RoutineChannel({ locationId }: { locationId: string }) {
  const qc = useQueryClient();
  const status = useQuery({
    queryKey: ["whatsapp-status"],
    queryFn: whatsappStatus,
    enabled: WHATSAPP_ON,
  });
  const prefs = useQuery({
    queryKey: ["notification-prefs", locationId],
    queryFn: () => loadPrefs(locationId),
    enabled: WHATSAPP_ON,
  });
  const [err, setErr] = useState("");
  const change = useMutation({
    mutationFn: async (to: "whatsapp" | "email") => {
      const wa = to === "whatsapp";
      await whatsappPrefs(wa, wa);
      for (const c of ["review_new", "weekly_report"])
        await savePref(locationId, c, "email", wa ? "off" : "default");
    },
    onMutate: () => setErr(""),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["whatsapp-status"] });
      void qc.invalidateQueries({ queryKey: ["notification-prefs", locationId] });
    },
    onError: () => setErr("Couldn't save. Please try again."),
  });
  const s = status.data;
  if (!WHATSAPP_ON || s?.state !== "active" || !prefs.data) return null;
  const value =
    s.review_alerts !== false &&
    s.digest_optin === true &&
    choice(prefs.data, "review_new", "email") === "off" &&
    choice(prefs.data, "weekly_report", "email") === "off"
      ? "whatsapp"
      : "email";
  return (
    <div className="mt-4">
      <Segmented
        label="Where your routine messages go"
        value={value}
        onChange={(v) => change.mutate(v)}
        options={[
          { value: "whatsapp", label: "WhatsApp" },
          { value: "email", label: "Email" },
        ]}
      />
      {err ? (
        <p className="mt-2 text-small text-bad" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}

/** The AI questions Kabsi asks: owners and managers add, change and remove them within the plan (UX 1, LATER.md). */
function AiQuestions({ locationId }: { locationId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["ai-questions", locationId],
    queryFn: () => loadAiQuestions(locationId),
  });
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const done = async () => {
    await qc.invalidateQueries({ queryKey: ["ai-questions", locationId] });
  };
  const add = useMutation({
    mutationFn: () => saveAiPrompt(locationId, text),
    onSuccess: async () => {
      setText("");
      setErr(null);
      await done();
    },
    onError: (e) => setErr(aiPromptMessage(e)),
  });
  const edit = useMutation({
    mutationFn: (id: string) => saveAiPrompt(locationId, editText, id),
    onSuccess: async () => {
      setEditing(null);
      setErr(null);
      await done();
    },
    onError: (e) => setErr(aiPromptMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeAiPrompt(id),
    onSuccess: done,
    onError: (e) => setErr(aiPromptMessage(e)),
  });
  if (q.isError) return null;
  const list = q.data ?? [];
  return (
    <Panel title="Your AI questions" id="ai-questions">
      <p className="text-small text-text-2">
        Kabsi asks ChatGPT and Perplexity these questions, the way a customer would.
      </p>
      {list.length ? (
        <ul className="mt-3 divide-y divide-line">
          {list.map((p) => (
            <li key={p.id} className="py-3">
              {editing === p.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    edit.mutate(p.id);
                  }}
                  className="space-y-3"
                >
                  <Field
                    label="Your question"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    maxLength={120}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" variant="secondary" size="md" loading={edit.isPending}>
                      Save
                    </Button>
                    <Button variant="tertiary" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 break-words text-body">
                    &lsquo;{asSentence(p.text)}&rsquo;
                  </span>
                  <span className="text-label font-bold text-text-2">
                    {p.cadence === "biweekly" ? "Every 2 weeks" : "Monthly"}
                  </span>
                  <span className="flex w-full gap-1 sm:w-auto">
                    <Button
                      variant="tertiary"
                      onClick={() => {
                        setEditing(p.id);
                        setEditText(asSentence(p.text));
                        setErr(null);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="tertiary"
                      className="ms-3"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(p.id)}
                    >
                      Remove
                    </Button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : q.isLoading ? null : (
        <p className="mt-3 text-body">Kabsi suggests your questions after your first check.</p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) add.mutate();
        }}
        className="mt-4 space-y-3 border-t border-line pt-4"
      >
        <Field
          label="Add a question"
          hint="The way a customer would ask, for example: best hair salon near the marina"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (err) setErr(null);
          }}
          maxLength={120}
          error={err}
        />
        <Button type="submit" variant="secondary" size="md" loading={add.isPending}>
          Add question
        </Button>
      </form>
    </Panel>
  );
}

// Who is signed in, and a sign-out that's easy to find on a phone too.
function AccountCard() {
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [err, setErr] = useState("");
  const [allOpen, setAllOpen] = useState(false);
  const [allBusy, setAllBusy] = useState(false);
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
  async function outEverywhere() {
    setErr("");
    setAllBusy(true);
    try {
      await supabase.auth.signOut({ scope: "global" });
      clearAssistantChat();
      await queryClient.cancelQueries();
      queryClient.clear();
      await navigate({ to: "/login", replace: true });
    } catch {
      setAllBusy(false);
      setErr("Couldn't sign out. Check your connection and try again.");
    }
  }
  return (
    <Panel title="Your account" id="account">
      <p className="text-small text-text-2">
        You sign in with a 6-digit code sent to your email. There&apos;s no password to remember.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="md"
          icon={<LogOut className="size-4" aria-hidden />}
          onClick={() => void out()}
        >
          Sign out
        </Button>
        <Button variant="secondary" size="md" onClick={() => setAllOpen(true)}>
          Sign out of all devices
        </Button>
      </div>
      <AlertDialog open={allOpen} onOpenChange={setAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of all devices?</AlertDialogTitle>
            <AlertDialogDescription>
              This signs you out everywhere. You can log in again with a code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay signed in</AlertDialogCancel>
            <AlertDialogAction disabled={allBusy} onClick={() => void outEverywhere()}>
              {allBusy ? "Signing out..." : "Sign out everywhere"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {err ? (
        <p className="mt-2 text-small text-bad" role="alert">
          {err}
        </p>
      ) : null}
    </Panel>
  );
}

// Disconnect Kabsi (K-41, P0.2-02): visible, three taps (Settings, Disconnect, Disconnect). The owner-only
// request_disconnect RPC stops everything at once; the disconnect job removes Kabsi's Manager access and emails the owner.
function DisconnectGoogle({
  locationId,
  settings,
  owner,
  onChanged,
}: {
  locationId: string;
  settings: Settings;
  owner: boolean;
  onChanged: () => unknown;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function disconnect() {
    setBusy(true);
    setErr("");
    const { error } = await supabase.rpc("request_disconnect", { p_location: locationId });
    setBusy(false);
    setOpen(false);
    if (error) {
      return setErr(
        error.code === "42501"
          ? "Only the owner of this business can disconnect Kabsi."
          : "Something went wrong. Email hello@kabsi.co and we'll do it for you.",
      );
    }
    await queryClient.invalidateQueries({ queryKey: ["my-location"] });
    onChanged();
  }
  const steps = (
    <>
      on your Business Profile open <b className="text-text-1">Menu</b>, then{" "}
      <b className="text-text-1">Business Profile settings</b>, then{" "}
      <b className="text-text-1">People and access</b>
    </>
  );
  return (
    <Panel title="Disconnect Kabsi" id="disconnect">
      {settings.access_removed_at ? (
        <p className="text-small text-text-2">
          Kabsi removed its Manager access on{" "}
          <b className="text-text-1">{fmtDate(settings.access_removed_at)}</b>. To check: {steps}.
          Kabsi Clients is no longer listed. Your review link and cards keep working until your plan
          ends.
        </p>
      ) : settings.disconnect_requested_at ? (
        <p className="text-small text-text-2" role="status">
          Kabsi has stopped and is removing its Manager access. We email you when it&apos;s done, at
          the latest 7 business days after {fmtDate(settings.disconnect_requested_at)}. You can also
          remove it yourself now: {steps}, and remove Kabsi Clients (group ID {KABSI_GROUP_ID}).
        </p>
      ) : (
        <>
          <p className="text-body">
            Kabsi stops, and data from your Google profile is deleted after 7 days.
          </p>
          <p className="mt-2 text-small text-text-2">
            Nothing more goes to Google, approvals still waiting are cancelled, and Kabsi removes
            its Manager access to your Google profile. You stay the owner. Your review link and
            cards keep working until your plan ends.
          </p>
          {settings.is_demo ? (
            <p className="mt-3 text-small text-text-2">Demo businesses stay connected.</p>
          ) : owner ? (
            <Button variant="secondary" size="md" className="mt-4" onClick={() => setOpen(true)}>
              Disconnect
            </Button>
          ) : (
            <p className="mt-3 text-small text-text-2">
              Only the owner of this business can disconnect Kabsi.
            </p>
          )}
        </>
      )}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Kabsi from Google?</AlertDialogTitle>
            <AlertDialogDescription>
              Kabsi stops now and removes its Manager access to your Google profile. Approvals still
              waiting are cancelled. Your profile, your reviews on Google and your review link are
              not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Kabsi</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={() => void disconnect()}>
              {busy ? "Disconnecting..." : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {err ? (
        <p className="mt-3 text-small text-bad" role="alert">
          {err}
        </p>
      ) : null}
    </Panel>
  );
}

// Owner-requested deletion (migration 019): 7 days to change your mind, then everything is deleted.
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
    <section
      className="rounded-card border border-line-strong p-4 sm:p-5"
      aria-labelledby="delete-business"
    >
      <h2 id="delete-business" className="font-display text-h3 font-bold">
        Delete this business from Kabsi
      </h2>
      {due ? (
        <>
          <p className="mt-2 text-small text-text-2">
            Deletion is scheduled for <b className="text-text-1">{due}</b>. Until then everything
            keeps working and you can cancel.
          </p>
          <Button
            variant="secondary"
            size="md"
            className="mt-4"
            loading={busy}
            onClick={() => void run("cancel")}
          >
            Cancel deletion
          </Button>
        </>
      ) : (
        <>
          <p className="mt-2 text-small text-text-2">
            After 7 days we delete its reviews, drafts, posts, photos, reports and settings, and
            your NFC cards stop opening your review page. Payment records are kept where the law
            requires. To stop Kabsi reaching your Google profile, also remove the Kabsi group (ID{" "}
            {KABSI_GROUP_ID}) under People and access.
          </p>
          <Field
            id="confirm-delete"
            label="Type the business name to confirm"
            className="mt-4"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={name}
          />
          <Button
            variant="secondary"
            size="md"
            className="mt-4 border-bad text-bad"
            disabled={busy || confirm.trim().toLowerCase() !== name.trim().toLowerCase()}
            loading={busy}
            onClick={() => void run("request")}
          >
            Delete in 7 days
          </Button>
        </>
      )}
      {err ? (
        <p className="mt-3 text-small text-bad" role="alert">
          {err}
        </p>
      ) : null}
    </section>
  );
}

/** Review emails: the daily email time, the time zone, up to 3 extra addresses and the 7 day pause (D220). */
function EmailSettings({
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
    <Panel title="Review emails" id="emails">
      <form onSubmit={(e) => void save(null, e)}>
        <p className="text-small text-text-2">
          Reviews that need extra care are emailed right away. Other reviews are emailed at once
          while you are open and come together in one daily email after hours.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="hour" className="mb-2 block text-small font-bold">
              Daily email time
            </label>
            <select
              id="hour"
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className={selectClass}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="zone" className="mb-2 block text-small font-bold">
              Time zone
            </label>
            <select
              id="zone"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className={selectClass}
            >
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Field
          id="emails"
          className="mt-5"
          label="Also send review alerts to (optional, up to 3)"
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          placeholder="manager@yourbusiness.com"
          hint="These people see new reviews by email. Only you can post replies."
        />
        {err ? (
          <p className="mt-4 text-small text-bad" role="alert">
            {err}
          </p>
        ) : null}
        {msg ? (
          <p className="mt-4 text-small text-ok" role="status">
            {msg}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="submit" size="md" loading={busy} data-main-cta>
            Save
          </Button>
          <Button
            variant="secondary"
            size="md"
            disabled={busy}
            onClick={() => void save(paused ? 0 : 7)}
          >
            {paused ? "Turn emails back on" : "Pause for 7 days"}
          </Button>
        </div>
        <p className="mt-3 text-small text-text-2">
          {paused
            ? `Paused until ${fmtDate(initial.emails_paused_until)}. Reviews still arrive in your inbox.`
            : "Going on holiday? Pause review emails for a week. Reviews still arrive in your Kabsi inbox."}
        </p>
      </form>
    </Panel>
  );
}
