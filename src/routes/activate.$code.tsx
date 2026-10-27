import { createFileRoute, Link } from "@tanstack/react-router";
import { Nfc } from "lucide-react";
import { ConfirmLayout } from "@/components/layouts/confirm-layout";
import { Button } from "@/components/ui/button";

// Reached from go.kabsi.co/{CODE} when a card isn't linked to a business yet.
export const Route = createFileRoute("/activate/$code")({
  head: () => ({
    meta: [{ title: "Set up this card | Kabsi" }, { name: "robots", content: "noindex" }],
  }),
  component: ActivatePage,
});

function ActivatePage() {
  const { code } = Route.useParams();
  const clean = code
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .slice(0, 6);
  return (
    <ConfirmLayout>
      <div className="grid size-12 place-items-center rounded-full bg-kb-yellow">
        <Nfc className="size-6" aria-hidden="true" />
      </div>
      <h1 className="mt-6 font-display text-h2 leading-tight">This Kabsi card isn't set up yet</h1>
      <p className="mt-3 leading-7 text-text-2">
        Card code <span className="font-mono font-bold text-text-1">{clean}</span>
      </p>

      <div className="mt-7 rounded-card bg-surface-2 p-5">
        <p className="font-bold">Is this your card?</p>
        <p className="mt-1 text-small leading-6 text-text-2">
          Link it to your business, then invite Kabsi as a Manager. We accept your invite and email
          you as soon as we do. After that, every tap opens your Google review page.
        </p>
        <Button asChild className="mt-4 w-full">
          <Link to="/start" search={{ code: clean }}>
            Set it up
          </Link>
        </Button>
      </div>

      <p className="mt-6 text-small leading-6 text-text-2">
        Here to leave a review? Sorry, this card isn't ready yet. Please ask the staff, or find the
        business on Google Maps.
      </p>
      <p className="mt-4 text-small text-text-2">
        Questions:{" "}
        <a className="font-medium text-text-1 underline" href="mailto:hello@kabsi.co">
          hello@kabsi.co
        </a>
      </p>
    </ConfirmLayout>
  );
}
