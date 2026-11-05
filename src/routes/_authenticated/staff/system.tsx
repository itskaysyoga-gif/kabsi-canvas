import { createFileRoute } from "@tanstack/react-router";
import { STAFF_PAGES } from "@/lib/staff-nav";
import { PanelChips, STAFF_CARD, StaffTop, usePanelChips } from "@/components/staff/staff-ui";
import { OperationsPanel } from "@/components/staff/operations-panel";
import { SystemHealthPanel } from "@/components/staff/system-health-panel";
import { OpsPanel } from "@/components/staff/ops-panel";
import { ValidationPanel } from "@/components/staff/validation-panel";
import { EvidencePanel } from "@/components/staff/evidence-panel";
import { useStaffLocations } from "@/components/staff/businesses-panel";

export const Route = createFileRoute("/_authenticated/staff/system")({
  head: () => ({
    meta: [{ title: "System | Staff | Kabsi" }, { name: "robots", content: "noindex" }],
  }),
  component: SystemPage,
});

const IDS = ["operations", "health", "jobs", "validation", "evidence"] as const;

function SystemPage() {
  const p = usePanelChips(IDS);
  const rows = useStaffLocations();
  return (
    <>
      <StaffTop page={STAFF_PAGES.system} />
      <PanelChips
        value={p.show}
        onChange={p.set}
        options={[
          { value: "operations", label: "Operations" },
          { value: "health", label: "System health" },
          { value: "jobs", label: "Jobs" },
          { value: "validation", label: "Validation" },
          { value: "evidence", label: "Evidence log" },
        ]}
      />
      <div className="space-y-5">
        {p.on("operations") ? <OperationsPanel /> : null}
        {p.on("health") ? <SystemHealthPanel /> : null}
        {p.on("jobs") ? (
          <div id="jobs" className={STAFF_CARD}>
            <OpsPanel />
          </div>
        ) : null}
        {p.on("validation") ? <ValidationPanel /> : null}
        {p.on("evidence") ? (
          <EvidencePanel businesses={(rows.data ?? []).map((r) => ({ id: r.id, name: r.name }))} />
        ) : null}
      </div>
    </>
  );
}
