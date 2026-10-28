import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ConfirmLayout } from "@/components/layouts/confirm-layout";
import { Check, CircleSlash } from "lucide-react";
import { QuietMark, QuietTitle } from "@/components/kabsi/d2-quiet";
import { Button, buttonClass } from "@/components/kabsi/ui";
import { lookUpUnsubscribe, unsubscribe } from "@/lib/unsubscribe";

// The page behind "Unsubscribe from these emails" in the footer of an email (K-102). It asks first; the button does it.
export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (s: Record<string, unknown>) => ({ t: typeof s["t"] === "string" ? s["t"] : "" }),
  head: () => ({
    meta: [
      { title: "Email settings | Kabsi" },
      { name: "robots", content: "noindex" },
      // Sec 1: the address holds a credential; no other site ever gets it as a Referer.
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: UnsubscribePage,
});

type State =
  | { step: "loading" }
  | { step: "ask"; label: string }
  | { step: "done"; label: string }
  | { step: "bad"; message: string };

// Sec 2: new links carry the token in the fragment (#t=TOKEN), which the browser never sends to a server or in a
// Referer; links sent before Sec 2 carry ?t=TOKEN and keep working.
function tokenFromHash() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.hash.replace(/^#/, "")).get("t") ?? "";
}

function UnsubscribePage() {
  const { t: fromSearch } = Route.useSearch();
  const [t, setT] = useState(fromSearch);
  const [state, setState] = useState<State>({ step: "loading" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const token = fromSearch || tokenFromHash();
    setT(token);
    if (!token) return setState({ step: "bad", message: "This link is not valid." });
    void lookUpUnsubscribe(token).then((r) =>
      setState(r.ok ? { step: "ask", label: r.label } : { step: "bad", message: r.message }),
    );
  }, [fromSearch]);

  async function stop() {
    setBusy(true);
    const r = await unsubscribe(t);
    setBusy(false);
    setState(r.ok ? { step: "done", label: r.label } : { step: "bad", message: r.message });
  }

  const settings = (variant: "primary" | "secondary") => (
    <Link
      to="/app/settings"
      data-main-cta={variant === "primary" ? true : undefined}
      className={buttonClass(variant, variant === "primary" ? "lg" : "md", true) + " mt-6"}
    >
      Choose which emails I get
    </Link>
  );
  return (
    <ConfirmLayout>
      {state.step === "loading" ? (
        <p className="text-text-2" role="status">
          Loading
        </p>
      ) : null}
      {state.step === "ask" ? (
        <>
          <QuietTitle
            lead={
              <>
                You get <strong className="text-text-1">{state.label}</strong> emails at this
                address. Unsubscribe and Kabsi stops sending them. Your other Kabsi emails are not
                affected.
              </>
            }
          >
            Stop these emails?
          </QuietTitle>
          <div className="mt-6" data-main-cta>
            <Button full loading={busy} onClick={() => void stop()}>
              Unsubscribe
            </Button>
          </div>
          <Link
            to="/app/settings"
            className={buttonClass("tertiary") + " mt-3 w-full justify-center"}
          >
            Choose which emails I get
          </Link>
        </>
      ) : null}
      {state.step === "done" ? (
        <>
          <QuietMark icon={Check} tone="ok" />
          <QuietTitle
            lead={
              <>
                Kabsi stops sending <strong className="text-text-1">{state.label}</strong> emails to
                this address. WhatsApp messages are not affected.
              </>
            }
          >
            You are unsubscribed.
          </QuietTitle>
          {settings("secondary")}
        </>
      ) : null}
      {state.step === "bad" ? (
        <>
          <QuietMark icon={CircleSlash} tone="warn" />
          <QuietTitle
            lead={`${state.message} Choose which emails you get on the Kabsi website, or write to hello@kabsi.co.`}
          >
            This link did not work.
          </QuietTitle>
          {settings("primary")}
        </>
      ) : null}
    </ConfirmLayout>
  );
}
