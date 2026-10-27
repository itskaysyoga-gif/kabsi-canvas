import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatusPill } from "@/components/ui/status-pill";
import { accessPill } from "@/lib/access-status";
import { loadAccessState, loadGoogleLive, type Location } from "@/lib/onboarding";

/** Reads google_connections.access_state every 30 seconds and says it in words. Calls onConnected once when access works. */
export function AccessStatus({
  location,
  onConnected,
}: {
  location: Location;
  onConnected?: () => void;
}) {
  const state = useQuery({
    queryKey: ["access-state", location.id],
    queryFn: () => loadAccessState(location.id),
    refetchInterval: 30_000,
  });
  const live = useQuery({
    queryKey: ["google-live"],
    queryFn: loadGoogleLive,
    staleTime: Infinity,
  });
  const pill = accessPill({
    state: state.data ?? "none",
    consented: Boolean(location.consent_at),
    live: live.data === true && !location.concierge,
  });
  const connected = pill?.connected === true;
  useEffect(() => {
    if (connected) onConnected?.();
  }, [connected]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!pill) return null;
  return (
    <div aria-live="polite" data-testid="access-pill" className="mt-6">
      <StatusPill tone={pill.tone} className="max-w-full whitespace-normal text-left">
        {pill.text}
      </StatusPill>
      {pill.detail ? <p className="mt-2 text-small leading-6 text-text-2">{pill.detail}</p> : null}
    </div>
  );
}
