import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ShieldCheck } from "lucide-react";
import { EarlyAccessNotice } from "@/components/app/early-access-notice";
import { ProfileGaps } from "@/components/app/profile-gaps";
import { AccountTop, Panel, SourceLabel } from "@/components/kabsi/d3-account";
import { TaskBlock } from "@/components/kabsi/d3-content-task";
import {
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  Skeleton,
  StatusPill,
  type Tone,
} from "@/components/kabsi/ui";
import { OpenChange } from "@/components/profile/open-change";
import { changeWords } from "@/components/profile/change-card";
import { fmtDate } from "@/lib/format";
import { myLatestLocation } from "@/lib/onboarding";
import {
  NOT_CONFIRMED,
  OPEN_STATUSES,
  profileRows,
  protectionLine,
  type Change,
  type Fact,
  type ProfileRow,
  type RowTone,
} from "@/lib/profile-rows";
import { amStaff } from "@/lib/reviews";
import { supabase } from "@/lib/supabase";
import { latestByTarget, recentTasks } from "@/lib/task-feed";
import { loadTasks, type Task } from "@/lib/tasks";
import { myAccess } from "@/lib/team";

// Profile watch (K-18, K-19, P0.3-11; Design 3's "Your Google profile"): changes others made, each with its two
// decisions; the details Kabsi watches, with what is missing; the things to fix; Google's warnings; and the put-backs
// Kabsi sent, each with its task state. Nothing changes on Google until the owner chooses.
export const Route = createFileRoute("/_authenticated/app/shield")({
  head: () => ({
    meta: [{ title: "Your Google profile | Kabsi" }, { name: "robots", content: "noindex" }],
  }),
  component: ProfilePage,
});

const STATUS: Record<string, string> = {
  accepted: "You said Google is right",
  rejected: "Your information is on its way to Google",
  corrected: "Your information is back on Google",
  failed: "Google did not take your information",
  expired: "No answer in 14 days",
  superseded: "Replaced by a newer change",
};
// The things to fix on this screen: what is missing or unconfirmed on the profile, and lost access. Google's own
// warnings (google_needs_action) have their own panel; changes have their own cards.
const FIX_TASKS = ["profile_gap", "knowledge_confirm", "hours_confirm", "reconnect"];
const TONE: Record<RowTone, Tone> = { green: "ok", amber: "warn", red: "bad", grey: "info" };

async function loadProfile(locationId: string) {
  const [changes, facts, loc, tasks, putBacks] = await Promise.all([
    supabase
      .from("profile_changes")
      .select(
        "id, field, previous_value, previous_fact_id, google_value, source, status, explanation, recommend, recommend_reason, support_requested_at, detected_at",
      )
      .eq("location_id", locationId)
      .order("detected_at", { ascending: false })
      .limit(30),
    supabase
      .from("knowledge_facts")
      .select("key, value, status")
      .eq("location_id", locationId)
      .like("slot", "profile.%")
      .is("superseded_by", null),
    supabase.from("locations").select("shield_checked_at").eq("id", locationId).maybeSingle(),
    loadTasks(locationId).catch(() => ({ tasks: [] as Task[], snoozed: 0 })),
    recentTasks(locationId, { kinds: ["listing_revert"], days: 60 }).catch(() => []),
  ]);
  if (changes.error) throw new Error(changes.error.message);
  if (facts.error) throw new Error(facts.error.message);
  return {
    changes: (changes.data ?? []) as Change[],
    facts: (facts.data ?? []) as Fact[],
    checkedAt: (loc.data as { shield_checked_at: string | null } | null)?.shield_checked_at ?? null,
    fix: tasks.tasks.filter((t) => FIX_TASKS.includes(t.kind)),
    warnings: tasks.tasks.filter((t) => t.kind === "google_needs_action"),
    putBacks: latestByTarget(putBacks),
  };
}

