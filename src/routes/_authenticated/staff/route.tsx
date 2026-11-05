import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layouts/app-layout";
import { amStaff } from "@/lib/reviews";
import { NotFoundPage } from "@/components/kabsi/status-pages";
import { ErrorState } from "@/components/kabsi/ui";
import { StaffLoading } from "@/components/staff/staff-ui";

// The staff workspace (App 5, master plan 30.33 item 3): its own menu in the shell (src/lib/staff-nav.ts) and one page
// for each part of the work: Today, Businesses, Conversations, Programs, System, Costs and Settings. Every panel of the
// old single page moved whole, with the same queries and actions. There is no manual payment confirmation here (K-124,
// P0.8-01): money is recorded only by the Creem webhook (P0.4-07).
// Every page under /staff is refused to a session that is not Kabsi staff exactly as App 4 made it (30.31 item 3): the
// not-found page, and no staff panel is mounted, so no staff read is even asked for. A failed is_staff read says the
// page did not load, so real staff on a bad connection are not told the page does not exist (App 4, E-05).
export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({ meta: [{ title: "Staff | Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: StaffLayout,
});

function StaffLayout() {
  const staff = useQuery({ queryKey: ["am-staff"], queryFn: amStaff, staleTime: Infinity });
  if (staff.data === false) return <NotFoundPage />;
  return (
    <AppLayout area="staff">
      {staff.isLoading ? <StaffLoading what="the staff pages" /> : null}
      {staff.isError ? (
        <ErrorState page title="This page did not load." onRetry={() => void staff.refetch()}>
          Nothing you did. Try again in a minute.
        </ErrorState>
      ) : null}
      {staff.data === true ? <Outlet /> : null}
    </AppLayout>
  );
}
