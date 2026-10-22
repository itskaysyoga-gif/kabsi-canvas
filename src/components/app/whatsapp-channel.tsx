import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { WHATSAPP_ON } from "@/lib/site";
import {
  WHATSAPP_CONSENT_TEXT,
  whatsappConnect,
  whatsappDisconnect,
  whatsappPrefs,
  whatsappStatus,
} from "@/lib/whatsapp-owner";

// The WhatsApp channel in "What Kabsi tells you" (P0.8-03, K-129). While Kabsi has no WhatsApp number it says "coming
// soon" and calls nothing. Connect opens WhatsApp with a one-time code; sending it is the opt-in. Once connected the
// owner chooses review alerts and the weekly digest, or disconnects (the same as replying STOP).
export function WhatsappChannel() {
  if (!WHATSAPP_ON) {
    return (
      <div className="mt-6 rounded-card bg-kb-sand p-4" data-testid="whatsapp-coming-soon">
        <p className="font-bold">WhatsApp: coming soon</p>
        <p className="mt-1 text-sm leading-6 text-kb-stone">
          Review alerts and Approve on WhatsApp start when Kabsi&apos;s WhatsApp number is ready.
          Until then everything comes by email and in the bell on Home.
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
  const prefs = useMutation({
    mutationFn: (v: { alerts: boolean | null; digest: boolean | null }) =>
      whatsappPrefs(v.alerts, v.digest),
    onSuccess: refresh,
    onError: () => setErr("Couldn't save. Please try again."),
  });
  const disconnect = useMutation({ mutationFn: whatsappDisconnect, onSuccess: refresh });
  const s = status.data;

  return (
    <div className="mt-6 rounded-card border border-kb-hairline p-4">
      <p className="font-bold">WhatsApp</p>
      {s?.state === "active" ? (
        <>
          <p className="mt-1 text-sm leading-6 text-kb-stone">
            Connected to the phone ending in {s.phone_last4}. Reply STOP there at any time to stop.
          </p>
          <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <Checkbox
              checked={s.review_alerts !== false}
              onCheckedChange={(v) => prefs.mutate({ alerts: v === true, digest: null })}
              className="size-5 rounded-md border-2 border-kb-black"
            />
            <span>Review alerts with Approve</span>
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <Checkbox
              checked={s.digest_optin === true}
              onCheckedChange={(v) => prefs.mutate({ alerts: null, digest: v === true })}
              className="size-5 rounded-md border-2 border-kb-black"
            />
            <span>The weekly summary on WhatsApp</span>
          </label>
          <Button
            variant="outline"
            className="mt-3 min-h-11"
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
          >
            Disconnect WhatsApp
          </Button>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm leading-6 text-kb-stone">{WHATSAPP_CONSENT_TEXT}</p>
          <Button
            variant="outline"
            className="mt-3 min-h-11"
            onClick={() => connect.mutate()}
            disabled={connect.isPending}
          >
            Connect WhatsApp
          </Button>
          {code ? (
            <p className="mt-3 text-sm leading-6">
              WhatsApp opens with the code <b>{code.code}</b> typed in. Press send from the phone
              you want to connect. The code works for 30 minutes.{" "}
              <a href={code.href} target="_blank" rel="noopener noreferrer" className="underline">
                Open WhatsApp again
              </a>{" "}
              <button type="button" className="underline" onClick={refresh}>
                I sent it
              </button>
            </p>
          ) : null}
        </>
      )}
      <p className="mt-2 min-h-6 text-sm text-kb-red" role="status">
        {err}
      </p>
    </div>
  );
}
