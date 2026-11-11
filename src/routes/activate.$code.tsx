import { createFileRoute, Link } from "@tanstack/react-router";
import { Nfc } from "lucide-react";
import { ConfirmLayout } from "@/components/layouts/confirm-layout";
import { QuietMark, QuietTitle } from "@/components/kabsi/d2-quiet";
import { buttonClass } from "@/components/kabsi/ui";
import { CONTACT_EMAIL, linkCardHref, WHATSAPP_ON } from "@/lib/site";

// Reached from go.kabsi.co/{CODE} when a card isn't linked to a business yet. Design 2's quiet page: one card, one
// action (set it up on /start with the code), and a line for a customer who scanned a card that is not ready.
// Cards 2 (master plan 30.50 item 9): "Set up on WhatsApp" opens a chat with "Link card CODE" filled in; Kabsi answers
// there with one confirm and the place. Shown only while Kabsi's WhatsApp number is set (WHATSAPP_ON).
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
      {WHATSAPP_ON && linkCardHref(clean) ? (
        <a href={linkCardHref(clean)!} className={buttonClass("whatsapp", "lg", true) + " mt-3"}>
          Set up on WhatsApp
        </a>
      ) : null}
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
