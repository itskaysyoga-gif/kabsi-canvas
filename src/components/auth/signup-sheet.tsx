import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { useAuth } from "@/components/auth/auth-provider";
import { keepSnapshot, type KeptSnapshot } from "@/lib/signup";
import { track } from "@/lib/telemetry";

/** The button after the snapshot and the sign-up sheet it opens (P0.4-02, K-91). The snapshot is kept in this browser,
 * so after Google or the email code the owner lands on the next onboarding step with their business already picked. */
export function SaveSnapshotButton({ snapshot, label }: { snapshot: KeptSnapshot; label: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const go = () => void navigate({ to: "/start" });

  return (
    <>
      <Button
        className="mt-4 w-full sm:w-auto"
        onClick={() => {
          keepSnapshot(snapshot);
          track("signup_started", { source: "snapshot" });
          if (user) go();
          else setOpen(true);
        }}
      >
        {label}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[92vh] overflow-y-auto rounded-t-large bg-surface-1 px-5 pb-8 pt-7 sm:mx-auto sm:max-w-md"
        >
          <SheetTitle className="font-display text-h3 leading-tight">
            Save your snapshot and continue
          </SheetTitle>
          <SheetDescription className="mb-5 mt-2 text-body leading-7 text-text-2">
            Create your Kabsi account to keep {snapshot.name} and carry on. No card needed.
          </SheetDescription>
          <SignInPanel next="/start" onDone={go} />
        </SheetContent>
      </Sheet>
    </>
  );
}
