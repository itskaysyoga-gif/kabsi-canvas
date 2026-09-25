import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/components/auth/auth-provider";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      const next = `${location.pathname}${location.searchStr}${location.hash}`;
      void navigate({ to: "/login", search: { next }, replace: true });
    }
  }, [loading, location.hash, location.pathname, location.searchStr, navigate, user]);

  if (loading || !user) {
    return <div className="grid min-h-screen place-items-center bg-kb-sand text-kb-stone">Loading…</div>;
  }
  return children;
}
