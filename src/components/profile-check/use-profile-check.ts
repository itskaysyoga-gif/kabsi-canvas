import { useState } from "react";
import {
  CheckError,
  findBusinesses,
  runCheck,
  type FoundBusiness,
  type Snapshot,
} from "@/lib/profile-check";
import { pixelCustom, pixelEvent } from "@/lib/meta-pixel";
import { track } from "@/lib/telemetry";

export type Phase = "find" | "result";

/** State of the free Profile Check, shared by /google-profile-check, the homepage hero and onboarding steps 1 and 2. */
export function useProfileCheck(source: "tool" | "onboarding" | "home") {
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
    // 20.1: the scan starts when the visitor asks for their business ("See your map").
    track("free_scan_started", { source });
    pixelCustom("FreeScanStarted");
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
      // 20.1 and 20.4: the result is on screen.
      track("free_scan_completed", { source });
      pixelEvent("Lead", { content_name: "free_scan" });
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
