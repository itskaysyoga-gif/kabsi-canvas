import { useEffect, useState } from "react";
import { useAccountLink } from "@/components/auth/use-account-link";
import { startFreeDoor, type StartFreeDoor } from "@/lib/start-free";

/**
 * Launch 2 part C (30.36 item 8): where "Start free" goes for this person. The number of businesses is read only for a
 * signed-in person (the sign-in client is already loaded then); a visitor never loads it.
 */
export function useStartFree(): StartFreeDoor {
  const { state } = useAccountLink();
  const [businesses, setBusinesses] = useState<number | null>(null);
  useEffect(() => {
    if (state !== "in") return;
    let live = true;
    void import("@/lib/onboarding")
      .then((m) => m.myLocations())
      .then((l) => live && setBusinesses(l.length))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [state]);
  return startFreeDoor(state, businesses);
}
