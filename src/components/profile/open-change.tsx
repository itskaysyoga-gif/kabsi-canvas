import { useState } from "react";
import { fmtDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { contentCall } from "@/lib/reviews";
import { track } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { rowLabel as label, type Change } from "@/lib/profile-rows";
import type { Access } from "@/lib/team";

// The card for one change Google Protection found (K-19): what you approved next to what Google shows now, and the two
// decisions. Stacked on a phone. Nothing is sent to Google unless the owner chooses "Keep my information".
// K-19, K-64, K-116.2, K-117: these need the owner, signed in, and carry the warning.
const HIGH_RISK = ["name", "address", "main_category", "open_status", "map_pin"];
const VERIFY_WARNING = "Changing this can make Google ask you to verify your business again.";
const WHO: Record<string, string> = {
  google_update: "Google changed this itself, or accepted a suggestion from the public.",
  scheduled_check: "We don't know who changed it.",
  notification: "Google told Kabsi about this change.",
};
export function OpenChange({
  change,
  access,
  lead,
  onDone,
}: {
  change: Change;
  access: Access | undefined;
  lead: boolean;
  onDone: () => unknown;
}) {
  const [busy, setBusy] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState("");
  const confirmed = !!change.previous_fact_id;
  const risky = HIGH_RISK.includes(change.field);
  const googleRight = change.recommend === "accept";
  // K-16: the owner always; a manager only for what the owner allowed, and never name, address, main category, open status
  // or map pin. Everyone else reads the card and the owner decides.
  const mayDecide = !!access?.approve.profile_change && (!risky || access.role === "owner");
  async function decide(decision: "accept" | "reject") {
    setBusy(decision);
    setErr("");
    try {
      // A third conflict in 30 days comes back as "support": the history then says Kabsi's team asks Google.
      await contentCall({ do: "shield_decide", change_id: change.id, decision });
      track(decision === "reject" ? "shield_reverted" : "shield_kept", { channel: "dashboard" });
      onDone();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Something went wrong. Nothing changed.");
    }
    setBusy("");
  }
  const before = change.previous_value?.display || "(empty)";
  const now = change.google_value?.display || "(empty)";
  return (
    <article className="rounded-large border-2 border-kb-black bg-kb-white p-6">
      <p className="font-bold">{label(change.field)} changed on Google</p>
      <p className="mt-1 text-sm text-kb-stone">{fmtDateTime(change.detected_at)}</p>
      {change.explanation ? <p className="mt-3 leading-7">{change.explanation}</p> : null}
      <p className="mt-1 text-sm text-kb-stone">{WHO[change.source] ?? WHO["scheduled_check"]}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-card bg-kb-sand p-3">
          <p className="text-xs font-bold uppercase text-kb-stone">
            {confirmed ? "You approved" : "Not yet confirmed by you"}
          </p>
          <p dir="auto" className="mt-1">
            {before}
          </p>
        </div>
        <div className="rounded-card bg-kb-sand p-3">
          <p className="text-xs font-bold uppercase text-kb-stone">Google shows now</p>
          <p dir="auto" className="mt-1">
            {now}
          </p>
        </div>
      </div>
      {googleRight && change.recommend_reason ? (
        <p className="mt-4 rounded-card bg-kb-sand p-3 text-sm">
          <span className="font-bold">Kabsi recommends “Google is right”.</span>{" "}
          {change.recommend_reason}
        </p>
      ) : null}
      {risky ? <p className="mt-3 text-sm text-kb-stone">{VERIFY_WARNING}</p> : null}
      {!confirmed ? (
        <p className="mt-3 text-sm text-kb-stone">
          You have not confirmed this detail yet, so Kabsi will not put the old value back.
        </p>
      ) : null}
      {err ? (
        <p className="mt-3 text-sm text-kb-red" role="alert">
          {err}
        </p>
      ) : null}
      {access && !mayDecide ? (
        <p
          className="mt-4 rounded-card bg-kb-sand p-3 text-sm leading-6 text-kb-stone"
          role="status"
        >
          The owner decides this one.
        </p>
      ) : null}
      <div className={cn("mt-5 flex flex-wrap gap-2", access && !mayDecide && "hidden")}>
        {/* One primary button: the recommended choice, or "Keep my information" when Kabsi has no view. */}
        {confirmed && !googleRight ? (
          <>
            <Button
              variant={lead ? "primary" : "secondary"}
              className="w-full sm:w-auto"
              disabled={!!busy}
              onClick={() => setConfirm(true)}
            >
              {busy === "reject" ? "Saving…" : "Keep my information"}
            </Button>
            <Button variant="ghost" disabled={!!busy} onClick={() => void decide("accept")}>
              {busy === "accept" ? "Saving…" : "Google is right"}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant={lead ? "primary" : "secondary"}
              className="w-full sm:w-auto"
              disabled={!!busy}
              onClick={() => void decide("accept")}
            >
              {busy === "accept" ? "Saving…" : "Google is right"}
            </Button>
            {confirmed ? (
              <Button variant="ghost" disabled={!!busy} onClick={() => setConfirm(true)}>
                {busy === "reject" ? "Saving…" : "Keep my information"}
              </Button>
            ) : null}
          </>
        )}
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Keep your {label(change.field).toLowerCase()} on Google?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Kabsi sends your approved value to Google: {before}.
              {googleRight && change.recommend_reason ? ` ${change.recommend_reason}` : ""}
              {risky ? ` ${VERIFY_WARNING}` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={() => void decide("reject")}>
              Keep my information
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
