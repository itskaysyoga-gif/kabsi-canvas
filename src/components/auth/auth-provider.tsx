import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { clearAssistantChat } from "@/lib/assistant-storage";
import { identify } from "@/lib/telemetry";
import { clearSeen, isIdle, lastSeen, OWNER_IDLE_MS, STAFF_IDLE_MS, touch } from "@/lib/idle";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    let lastUser: string | null = null;
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // A different person on this device must never see the previous person's data.
      const nextUser = nextSession?.user.id ?? null;
      if (event === "SIGNED_OUT" || (lastUser && nextUser && nextUser !== lastUser)) {
        queryClient.clear();
        clearAssistantChat();
      }
      lastUser = nextUser;
      setSession(nextSession);
      setLoading(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient]);

  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!loading) identify(userId);
  }, [loading, userId]);

  // Idle sign-out: staff after 12 hours, owners after 30 days (D301).
  useEffect(() => {
    if (!userId) {
      clearSeen();
      return;
    }
    let limit = OWNER_IDLE_MS;
    let stopped = false;
    const seenAtStart = lastSeen();
    const check = () => {
      if (!stopped && isIdle(limit)) void supabase.auth.signOut({ scope: "local" });
    };
    void supabase.rpc("is_staff").then(({ data }) => {
      if (data === true) {
        limit = STAFF_IDLE_MS;
        // Judge by the stamp from before this page load touched it.
        if (seenAtStart !== null && Date.now() - seenAtStart > limit && !stopped)
          void supabase.auth.signOut({ scope: "local" });
      }
      check();
    });
    check();
    let last = 0;
    const mark = () => {
      const now = Date.now();
      if (now - last > 60_000) {
        last = now;
        touch();
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        check();
        mark();
      }
    };
    mark();
    window.addEventListener("click", mark);
    window.addEventListener("keydown", mark);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(check, 300_000);
    return () => {
      stopped = true;
      window.removeEventListener("click", mark);
      window.removeEventListener("keydown", mark);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [userId]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signOut: async () => {
        // Local scope: signing out here doesn't sign you out on your other devices.
        const { error } = await supabase.auth.signOut({ scope: "local" });
        if (error) throw error;
      },
    }),
    [loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
