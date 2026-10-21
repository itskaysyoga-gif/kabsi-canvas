import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeatureAccess } from "@/lib/feature-access";
import { sendReviewLinkHref } from "@/lib/send-review-link";
import { supabase } from "@/lib/supabase";

/** The business's place link: its first active review link (go.kabsi.co/CODE), or null when it has none. */
export function usePlaceLink(locationId: string | undefined) {
  return useQuery({
    queryKey: ["place-link", locationId],
    enabled: !!locationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("cards")
        .select("code")
        .eq("location_id", locationId!)
        .eq("kind", "link")
        .eq("status", "active")
        .order("activated_at")
        .limit(1);
      const code = (data?.[0] as { code: string } | undefined)?.code;
      return code ? `https://go.kabsi.co/${code}` : null;
    },
  });
}

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
            Opens your own WhatsApp with a short message and the link. Pick the customer and send.
            Send it the same way to every customer.
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
