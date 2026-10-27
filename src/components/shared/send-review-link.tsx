import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendReviewLinkHref } from "@/lib/send-review-link";

/**
 * "Send review link" (P0.8-06): opens the staff member's own WhatsApp with the same message for every customer.
 * Open to every business, with or without a plan (lane R, 21 Oct 2026). Records nothing, counts nothing.
 */
export function SendReviewLink({ name, link }: { name: string; link: string | null | undefined }) {
  if (!link) return null;
  return (
    <div className="rounded-card bg-surface-1 p-4 shadow-rest sm:p-5">
      <p className="font-bold">Send the review link</p>
      <p className="mt-1 text-small leading-6 text-text-2">
        Opens your own WhatsApp with a short message and the link. Pick the customer and press send.
        Offer it to every customer the same way.
      </p>
      <Button asChild variant="outline" className="mt-3 w-full sm:w-auto">
        <a href={sendReviewLinkHref(name, link)} target="_blank" rel="noopener noreferrer">
          <MessageCircle aria-hidden="true" /> Send review link
        </a>
      </Button>
    </div>
  );
}
