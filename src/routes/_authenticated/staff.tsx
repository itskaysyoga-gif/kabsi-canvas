import { useState } from "react";
import { fmtDate } from "@/lib/format";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layouts/app-layout";
import { supabase } from "@/lib/supabase";
import { amStaff } from "@/lib/reviews";
import { OpsPanel } from "@/components/staff/ops-panel";
import { OperationsPanel } from "@/components/staff/operations-panel";
import { BusinessDiagnostics, SystemHealthPanel } from "@/components/staff/system-health-panel";
import { ChatsPanel } from "@/components/staff/chats-panel";
import { ConciergePanel } from "@/components/staff/concierge-panel";
import { FollowupsPanel } from "@/components/staff/followups-panel";
import { WhatsappStaffCode } from "@/components/staff/whatsapp-staff-code";
import { FoundingPanel } from "@/components/staff/founding-panel";
import { PartnersPanel } from "@/components/staff/partners-panel";
import { convertConcierge, setConcierge } from "@/lib/concierge";
import { CostsPanel } from "@/components/staff/costs-panel";
import { Button, STAFF_CARD, STAFF_H2, STAFF_ITEM } from "@/components/staff/staff-ui";
import { AccountTop } from "@/components/kabsi/d3-account";

// Staff workspace: the operations view (Sec 2), follow-ups, concierge, chats, Founding 25 (with the V4 start checklist) and Kabsi Partners, system
// and job health, costs (data providers and AI Visibility by provider), the WhatsApp staff code, and every business. There is no
// manual payment confirmation here (K-124, P0.8-01): money is recorded only by the Creem webhook (P0.4-07).
export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({ meta: [{ title: "Staff | Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: StaffPage,
});

type Row = {
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

async function allLocations(): Promise<Row[]> {
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

function StaffPage() {
  const staff = useQuery({ queryKey: ["am-staff"], queryFn: amStaff, staleTime: Infinity });
  const rows = useQuery({
    queryKey: ["staff-locations"],
    queryFn: allLocations,
    enabled: staff.data === true,
  });
  return (
    <AppLayout area="staff">
      <AccountTop
        title="Staff"
        lead="For the Kabsi team only. Nothing here is published without the owner's yes."
        tabs={false}
      />
      {staff.isLoading ? <p className="text-text-2">Loading</p> : null}
      {staff.data === false ? (
        <p className="text-text-2">This page is for the Kabsi team only.</p>
      ) : null}
      {staff.data ? (
        <>
          <nav
            aria-label="Staff panels"
            className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0"
          >
            <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
              {JUMPS.map(([id, label]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="press inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-small font-bold text-text-1 hover:bg-surface-2"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="space-y-5">
            <OperationsPanel />
            <div id="followups" className="scroll-mt-24">
              <FollowupsPanel />
            </div>
            <div id="concierge" className="scroll-mt-24">
              <ConciergePanel />
            </div>
            <div id="chats" className="scroll-mt-24">
              <ChatsPanel />
            </div>
            <div id="founding" className="scroll-mt-24">
              <FoundingPanel businesses={rows.data ?? []} />
            </div>
            <div id="partners" className="scroll-mt-24">
              <PartnersPanel />
            </div>
            <CostsPanel />
            <SystemHealthPanel />
            <div id="jobs" className="scroll-mt-24">
              <OpsPanel />
            </div>
            <WhatsappStaffCode />
            <section id="businesses" className={STAFF_CARD}>
              <h2 className={STAFF_H2}>Businesses</h2>
              <p className="mt-1 text-small text-text-2">Newest first.</p>
              <div className="mt-4 space-y-3">
                {rows.isLoading ? <p className="text-text-2">Loading businesses</p> : null}
                {rows.data?.length === 0 ? <p className="text-text-2">No businesses yet.</p> : null}
                {rows.data?.map((row) => (
                  <LocationRow key={row.id} row={row} />
                ))}
              </div>
            </section>
          </div>
        </>
      ) : null}
    </AppLayout>
  );
}

const JUMPS: [string, string][] = [
  ["operations", "Operations"],
  ["followups", "Follow-ups"],
  ["concierge", "Concierge"],
  ["chats", "Chats"],
  ["founding", "Founding 25"],
  ["partners", "Partners"],
  ["costs", "Costs"],
  ["system-health", "System health"],
  ["jobs", "Jobs"],
  ["businesses", "Businesses"],
];

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
          <p className="truncate font-bold">{row.name}</p>
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
