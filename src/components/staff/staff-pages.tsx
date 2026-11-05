// The six staff pages under /staff/$page (App 5, master plan 30.33 item 3). They live in one route, so the route tree that
// every page of the website loads grows by one entry, not six (the speed gate holds Home's script at 205 KB).
import { BusinessesPanel, useStaffLocations } from "@/components/staff/businesses-panel";
import { ChatsPanel } from "@/components/staff/chats-panel";
import { ConciergePanel } from "@/components/staff/concierge-panel";
import { CostsPanel } from "@/components/staff/costs-panel";
import { EvidencePanel } from "@/components/staff/evidence-panel";
import { FollowupsPanel } from "@/components/staff/followups-panel";
import { FoundingPanel } from "@/components/staff/founding-panel";
import { OperationsPanel } from "@/components/staff/operations-panel";
import { OpsPanel } from "@/components/staff/ops-panel";
import { PartnersPanel } from "@/components/staff/partners-panel";
import { PanelChips, STAFF_CARD, StaffTop, usePanelChips } from "@/components/staff/staff-ui";
import { SystemHealthPanel } from "@/components/staff/system-health-panel";
import { ValidationPanel } from "@/components/staff/validation-panel";
import { WhatsappStaffCode } from "@/components/staff/whatsapp-staff-code";
import { STAFF_PAGES } from "@/lib/staff-nav";

function BusinessesPage() {
  return (
    <>
      <StaffTop page={STAFF_PAGES.businesses} />
      <BusinessesPanel />
    </>
  );
}

const CONVERSATIONS_IDS = ["chats", "followups", "concierge"] as const;

function Conversations() {
  const p = usePanelChips(CONVERSATIONS_IDS);
  return (
    <>
      <StaffTop page={STAFF_PAGES.conversations} />
      <PanelChips
        value={p.show}
        onChange={p.set}
        options={[
          { value: "chats", label: "Chats with Nora" },
          { value: "followups", label: "Follow-ups" },
          { value: "concierge", label: "Concierge" },
        ]}
      />
      <div className="space-y-5">
        {p.on("chats") ? (
          <div id="chats" className="scroll-mt-24">
            <ChatsPanel />
          </div>
        ) : null}
        {p.on("followups") ? (
          <div id="followups" className="scroll-mt-24">
            <FollowupsPanel />
          </div>
        ) : null}
        {p.on("concierge") ? (
          <div id="concierge" className="scroll-mt-24">
            <ConciergePanel />
          </div>
        ) : null}
      </div>
    </>
  );
}

const PROGRAMS_IDS = ["founding", "partners"] as const;

function Programs() {
  const p = usePanelChips(PROGRAMS_IDS);
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

const SYSTEM_IDS = ["operations", "health", "jobs", "validation", "evidence"] as const;

function SystemPage() {
  const p = usePanelChips(SYSTEM_IDS);
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

function CostsPage() {
  return (
    <>
      <StaffTop page={STAFF_PAGES.costs} />
      <CostsPanel />
    </>
  );
}

function SettingsPage() {
  return (
    <>
      <StaffTop page={STAFF_PAGES.settings} />
      <div className="max-w-2xl">
        <WhatsappStaffCode />
      </div>
    </>
  );
}

/** The page for each address under /staff; Today is /staff itself. */
export const STAFF_SUB_PAGES = {
  businesses: BusinessesPage,
  conversations: Conversations,
  programs: Programs,
  system: SystemPage,
  costs: CostsPage,
  settings: SettingsPage,
} as const;
