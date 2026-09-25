import { useEffect, useRef, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/components/auth/auth-provider";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const redirected = useRef(false);

  useEffect(() => {
    // Redirect once. Without the guard, this effect re-runs while the router is already on /login
    // and wraps /login inside ?next= again and again (an endless redirect loop).
    if (loading || user || redirected.current || location.pathname.startsWith("/login")) return;
    redirected.current = true;
    const next = `${location.pathname}${location.searchStr}${location.hash ? `#${location.hash}` : ""}`;
    void navigate({ to: "/login", search: { next }, replace: true });
  }, [loading, location.hash, location.pathname, location.searchStr, navigate, user]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-kb-sand text-kb-stone">Loading…</div>
    );
  }
  return children;
}
