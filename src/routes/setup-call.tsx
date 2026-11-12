// Help setting up (Fix 2, master plan 30.27 item 2). There is no booking calendar: Rashid helps by email at
// hello@kabsi.co and sends times when a call helps, and on WhatsApp once Kabsi's number is on (WHATSAPP_ON). The address /setup-call is kept, because
// emails, the FAQ and onboarding link to it.
import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layouts/public-layout";
import { SectionHead, buttonClass } from "@/components/kabsi/ui";
import { WhatsappLink } from "@/components/shared/whatsapp-link";
import {
  BOOKING_ANSWERS,
  CONTACT_EMAIL,
  SETUP_CALL_MINUTES,
  WHATSAPP_NUMBER,
  WHATSAPP_ON,
  WORKING_HOURS,
  pageHead,
} from "@/lib/site";
import { oneOf } from "@/lib/search-params";
import { Marked } from "@/components/kabsi/highlight";
import { Closing } from "@/components/kabsi/closing";

const searchSchema = (
  s: Record<string, unknown>,
): { topic?: "setup" | "partner" | "other" | undefined } => ({
  topic: oneOf(s["topic"], ["setup", "partner", "other"] as const),
});

export const Route = createFileRoute("/setup-call")({
  validateSearch: searchSchema,
  head: () =>
    pageHead({
      title: "Help setting up Kabsi | Kabsi",
      description: `Rashid, who runs Kabsi, helps you set up by email, with a free ${SETUP_CALL_MINUTES}-minute call when it helps. You add Kabsi as a Manager yourself. No password, no codes.`,
      path: "/setup-call",
      crumbs: [{ name: "Help setting up", path: "/setup-call" }],
    }),
  component: SetupCallPage,
});

const SETUP_HELP_STEPS = [
  {
    title: `Write to ${CONTACT_EMAIL}`,
    text: "Your business name and city, and the step where you are stuck.",
  },
  {
    title: "Rashid replies with your steps",
    text: `By email. If a free ${SETUP_CALL_MINUTES}-minute call helps, he sends you times for one.`,
  },
  {
    title: "You click, he explains",
    text: "No password and no codes. You stay the owner of your Google profile.",
  },
] as const;

function SetupCallPage() {
  const { topic } = Route.useSearch();
  const kind = topic ?? "setup";
  const subject = `Help with Kabsi: ${BOOKING_ANSWERS[kind]}`;

  return (
    <PublicLayout>
      <section className="container-kb py-10 sm:py-16">
        <SectionHead
          as="h1"
          title={<Marked text="Get help setting up." mark="help" />}
          lead="Rashid, who runs Kabsi, helps you set up by email. You add Kabsi as a Manager yourself, with each step explained."
        />
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="rounded-card border border-line bg-surface-1 p-5 shadow-rest sm:p-7">
            <ol className="space-y-5">
              {SETUP_HELP_STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span
                    aria-hidden
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-kb-yellow text-small font-bold text-kb-black"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <h2 className="text-title font-bold text-text-1">{s.title}</h2>
                    <p className="mt-1 text-body text-text-2">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            {/* Site 3b (audit E3): the free check is the page's one yellow button, in the closing below. */}
            <div className="mt-6">
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`}
                className={buttonClass("secondary", "lg")}
              >
                Email {CONTACT_EMAIL}
              </a>
            </div>
          </div>
          <aside className="space-y-4 rounded-card border border-line bg-surface-2 p-5 text-small text-text-2">
            <p>
              We never ask for your Google password, and we never sign in to your Google account:
              you send the Manager invitation yourself.
            </p>
            <p>
              {WORKING_HOURS} Calls run in those hours. In your email, say what the call is about.
            </p>
            {WHATSAPP_ON ? (
              <>
                <p>
                  Prefer to type? Message us on{" "}
                  <WhatsappLink
                    glyph
                    kind={kind === "setup" ? "setup" : kind === "partner" ? "partner" : "general"}
                  >
                    WhatsApp {WHATSAPP_NUMBER}
                  </WhatsappLink>
                  .
                </p>
                <p>
                  Nora, Kabsi's assistant, answers at once. Ask for a person and Rashid replies in
                  working hours.
                </p>
                <p>We never ask for your Google password or codes there either.</p>
              </>
            ) : null}
          </aside>
        </div>
      </section>
      <Closing />
    </PublicLayout>
  );
}
