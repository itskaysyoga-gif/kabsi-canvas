import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { clearAssistantChat } from "@/lib/assistant-storage";
import { identify, isPrivatePath } from "@/lib/telemetry";
import { saveSignupAttribution } from "@/lib/attribution";
import { clearSeen, isIdle, lastSeen, OWNER_IDLE_MS, STAFF_IDLE_MS, touch } from "@/lib/idle";
import { hasStoredSession, signInInUrl, SUPABASE_READY_EVENT } from "@/lib/stored-session";
import { resetSessionEnded } from "@/lib/session-ended";

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
  const [wanted, setWanted] = useState(false);
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const queryClient = useQueryClient();
  const pathname = useLocation({ select: (l) => l.pathname });

  // supabase-js is about 55 KB compressed and a public page does not need it to be seen. It loads when the page is
  // private (the app, sign-in, setup), when this browser holds a session or a sign-in is returning in the address, and
  // when any other part of the page loads it (the sign-up sheet): then the provider follows. A visitor with none of
  // these is signed out, which is known at once (lane R, 22 Oct 2026, performance).
  useEffect(() => {
    if (wanted) return;
    if (
      isPrivatePath(pathname) ||
      hasStoredSession() ||
      signInInUrl(window.location.search, window.location.hash)
    )
      setWanted(true);
    else setLoading(false);
  }, [pathname, wanted]);
  useEffect(() => {
    const follow = () => setWanted(true);
    window.addEventListener(SUPABASE_READY_EVENT, follow);
    if ((window as { __kabsiSupabase?: boolean }).__kabsiSupabase) follow();
    return () => window.removeEventListener(SUPABASE_READY_EVENT, follow);
  }, []);
  useEffect(() => {
    if (!wanted) return;
    let active = true;
    setLoading(true);
    void import("@/lib/supabase").then(({ supabase }) => {
      if (active) setClient(supabase);
    });
    return () => {
      active = false;
    };
  }, [wanted]);

  useEffect(() => {
    if (!client) return;
    let active = true;
    void client.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    let lastUser: string | null = null;
    const { data } = client.auth.onAuthStateChange((event, nextSession) => {
      // A different person on this device must never see the previous person's data.
      const nextUser = nextSession?.user.id ?? null;
      if (event === "SIGNED_OUT" || (lastUser && nextUser && nextUser !== lastUser)) {
        queryClient.clear();
        clearAssistantChat();
      }
      // A fresh sign-in clears "Your session ended" (session-ended.ts).
      if (event === "SIGNED_IN") resetSessionEnded();
      lastUser = nextUser;
      setSession(nextSession);
      setLoading(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client, queryClient]);

  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!loading) identify(userId);
    // Where a new account came from, saved on the server once (P0.6-02).
    if (!loading && userId) void saveSignupAttribution(userId);
  }, [loading, userId]);

  // Idle sign-out: staff after 12 hours, owners after 30 days (D301).
  useEffect(() => {
    if (!userId || !client) {
      if (!userId) clearSeen();
      return;
    }
    let limit = OWNER_IDLE_MS;
    let stopped = false;
    const seenAtStart = lastSeen();
    const check = () => {
      if (!stopped && isIdle(limit)) void client.auth.signOut({ scope: "local" });
    };
    void client.rpc("is_staff").then(({ data }) => {
      if (data === true) {
        limit = STAFF_IDLE_MS;
        // Judge by the stamp from before this page load touched it.
        if (seenAtStart !== null && Date.now() - seenAtStart > limit && !stopped)
          void client.auth.signOut({ scope: "local" });
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
  }, [userId, client]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signOut: async () => {
        // Local scope: signing out here doesn't sign you out on your other devices.
        const { supabase } = await import("@/lib/supabase");
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
