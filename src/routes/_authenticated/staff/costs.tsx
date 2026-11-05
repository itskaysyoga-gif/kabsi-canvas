import { createFileRoute } from "@tanstack/react-router";
import { STAFF_PAGES } from "@/lib/staff-nav";
import { StaffTop } from "@/components/staff/staff-ui";
import { CostsPanel } from "@/components/staff/costs-panel";

export const Route = createFileRoute("/_authenticated/staff/costs")({
  head: () => ({ meta: [{ title: "Costs | Staff | Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <>
      <StaffTop page={STAFF_PAGES.costs} />
      <CostsPanel />
    </>
  ),
});
