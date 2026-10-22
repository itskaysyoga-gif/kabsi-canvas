// Real product mockups for the public site (P0.8-13, K-140). Each one is built from the app's own components: the review
// head, the Kabsi card, the Google Protection change card and the Profile Coach checklist, with invented data that every
// frame labels "Example". They are pictures, not controls: the buttons do nothing and are hidden from assistive technology
// (the figure carries one plain description instead). Nothing here prints a date or a time from the visitor's locale, so the
// server and the browser always draw the same thing (Sentry KABSI-WEB-7).
import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { KabsiMark } from "@/components/shared/kabsi-logo";
import { KabsiCard } from "@/components/ui/kabsi-card";
import { buttonVariants } from "@/components/ui/button";
import { CoachList } from "@/components/coach/coach-list";
import { ChangeCardView } from "@/components/profile/change-card";
import { ReviewHead } from "@/components/reviews/review-head";
import {
  alertButtons,
  reviewAlertBody,
} from "../../../supabase/functions/_shared/whatsapp/alert-text";
import { COACH_ITEMS, type CoachRow } from "@/lib/coach";
import type { Change } from "@/lib/profile-rows";
import type { InboxReview } from "@/lib/reviews";
import { cn } from "@/lib/utils";

/** The label every mockup carries: the data in it is invented. */
export function ExampleTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-pill bg-kb-sand px-2.5 py-1 text-xs font-bold text-kb-stone ring-1 ring-kb-hairline",
        className,
      )}
    >
      Example
    </span>
  );
}

/** A figure for a mockup: the picture is hidden from screen readers and the caption says what it shows. */
export function MockFigure({
  caption,
  children,
  className,
}: {
  caption: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure className={cn("m-0 text-kb-ink", className)}>
      <div aria-hidden="true" className="pointer-events-none select-none">
        {children}
      </div>
      <figcaption className="sr-only">{caption}</figcaption>
    </figure>
  );
}

/** A button as the app draws it, as a picture. */
function FakeButton({
  children,
  variant = "primary",
  className,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "tertiary";
  className?: string;
}) {
  return <span className={cn(buttonVariants({ variant }), className)}>{children}</span>;
}

/** A phone: one calm frame for a screen of the app or a WhatsApp chat. */
export function Phone({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  /** The small bar at the top of the screen. */
  title: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[340px] rounded-[2.6rem] border-[10px] border-kb-black bg-kb-black text-kb-ink shadow-kb",
        className,
      )}
    >
      <div className="overflow-hidden rounded-[2rem] bg-kb-sand">
        <div className="flex items-center justify-between gap-3 border-b border-kb-hairline bg-kb-white px-5 py-3">
          <span className="flex items-center gap-2 text-sm font-bold">{title}</span>
          <ExampleTag />
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// ── The example review: the same shape the app reads from the database. The date is left out on purpose.
export const EXAMPLE_REVIEW: InboxReview = {
  id: "example",
  location_id: "example",
  reviewer_name: "Emma",
  star_rating: 4,
  comment: "Lovely spot and great coffee. We waited a little for a table on Saturday.",
  language: "en",
  risk: "low",
  risk_reasons: [],
  state: "drafted",
  existing_reply: null,
  reply_state: null,
  reply_state_reason: null,
  review_created_at: null,
  is_backlog: false,
  draft: {
    body: "Thank you, Emma. We are glad you enjoyed the coffee, and sorry about the wait on Saturday. We hope to see you again soon.",
    safety_ok: true,
    version: 1,
  },
};

/** The Reviews screen's card for one new review, with the reply ready to approve. */
export function ReviewScreen({ review = EXAMPLE_REVIEW }: { review?: InboxReview }) {
  return (
    <article className="rounded-large bg-kb-white p-5 shadow-kb">
      <ReviewHead review={review} />
      <p className="mt-5 flex items-center gap-2 font-bold">
        <Sparkles className="size-4" aria-hidden="true" /> Your reply, ready to approve
      </p>
      <p className="mt-1 text-sm text-kb-stone">
        Kabsi publishes exactly this text after you approve.
      </p>
      <p className="mt-3 whitespace-pre-wrap rounded-card border-l-4 border-l-kb-yellow bg-kb-sand/60 p-4 text-base leading-7">
        {review.draft?.body}
      </p>
      <div className="mt-5 space-y-2">
        <FakeButton className="h-14 w-full text-lg">Approve reply</FakeButton>
        <div className="grid grid-cols-2 gap-2">
          <FakeButton variant="secondary" className="w-full px-2">
            Edit
          </FakeButton>
          <FakeButton variant="secondary" className="w-full px-2">
            Other options
          </FakeButton>
        </div>
      </div>
    </article>
  );
}

