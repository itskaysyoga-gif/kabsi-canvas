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
import { ChangeCardView, VERIFY_WARNING, changeFlags } from "@/components/profile/change-card";
import type { Access } from "@/lib/team";

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
  const { confirmed, risky, googleRight } = changeFlags(change);
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
    <ChangeCardView change={change} when={fmtDateTime(change.detected_at)}>
      {err ? (
        <p className="mt-3 text-small text-bad" role="alert">
          {err}
        </p>
      ) : null}
      {access && !mayDecide ? (
        <p
          className="mt-4 rounded-card bg-surface-2 p-3 text-small leading-6 text-text-2"
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
    </ChangeCardView>
  );
}
