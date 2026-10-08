import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layouts/public-layout";
import { H2, PageHero, Section } from "@/components/marketing/parts";
import { BookingLink } from "@/components/shared/booking-link";
import {
  BOOKING_ANSWERS,
  BOOKING_READY,
  CONTACT_EMAIL,
  SETUP_CALL_MINUTES,
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
      <PageHero
        eyebrow="Free call"
        title="Book a free setup call"
        sub={`${SETUP_CALL_MINUTES} minutes with the Kabsi team. Pick a time that suits you and tell us what the call is about.`}
        crumbs={[{ name: "Free setup call" }]}
      />
      <Section className="max-w-3xl space-y-8 text-[17px] leading-8">
        <p className="text-kb-stone">
          We guide, you click. We never ask for your Google password, and we never sign in to your
          Google account: you send the Manager invitation yourself, with us beside you.
        </p>
        {BOOKING_READY ? (
          <iframe
            title="Book a call with Kabsi"
            src={bookingUrl(kind, true)}
            loading="lazy"
            className="h-[700px] w-full rounded-large border border-kb-hairline bg-kb-white"
          />
        ) : (
          <div className="rounded-large bg-kb-sand p-6">
            <H2 className="text-2xl">Pick a time by email</H2>
            <p className="mt-3 text-kb-stone">
              The booking calendar is on its way. Until then, write to{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-bold underline underline-offset-4"
              >
                {CONTACT_EMAIL}
              </a>{" "}
              and a person replies with times.
            </p>
            <div className="mt-5">
              <BookingLink kind={kind} button>
                Email the team
              </BookingLink>
            </div>
          </div>
        )}
        <p className="text-sm text-kb-stone">
          Calls run Monday to Friday, 8am to 6pm Beirut time. The call is about:{" "}
          {Object.values(BOOKING_ANSWERS).join(", ")}. Questions? Write to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </PublicLayout>
  );
}
