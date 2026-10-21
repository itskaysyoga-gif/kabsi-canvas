import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeatureAccess } from "@/lib/feature-access";
import { sendReviewLinkHref } from "@/lib/send-review-link";

/**
 * "Send review link" (P0.8-06): opens the staff member's own WhatsApp with the same message for every customer.
 * Part of Essentials and Pro (K-126). Records nothing, counts nothing.
 */
export function SendReviewLink({
  locationId,
  name,
  link,
}: {
  locationId: string;
  name: string;
  link: string | null | undefined;
}) {
  const access = useFeatureAccess(locationId);
  if (!link || access.isLoading) return null;
  return (
    <div className="rounded-card bg-kb-white p-4 shadow-kb sm:p-5">
      <p className="font-bold">Send the review link</p>
      {access.data?.essentials ? (
        <>
          <p className="mt-1 text-sm leading-6 text-kb-stone">
            Opens your own WhatsApp with a short message and the link. Pick the customer and press
            send. Offer it to every customer the same way.
          </p>
          <Button asChild variant="outline" className="mt-3 w-full sm:w-auto">
            <a href={sendReviewLinkHref(name, link)} target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden="true" /> Send review link
            </a>
          </Button>
        </>
      ) : (
        <p className="mt-1 text-sm leading-6 text-kb-stone">
          Sending the link from WhatsApp is part of your Kabsi plan.{" "}
          <Link to="/app/plan" className="font-bold underline underline-offset-4">
            See your plan
          </Link>
        </p>
      )}
    </div>
  );
}
