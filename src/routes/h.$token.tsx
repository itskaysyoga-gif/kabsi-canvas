import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Clock, Undo2 } from "lucide-react";
import { z } from "zod";
import { HolidayAnswerForm } from "@/components/hours/holiday-answer";
import { ConfirmLayout } from "@/components/layouts/confirm-layout";
import { QuietMark, QuietTitle } from "@/components/kabsi/d2-quiet";
import { Button, StatusPill, buttonClass } from "@/components/kabsi/ui";
import { localToday } from "@/lib/hours-format";
import {
  answerHolidayLink,
  loadHolidayLink,
  undoHolidayLink,
  whenWords,
  type HolidayAnswer,
  type HolidayLinkView,
} from "@/lib/holidays";
import { setAnalyticsPaused, track } from "@/lib/telemetry";

// The holiday hours link in the email (P0.5-03, K-131). Opening it never does anything by itself (mail scanners open
// links): the owner chooses, reads what Google will show and confirms. "Normal hours" needs only the link; "Closed" and
// "Custom hours" are the approval of hours, so the person signs in first and comes back here (K-17). After a new approval
// the page counts down 10 seconds with Undo (K-70).
export const Route = createFileRoute("/h/$token")({
  validateSearch: z.object({
    a: z.enum(["normal", "closed", "custom"]).optional().catch(undefined),
  }),
  head: () => ({
    meta: [{ title: "Your holiday hours | Kabsi" }, { name: "robots", content: "noindex" }],
  }),
  component: HolidayLinkPage,
});

const UNDO_SECONDS = 10;

function HolidayLinkPage() {
  const { token } = Route.useParams();
  const { a } = Route.useSearch();
  const navigate = useNavigate();
  const [view, setView] = useState<HolidayLinkView | null>(null);
  const [done, setDone] = useState<HolidayAnswer | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadHolidayLink(token)
      .then((v) => {
        setAnalyticsPaused(v.demo === true);
        setView(v);
      })
      .catch(() => setView({ status: "invalid" }));
  }, [token]);

  useEffect(() => {
    if (pending === null) return;
    if (pending <= 0) {
      setPending(null);
      return;
    }
    const id = setTimeout(() => setPending((s) => (s === null ? s : s - 1)), 1000);
    return () => clearTimeout(id);
  }, [pending]);

  async function undo() {
    setError("");
    setBusy(true);
    try {
      await undoHolidayLink(token);
      setPending(null);
      setDone(null);
      setView(await loadHolidayLink(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
    setBusy(false);
  }

  if (!view)
    return (
      <ConfirmLayout>
        <p className="text-text-2" role="status">
          Loading
        </p>
      </ConfirmLayout>
    );

  const open = (
    <Link to="/app/hours" className={buttonClass("secondary", "md", true) + " mt-6"}>
      Open Hours in Kabsi
    </Link>
  );

  if (view.status === "invalid" || view.status === "expired") {
    return (
      <ConfirmLayout>
        <QuietMark icon={Clock} tone="warn" />
        <QuietTitle lead="You can still answer in Kabsi, under Hours. Nothing is changed until you confirm it.">
          {view.status === "expired" ? "This link has expired." : "This link does not work."}
        </QuietTitle>
        {open}
      </ConfirmLayout>
    );
  }

  const h = view.holiday!;
  if (pending !== null) {
    return (
      <ConfirmLayout demo={view.demo === true}>
        <QuietTitle business={view.business} live>
          Approved.
        </QuietTitle>
        <p className="mt-2 text-body text-text-2" aria-live="polite">
          Changed your mind? Tap Undo in the next {pending} {pending === 1 ? "second" : "seconds"}{" "}
          and nothing reaches Google.
        </p>
        <StatusPill tone="info" className="mt-4">
          Waiting {pending} {pending === 1 ? "second" : "seconds"}
        </StatusPill>
        {error ? (
          <p className="mt-3 text-small font-semibold text-bad" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-6" data-main-cta>
          <Button
            variant="secondary"
            full
            loading={busy}
            icon={<Undo2 className="size-5" aria-hidden />}
            onClick={() => void undo()}
          >
            Undo
          </Button>
        </div>
      </ConfirmLayout>
    );
  }
  if (done || view.status === "answered") {
    const answer = done ?? view.answer ?? null;
    return (
      <ConfirmLayout demo={view.demo === true}>
        <QuietMark icon={Check} tone="ok" />
        <h1 className="font-display text-h3 font-bold">
          {answer === "normal"
            ? `Noted. Your normal hours stay for ${h.name}.`
            : answer
              ? `Done. Your hours for ${h.name} are on their way to Google.`
              : `You already answered for ${h.name}.`}
        </h1>
        <p className="mt-2 text-body text-text-2">
          Kabsi checks that Google shows them. You can change them under Hours.
        </p>
        {open}
      </ConfirmLayout>
    );
  }

  return (
    <ConfirmLayout demo={view.demo === true}>
      <QuietTitle business={view.business}>Your hours for {h.name}</QuietTitle>
      <p className="mt-2 text-body text-text-2">
        {h.estimated ? "Expected " : ""}
        {whenWords(h.starts_on, h.ends_on)}. Customers check Google for your hours first.
      </p>
      <HolidayAnswerForm
        holiday={h}
        today={localToday()}
        regularHours={view.regular_hours}
        initial={a ?? null}
        onSubmit={async (answer, fields) => {
          // K-17: hours change what customers see, so the person signs in first and comes back to this page.
          if (answer !== "normal" && !view.signed_in) {
            await navigate({ to: "/login", search: { next: `/h/${token}?a=${answer}` } });
            return;
          }
          const r = await answerHolidayLink(token, answer, fields);
          if (!r.repeat && answer !== "normal")
            track("special_hours_approved", { channel: "email_link", source: "holiday" });
          setDone(answer);
          if (r.publication && !r.repeat) setPending(UNDO_SECONDS);
        }}
      />
      <p className="mt-5 text-small text-text-2">Nothing changes on Google until you say yes.</p>
    </ConfirmLayout>
  );
}
