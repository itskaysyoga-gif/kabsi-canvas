import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppLayout } from "@/components/layouts/app-layout";
export const Route = createFileRoute("/_authenticated/app")({ component: Layout });
function Layout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
