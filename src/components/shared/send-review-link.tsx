import { WhatsAppGlyph, buttonClass } from "@/components/kabsi/ui";
import { sendReviewLinkHref } from "@/lib/send-review-link";

/**
 * "Send review link" (P0.8-06): opens the staff member's own WhatsApp with the same message for every customer.
 * Open to every business, with or without a plan (lane R, 21 Oct 2026). Records nothing, counts nothing.
 */
export function SendReviewLink({ name, link }: { name: string; link: string | null | undefined }) {
  if (!link) return null;
  return (
    <div className="rounded-card border border-line bg-surface-1 p-4 shadow-rest sm:p-5">
      <p className="font-bold">Send the review link</p>
      <p className="mt-1 text-small text-text-2">
        Opens your own WhatsApp with a short message and the link. Pick the customer and press send.
        Offer it to every customer the same way.
      </p>
      <a
        href={sendReviewLinkHref(name, link)}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass("whatsapp", "md") + " mt-3"}
      >
        <WhatsAppGlyph className="size-4.5" />
        Send review link
      </a>
    </div>
  );
}
