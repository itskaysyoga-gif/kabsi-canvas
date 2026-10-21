import { useState } from "react";
import { EarlyAccessNotice } from "@/components/app/early-access-notice";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { HoursCalendar } from "@/components/hours/hours-calendar";
import { ClosureForm, SpecialHoursForm } from "@/components/hours/special-hours-form";
import { localToday, range, times } from "@/lib/hours-format";
import { WeekEditor } from "@/components/hours/week-editor";
import { emptyWeek, weekFromFact } from "@/lib/hours";
import { supabase } from "@/lib/supabase";
import { myLatestLocation } from "@/lib/onboarding";
import { CalendarClock as PageGlyph } from "lucide-react";
import { PageIcon } from "@/components/shared/page-icon";

// Hours (P0.5-03, K-21): one editor for the weekly hours, special days and a closure with a reopening date, and a
// calendar of what is set. The owner confirms the exact hours before anything changes on Google (D202); every
// approval goes through the one publication pipeline.
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

const MODES = [
  { id: "regular", label: "Opening hours" },
  { id: "special", label: "Special days" },
  { id: "closure", label: "Closed for a while" },
] as const;
type Mode = (typeof MODES)[number]["id"];

function HoursPage() {
  const queryClient = useQueryClient();
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
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
  const [mode, setMode] = useState<Mode>("regular");
  const refresh = () =>
    Promise.all(
      [["hours"], ["hours-approved"], ["shield"], ["tasks"], ["feed"], ["home-facts"]].map(
        (queryKey) => queryClient.invalidateQueries({ queryKey }),
      ),
    );
  const live = !!loc && loc.status === "active" && !loc.concierge;
  const today = localToday();
  const entries = (rows.data ?? [])
    .filter((r) => r.state !== "skipped")
    .map((r) => ({
      start: r.start_date,
      end: r.end_date,
      label: `${times(r)}${r.reason ? `, ${r.reason}` : ""}`,
    }));
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 sm:py-12">
      <PageIcon icon={<PageGlyph />} />
      <p className="text-sm font-bold uppercase tracking-wider text-kb-stone">Profile</p>
      <h1 className="mt-1 font-display text-4xl leading-none sm:text-5xl">Hours</h1>
      <p className="mt-2 text-kb-stone">
        Your weekly hours, holidays and closures, so Google shows the right times. Nothing changes
        on Google until you confirm it.
      </p>
      {!location.isLoading && !loc ? (
        <Button asChild className="mt-6">
          <Link to="/start">Add your business</Link>
        </Button>
      ) : null}
      {loc?.concierge ? <EarlyAccessNotice what="Hours" /> : null}
      {live ? (
        <>
          <div className="mt-6 grid grid-cols-3 gap-2" role="group" aria-label="What to change">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={mode === m.id}
                onClick={() => setMode(m.id)}
                className={`min-h-12 rounded-card border-2 px-2 text-sm font-bold ${mode === m.id ? "border-kb-black bg-kb-sand" : "border-kb-hairline"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {mode === "regular" ? (
            approved.isLoading ? (
              <p className="mt-7 text-kb-stone">Loading…</p>
            ) : (
              <WeekEditor
                // A new week arrives after a save: start the editor again from it.
                key={JSON.stringify(approved.data ?? null)}
                locationId={loc.id}
                initial={weekFromFact(approved.data) ?? emptyWeek()}
                onDone={refresh}
              />
            )
          ) : mode === "special" ? (
            <SpecialHoursForm locationId={loc.id} onDone={refresh} />
          ) : (
            <ClosureForm locationId={loc.id} onDone={refresh} />
          )}
        </>
      ) : loc && !loc.concierge ? (
        <div className="mt-7 rounded-large bg-kb-white p-6 shadow-kb">
          <p className="font-bold">Hours can be set once Kabsi can reach your Google profile.</p>
          <Button asChild size="compact" className="mt-4">
            <Link to="/start">Continue setup</Link>
          </Button>
        </div>
      ) : null}
      {live ? <HoursCalendar entries={entries} holidays={[]} today={today} /> : null}
      {rows.data?.length ? (
        <div className="mt-10">
          <h2 className="text-lg font-bold">Set with Kabsi</h2>
          <div className="mt-3 space-y-2">
            {rows.data.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-card bg-kb-white p-4 shadow-kb"
              >
                <div>
                  <p className="font-medium">{range(r)}</p>
                  <p className="text-sm text-kb-stone">
                    {times(r)}
                    {r.reason ? ` · ${r.reason}` : ""}
                  </p>
                </div>
                <span
                  className={
                    r.state === "failed"
                      ? "shrink-0 rounded-pill bg-kb-red/10 px-2.5 py-1 text-xs font-bold text-kb-red"
                      : r.state === "posted" || r.state === "live"
                        ? "shrink-0 rounded-pill bg-kb-green/10 px-2.5 py-1 text-xs font-bold text-kb-green"
                        : "shrink-0 rounded-pill bg-kb-sand px-2.5 py-1 text-xs font-bold text-kb-stone"
                  }
                >
                  {r.state === "posted" || r.state === "live"
                    ? "On Google"
                    : r.state === "failed"
                      ? "Not saved"
                      : r.state === "in_review"
                        ? "Google is reviewing"
                        : "Sending"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
