import { useState } from "react";
import { fmtDateTime } from "@/lib/format";
import { Button } from "@/components/kabsi/ui";
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
import type { Change } from "@/lib/profile-rows";
import {
  ChangeCardView,
  VERIFY_WARNING,
  changeFlags,
  changeWords,
} from "@/components/profile/change-card";
import type { Access } from "@/lib/team";

export function OpenChange({
  change,
  access,
  lead,
  business,
  onDone,
}: {
  change: Change;
  access: Access | undefined;
  /** The first card on the screen: its recommended choice is the one yellow button. */
  lead: boolean;
  business?: string | null | undefined;
  onDone: () => unknown;
}) {
  const [busy, setBusy] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState("");
  const { confirmed, risky, googleRight } = changeFlags(change);
  const words = changeWords(change.field, business);
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
  // One yellow button: the recommended choice, or the put-back when Kabsi has no view.
  const putBackFirst = confirmed && !googleRight;
  const main = (on: boolean) =>
    on && lead
      ? ({ variant: "primary", "data-main-cta": true } as const)
      : ({ variant: "secondary" } as const);
  const putBack = (
    <Button
      size="md"
      {...main(putBackFirst)}
      className="w-full sm:w-auto"
      loading={busy === "reject"}
      disabled={!!busy}
      onClick={() => setConfirm(true)}
    >
      {words.putBack}
    </Button>
  );
  const keep = (
    <Button
      size="md"
      {...main(!putBackFirst)}
      className="w-full sm:w-auto"
      loading={busy === "accept"}
      disabled={!!busy}
      onClick={() => void decide("accept")}
    >
      {words.keep}
    </Button>
  );
  return (
    <ChangeCardView change={change} when={fmtDateTime(change.detected_at)} business={business}>
      {err ? (
        <p className="mt-3 text-small font-semibold text-bad" role="alert">
          {err}
        </p>
      ) : null}
      {access && !mayDecide ? (
        <p className="mt-4 rounded-inner bg-surface-1 p-3 text-small text-text-2" role="status">
          The owner decides this one.
        </p>
      ) : null}
      <div className={cn("mt-4 flex flex-wrap gap-2", access && !mayDecide && "hidden")}>
        {putBackFirst ? (
          <>
            {putBack}
            {keep}
          </>
        ) : (
          <>
            {keep}
            {confirmed ? putBack : null}
          </>
        )}
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Put your {words.noun} back on Google?</AlertDialogTitle>
            <AlertDialogDescription>
              Kabsi sends your approved {words.noun} to Google: {before}.
              {googleRight && change.recommend_reason ? ` ${change.recommend_reason}` : ""}
              {risky ? ` ${VERIFY_WARNING}` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={() => void decide("reject")}>
              {words.putBack}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ChangeCardView>
  );
}
