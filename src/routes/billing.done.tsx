import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { ConfirmLayout } from "@/components/layouts/confirm-layout";
import { QuietMark, QuietTitle } from "@/components/kabsi/d2-quiet";
import { buttonClass } from "@/components/kabsi/ui";

// Where Creem sends the owner after paying (master plan 10.2.7, success_url). The copy is docs/COPY.md section 23. The
// page changes nothing: the paid state is written only by the Creem webhook (10.2.8).
export const Route = createFileRoute("/billing/done")({
  head: () => ({
    meta: [{ title: "You are all set | Kabsi" }, { name: "robots", content: "noindex" }],
  }),
  component: BillingDonePage,
});

function BillingDonePage() {
  return (
    <ConfirmLayout>
      <QuietMark icon={Check} tone="ok" />
      <QuietTitle lead="Your plan starts the day Kabsi's access to your Google profile works.">
        You are all set.
      </QuietTitle>
      <Link to="/app/plan" data-main-cta className={buttonClass("primary", "lg", true) + " mt-6"}>
        Back to Kabsi
      </Link>
    </ConfirmLayout>
  );
}
