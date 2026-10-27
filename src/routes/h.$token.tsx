import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { HolidayAnswerForm } from "@/components/hours/holiday-answer";
import { ConfirmLayout } from "@/components/layouts/confirm-layout";
import { Button } from "@/components/ui/button";
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
        <p className="text-text-2">Loading…</p>
      </ConfirmLayout>
    );

  const open = (
    <Button asChild variant="outline" className="mt-6 w-full">
      <Link to="/app/hours">Open Hours in Kabsi</Link>
    </Button>
  );

  if (view.status === "invalid" || view.status === "expired") {
    return (
      <ConfirmLayout>
        <h1 className="font-display text-h3 leading-tight">
          {view.status === "expired" ? "This link has expired" : "This link isn't valid"}
        </h1>
        <p className="mt-3 leading-7 text-text-2">
          You can still answer in Kabsi, under Hours. Nothing is changed until you confirm it.
        </p>
        {open}
      </ConfirmLayout>
    );
  }

  const h = view.holiday!;
  if (pending !== null) {
    return (
      <ConfirmLayout demo={view.demo === true}>
        <p className="text-small font-medium text-text-2">{view.business}</p>
        <h1 className="mt-1 font-display text-h3 leading-tight" aria-live="polite">
          Publishing in {pending} {pending === 1 ? "second" : "seconds"}
        </h1>
        <p className="mt-3 leading-7 text-text-2">Nothing is sent to Google until then.</p>
        {error ? (
          <p className="mt-3 text-small text-bad" role="alert">
            {error}
          </p>
        ) : null}
        <Button className="mt-6 w-full" disabled={busy} onClick={() => void undo()}>
          {busy ? "Undoing…" : "Undo"}
        </Button>
      </ConfirmLayout>
    );
  }
  if (done || view.status === "answered") {
    const answer = done ?? view.answer ?? null;
    return (
      <ConfirmLayout demo={view.demo === true}>
        <CheckCircle2 className="size-10 text-ok" aria-hidden="true" />
        <h1 className="mt-4 font-display text-h3 leading-tight">
          {answer === "normal"
            ? `Noted. Your normal hours stay for ${h.name}.`
            : answer
              ? `Done. Your hours for ${h.name} are on their way to Google.`
              : `You already answered for ${h.name}.`}
        </h1>
        <p className="mt-3 leading-7 text-text-2">
          Kabsi checks that Google shows them. You can change them under Hours.
        </p>
        {open}
      </ConfirmLayout>
    );
  }

  return (
    <ConfirmLayout demo={view.demo === true}>
      <p className="text-small font-medium text-text-2">{view.business}</p>
      <h1 className="mt-1 font-display text-h3 leading-tight">Your hours for {h.name}</h1>
      <p className="mt-2 text-text-2">
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
      <p className="mt-5 text-label leading-5 text-text-2">
        Nothing changes on Google until you confirm. Kabsi is independent and not affiliated with
        Google.
      </p>
    </ConfirmLayout>
  );
}
