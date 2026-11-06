import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Switch, WhatsAppGlyph } from "@/components/kabsi/ui";
import { WHATSAPP_ON } from "@/lib/site";
import {
  WHATSAPP_CONSENT_TEXT,
  whatsappConnect,
  whatsappDisconnect,
  whatsappPrefs,
  whatsappStatus,
  type WhatsappStatus,
} from "@/lib/whatsapp-owner";

// The WhatsApp panel in Settings (P0.8-03, K-129). While Kabsi has no WhatsApp number it says "coming soon" and calls
// nothing. Connect opens WhatsApp with a one-time code; sending it is the opt-in. Once connected the owner chooses review
// alerts and the weekly report on WhatsApp, or disconnects (the same as replying STOP).
export function WhatsappChannel() {
  if (!WHATSAPP_ON) {
    return (
      <div className="rounded-inner bg-surface-2 p-4" data-testid="whatsapp-coming-soon">
        <p className="text-body font-bold">WhatsApp: coming soon</p>
        <p className="mt-1 text-small text-text-2">
          Review alerts and Approve on WhatsApp start when Kabsi&apos;s WhatsApp number is ready.
          Until then everything comes by email.
        </p>
      </div>
    );
  }
  return <WhatsappConnected />;
}

function WhatsappConnected() {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ["whatsapp-status"], queryFn: whatsappStatus });
  const [code, setCode] = useState<{ code: string; href: string } | null>(null);
  const [err, setErr] = useState("");
  const refresh = () => void qc.invalidateQueries({ queryKey: ["whatsapp-status"] });
  const connect = useMutation({
    mutationFn: whatsappConnect,
    onSuccess: (c) => {
      setErr("");
      setCode(c);
      window.open(c.href, "_blank", "noopener,noreferrer");
    },
    onError: () => setErr("Couldn't start. Please try again."),
  });
  // Launch 1 (part C): a switch moves at once and the server's answer only confirms it (it took 540 to 670 ms on
  // production before). One save after another; a failure puts the switch back and says so.
  const prefs = useMutation({
    mutationKey: ["whatsapp-prefs"],
    scope: { id: "whatsapp-prefs" },
    mutationFn: (v: { alerts: boolean | null; digest: boolean | null }) =>
      whatsappPrefs(v.alerts, v.digest),
    onMutate: async (v) => {
      setErr("");
      await qc.cancelQueries({ queryKey: ["whatsapp-status"] });
      const before = qc.getQueryData<WhatsappStatus>(["whatsapp-status"]);
      if (before)
        qc.setQueryData<WhatsappStatus>(["whatsapp-status"], {
          ...before,
          ...(v.alerts === null ? {} : { review_alerts: v.alerts }),
          ...(v.digest === null ? {} : { digest_optin: v.digest }),
        });
      return { before };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.before) qc.setQueryData(["whatsapp-status"], ctx.before);
      setErr("Couldn't save that. It is back as it was. Try again.");
    },
    onSettled: () => {
      // Read the truth back once the last save is done.
      if (qc.isMutating({ mutationKey: ["whatsapp-prefs"] }) <= 1) refresh();
    },
  });
  const disconnect = useMutation({ mutationFn: whatsappDisconnect, onSuccess: refresh });
  const s = status.data;

  return (
    <div>
      {s?.state === "active" ? (
        <>
          <p className="flex items-center gap-2 text-body">
            <WhatsAppGlyph className="size-5" />
            Connected to the phone ending in {s.phone_last4}.
          </p>
          <p className="mt-1 text-small text-text-2">Reply STOP there at any time to stop.</p>
          <div className="mt-4 space-y-4 border-t border-line pt-4">
            <Switch
              label="Review alerts with Approve"
              checked={s.review_alerts !== false}
              onChange={(v) => prefs.mutate({ alerts: v, digest: null })}
            />
            <Switch
              label="Your weekly report on WhatsApp"
              checked={s.digest_optin === true}
              onChange={(v) => prefs.mutate({ alerts: null, digest: v })}
            />
          </div>
          <Button
            variant="secondary"
            size="md"
            className="mt-4"
            onClick={() => disconnect.mutate()}
            loading={disconnect.isPending}
          >
            Disconnect WhatsApp
          </Button>
        </>
      ) : (
        <>
          {/* The consent text is stored word for word as the proof of the opt-in (K-113), so it stays one paragraph (App 5). */}
          <p data-long-ok className="text-small text-text-2">
            {WHATSAPP_CONSENT_TEXT}
          </p>
          <Button
            variant="whatsapp"
            size="md"
            className="mt-3"
            icon={<WhatsAppGlyph className="size-4.5" />}
            onClick={() => connect.mutate()}
            loading={connect.isPending}
          >
            Connect WhatsApp
          </Button>
          {code ? (
            <p className="mt-3 text-small">
              WhatsApp opens with the code <b>{code.code}</b> typed in. Press send from the phone
              you want to connect. The code works for 30 minutes.{" "}
              <a
                href={code.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center font-bold underline underline-offset-4"
              >
                Open WhatsApp again
              </a>{" "}
              <button
                type="button"
                className="inline-flex min-h-11 items-center font-bold underline underline-offset-4"
                onClick={refresh}
              >
                I sent it
              </button>
            </p>
          ) : null}
        </>
      )}
      {err ? (
        <p className="mt-2 text-small text-bad" role="status">
          {err}
        </p>
      ) : null}
    </div>
  );
}
