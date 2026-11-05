// Staff: every business (newest first), with concierge on and off, convert to Google access, the Pro trial and the
// diagnostics. Moved whole from the one /staff page by App 5 (master plan 30.33 item 3): the same read and the same
// actions. The list is also what Founding 25's start checklist and the evidence log choose a business from.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fmtDate } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { convertConcierge, setConcierge } from "@/lib/concierge";
import { ChoiceChips } from "@/components/kabsi/d3-account";
import { BusinessDiagnostics } from "./system-health-panel";
import { Button, STAFF_CARD, STAFF_H2, STAFF_ITEM } from "./staff-ui";

export type StaffBusiness = {
  id: string;
  name: string;
  status: string;
  onboarding_step: string;
  country: string | null;
  created_at: string;
  access_granted_at: string | null;
  concierge: boolean;
  organization_id: string | null;
};
type Row = StaffBusiness;

export async function allLocations(): Promise<Row[]> {
  const { data, error } = await supabase
    .from("locations")
    .select(
      "id, name, status, onboarding_step, country, created_at, access_granted_at, concierge, organization_id",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

/** The one read of every business, shared by the pages that need the list. */
export function useStaffLocations() {
  return useQuery({ queryKey: ["staff-locations"], queryFn: allLocations });
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "setup", label: "Setting up" },
  { value: "active", label: "Active" },
  { value: "concierge", label: "Concierge" },
];
const matches = (r: Row, f: string) =>
  f === "all" ||
  (f === "setup" && r.status !== "active") ||
  (f === "active" && r.status === "active") ||
  (f === "concierge" && r.concierge);

export function BusinessesPanel() {
  const rows = useStaffLocations();
  const [filter, setFilter] = useState("all");
  const shown = (rows.data ?? []).filter((r) => matches(r, filter));
  return (
    <section id="businesses" className={STAFF_CARD}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={STAFF_H2}>Businesses</h2>
        {rows.data ? (
          <p className="text-small text-text-2">
            {shown.length} of {rows.data.length}
          </p>
        ) : null}
      </div>
      <ChoiceChips
        name="business-filter"
        legend="Show"
        legendClassName="sr-only"
        className="mt-3"
        value={filter}
        onChange={setFilter}
        options={FILTERS}
      />
      <div className="mt-4 space-y-3">
        {rows.isLoading ? <p className="text-text-2">Loading businesses</p> : null}
        {rows.isError ? (
          <p className="text-small font-semibold text-bad" role="alert">
            The businesses did not load.{" "}
            <button type="button" className="underline" onClick={() => void rows.refetch()}>
              Try again
            </button>
          </p>
        ) : null}
        {rows.data && shown.length === 0 ? (
          <p className="text-text-2">
            {rows.data.length === 0 ? "No businesses yet." : "No business matches."}
          </p>
        ) : null}
        {shown.map((row) => (
          <LocationRow key={row.id} row={row} />
        ))}
      </div>
    </section>
  );
}

function LocationRow({ row }: { row: Row }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [diag, setDiag] = useState(false);

  async function conciergeToggle(on: boolean) {
    setBusy(true);
    setMsg("");
    try {
      await setConcierge(row.id, on);
      setMsg(
        on
          ? "Early access is on. Accept the invitation from the Concierge list."
          : "Early access is off.",
      );
      await queryClient.invalidateQueries({ queryKey: ["staff-locations"] });
      await queryClient.invalidateQueries({ queryKey: ["concierge-queue"] });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  }
  async function convert() {
    setBusy(true);
    setMsg("");
    try {
      await convertConcierge(row.id);
      setMsg("Converted. Kabsi will look for the real Google invitation.");
      await queryClient.invalidateQueries({ queryKey: ["staff-locations"] });
      await queryClient.invalidateQueries({ queryKey: ["concierge-queue"] });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  }

  async function grantTrial() {
    setBusy(true);
    setMsg("");
    const { error } = await supabase.rpc("staff_grant_trial", { p_location: row.id });
    setBusy(false);
    if (error) return setMsg(`No trial given: ${error.message}`);
    setMsg("Pro trial started.");
    await queryClient.invalidateQueries({ queryKey: ["staff-locations"] });
    await queryClient.invalidateQueries({ queryKey: ["my-location"] });
  }

  return (
    <div className={STAFF_ITEM}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold break-words">{row.name}</p>
          <p className="text-small text-text-2">
            {row.status.replace(/_/g, " ")} · step {row.onboarding_step} · {row.country ?? "-"} ·{" "}
            {fmtDate(row.created_at)}
            {row.access_granted_at ? " · Google access works" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="compact"
            variant="outline"
            disabled={busy}
            onClick={() => void conciergeToggle(!row.concierge)}
          >
            {row.concierge ? "Concierge off" : "Concierge on"}
          </Button>
          {row.concierge ? (
            <Button size="compact" variant="outline" disabled={busy} onClick={() => void convert()}>
              Convert to Google access
            </Button>
          ) : null}
          {row.access_granted_at && !row.concierge ? (
            <Button
              size="compact"
              variant="outline"
              disabled={busy}
              onClick={() => void grantTrial()}
            >
              Give Pro trial
            </Button>
          ) : null}
          <Button size="compact" variant="ghost" onClick={() => setDiag((v) => !v)}>
            {diag ? "Hide diagnostics" : "Diagnostics"}
          </Button>
        </div>
      </div>
      {diag ? <BusinessDiagnostics location={row.id} /> : null}
      {msg ? <p className="mt-3 text-small text-text-2">{msg}</p> : null}
    </div>
  );
}
