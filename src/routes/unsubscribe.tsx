import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ConfirmLayout } from "@/components/layouts/confirm-layout";
import { Button } from "@/components/ui/button";
import { lookUpUnsubscribe, unsubscribe } from "@/lib/unsubscribe";

// The page behind "Unsubscribe from these emails" in the footer of an email (K-102). It asks first; the button does it.
export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (s: Record<string, unknown>) => ({ t: typeof s["t"] === "string" ? s["t"] : "" }),
  head: () => ({
    meta: [{ title: "Email settings | Kabsi" }, { name: "robots", content: "noindex" }],
  }),
  component: UnsubscribePage,
});

type State =
  | { step: "loading" }
  | { step: "ask"; label: string }
  | { step: "done"; label: string }
  | { step: "bad"; message: string };

function UnsubscribePage() {
  const { t } = Route.useSearch();
  const [state, setState] = useState<State>({ step: "loading" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!t) return setState({ step: "bad", message: "This link is not valid." });
    void lookUpUnsubscribe(t).then((r) =>
      setState(r.ok ? { step: "ask", label: r.label } : { step: "bad", message: r.message }),
    );
  }, [t]);

  async function stop() {
    setBusy(true);
    const r = await unsubscribe(t);
    setBusy(false);
    setState(r.ok ? { step: "done", label: r.label } : { step: "bad", message: r.message });
  }

  return (
    <ConfirmLayout>
      {state.step === "loading" ? <p className="text-kb-stone">Loading…</p> : null}
      {state.step === "ask" ? (
        <>
          <h1 className="font-display text-3xl leading-tight">Stop these emails?</h1>
          <p className="mt-3 leading-7 text-kb-stone">
            You will stop getting <strong>{state.label}</strong> emails at this address. Your other
            Kabsi emails are not affected, and you can change this any time in Settings.
          </p>
          <Button className="mt-6 w-full" disabled={busy} onClick={() => void stop()}>
            {busy ? "Stopping…" : "Stop these emails"}
          </Button>
        </>
      ) : null}
      {state.step === "done" ? (
        <>
          <h1 className="font-display text-3xl leading-tight">Done</h1>
          <p className="mt-3 leading-7 text-kb-stone">
            You will not get <strong>{state.label}</strong> emails at this address any more. You can
            change this any time in Settings, Email settings.
          </p>
          <Button asChild variant="secondary" className="mt-6 w-full">
            <Link to="/app/settings">Open Email settings</Link>
          </Button>
        </>
      ) : null}
      {state.step === "bad" ? (
        <>
          <h1 className="font-display text-3xl leading-tight">This link did not work</h1>
          <p className="mt-3 leading-7 text-kb-stone">
            {state.message} Open Email settings in Kabsi to choose which emails you get, or write to
            hello@kabsi.co.
          </p>
          <Button asChild className="mt-6 w-full">
            <Link to="/app/settings">Open Email settings</Link>
          </Button>
        </>
      ) : null}
    </ConfirmLayout>
  );
}