/** The home card for a new review, as the app's Action Center draws it. */
export function ActionScreen() {
  return (
    <KabsiCard
      needsYou
      eyebrow="New review, 4 stars"
      title="Emma left a review"
      draft={EXAMPLE_REVIEW.draft?.body}
      note="Nothing is published until you approve it."
      actions={
        <>
          <FakeButton className="h-11 px-5 text-sm">Approve reply</FakeButton>
          <span className={cn(buttonVariants({ variant: "tertiary" }), "px-2 text-sm")}>Later</span>
        </>
      }
    />
  );
}

/** A change Google Protection found, as the app's card draws it. A phone number moved by one digit. */
export const EXAMPLE_CHANGE: Change = {
  id: "example",
  field: "phone",
  previous_value: { display: "+1 555 010 0142" },
  previous_fact_id: "example",
  google_value: { display: "+1 555 010 0199" },
  source: "scheduled_check",
  status: "detected",
  explanation: "The phone number on Google is not the one you approved.",
  recommend: null,
  recommend_reason: null,
  support_requested_at: null,
  detected_at: "2026-10-01T09:00:00Z",
};

export function ProtectionScreen() {
  return (
    <ChangeCardView change={EXAMPLE_CHANGE} when="Found by Kabsi's daily check">
      <div className="mt-5 flex flex-wrap gap-2">
        <FakeButton className="w-full sm:w-auto">Keep my information</FakeButton>
        <span className={cn(buttonVariants({ variant: "ghost" }))}>Google is right</span>
      </div>
    </ChangeCardView>
  );
}

/** Three rows of the Profile Coach checklist, with the app's own wording. */
export function CoachScreen() {
  const pick = (id: string, status: CoachRow["status"], detail?: CoachRow["detail"]): CoachRow => {
    const item = COACH_ITEMS.find((i) => i.id === id);
    if (!item) throw new Error(`Coach item missing: ${id}`);
    return { ...item, status, detail };
  };
  const rows: CoachRow[] = [
    pick("description", "todo", { length: 0 }),
    pick("attributes", "todo"),
    pick("photos", "done"),
  ];
  return (
    <div className="rounded-large bg-kb-white p-5 shadow-kb">
      <p className="font-bold">Profile Coach</p>
      <p className="mt-1 mb-4 text-sm text-kb-stone">What a complete Google profile has.</p>
      <CoachList rows={rows} />
    </div>
  );
}

/** The WhatsApp alert, built by the same function that builds the real one. */
export function WhatsappChat() {
  const body = reviewAlertBody({
    business: "Cafe Nour",
    stars: 4,
    reviewer: "Emma",
    text: EXAMPLE_REVIEW.comment,
    draft: EXAMPLE_REVIEW.draft?.body ?? null,
  });
  const buttons = alertButtons("example", true);
  return (
    <div className="space-y-2">
      <div className="max-w-[92%] rounded-card rounded-tl-sm bg-kb-white p-3 text-[15px] leading-6 shadow-kb">
        {body.split("\n\n").map((para) => (
          <p key={para} className="mt-2 first:mt-0">
            {para}
          </p>
        ))}
        <p className="mt-2 text-xs text-kb-stone">Kabsi</p>
      </div>
      <div className="grid max-w-[92%] gap-1.5">
        {buttons.map((b, i) => (
          <span
            key={b.id}
            className={cn(
              "rounded-card py-2.5 text-center text-sm font-bold",
              i === 0 ? "bg-kb-yellow text-kb-black" : "bg-kb-white text-kb-ink shadow-kb",
            )}
          >
            {b.title}
          </span>
        ))}
      </div>
    </div>
  );
}

export const PhoneTitle = ({ children }: { children: ReactNode }) => (
  <>
    <KabsiMark className="size-5" />
    {children}
  </>
);
