import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Mail, MessageCircle, Share2, Users } from "lucide-react";
import { BookingLink } from "@/components/shared/booking-link";
import { ReadyMessage } from "@/components/onboarding/ready-message";
import { Button, buttonClass } from "@/components/kabsi/ui";
import { cn } from "@/lib/utils";
import { readyMessage, stepsUrl, whatsappShareUrl } from "@/lib/manager-guide";
import { friendlyError, sendManagerSteps, type Location } from "@/lib/onboarding";
import { SETUP_CALL_MINUTES, SITE_URL } from "@/lib/site";

type Panel = "device" | "someone" | null;

/**
 * The three ways out of the Manager guide (K-93): send the steps to my other device (email, or a WhatsApp share link),
 * someone else manages my Google profile (a ready message to forward), and a free setup call. None of them asks for a
 * password or a code. The email goes only to the signed-in person's own address.
 */
export function AccessExits({ location, step }: { location: Location; step: number }) {
  const [open, setOpen] = useState<Panel>(null);
  const link = stepsUrl(SITE_URL, location.name, step);
  const message = readyMessage(location.name, stepsUrl(SITE_URL, location.name));
  const email = useMutation({ mutationFn: () => sendManagerSteps(location.id, step) });

  return (
    <div className="mt-6 space-y-3">
      <Button
        variant="secondary"
        full
        className="h-auto min-h-13 whitespace-normal py-3 text-center"
        aria-expanded={open === "device"}
        onClick={() => setOpen(open === "device" ? null : "device")}
        icon={<Share2 className="size-5" />}
      >
        Send these steps to my other device
      </Button>
      {open === "device" ? (
        <div className="rounded-card bg-surface-2 p-4">
          <p className="text-small leading-6">
            Open the steps on the device where you are signed in to Google.
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="secondary"
              size="md"
              onClick={() => email.mutate()}
              disabled={email.isPending || email.isSuccess}
              icon={email.isSuccess ? <Check className="size-5" /> : <Mail className="size-5" />}
            >
              {email.isSuccess ? "Sent to your email" : "Email them to me"}
            </Button>
            <a
              className={buttonClass("secondary", "md")}
              href={whatsappShareUrl(`Steps to add Kabsi as a Manager: ${link}`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="size-5" /> Share on WhatsApp
            </a>
          </div>
          {email.isError ? (
            <p role="alert" className="mt-3 text-small text-bad">
              {friendlyError(email.error)}
            </p>
          ) : null}
        </div>
      ) : null}

      <Button
        variant="secondary"
        full
        className="h-auto min-h-13 whitespace-normal py-3 text-center"
        aria-expanded={open === "someone"}
        onClick={() => setOpen(open === "someone" ? null : "someone")}
        icon={<Users className="size-5" />}
      >
        Someone else manages my Google profile
      </Button>
      {open === "someone" ? (
        <div className="rounded-card bg-surface-2 p-4">
          <p className="text-small leading-6">
            Send this to whoever manages it. They add Kabsi as a Manager, and you carry on here.
          </p>
          <div className="mt-3">
            <ReadyMessage text={message} subject={`Add Kabsi as a Manager for ${location.name}`} />
          </div>
        </div>
      ) : null}

      <BookingLink
        kind="setup"
        button
        className="h-auto min-h-13 w-full whitespace-normal py-3 text-center"
      >
        Book a free {SETUP_CALL_MINUTES}-minute setup call
      </BookingLink>
    </div>
  );
}
