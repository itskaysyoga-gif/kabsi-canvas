import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Mail, MessageCircle, Share2, TriangleAlert, Users } from "lucide-react";
import { BookingLink } from "@/components/shared/booking-link";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import { mailtoUrl, readyMessage, stepsUrl, whatsappShareUrl } from "@/lib/manager-guide";
import { friendlyError, sendManagerSteps, type Location } from "@/lib/onboarding";
import { SETUP_CALL_MINUTES, SITE_URL } from "@/lib/site";

type Panel = "device" | "someone" | null;

/**
 * The three ways out of the Manager guide (K-93): send the steps to my other device (email, or a WhatsApp share link),
 * someone else manages my Google listing (a ready message to forward), and a free setup call. None of them asks for a
 * password or a code. The email goes only to the signed-in person's own address.
 */
export function AccessExits({ location, step }: { location: Location; step: number }) {
  const [open, setOpen] = useState<Panel>(null);
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const link = stepsUrl(SITE_URL, location.name, step);
  const message = readyMessage(location.name, stepsUrl(SITE_URL, location.name));
  const email = useMutation({ mutationFn: () => sendManagerSteps(location.id, step) });

  async function copyMessage() {
    const ok = await copyText(message);
    setCopied(ok ? "done" : "failed");
    window.setTimeout(() => setCopied("idle"), 2000);
  }
  async function shareMessage() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Add Kabsi as a Manager", text: message });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    await copyMessage();
  }

  return (
    <div className="mt-6 space-y-3">
      <Button
        type="button"
        variant="outline"
        className="h-auto min-h-[52px] w-full whitespace-normal py-3 text-center"
        aria-expanded={open === "device"}
        onClick={() => setOpen(open === "device" ? null : "device")}
      >
        <Share2 /> Send these steps to my other device
      </Button>
      {open === "device" ? (
        <div className="rounded-card bg-kb-sand p-4">
          <p className="text-sm leading-6">
            Open the steps on the device where you are signed in to Google.
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              size="compact"
              onClick={() => email.mutate()}
              disabled={email.isPending || email.isSuccess}
            >
              {email.isSuccess ? <Check /> : <Mail />}
              {email.isSuccess ? "Sent to your email" : "Email them to me"}
            </Button>
            <Button asChild variant="outline" size="compact">
              <a
                href={whatsappShareUrl(`Steps to add Kabsi as a Manager: ${link}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle /> Share on WhatsApp
              </a>
            </Button>
          </div>
          {email.isError ? (
            <p role="alert" className="mt-3 text-sm text-kb-red">
              {friendlyError(email.error)}
            </p>
          ) : null}
        </div>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="h-auto min-h-[52px] w-full whitespace-normal py-3 text-center"
        aria-expanded={open === "someone"}
        onClick={() => setOpen(open === "someone" ? null : "someone")}
      >
        <Users /> Someone else manages my Google listing
      </Button>
      {open === "someone" ? (
        <div className="rounded-card bg-kb-sand p-4">
          <p className="text-sm leading-6">
            Send this to whoever manages it. They add Kabsi as a Manager, and you carry on here.
          </p>
          <p
            className="mt-3 whitespace-pre-wrap rounded-card bg-kb-white p-3 text-sm leading-6"
            data-testid="ready-message"
          >
            {message}
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button type="button" variant="outline" size="compact" onClick={copyMessage}>
              {copied === "done" ? <Check /> : copied === "failed" ? <TriangleAlert /> : null}
              {copied === "done"
                ? "Copied"
                : copied === "failed"
                  ? "Couldn't copy"
                  : "Copy message"}
            </Button>
            <Button type="button" variant="outline" size="compact" onClick={shareMessage}>
              <Share2 /> Share
            </Button>
            <Button asChild variant="outline" size="compact">
              <a href={whatsappShareUrl(message)} target="_blank" rel="noopener noreferrer">
                <MessageCircle /> WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" size="compact">
              <a href={mailtoUrl(`Add Kabsi as a Manager for ${location.name}`, message)}>
                <Mail /> Email
              </a>
            </Button>
          </div>
        </div>
      ) : null}

      <BookingLink
        kind="setup"
        button
        className="h-auto min-h-[52px] w-full whitespace-normal py-3 text-center"
      >
        Book a free {SETUP_CALL_MINUTES}-minute setup call
      </BookingLink>
    </div>
  );
}
