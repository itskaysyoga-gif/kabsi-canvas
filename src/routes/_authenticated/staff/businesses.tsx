import { createFileRoute } from "@tanstack/react-router";
import { STAFF_PAGES } from "@/lib/staff-nav";
import { StaffTop } from "@/components/staff/staff-ui";
import { BusinessesPanel } from "@/components/staff/businesses-panel";

export const Route = createFileRoute("/_authenticated/staff/businesses")({
  head: () => ({ meta: [{ title: "Businesses | Staff | Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <>
      <StaffTop page={STAFF_PAGES.businesses} />
      <BusinessesPanel />
    </>
  ),
});
