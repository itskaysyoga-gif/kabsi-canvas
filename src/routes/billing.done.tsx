import { createFileRoute, Link } from "@tanstack/react-router";
import { ConfirmLayout } from "@/components/layouts/confirm-layout";
import { Button } from "@/components/ui/button";

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
      <h1 className="font-display text-h3 leading-tight">You are all set.</h1>
      <p className="mt-3 leading-7 text-text-2">
        Your plan starts the day Kabsi&apos;s access to your Google listing works.
      </p>
      <Button asChild className="mt-6 w-full">
        <Link to="/app/plan">Back to Kabsi</Link>
      </Button>
    </ConfirmLayout>
  );
}
