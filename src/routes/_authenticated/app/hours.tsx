import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { EarlyAccessNotice } from "@/components/app/early-access-notice";
import { AccountTop, Panel } from "@/components/kabsi/d3-account";
import { TaskBlock } from "@/components/kabsi/d3-content-task";
import { Button, ButtonLink, EmptyState, ErrorState, Skeleton } from "@/components/kabsi/ui";
import { HolidayQuestions } from "@/components/hours/holiday-questions";
import { HoursCalendar } from "@/components/hours/hours-calendar";
import { ClosureForm, SpecialHoursForm } from "@/components/hours/special-hours-form";
import { WeekEditor } from "@/components/hours/week-editor";
import { addDays, loadHolidayCalendar } from "@/lib/holidays";
import { DAY_KEYS, DAY_LABEL, emptyWeek, weekFromFact, type Week } from "@/lib/hours";
import { localToday, range, times } from "@/lib/hours-format";
import { myLatestLocation } from "@/lib/onboarding";
import { supabase } from "@/lib/supabase";
import { latestByTarget, recentTasks } from "@/lib/task-feed";

// Hours (P0.5-03, K-21; Design 3's Hours tab): the usual week, holidays and special days, and a calendar of what is set.
// The owner confirms the exact hours before anything changes on Google (D202); every approval goes through the one
// publication pipeline, and each special day Kabsi sent shows its task state.
export const Route = createFileRoute("/_authenticated/app/hours")({
  head: () => ({ meta: [{ title: "Hours | Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: HoursPage,
});

type Row = {
  id: string;
  start_date: string;
  end_date: string;
  closed: boolean;
  open_time: string | null;
  close_time: string | null;
  reason: string | null;
  state: string;
};

async function loadHours(locationId: string): Promise<Row[]> {
  const { data, error } = await supabase
    .from("special_hours")
    .select("id, start_date, end_date, closed, open_time, close_time, reason, state")
    .eq("location_id", locationId)
    .order("start_date", { ascending: false })
    .limit(60);
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

type Fact = { display?: string; raw?: unknown } | null;
/** The regular hours the owner approved, or what Google showed when they confirmed it (Business Knowledge). */
async function loadApprovedHours(locationId: string): Promise<Fact> {
  const { data, error } = await supabase
    .from("knowledge_facts")
    .select("value")
    .eq("location_id", locationId)
    .eq("slot", "profile.regular_hours")
    .is("superseded_by", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.value ?? null) as Fact;
}

/** One calendar entry per day of a holiday, so a run of days is marked on each of them. */
const holidayDays = (start: string, end: string, name: string) => {
  const out: { date: string; name: string }[] = [];
  for (let d = start; d <= end && out.length < 40; d = addDays(d, 1)) out.push({ date: d, name });
  return out;
};

const dayText = (week: Week, d: (typeof DAY_KEYS)[number]) =>
  week[d].length
    ? week[d].map((p) => `${p.open} to ${p.close === "00:00" ? "midnight" : p.close}`).join(", ")
    : "Closed";

type Extra = "special" | "closure" | null;

function HoursPage() {
  const queryClient = useQueryClient();
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const live = !!loc && loc.status === "active" && !loc.concierge;
  const rows = useQuery({
    queryKey: ["hours", loc?.id],
    queryFn: () => loadHours(loc!.id),
    enabled: !!loc,
  });
  const approved = useQuery({
    queryKey: ["hours-approved", loc?.id],
    queryFn: () => loadApprovedHours(loc!.id),
    enabled: !!loc,
  });
  const holidays = useQuery({
    queryKey: ["holidays", loc?.id],
    queryFn: () => loadHolidayCalendar(loc!.id),
    enabled: live,
    retry: false,
  });
  const tasks = useQuery({
    queryKey: ["hours-tasks", loc?.id],
    queryFn: () => recentTasks(loc!.id, { kinds: ["special_hours"], days: 120, limit: 60 }),
    enabled: live,
    retry: false,
  });
  const [editing, setEditing] = useState(false);
  const [extra, setExtra] = useState<Extra>(null);
  const refresh = () =>
    Promise.all(
      [
        ["hours"],
        ["hours-approved"],
        ["hours-tasks"],
        ["holidays"],
        ["shield"],
        ["tasks"],
        ["feed"],
        ["home-facts"],
      ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
  const today = localToday();
  const week = weekFromFact(approved.data);
  const byRow = latestByTarget(tasks.data ?? []);
  const sent = (rows.data ?? []).filter((r) => r.state !== "skipped" && r.state !== "draft");
  const entries = (rows.data ?? [])
    .filter((r) => r.state !== "skipped")
    .map((r) => ({
      start: r.start_date,
      end: r.end_date,
      label: `${times(r)}${r.reason ? `, ${r.reason}` : ""}`,
    }));

  return (
    <>
      <AccountTop title="Hours" />
      {!location.isLoading && !loc ? <ButtonLink to="/start">Add your business</ButtonLink> : null}
      {loc?.concierge ? <EarlyAccessNotice what="Hours" /> : null}
      {loc && !loc.concierge && loc.status !== "active" ? (
        <Panel>
          <p className="text-body font-bold">
            Hours can be set once Kabsi can reach your Google profile.
          </p>
          <ButtonLink to="/start" size="md" className="mt-4">
            Continue setup
          </ButtonLink>
        </Panel>
      ) : null}
      {live && approved.isError ? (
        <ErrorState title="This page did not load." onRetry={() => void approved.refetch()}>
          Nothing you did, and nothing changed on Google. Try again in a minute.
        </ErrorState>
      ) : null}

      {live && !approved.isError ? (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Panel title="Usual hours" id="usual">
            {approved.isLoading ? (
              <div role="status" aria-busy="true" aria-label="Loading">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-3 h-4 w-4/5" />
                <Skeleton className="mt-3 h-4 w-3/5" />
              </div>
            ) : editing ? (
              <WeekEditor
                // A new week arrives after a save: start the editor again from it.
                key={JSON.stringify(approved.data ?? null)}
                locationId={loc.id}
                initial={week ?? emptyWeek()}
                onDone={refresh}
                onClose={() => setEditing(false)}
              />
            ) : week ? (
              <>
                <dl className="divide-y divide-line">
                  {DAY_KEYS.map((d) => (
                    <div key={d} className="flex justify-between gap-3 py-2.5 text-small">
                      <dt className="text-text-2">{DAY_LABEL[d]}</dt>
                      <dd className="text-end font-semibold text-text-1">{dayText(week, d)}</dd>
                    </div>
                  ))}
                </dl>
                <Button
                  variant="secondary"
                  size="md"
                  className="mt-4"
                  onClick={() => setEditing(true)}
                >
                  Change hours
                </Button>
              </>
            ) : (
              <EmptyState
                icon={Clock}
                title="No hours on Google yet."
                action={
                  <Button variant="secondary" size="md" onClick={() => setEditing(true)}>
                    Change hours
                  </Button>
                }
              >
                Send your opening hours on WhatsApp and Kabsi adds them after your yes.
              </EmptyState>
            )}
          </Panel>

          <div className="space-y-4">
            <Panel title="Holidays" id="holidays">
              {rows.isError || holidays.isError ? (
                <ErrorState
                  className="mb-4"
                  title="Your holidays did not load."
                  onRetry={() => {
                    void rows.refetch();
                    void holidays.refetch();
                  }}
                >
                  Nothing you did, and nothing changed on Google. Try again in a minute.
                </ErrorState>
              ) : null}
              <HolidayQuestions
                prompts={holidays.data?.prompts ?? []}
                today={today}
                regularHours={
                  typeof approved.data?.display === "string" ? approved.data.display : null
                }
                onDone={refresh}
              />
              {sent.length ? (
                <ul className="divide-y divide-line" aria-label="Special days set with Kabsi">
                  {sent.map((r) => (
                    <li key={r.id} className="py-4 first:pt-0 last:pb-0">
                      <p className="text-body font-semibold text-text-1">{range(r)}</p>
                      <p className="text-small text-text-2">
                        {times(r)}
                        {r.reason ? `. ${r.reason}` : ""}
                      </p>
                      <TaskBlock
                        task={byRow.get(r.id)}
                        kind="special_hours"
                        rowState={r.state}
                        className="mt-3"
                      />
                    </li>
                  ))}
                </ul>
              ) : !holidays.data?.prompts.length ? (
                <p className="text-body text-text-2">
                  Kabsi asks about your hours before each public holiday.
                </p>
              ) : null}
              <div
                className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4"
                role="group"
                aria-label="Add different hours"
              >
                <Button
                  variant={extra === "special" ? "quiet" : "secondary"}
                  size="md"
                  aria-pressed={extra === "special"}
                  onClick={() => setExtra(extra === "special" ? null : "special")}
                >
                  Special days
                </Button>
                <Button
                  variant={extra === "closure" ? "quiet" : "secondary"}
                  size="md"
                  aria-pressed={extra === "closure"}
                  onClick={() => setExtra(extra === "closure" ? null : "closure")}
                >
                  Closed for a while
                </Button>
              </div>
              {extra === "special" ? (
                <SpecialHoursForm locationId={loc.id} onDone={refresh} />
              ) : null}
              {extra === "closure" ? <ClosureForm locationId={loc.id} onDone={refresh} /> : null}
            </Panel>
            <p className="text-small text-text-2">Nothing changes on Google until you say yes.</p>
          </div>

          <Panel className="lg:col-span-2">
            <HoursCalendar
              entries={entries}
              holidays={(holidays.data?.upcoming ?? []).flatMap((h) =>
                holidayDays(h.starts_on, h.ends_on, h.name),
              )}
              today={today}
            />
          </Panel>
        </div>
      ) : null}
    </>
  );
}
