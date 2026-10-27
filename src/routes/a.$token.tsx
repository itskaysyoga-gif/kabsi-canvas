import { useEffect, useState } from "react";
import { CONCIERGE_COPY } from "@/lib/concierge-copy";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Clock, Undo2 } from "lucide-react";
import { ConfirmLayout } from "@/components/layouts/confirm-layout";
import { QuietMark, QuietTitle } from "@/components/kabsi/d2-quiet";
import { Button, StatusPill, buttonClass } from "@/components/kabsi/ui";
import { HIGH_RISK_CHECKLIST, issueLines } from "@/lib/review-risk";
import {
  loadAction,
  ReplyChanged,
  runAction,
  undoAction,
  type ActionResult,
  type ActionView,
} from "@/lib/reviews";
import { supabase } from "@/lib/supabase";
import { setAnalyticsPaused, track } from "@/lib/telemetry";

// Email action links. Opening this page never does anything by itself (mail scanners open links);
// the owner always presses a button, and "Approve" sends exactly the text in the box (D202).
// P0.2-05 (K-17, K-70): links last 72 hours and work once; profile changes, hours and high-risk reviews ask the
// link's recipient to sign in first and come back here; after Approve the page counts down 10 seconds with Undo.
export const Route = createFileRoute("/a/$token")({
  head: () => ({
    meta: [
      { title: "Your review reply | Kabsi" },
      { name: "robots", content: "noindex" },
      // Sec 1: the address holds a credential; no other site ever gets it as a Referer.
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: ActionPage,
});

const DONE: Record<string, string> = {
  // Sent, not yet seen on Google (30.15 section 3.1): "On Google" is said only once Kabsi read it back.
  posted: "Sent to Google. Kabsi tells you when it shows there.",
  approved: "Approved. Kabsi sends your reply to Google within a few minutes.",
  queued_manual: `${CONCIERGE_COPY.posted} ${CONCIERGE_COPY.waiting}`,
  publishing: `${CONCIERGE_COPY.posted} ${CONCIERGE_COPY.waiting}`,
  skipped: "Skipped. Nothing was posted.",
  handled_offline: "Noted. Kabsi won't post anything for this review.",
  in_review: "Sent. Google is checking your reply before it appears.",
  undone: "Undone. Nothing reached Google.",
  reverted: "Done. Your version is back on Google.",
  reverting: "Approved. Kabsi puts your version back on Google within a few minutes.",
  kept: "Noted. Kabsi will keep the new version as yours.",
  support:
    "Google keeps changing this. A person at Kabsi will contact Google support for you. Nothing more is sent to Google for now.",
};
const UNDO_SECONDS = 10;

function ActionPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [view, setView] = useState<ActionView | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [pending, setPending] = useState<{ result: ActionResult; seconds: number } | null>(null);

  useEffect(() => {
    loadAction(token)
      .then((v) => {
        if (v.status === "ok" && v.action === "open")
          return void navigate({ to: "/app/reviews", search: { f: "needs" }, replace: true });
        setAnalyticsPaused(v.demo === true);
        setView(v);
        setText(v.draft ?? "");
      })
      .catch(() => setView({ status: "invalid" }));
  }, [token, navigate]);

  async function run(what: "post" | "skip" | "handle_myself" | "revert" | "keep") {
    setError("");
    setBusy(true);
    try {
      const result = await runAction(
        token,
        what,
        what === "post" ? text : undefined,
        what === "post" ? (view?.draft_version ?? 0) : undefined,
      );
      if (!result.repeat) {
        if (what === "revert" || what === "keep")
          track(what === "revert" ? "shield_reverted" : "shield_kept", { channel: "email_link" });
        else
          track(what === "post" ? "reply_published" : "reply_skipped", { channel: "email_link" });
      }
      // K-70: a new approval waits 10 seconds before it goes to Google; Undo stays open until then.
      if (result.publication && !result.repeat && result.state === "approved")
        setPending({ result, seconds: UNDO_SECONDS });
      else setDone(result.state === "in_review" ? "in_review" : result.done);
    } catch (e) {
      // Sec 2: a newer draft arrived after this page loaded. Nothing was approved; show the new one.
      if (e instanceof ReplyChanged) {
        const v = await loadAction(token).catch(() => null);
        if (v) {
          setView(v);
          setText(v.draft ?? "");
        }
      }
      setError(e instanceof Error ? e.message : "Something went wrong. Nothing was posted.");
    }
    setBusy(false);
  }

  useEffect(() => {
    if (!pending) return;
    if (pending.seconds <= 0) {
      setDone(pending.result.done);
      setPending(null);
      return;
    }
    const id = setTimeout(
      () => setPending((p) => (p ? { ...p, seconds: p.seconds - 1 } : p)),
      1000,
    );
    return () => clearTimeout(id);
  }, [pending]);

  async function undo() {
    if (!pending?.result.publication) return;
    setError("");
    setBusy(true);
    try {
      await undoAction(token, pending.result.publication);
      setPending(null);
      setDone("undone");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
    setBusy(false);
  }

  async function switchAccount() {
    await supabase.auth.signOut();
    void navigate({ to: "/login", search: { next: `/a/${token}` } });
  }

  if (!view)
    return (
      <ConfirmLayout>
        <p className="text-text-2" role="status">
          Loading
        </p>
      </ConfirmLayout>
    );

  const inbox = (
    <Link
      to="/app/reviews"
      search={{ f: "needs" }}
      className={buttonClass("secondary", "md", true) + " mt-6"}
    >
      Open your Kabsi reviews
    </Link>
  );
  const errorLine = error ? (
    <p className="mt-3 text-small font-semibold text-bad" role="alert">
      {error}
    </p>
  ) : null;
  if (pending) {
    return (
      <ConfirmLayout
        demo={view?.demo === true}
        mode={view?.mode}
        concierge={view.concierge === true}
      >
        <QuietTitle business={view.business} live>
          Approved.
        </QuietTitle>
        <p className="mt-2 text-body text-text-2" aria-live="polite">
          Changed your mind? Tap Undo in the next {pending.seconds}{" "}
          {pending.seconds === 1 ? "second" : "seconds"} and nothing reaches Google.
        </p>
        <StatusPill tone="info" className="mt-4">
          Waiting {pending.seconds} {pending.seconds === 1 ? "second" : "seconds"}
        </StatusPill>
        {errorLine}
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
  // Sec 1: any link, not only the ones that need sign-in: another account never acts through it.
  if (!done && view.other_account && view.status === "ok") {
    return (
      <ConfirmLayout demo={view?.demo === true} mode={view?.mode}>
        <QuietTitle lead="You are signed in to Kabsi with a different email address. Sign out, then sign in with the address this email was sent to.">
          This link was sent to someone else
        </QuietTitle>
        <div className="mt-6" data-main-cta>
          <Button full onClick={() => void switchAccount()}>
            Sign out and sign in again
          </Button>
        </div>
        {inbox}
      </ConfirmLayout>
    );
  }
  // K-17: profile changes, hours and high-risk reviews: the person the link was sent to signs in first.
  const needsSignIn = view.sign_in === true && view.signed_in !== true && view.status === "ok";
  const signIn = (label: string, why: string) => (
    <>
      <p className="mt-5 text-small text-text-2">{why} You come back to this page.</p>
      <Link
        to="/login"
        search={{ next: `/a/${token}` }}
        data-main-cta
        className={buttonClass("primary", "lg", true) + " mt-4"}
      >
        {label}
      </Link>
    </>
  );
  if (done) {
    return (
      <ConfirmLayout demo={view?.demo === true} mode={view?.mode}>
        <QuietMark
          icon={done === "undone" ? Undo2 : Check}
          tone={done === "undone" ? "info" : "ok"}
        />
        <QuietTitle
          lead={
            done === "undone"
              ? "The reply is back, waiting for your yes."
              : done === "posted"
                ? "To remove it, open your Kabsi account on the website."
                : undefined
          }
        >
          {DONE[done] ?? "Done."}
        </QuietTitle>
        {inbox}
      </ConfirmLayout>
    );
  }
  if (view.change && (view.status === "ok" || view.status === "used")) {
    const c = view.change;
    const LABELS: Record<string, string> = {
      title: "business name",
      phone: "phone number",
      address: "address",
      website: "website",
      hours: "opening hours",
      categories: "main category",
    };
    const decided = c.state !== "open" || view.status === "used";
    return (
      <ConfirmLayout demo={view?.demo === true} mode={view?.mode}>
        <QuietTitle business={view.business}>
          Your {LABELS[c.field] ?? c.field} changed on Google
        </QuietTitle>
        <div className="mt-6 grid gap-3">
          <div className="rounded-inner bg-surface-2 p-4">
            <p className="text-label font-bold text-text-2">Before</p>
            <p dir="auto" className="mt-1">
              {c.before || "(empty)"}
            </p>
          </div>
          <div className="rounded-inner bg-surface-2 p-4">
            <p className="text-label font-bold text-text-2">Now</p>
            <p dir="auto" className="mt-1">
              {c.after || "(empty)"}
            </p>
          </div>
        </div>
        {decided ? (
          <p className="mt-5 text-body">
            {(view.result && DONE[view.result.done]) || "This change was already handled."}
          </p>
        ) : needsSignIn ? (
          signIn(
            "Sign in to choose",
            "This changes what every customer sees on Google, so Kabsi asks you to sign in first.",
          )
        ) : (
          <>
            {errorLine}
            <div className="mt-6 space-y-3" data-main-cta>
              <Button full loading={busy} onClick={() => void run("revert")}>
                Keep my information
              </Button>
              <Button variant="secondary" full disabled={busy} onClick={() => void run("keep")}>
                Google is right
              </Button>
            </div>
          </>
        )}
        {inbox}
      </ConfirmLayout>
    );
  }
  if (view.status === "invalid" || view.status === "expired" || !view.review) {
    return (
      <ConfirmLayout demo={view?.demo === true} mode={view?.mode}>
        <QuietMark icon={Clock} tone="warn" />
        <QuietTitle lead="Email links work once, for 3 days. Your reviews and drafts are always on the Kabsi website.">
          {view.status === "expired" ? "This link has expired." : "This link does not work."}
        </QuietTitle>
        {inbox}
      </ConfirmLayout>
    );
  }

  const r = view.review;
  const closed = r.state === "posted" || r.state === "skipped" || r.state === "handled_offline";
  const reviewCard = (
    <div className="rounded-inner border border-line bg-surface-1 p-4">
      <p className="text-small font-bold text-text-2">
        {r.rating}-star review from {r.reviewer ?? "a customer"}
      </p>
      <p dir="auto" className="mt-2 whitespace-pre-wrap text-body text-text-1">
        {r.comment || <span className="text-text-2">No written review, just a rating.</span>}
      </p>
    </div>
  );
  const header = (
    <QuietTitle business={view.business}>
      {r.risk === "high" ? "This review needs a little more care" : "A reply is ready."}
    </QuietTitle>
  );

  if (closed || view.status === "used") {
    return (
      <ConfirmLayout
        demo={view?.demo === true}
        mode={view?.mode}
        concierge={view.concierge === true}
      >
        {header}
        <div className="mt-6">{reviewCard}</div>
        <p className="mt-5 text-body">
          {closed
            ? DONE[r.state]
            : (view.result && DONE[view.result.done]) || "This link was already used."}
        </p>
        {r.state === "posted" && r.reply ? (
          <p
            dir="auto"
            className="mt-3 whitespace-pre-wrap rounded-inner bg-surface-2 p-4 text-body"
          >
            {r.reply}
          </p>
        ) : null}
        {inbox}
      </ConfirmLayout>
    );
  }

  if (view.action === "skip" || view.action === "handle_myself") {
    const skip = view.action === "skip";
    return (
      <ConfirmLayout
        demo={view?.demo === true}
        mode={view?.mode}
        concierge={view.concierge === true}
      >
        {header}
        <div className="mt-6">{reviewCard}</div>
        <p className="mt-5 text-body">
          {skip
            ? "Skip this review? Nothing will be posted."
            : "You'll handle this one yourself. Kabsi won't post anything."}
        </p>
        {errorLine}
        <div className="mt-5" data-main-cta>
          <Button
            full
            loading={busy}
            onClick={() => void run(view.action as "skip" | "handle_myself")}
          >
            {skip ? "Skip review" : "I'll handle it"}
          </Button>
        </div>
        {inbox}
      </ConfirmLayout>
    );
  }

  // post / edit / see_draft: the owner sees and can change the exact text before posting
  const tooLong = text.trim().length > 4000;
  return (
    <ConfirmLayout demo={view?.demo === true} mode={view?.mode} concierge={view.concierge === true}>
      {header}
      <div className="mt-6">{reviewCard}</div>
      {r.risk === "high" ? (
        <div className="mt-5 rounded-inner border border-line-strong bg-surface-2 p-4 text-small">
          {issueLines(r.risk_reasons).map((i) => (
            <p key={i}>{i}</p>
          ))}
          <ol className="mt-2 list-decimal space-y-1 ps-5">
            {HIGH_RISK_CHECKLIST.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
        </div>
      ) : r.risk === "medium" && issueLines(r.risk_reasons).length ? (
        <div className="mt-5 rounded-inner bg-warn-soft p-4 text-small text-text-1">
          {issueLines(r.risk_reasons).map((i) => (
            <p key={i}>{i}</p>
          ))}
        </div>
      ) : null}
      <label htmlFor="reply" className="mt-6 block text-small font-bold text-text-1">
        Your reply
      </label>
      {!view.draft ? (
        <p className="mt-1 text-small text-text-2">
          {r.risk === "high"
            ? "Kabsi did not draft a reply for this one. Write your own when you are ready, or skip it."
            : "Kabsi couldn't safely draft this one. Write your own reply, or skip it."}
        </p>
      ) : (
        <p className="mt-1 text-small text-text-2">
          Change anything you like. Kabsi publishes exactly this text after you approve.
        </p>
      )}
      <textarea
        dir="auto"
        id="reply"
        value={text}
        onChange={(e) => setText(e.target.value)}
        readOnly={needsSignIn}
        rows={7}
        autoFocus={view.action === "edit" && !needsSignIn}
        className="mt-3 w-full rounded-input border border-stroke bg-surface-2 p-3 text-body text-text-1 read-only:opacity-80 focus-visible:border-text-1"
      />
      {errorLine}
      {needsSignIn ? (
        signIn(
          "Sign in to approve",
          "This review needs a little more care, so Kabsi asks you to sign in before a reply goes to Google.",
        )
      ) : (
        <div className="mt-5" data-main-cta>
          <Button
            full
            loading={busy}
            disabled={!text.trim() || tooLong}
            onClick={() => void run("post")}
          >
            Approve reply
          </Button>
        </div>
      )}
      <Button
        variant="secondary"
        full
        className="mt-3"
        disabled={busy}
        onClick={() => void run(view.action === "see_draft" ? "handle_myself" : "skip")}
      >
        {view.action === "see_draft" ? "I'll handle it myself" : "Skip this review"}
      </Button>
      <p className="mt-5 text-small text-text-2">Nothing is published until you approve it.</p>
    </ConfirmLayout>
  );
}
