import { useState } from "react";
import {
  CheckError,
  findBusinesses,
  runCheck,
  type FoundBusiness,
  type Snapshot,
} from "@/lib/profile-check";
import { track } from "@/lib/telemetry";

export type Phase = "find" | "result";

/** State of the free Profile Check, shared by /google-profile-check and onboarding steps 1 and 2. */
export function useProfileCheck(source: "tool" | "onboarding") {
  const [phase, setPhase] = useState<Phase>("find");
  const [results, setResults] = useState<FoundBusiness[] | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CheckError | null>(null);

  const fail = (e: unknown) =>
    setError(
      e instanceof CheckError ? e : new CheckError("failed", "That didn't work. Please try again."),
    );

  async function search(query: string, token: string) {
    setError(null);
    setBusy(true);
    try {
      setResults(await findBusinesses(query, token));
    } catch (e) {
      setResults(null);
      fail(e);
    }
    setBusy(false);
  }

  async function pick(place: FoundBusiness, token: string) {
    setError(null);
    setBusy(true);
    try {
      setSnapshot(await runCheck(place.place_id, token));
      setPhase("result");
      // G-44: the business is found, then its snapshot is on screen.
      track("business_found", { source });
      track("snapshot_viewed", { source });
    } catch (e) {
      fail(e);
    }
    setBusy(false);
  }

  function again() {
    setPhase("find");
    setResults(null);
    setSnapshot(null);
    setError(null);
  }

  return {
    phase,
    results,
    snapshot,
    busy,
    error,
    backSoon: error?.code === "back_soon",
    search,
    pick,
    again,
  };
}
export type ProfileCheckState = ReturnType<typeof useProfileCheck>;
