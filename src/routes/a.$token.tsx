import { useEffect, useState } from "react";
import { CONCIERGE_COPY } from "@/lib/concierge-copy";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { ConfirmLayout } from "@/components/layouts/confirm-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { loadAction, runAction, type ActionView } from "@/lib/reviews";
import { setAnalyticsPaused, track } from "@/lib/telemetry";

// Email action links. Opening this page never does anything by itself (mail scanners open links);
// the owner always presses a button, and "Approve" sends exactly the text in the box (D202).
export const Route = createFileRoute("/a/$token")({
  head: () => ({
    meta: [{ title: "Your review reply | Kabsi" }, { name: "robots", content: "noindex" }],
  }),
  component: ActionPage,
});

const DONE: Record<string, string> = {
  posted: "Posted. Your reply is on Google.",
  approved: "Approved. Kabsi sends your reply to Google within a few minutes.",
  queued_manual: `${CONCIERGE_COPY.posted} ${CONCIERGE_COPY.waiting}`,
  publishing: `${CONCIERGE_COPY.posted} ${CONCIERGE_COPY.waiting}`,
  skipped: "Skipped. Nothing was posted.",
  handled_offline: "Noted. Kabsi won't post anything for this review.",
  in_review: "Sent. Google is checking your reply before it appears.",
  undone: "Undone. Nothing was sent to Google.",
  reverted: "Done. Your version is back on Google.",
  reverting: "Approved. Kabsi puts your version back on Google within a few minutes.",
  kept: "Noted. Kabsi will keep the new version as yours.",
};

function ActionPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [view, setView] = useState<ActionView | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    loadAction(token)
      .then((v) => {
        if (v.status === "ok" && v.action === "open")
          return void navigate({ to: "/app/inbox", replace: true });
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
      const result = await runAction(token, what, what === "post" ? text : undefined);
      if (what === "revert" || what === "keep")
        track(what === "revert" ? "shield_reverted" : "shield_kept", { channel: "email_link" });
      else track(what === "post" ? "reply_published" : "reply_skipped", { channel: "email_link" });
      setDone(result.state === "in_review" ? "in_review" : result.done);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Nothing was posted.");
    }
    setBusy(false);
  }

  if (!view)
    return (
      <ConfirmLayout>
        <p className="text-kb-stone">Loading…</p>
      </ConfirmLayout>
    );

  const inbox = (
    <Button asChild variant="outline" className="mt-6 w-full">
      <Link to="/app/inbox">Open your Kabsi inbox</Link>
    </Button>
  );
  if (done) {
    return (
      <ConfirmLayout demo={view?.demo === true} mode={view?.mode}>
        <CheckCircle2 className="size-10 text-kb-green" aria-hidden="true" />
        <h1 className="mt-4 font-display text-3xl leading-tight">{DONE[done] ?? "Done."}</h1>
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
        <p className="text-sm font-medium text-kb-stone">{view.business}</p>
        <h1 className="mt-1 font-display text-3xl leading-tight">
          Your {LABELS[c.field] ?? c.field} changed on Google
        </h1>
        <div className="mt-6 grid gap-3">
          <div className="rounded-card bg-kb-sand p-4">
            <p className="text-xs font-bold uppercase text-kb-stone">Before</p>
            <p dir="auto" className="mt-1">
              {c.before || "(empty)"}
            </p>
          </div>
          <div className="rounded-card bg-kb-sand p-4">
            <p className="text-xs font-bold uppercase text-kb-stone">Now</p>
            <p dir="auto" className="mt-1">
              {c.after || "(empty)"}
            </p>
          </div>
        </div>
        {decided ? (
          <p className="mt-5 leading-7">This change was already handled.</p>
        ) : (
          <>
            {error ? (
              <p className="mt-3 text-sm text-kb-red" role="alert">
                {error}
              </p>
            ) : null}
            <Button className="mt-6 w-full" disabled={busy} onClick={() => void run("revert")}>
              {busy ? "Working…" : "Keep my information"}
            </Button>
            <Button
              variant="ghost"
              className="mt-2 w-full"
              disabled={busy}
              onClick={() => void run("keep")}
            >
              Keep the new one
            </Button>
          </>
        )}
        {inbox}
      </ConfirmLayout>
    );
  }
  if (view.status === "invalid" || view.status === "expired" || !view.review) {
    return (
      <ConfirmLayout demo={view?.demo === true} mode={view?.mode}>
        <h1 className="font-display text-3xl leading-tight">
          {view.status === "expired" ? "This link has expired" : "This link isn't valid"}
        </h1>
        <p className="mt-3 leading-7 text-kb-stone">
          Email links work for 7 days. Your reviews and drafts are always in your Kabsi inbox.
        </p>
        {inbox}
      </ConfirmLayout>
    );
  }

  const r = view.review;
  const closed = r.state === "posted" || r.state === "skipped" || r.state === "handled_offline";
  const reviewCard = (
    <div className="rounded-card bg-kb-sand p-5">
      <p className="font-bold">
        {r.reviewer ?? "A customer"}{" "}
        <span className="font-normal text-kb-stone">· Rating {r.rating} of 5</span>
      </p>
      <p dir="auto" className="mt-2 whitespace-pre-wrap leading-7">
        {r.comment || <span className="text-kb-stone">No written review, just a rating.</span>}
      </p>
    </div>
  );
  const header = (
    <>
      <p className="text-sm font-medium text-kb-stone">{view.business}</p>
      <h1 className="mt-1 font-display text-3xl leading-tight">
        {r.urgent ? "This review needs care" : "Reply to this review"}
      </h1>
    </>
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
        <p className="mt-5 leading-7">{closed ? DONE[r.state] : "This link was already used."}</p>
        {r.state === "posted" && r.reply ? (
          <p
            dir="auto"
            className="mt-3 whitespace-pre-wrap rounded-card border border-kb-hairline p-4 text-sm leading-6"
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
        <p className="mt-5 leading-7">
          {skip
            ? "Skip this review? Nothing will be posted."
            : "You'll handle this one yourself. Kabsi won't post anything."}
        </p>
        {error ? (
          <p className="mt-3 text-sm text-kb-red" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          className="mt-5 w-full"
          disabled={busy}
          onClick={() => void run(view.action as "skip" | "handle_myself")}
        >
          {skip ? "Skip review" : "I'll handle it"}
        </Button>
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
      {r.urgent ? (
        <p className="mt-5 rounded-card border-2 border-kb-black p-4 text-sm leading-6">
          Take a breath before replying. If you can reach the customer, call them first. A calm,
          short public reply is usually best.
        </p>
      ) : null}
      <Label htmlFor="reply" className="mt-6 block font-bold">
        Your reply
      </Label>
      {!view.draft ? (
        <p className="mt-1 text-sm text-kb-stone">
          Kabsi couldn't safely draft this one. Write your own reply, or skip it.
        </p>
      ) : (
        <p className="mt-1 text-sm text-kb-stone">
          Change anything you like. Kabsi publishes exactly this text after you approve.
        </p>
      )}
      <Textarea
        dir="auto"
        id="reply"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        autoFocus={view.action === "edit"}
        className="mt-3 text-base leading-7"
      />
      {error ? (
        <p className="mt-3 text-sm text-kb-red" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        className="mt-5 w-full"
        disabled={busy || !text.trim() || tooLong}
        onClick={() => void run("post")}
      >
        {busy ? "Approving…" : "Approve reply"}
      </Button>
      <Button
        variant="ghost"
        className="mt-2 w-full"
        disabled={busy}
        onClick={() => void run(view.action === "see_draft" ? "handle_myself" : "skip")}
      >
        {view.action === "see_draft" ? "I'll handle it myself" : "Skip this review"}
      </Button>
    </ConfirmLayout>
  );
}
