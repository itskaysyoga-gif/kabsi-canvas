import { createFileRoute } from "@tanstack/react-router";
import { STAFF_PAGES } from "@/lib/staff-nav";
import { PanelChips, StaffTop, usePanelChips } from "@/components/staff/staff-ui";
import { FoundingPanel } from "@/components/staff/founding-panel";
import { PartnersPanel } from "@/components/staff/partners-panel";
import { useStaffLocations } from "@/components/staff/businesses-panel";

export const Route = createFileRoute("/_authenticated/staff/programs")({
  head: () => ({ meta: [{ title: "Programs | Staff | Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: Programs,
});

const IDS = ["founding", "partners"] as const;

function Programs() {
  const p = usePanelChips(IDS);
  // Founding 25's start checklist finds each linked place's business in the list of every business, as before.
  const rows = useStaffLocations();
  return (
    <>
      <StaffTop page={STAFF_PAGES.programs} />
      <PanelChips
        value={p.show}
        onChange={p.set}
        options={[
          { value: "founding", label: "Founding 25" },
          { value: "partners", label: "Kabsi Partners" },
        ]}
      />
      <div className="space-y-5">
        {p.on("founding") ? (
          <div id="founding" className="scroll-mt-24">
            <FoundingPanel businesses={rows.data ?? []} />
          </div>
        ) : null}
        {p.on("partners") ? (
          <div id="partners" className="scroll-mt-24">
            <PartnersPanel />
          </div>
        ) : null}
      </div>
    </>
  );
}
