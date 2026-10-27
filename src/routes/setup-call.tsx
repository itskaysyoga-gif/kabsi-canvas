import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layouts/public-layout";
import { BookingLink } from "@/components/shared/booking-link";
import { SectionHead } from "@/components/kabsi/ui";
import { WhatsappLink } from "@/components/shared/whatsapp-link";
import {
  BOOKING_ANSWERS,
  BOOKING_READY,
  CONTACT_EMAIL,
  SETUP_CALL_MINUTES,
  WHATSAPP_NUMBER,
  WHATSAPP_ON,
  bookingUrl,
  pageHead,
} from "@/lib/site";
import { z } from "zod";

const searchSchema = z.object({
  topic: z.enum(["setup", "partner", "other"]).optional().catch(undefined),
});

export const Route = createFileRoute("/setup-call")({
  validateSearch: searchSchema,
  head: () =>
    pageHead({
      title: "Book a free setup call | Kabsi",
      description: `A free ${SETUP_CALL_MINUTES}-minute call with the Kabsi team to set up your Google profile, talk about partnering, or ask anything else.`,
      path: "/setup-call",
      crumbs: [{ name: "Free setup call", path: "/setup-call" }],
    }),
  component: SetupCallPage,
});

function SetupCallPage() {
  const { topic } = Route.useSearch();
  const kind = topic ?? "setup";

  return (
    <PublicLayout>
      <section className="container-kb py-10 sm:py-16">
        <SectionHead
          as="h1"
          title="Book a setup call."
          lead={`A short call to set up Kabsi with you. You pick the time. ${SETUP_CALL_MINUTES} minutes with the Kabsi team.`}
        />
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          {BOOKING_READY ? (
            <iframe
              title="Book a call with Kabsi"
              src={bookingUrl(kind, true)}
              loading="lazy"
              className="h-[700px] w-full rounded-card border border-line bg-surface-1 shadow-rest"
            />
          ) : (
            <div className="rounded-card border border-line bg-surface-1 p-5 shadow-rest sm:p-7">
              <h2 className="font-display text-h3 font-bold text-text-1">Pick a time by email</h2>
              <p className="mt-3 text-body text-text-2">
                The booking calendar is on its way. Until then, write to{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="font-bold text-text-1 underline underline-offset-4"
                >
                  {CONTACT_EMAIL}
                </a>{" "}
                and a person replies with times.
              </p>
              <div className="mt-5" data-main-cta>
                <BookingLink kind={kind} button>
                  Email the team
                </BookingLink>
              </div>
            </div>
          )}
          <aside className="space-y-4 rounded-card border border-line bg-surface-2 p-5 text-small text-text-2">
            <p>
              We guide, you click. We never ask for your Google password, and we never sign in to
              your Google account: you send the Manager invitation yourself, with us beside you.
            </p>
            <p>
              Calls run Monday to Friday, 8am to 6pm Beirut time. The call is about:{" "}
              {Object.values(BOOKING_ANSWERS).join(", ")}. Questions? Write to{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-text-1 underline underline-offset-4"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
            {WHATSAPP_ON ? (
              <p>
                Prefer to type? Message us on{" "}
                <WhatsappLink
                  kind={kind === "setup" ? "setup" : kind === "partner" ? "partner" : "general"}
                >
                  WhatsApp {WHATSAPP_NUMBER}
                </WhatsappLink>
                . A person replies. We never ask for your Google password or codes there either.
              </p>
            ) : null}
          </aside>
        </div>
      </section>
    </PublicLayout>
  );
}
