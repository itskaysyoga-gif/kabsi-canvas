// Add Kabsi as a Manager (/manager-steps). The step states have their own links in development only (d2-parts).
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { KABSI_GROUP_ID } from "@/lib/site";
import { FlowProgress, PageTop, useFlagState } from "./d2-parts";
import { AccessSteps, type AccessState } from "./d5-access";
import { Button, ButtonLink, ErrorState, StatusPill, buttonClass } from "./ui";

const FLOW = ["Find your business", "Your email", "Add Kabsi as a Manager"];

/* ---------- Add Kabsi as a Manager (/manager-steps) ---------- */

// The access steps component (d5-access.tsx) carries the ID, the five steps, the recording and the three states.
// ?state=pending, accepted, checked and problem; the older waiting and works links still open pending and checked.
const MANAGER_STATES = [
  "start",
  "pending",
  "waiting",
  "accepted",
  "checked",
  "works",
  "ask",
  "problem",
] as const;
type ManagerState = (typeof MANAGER_STATES)[number];

export function ManagerSteps() {
  const [state, setState] = useFlagState<ManagerState>("start", MANAGER_STATES);
  const [resent, setResent] = useState(false);
  const s: AccessState =
    state === "pending" || state === "waiting" || state === "problem"
      ? "pending"
      : state === "accepted"
        ? "accepted"
        : state === "checked" || state === "works"
          ? "checked"
          : "steps";

  return (
    <>
      <PageTop
        title="Add Kabsi as a Manager on Google."
        lead="You stay the owner. You can remove Kabsi any time."
      >
        <FlowProgress steps={FLOW} current={2} className="mt-8 max-w-xl" />
      </PageTop>

      <section className="container-kb mt-10">
        {s === "steps" && (
          <div
            className="max-w-2xl rounded-panel border border-line bg-surface-1 p-6 sm:p-8"
            data-main-cta
          >
            <StatusPill tone="info">Not started</StatusPill>
            <p className="mt-4 text-h3">Five taps on Google, and Kabsi can start.</p>
            <p className="mt-2 text-body text-text-2">
              Kabsi checks for your invite by itself. Nothing goes live without your yes.
            </p>
            <div className="mt-6">
              <a href="#how" className={buttonClass("primary")}>
                Show me how
              </a>
            </div>
          </div>
        )}
        {s === "pending" && state !== "problem" && (
          <div className="max-w-2xl rounded-panel border border-line bg-surface-1 p-6 sm:p-8">
            <StatusPill tone="warn">Invite pending</StatusPill>
            <p className="mt-4 flex items-center gap-3 text-h3">
              <LoaderCircle
                className="size-6 shrink-0 animate-[kb-spin_0.9s_linear_infinite]"
                aria-hidden
              />
              Invite sent. Kabsi accepts it within a few minutes.
            </p>
            <p className="mt-2 text-body text-text-2">
              It shows as Pending until Kabsi accepts, usually within minutes. This page updates by
              itself.
            </p>
            <div className="mt-6">
              <Button variant="secondary" onClick={() => setResent(true)}>
                Resend
              </Button>
            </div>
            {resent && (
              <p role="status" className="mt-3 text-small text-ok">
                Sent again.
              </p>
            )}
          </div>
        )}
        {s === "accepted" && (
          <div className="max-w-2xl rounded-panel border border-line bg-surface-1 p-6 sm:p-8">
            <StatusPill tone="info">Accepted</StatusPill>
            <p className="mt-4 text-h3">Kabsi accepted your invite.</p>
            <p className="mt-2 text-body text-text-2">
              It is checking that it can read your profile. This takes about a minute.
            </p>
          </div>
        )}
        {s === "checked" && (
          <div
            className="max-w-2xl rounded-panel border border-line bg-surface-1 p-6 sm:p-8"
            data-main-cta
          >
            <StatusPill tone="ok">Done</StatusPill>
            <p className="mt-4 text-h3">Access works.</p>
            <p className="mt-2 text-body text-text-2">
              Kabsi can now see your Google profile. Nothing has been published.
            </p>
            <div className="mt-6">
              <ButtonLink to="/setup-call">Continue</ButtonLink>
            </div>
          </div>
        )}
        {state === "problem" && (
          <ErrorState
            title="Kabsi cannot see the invite yet."
            onRetry={() => setState("pending")}
            retryLabel="Check again"
            className="max-w-2xl"
          >
            Check that you pasted {KABSI_GROUP_ID} and chose Manager, not Owner. Then tap Add again.
          </ErrorState>
        )}
      </section>

      <section id="how" className="container-kb mt-14 scroll-mt-24 pb-20 lg:pb-28">
        <h2 className="sr-only">How to add Kabsi</h2>
        <AccessSteps state={s} headingLevel="h3" />
        <p className="mt-10 text-small text-text-2">
          Google Business Profile is free from Google. Kabsi is an independent paid service.
        </p>
      </section>
    </>
  );
}
