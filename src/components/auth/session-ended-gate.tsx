import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { SESSION_ENDED, SESSION_ENDED_EVENT, sessionHasEnded } from "@/lib/session-ended";

// Covers the signed-in app the moment a call finds the session no longer accepted (session-ended.ts): one message and
// one button to sign in again, so no other button can be tapped while nothing would be sent.
export function SessionEndedGate() {
  const [ended, setEnded] = useState(sessionHasEnded);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const on = () => setEnded(true);
    window.addEventListener(SESSION_ENDED_EVENT, on);
    return () => window.removeEventListener(SESSION_ENDED_EVENT, on);
  }, []);
  if (!ended) return null;
  async function again() {
    const next = `${location.pathname}${location.searchStr}`;
    await signOut().catch(() => undefined);
    void navigate({ to: "/login", search: { next }, replace: true });
  }
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-ended-title"
      className="fixed inset-0 z-50 grid place-items-center bg-kb-sand/95 p-4"
    >
      <div className="w-full max-w-sm rounded-large bg-kb-white p-6 text-center shadow-kb">
        <h2 id="session-ended-title" className="font-display text-2xl leading-tight">
          {SESSION_ENDED}
        </h2>
        <p className="mt-2 text-sm text-kb-stone">Nothing was sent. Sign in and try again.</p>
        <Button className="mt-4 w-full" onClick={() => void again()}>
          Sign in again
        </Button>
      </div>
    </div>
  );
}
