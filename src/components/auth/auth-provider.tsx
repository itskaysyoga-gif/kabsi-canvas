import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { clearAssistantChat } from "@/lib/assistant-storage";
import { identify, isPrivatePath } from "@/lib/telemetry";
import { saveSignupAttribution } from "@/lib/attribution";
import { awayVerdict, clearSeen, isStaffPath, lastSeen, touch } from "@/lib/idle";
import { hasStoredSession, signInInUrl, SUPABASE_READY_EVENT } from "@/lib/stored-session";
import { resetSessionEnded } from "@/lib/session-ended";
import { setSignedOutReason, takeSignedOutReason } from "@/lib/signed-out";

/** The key supabase-js keeps the session under (not the code verifier of a Google sign-in in flight). */
const SESSION_KEY = /^sb-.+-auth-token$/;
/** Pages behind RequireAuth, which sends a signed-out visitor to the log in page itself. */
const GUARDED = /^\/(app|staff|start)(\/|$)/;

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** Whether the signed-in person is Kabsi staff (is_staff), null until known. The website's Dashboard link uses it. */
  isStaff: boolean | null;
  /** Signs out on this device. Home then says "You are signed out."; `quiet` leaves no line (the session-ended gate). */
  signOut: (opts?: { quiet?: boolean }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [wanted, setWanted] = useState(false);
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
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
      // No session on this device: an old last-visit time must not judge the next person who signs in.
      if (!data.session) clearSeen();
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
      // Signed out: this device forgets the last visit, so the next person starts their own 30 days.
      if (event === "SIGNED_OUT") clearSeen();
      // A fresh sign-in clears "Your session ended" (session-ended.ts).
      if (event === "SIGNED_IN") {
        resetSessionEnded();
        // A sign-in forgets an earlier sign-out's reason, so a later redirect is not mistaken for Log out.
        if (nextSession) takeSignedOutReason();
      }
      lastUser = nextUser;
      setSession(nextSession);
      setLoading(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client, queryClient]);

  // Signing out in one tab signs out the others (App 4, 30.31 item 1): another tab removed the stored session, so this
  // tab drops its copy too and shows the signed-out Home, not a page that would refuse every call.
  useEffect(() => {
    if (!client) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || (SESSION_KEY.test(e.key) && e.newValue === null)) {
        if (e.key === null && hasStoredSession()) return;
        setSignedOutReason("you");
        void client.auth.signOut({ scope: "local" });
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [client]);

  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!userId || !client) {
      setIsStaff(null);
      return;
    }
    let active = true;
    let timer = 0;
    // No answer is not "not staff": it stays unknown and is asked again, so a later answer still applies the 12 hours (App 4 review).
    const ask = (tries: number) => {
      void client.rpc("is_staff").then(({ data, error }) => {
        if (!active) return;
        if (error) {
          if (tries < 3) timer = window.setTimeout(() => ask(tries + 1), 3000);
          return;
        }
        setIsStaff(data === true);
      });
    };
    ask(1);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [userId, client]);
  useEffect(() => {
    if (!loading) identify(userId);
    // Where a new account came from, saved on the server once (P0.6-02).
    if (!loading && userId) void saveSignupAttribution(userId);
  }, [loading, userId]);

  // How long a sign-in lasts (App 4, 30.31 item 2): 30 days after the last visit for an owner, 12 hours after the last
  // staff page visit on staff pages for staff (idle.ts). Judged as soon as the session is read, before this visit is
  // recorded, again when the staff answer comes in, on every page change, when the tab comes back and every 5 minutes.
  // A sign-out for time away is local to this device and leaves the reason, so the log in page says why; on a website
  // page the log in page opens (the dashboard's own guard does that for its pages, keeping the page to come back to).
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const awayOut = useRef<(() => void) | null>(null);
  const router = useRouter();
  useEffect(() => {
    if (!userId || !client) {
      awayOut.current = null;
      return;
    }
    let stopped = false;
    const staffPage = () => isStaff === true && isStaffPath(pathRef.current);
    const judge = () => {
      if (stopped) return true;
      const verdict = awayVerdict(lastSeen(), Date.now(), {
        staff: isStaff === true,
        pathname: pathRef.current,
        staffSeen: lastSeen(true),
      });
      if (!verdict) return false;
      stopped = true;
      setSignedOutReason(verdict);
      clearSeen();
      void client.auth.signOut({ scope: "local" }).then(() => {
        if (!GUARDED.test(pathRef.current)) void router.navigate({ to: "/login" });
      });
      return true;
    };
    const visit = () => {
      if (judge()) return;
      // On a staff page nothing is recorded until the staff answer is in, so the 12 hours are judged first.
      if (isStaff === null && isStaffPath(pathRef.current)) return;
      const now = Date.now();
      touch(now);
      if (staffPage()) touch(now, true);
    };
    awayOut.current = visit;
    visit();
    const onVisible = () => {
      if (document.visibilityState === "visible") visit();
    };
    window.addEventListener("click", visit, true);
    window.addEventListener("keydown", visit, true);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(judge, 300_000);
    return () => {
      stopped = true;
      awayOut.current = null;
      window.removeEventListener("click", visit, true);
      window.removeEventListener("keydown", visit, true);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [userId, client, isStaff, router]);
  // A page change is a visit too, judged first (a staff page has the shorter time).
  useEffect(() => {
    awayOut.current?.();
  }, [pathname]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      isStaff,
      signOut: async (opts?: { quiet?: boolean }) => {
        // Local scope: signing out here doesn't sign you out on your other devices. Home then says "You are signed out."
        const { supabase } = await import("@/lib/supabase");
        const { error } = await supabase.auth.signOut({ scope: "local" });
        if (error) throw error;
        if (!opts?.quiet) setSignedOutReason("you");
      },
    }),
    [isStaff, loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
