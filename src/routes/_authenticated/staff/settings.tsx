import { createFileRoute } from "@tanstack/react-router";
import { STAFF_PAGES } from "@/lib/staff-nav";
import { StaffTop } from "@/components/staff/staff-ui";
import { WhatsappStaffCode } from "@/components/staff/whatsapp-staff-code";

export const Route = createFileRoute("/_authenticated/staff/settings")({
  head: () => ({ meta: [{ title: "Settings | Staff | Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <>
      <StaffTop page={STAFF_PAGES.settings} />
      <div className="max-w-2xl">
        <WhatsappStaffCode />
      </div>
    </>
  ),
});
