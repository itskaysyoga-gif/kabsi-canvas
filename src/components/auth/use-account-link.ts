import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { hasStoredSession } from "@/lib/stored-session";

export type AccountState = "unknown" | "in" | "out";

/**
 * Whether the website shows Log in or Dashboard (App 4, master plan 30.31 item 1). The server render and the first
 * browser paint know nothing ("unknown": the header shows neither word, in the space both take). Then the stored
 * session decides at once, without loading supabase-js; once the session is read, it decides for good. Dashboard goes
 * to /staff for Kabsi staff and to /app for everyone else.
 */
export function useAccountLink(): { state: AccountState; to: "/app" | "/staff" } {
  const { user, loading, isStaff } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [stored, setStored] = useState(false);
  useEffect(() => {
    setStored(hasStoredSession());
    setMounted(true);
  }, []);
  const state: AccountState = !mounted
    ? "unknown"
    : loading
      ? stored
        ? "in"
        : "out"
      : user
        ? "in"
        : "out";
  return { state, to: isStaff ? "/staff" : "/app" };
}
