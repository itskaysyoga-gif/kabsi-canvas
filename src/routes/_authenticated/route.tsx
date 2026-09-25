import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RequireAuth } from "@/components/auth/require-auth";
export const Route = createFileRoute("/_authenticated")({ ssr: false, component: ProtectedLayout });
function ProtectedLayout() { return <RequireAuth><Outlet /></RequireAuth>; }
