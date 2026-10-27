import { createFileRoute, Link } from "@tanstack/react-router";
import { Nfc } from "lucide-react";
import { ConfirmLayout } from "@/components/layouts/confirm-layout";
import { QuietMark, QuietTitle } from "@/components/kabsi/d2-quiet";
import { buttonClass } from "@/components/kabsi/ui";
import { CONTACT_EMAIL } from "@/lib/site";

// Reached from go.kabsi.co/{CODE} when a card isn't linked to a business yet. Design 2's quiet page: one card, one
// action (set it up on /start with the code), and a line for a customer who scanned a card that is not ready.
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
      <QuietMark icon={Nfc} />
      <QuietTitle
        lead={
          <>
            Card <span className="font-mono font-bold text-text-1">{clean}</span> is new. Link it to
            your business, then add Kabsi as a Manager on your Google profile. After that, every tap
            opens your Google review page.
          </>
        }
      >
        Set up your card.
      </QuietTitle>
      <Link
        to="/start"
        search={{ code: clean }}
        data-main-cta
        className={buttonClass("primary", "lg", true) + " mt-6"}
      >
        Set it up
      </Link>
      <div className="mt-6 border-t border-line pt-5 text-small text-text-2">
        <p>
          Here to leave a review? This card is not ready yet. Please ask the staff, or find the
          business on Google Maps.
        </p>
        <p className="mt-3">
          Questions:{" "}
          <a
            className="font-bold text-text-1 underline underline-offset-4"
            href={`mailto:${CONTACT_EMAIL}`}
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </ConfirmLayout>
  );
}
