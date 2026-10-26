import { useState } from "react";
import { fmtDate } from "@/lib/format";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { amStaff } from "@/lib/reviews";
import { OpsPanel } from "@/components/staff/ops-panel";
import { BusinessDiagnostics, SystemHealthPanel } from "@/components/staff/system-health-panel";
import { ChatsPanel } from "@/components/staff/chats-panel";
import { ConciergePanel } from "@/components/staff/concierge-panel";
import { FollowupsPanel } from "@/components/staff/followups-panel";
import { WhatsappStaffCode } from "@/components/staff/whatsapp-staff-code";
import { FoundingPanel } from "@/components/staff/founding-panel";
import { PartnersPanel } from "@/components/staff/partners-panel";
import { convertConcierge, setConcierge } from "@/lib/concierge";
import { ClipboardCheck as PageGlyph } from "lucide-react";
import { PageIcon } from "@/components/shared/page-icon";

// Staff workspace: follow-ups, concierge, chats, Founding 25 and Kabsi Partners, job health, existing card codes, and every business. There is no
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
};

async function allLocations(): Promise<Row[]> {
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, status, onboarding_step, country, created_at, access_granted_at, concierge")
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
      <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
        <PageIcon icon={<PageGlyph />} />
        <h1 className="font-display text-4xl leading-none sm:text-5xl">Staff</h1>
        {staff.isLoading ? <p className="mt-6 text-kb-stone">Loading…</p> : null}
        {staff.data === false ? (
          <p className="mt-6 text-kb-stone">This page is for the Kabsi team only.</p>
        ) : null}
        {staff.data ? (
          <>
            <FollowupsPanel />
            <ConciergePanel />
            <ChatsPanel />
            <FoundingPanel businesses={rows.data ?? []} />
            <PartnersPanel />
            <div className="mt-8">
              <SystemHealthPanel />
            </div>
            <OpsPanel />
            <WhatsappStaffCode />
            <h2 className="mt-10 text-xl font-bold">Businesses</h2>
            <p className="mt-1 text-sm text-kb-stone">Newest first.</p>
            <div className="mt-4 space-y-4">
              {rows.isLoading ? <p className="text-kb-stone">Loading businesses…</p> : null}
              {rows.data?.length === 0 ? <p className="text-kb-stone">No businesses yet.</p> : null}
              {rows.data?.map((row) => (
                <LocationRow key={row.id} row={row} />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
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
    <div className="rounded-large bg-kb-white p-5 shadow-kb">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold">{row.name}</p>
          <p className="text-sm text-kb-stone">
            {row.status.replace(/_/g, " ")} · step {row.onboarding_step} · {row.country ?? "-"} ·{" "}
            {fmtDate(row.created_at)}
            {row.access_granted_at ? " · Google access ✓" : ""}
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
      {msg ? <p className="mt-3 text-sm text-kb-stone">{msg}</p> : null}
    </div>
  );
}
