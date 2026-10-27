import { useState } from "react";
import { EarlyAccessNotice } from "@/components/app/early-access-notice";
import { fmtDate } from "@/lib/format";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { supabase } from "@/lib/supabase";
import { myLatestLocation } from "@/lib/onboarding";
import { amStaff } from "@/lib/reviews";
import { OpenChange } from "@/components/profile/open-change";
import { loadTasks, type Task } from "@/lib/tasks";
import { myAccess, type Access } from "@/lib/team";
import { agoWords } from "@/lib/home-state";
import { cn } from "@/lib/utils";
import {
  NOT_CONFIRMED,
  OPEN_STATUSES,
  profileRows,
  protectionLine,
  rowLabel as label,
  type Change,
  type Fact,
} from "@/lib/profile-rows";
import { ShieldCheck as PageGlyph } from "lucide-react";
import { PageIcon } from "@/components/shared/page-icon";

// Google Profile (K-18, K-19, P0.3-11): one row for every field Google Protection watches, with what Google shows, what you
// approved, a status and when it was last checked; what needs your attention at the top, with the two decisions for a
// change; the Protection status line. Nothing changes on Google until you choose. Editors for description, services and
// attributes are P1 (K-22): this screen lists what needs attention only.
export const Route = createFileRoute("/_authenticated/app/shield")({
  head: () => ({
    meta: [{ title: "Google Profile | Kabsi" }, { name: "robots", content: "noindex" }],
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
// The tasks that belong on this screen: what is missing or unconfirmed on the profile, and lost access. Changes have their
// own cards below, with the two decisions.
const PROFILE_TASKS = [
  "profile_gap",
  "knowledge_confirm",
  "hours_confirm",
  "reconnect",
  "google_needs_action",
];

async function loadProfile(locationId: string) {
  const [changes, facts, loc, tasks] = await Promise.all([
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
  ]);
  if (changes.error) throw new Error(changes.error.message);
  if (facts.error) throw new Error(facts.error.message);
  return {
    changes: (changes.data ?? []) as Change[],
    facts: (facts.data ?? []) as Fact[],
    checkedAt: (loc.data as { shield_checked_at: string | null } | null)?.shield_checked_at ?? null,
    tasks: tasks.tasks.filter((t) => PROFILE_TASKS.includes(t.kind)),
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
    enabled: !!loc,
    refetchInterval: 60_000,
  });
  const refresh = () =>
    Promise.all(
      [["shield"], ["tasks"], ["feed"], ["home-facts"]].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
  const changes = data.data?.changes ?? [];
  const facts = data.data?.facts ?? [];
  const rows = profileRows(facts, changes);
  const open = changes.filter((c) => OPEN_STATUSES.includes(c.status));
  const past = changes.filter((c) => !OPEN_STATUSES.includes(c.status));
  const tasks = data.data?.tasks ?? [];
  const running =
    !!loc && loc.status === "active" && !(loc.access_lost_at && !loc.access_granted_at);
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <PageIcon icon={<PageGlyph />} />
      <h1 className="font-display text-h2 leading-none sm:text-5xl">Google Profile</h1>
      <p className="mt-2 max-w-2xl text-text-2">
        What customers see on Google, next to what you approved. Google sometimes changes details
        itself or accepts edits from the public. Nothing changes on Google until you choose.
      </p>
      {loc && !loc.concierge ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-pill bg-surface-1 px-4 py-2 text-small font-medium shadow-rest">
          <ShieldCheck
            className={running ? "size-4 text-ok" : "size-4 text-text-2"}
            aria-hidden="true"
          />
          {protectionLine({ running, checkedAt: data.data?.checkedAt ?? null })}
        </p>
      ) : null}
      {!location.isLoading && !loc ? (
        <Button asChild className="mt-6">
          <Link to="/start">Add your business</Link>
        </Button>
      ) : null}
      {data.error ? (
        <p className="mt-6 text-bad" role="alert">
          Couldn't load your profile. Refresh the page.
        </p>
      ) : null}
      {loc?.concierge ? <EarlyAccessNotice what="Google Protection" /> : null}
      {loc && !loc.concierge && loc.status !== "active" ? (
        <div className="mt-7 rounded-panel bg-surface-1 p-6 shadow-rest">
          <p className="font-bold">
            Google Protection starts once Kabsi can reach your Google profile.
          </p>
          <Button asChild size="compact" className="mt-4">
            <Link to="/start">Continue setup</Link>
          </Button>
        </div>
      ) : null}

      {loc && loc.status === "active" && data.data ? (
        <>
          <section className="mt-8" aria-labelledby="attention">
            <h2 id="attention" className="text-title font-bold">
              What needs attention
            </h2>
            {!open.length && !tasks.length ? (
              <p className="mt-2 text-small text-text-2">
                Nothing needs your attention. Kabsi is watching your profile.
              </p>
            ) : null}
            <div className="mt-3 space-y-4">
              {open.map((c, i) => (
                <OpenChange
                  key={c.id}
                  change={c}
                  access={access.data}
                  lead={i === 0}
                  onDone={refresh}
                />
              ))}
              {tasks.map((t) => (
                <div key={t.id} className="rounded-card bg-surface-1 p-4 shadow-rest">
                  <p className="font-bold">{t.title}</p>
                  {t.why ? <p className="mt-1 text-small leading-6 text-text-2">{t.why}</p> : null}
                  <Button asChild variant="secondary" size="compact" className="mt-3">
                    <Link to={t.path}>
                      Open <ArrowRight />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-9" aria-labelledby="fields">
            <h2 id="fields" className="text-title font-bold">
              What Kabsi watches
            </h2>
            <ul className="mt-3 space-y-3">
              {rows.map((r) => (
                <li key={r.key} className="rounded-card bg-surface-1 p-4 shadow-rest">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-bold">{r.label}</p>
                    <StatusPill tone={r.tone} className="shrink whitespace-normal text-right">
                      {r.status}
                    </StatusPill>
                  </div>
                  <dl className="mt-3 space-y-2 text-small">
                    <div>
                      <dt className="text-label font-bold uppercase text-text-2">Google shows</dt>
                      <dd dir="auto" className="break-words">
                        {r.google ?? (
                          <span className="text-text-2">Kabsi has not read this yet</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-label font-bold uppercase text-text-2">
                        Approved by you
                      </dt>
                      <dd dir="auto" className="break-words">
                        {r.approved === null ? (
                          <span className="text-text-2">Nothing yet</span>
                        ) : r.approved === NOT_CONFIRMED ? (
                          <span className="text-warn">{NOT_CONFIRMED}</span>
                        ) : (
                          r.approved
                        )}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-3 flex flex-wrap items-center justify-between gap-2 text-label text-text-2">
                    <span>
                      {r.google === null
                        ? "Kabsi reads this once Google shows it"
                        : data.data?.checkedAt
                          ? `Last checked ${agoWords(data.data.checkedAt)}`
                          : "Not checked yet"}
                    </span>
                    {r.hint ? (
                      <Link to="/app/hours" className="underline underline-offset-4">
                        {r.hint}
                      </Link>
                    ) : null}
                    {r.approved === NOT_CONFIRMED ? (
                      <Link to="/app/knowledge" className="underline underline-offset-4">
                        Confirm it
                      </Link>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}

      {past.length ? (
        <div className="mt-8">
          <h2 className="text-title font-bold">History</h2>
          <div className="mt-3 space-y-2">
            {past.map((c) => (
              <div key={c.id} className="rounded-card bg-surface-1 p-4 text-small shadow-rest">
                <p className="font-medium">
                  {label(c.field)} ·{" "}
                  {c.support_requested_at
                    ? "Kabsi's team is asking Google support"
                    : (STATUS[c.status] ?? c.status)}
                </p>
                <p className="text-text-2">
                  {fmtDate(c.detected_at)} ·{" "}
                  {c.google_value
                    ? `Google showed “${c.google_value.display || "(empty)"}”`
                    : "Details removed after 30 days (Google's rule)"}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {loc ? <StaffEdit locationId={loc.id} /> : null}
    </div>
  );
}

// Staff only, simulated locations only: pretend Google edited the profile. The keys are the mock listing's own.
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
  return (
    <details className="mt-10 rounded-panel border border-dashed border-line p-5">
      <summary className="cursor-pointer text-small font-bold">
        Staff: simulate a Google edit
      </summary>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <select
          aria-label="Field"
          value={field}
          onChange={(e) => setField(e.target.value)}
          className="h-11 rounded-card border border-line bg-surface-1 px-3"
        >
          {MOCK_FIELDS.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <Input
          aria-label="New value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="New value"
        />
        <Button
          size="compact"
          variant="outline"
          disabled={!value.trim()}
          onClick={() => void run()}
        >
          Simulate
        </Button>
      </div>
      {msg ? <p className="mt-3 text-small text-text-2">{msg}</p> : null}
    </details>
  );
}