function ProfilePage() {
  const queryClient = useQueryClient();
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const access = useQuery({
    queryKey: ["access", loc?.id],
    queryFn: () => myAccess(loc!.id),
    enabled: !!loc,
  });
  const data = useQuery({
    queryKey: ["shield", loc?.id],
    queryFn: () => loadProfile(loc!.id),
    enabled: !!loc && loc.status === "active" && !loc.concierge,
    refetchInterval: 60_000,
  });
  const refresh = () =>
    Promise.all(
      [["shield"], ["tasks"], ["feed"], ["home-facts"]].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
  const d = data.data;
  const changes = d?.changes ?? [];
  const rows = profileRows(d?.facts ?? [], changes);
  const open = changes.filter((c) => OPEN_STATUSES.includes(c.status));
  const past = changes.filter((c) => !OPEN_STATUSES.includes(c.status));
  const running =
    !!loc && loc.status === "active" && !(loc.access_lost_at && !loc.access_granted_at);
  const live = !!loc && loc.status === "active" && !loc.concierge;
  // Kabsi has read nothing yet: no fact, no change and no check.
  const reading = !!d && !d.facts.length && !changes.length && !d.checkedAt;

  return (
    <>
      <AccountTop
        title="Your Google profile"
        lead="Kabsi checks your details every day and tells you when anything changes."
        action={
          live ? (
            <SourceLabel>
              <ShieldCheck
                className={running ? "size-4 text-ok" : "size-4 text-text-2"}
                aria-hidden
              />
              {protectionLine({ running, checkedAt: d?.checkedAt ?? null })}
            </SourceLabel>
          ) : null
        }
      />
      {!location.isLoading && !loc ? <ButtonLink to="/start">Add your business</ButtonLink> : null}
      {loc?.concierge ? <EarlyAccessNotice what="Google Protection" /> : null}
      {loc && !loc.concierge && loc.status !== "active" ? (
        <Panel>
          <p className="text-body font-bold">
            Google Protection starts once Kabsi can reach your Google profile.
          </p>
          <ButtonLink to="/start" size="md" className="mt-4">
            Continue setup
          </ButtonLink>
        </Panel>
      ) : null}
      {live && data.isLoading ? <Loading /> : null}
      {live && data.isError ? (
        <ErrorState title="This page did not load." onRetry={() => void data.refetch()}>
          Nothing you did, and nothing changed on Google. Try again in a minute.
        </ErrorState>
      ) : null}
      {live && d && reading ? (
        <EmptyState icon={ShieldCheck} title="Kabsi is reading your profile.">
          The first check takes a few minutes. Kabsi tells you on WhatsApp when it is done.
        </EmptyState>
      ) : null}

      {live && d && !reading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Changes others made" id="changes" className="lg:col-span-2">
            {open.length ? (
              <div className="space-y-3">
                {open.map((c, i) => (
                  <OpenChange
                    key={c.id}
                    change={c}
                    access={access.data}
                    lead={i === 0}
                    business={loc.name}
                    onDone={refresh}
                  />
                ))}
              </div>
            ) : (
              <p className="flex items-center gap-2 text-body text-text-1">
                <Check className="size-5 shrink-0 text-ok" aria-hidden />
                Nothing needs your attention. Kabsi is watching your profile.
              </p>
            )}
          </Panel>

          <Panel title="Details" id="details">
            <Details rows={rows} />
          </Panel>

          <ProfileGaps
            locationId={loc.id}
            gaps={d.fix}
            title={
              d.fix.length === 0
                ? "Nothing to fix"
                : `${d.fix.length} ${d.fix.length === 1 ? "thing" : "things"} to fix`
            }
          />

          <Panel title="Google's warnings" id="warnings" className="lg:col-span-2">
            {d.warnings.length ? (
              <ul className="space-y-3">
                {d.warnings.map((t) => (
                  <li key={t.id} className="rounded-inner bg-bad-soft p-4">
                    <StatusPill tone="bad">Needs you</StatusPill>
                    <p className="mt-3 text-body font-bold text-text-1">{t.title}</p>
                    {t.why ? <p className="mt-1 text-small text-text-1">{t.why}</p> : null}
                    <ButtonLink to={t.path} variant="secondary" size="md" className="mt-3">
                      Open
                    </ButtonLink>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-2 text-body text-text-1">
                <Check className="size-5 shrink-0 text-ok" aria-hidden />
                None. Google has not flagged anything on your profile.
              </p>
            )}
          </Panel>

          {past.length ? (
            <Panel title="History" id="history" className="lg:col-span-2">
              <ul className="divide-y divide-line">
                {past.map((c) => (
                  <PastChange key={c.id} change={c} task={d.putBacks.get(c.id)} />
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      ) : null}
      {loc ? <StaffEdit locationId={loc.id} /> : null}
    </>
  );
}

function Loading() {
  return (
    <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-card border border-line bg-surface-1 p-5">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}

/** Every watched detail: what Google shows, Missing when it shows nothing, and a status when it is not as approved. */
function Details({ rows }: { rows: ProfileRow[] }) {
  return (
    <dl className="divide-y divide-line">
      {rows.map((r) => (
        <div
          key={r.key}
          className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3"
        >
          <dt className="text-small text-text-2">{r.label}</dt>
          <dd className="min-w-0 text-small">
            {r.missing ? (
              <StatusPill tone="warn">Missing</StatusPill>
            ) : r.google === null ? (
              <span className="text-text-2">Not read yet</span>
            ) : (
              <span dir="auto" className="block break-words font-semibold text-text-1">
                {r.google}
              </span>
            )}
            {r.tone !== "green" && !(r.google === null && r.tone === "grey") ? (
              <StatusPill
                tone={TONE[r.tone]}
                className="mt-2 h-auto min-h-7 whitespace-normal py-1"
              >
                {r.status}
              </StatusPill>
            ) : null}
            {r.hint || r.approved === NOT_CONFIRMED ? (
              <span className="mt-1 flex flex-wrap gap-x-4">
                {r.hint ? (
                  <Link
                    to="/app/hours"
                    className="inline-flex min-h-11 items-center underline underline-offset-4"
                  >
                    {r.hint}
                  </Link>
                ) : null}
                {r.approved === NOT_CONFIRMED ? (
                  <Link
                    to="/app/knowledge"
                    className="inline-flex min-h-11 items-center underline underline-offset-4"
                  >
                    Confirm it
                  </Link>
                ) : null}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** A change that is decided: what happened, and for a put-back Kabsi sent, where that task is. */
function PastChange({
  change: c,
  task,
}: {
  change: Change;
  task: Parameters<typeof TaskBlock>[0]["task"];
}) {
  const words = changeWords(c.field);
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <p className="text-body font-semibold text-text-1">
        {words.noun.charAt(0).toUpperCase() + words.noun.slice(1)}:{" "}
        {c.support_requested_at
          ? "Kabsi's team is asking Google support"
          : (STATUS[c.status] ?? c.status)}
      </p>
      <p className="mt-1 text-small text-text-2">
        {fmtDate(c.detected_at)}.{" "}
        {c.google_value
          ? `Google showed “${c.google_value.display || "(empty)"}”`
          : "Details removed after 30 days (Google's rule)"}
      </p>
      {task || c.status === "rejected" || c.status === "corrected" || c.status === "failed" ? (
        <TaskBlock
          task={task}
          kind="listing_revert"
          rowState={c.status === "failed" ? "failed" : "posted"}
          seen={c.status === "corrected"}
          className="mt-3"
        />
      ) : null}
    </li>
  );
}

// Staff only, simulated locations only: pretend Google edited the profile. The keys are the mock profile's own.
const MOCK_FIELDS: [string, string][] = [
  ["title", "Business name"],
  ["phone", "Phone"],
  ["address", "Address"],
  ["website", "Website"],
  ["hours", "Opening hours"],
  ["categories", "Main category"],
  ["open_status", "Open status (OPEN, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY)"],
  ["map_pin", "Map pin (latitude, longitude)"],
];
function StaffEdit({ locationId }: { locationId: string }) {
  const staff = useQuery({ queryKey: ["am-staff"], queryFn: amStaff, staleTime: Infinity });
  const [field, setField] = useState("phone");
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState("");
  if (!staff.data) return null;
  async function run() {
    const { error } = await supabase.rpc("staff_mock_listing_edit", {
      p_location: locationId,
      p_field: field,
      p_value: value,
    });
    setMsg(error ? `Couldn't: ${error.message}` : "Edited. The alert arrives within 5 minutes.");
  }
  const input = "h-11 rounded-input border border-stroke bg-surface-2 px-3 text-body text-text-1";
  return (
    <details className="mt-8 rounded-card border border-dashed border-line-strong p-5">
      <summary className="min-h-11 cursor-pointer text-small font-bold">
        Staff: simulate a Google edit
      </summary>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <select
          aria-label="Field"
          value={field}
          onChange={(e) => setField(e.target.value)}
          className={input}
        >
          {MOCK_FIELDS.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <input
          aria-label="New value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="New value"
          className={`${input} min-w-0 flex-1`}
        />
        <Button size="md" variant="secondary" disabled={!value.trim()} onClick={() => void run()}>
          Simulate
        </Button>
      </div>
      {msg ? <p className="mt-3 text-small text-text-2">{msg}</p> : null}
    </details>
  );
}
