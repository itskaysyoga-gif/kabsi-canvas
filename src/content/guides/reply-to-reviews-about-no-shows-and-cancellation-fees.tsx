import { Callout, DoDont } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { weeklyAt } from "./schedule";
import type { GuideDoc } from "./types";

// Weekly guide 6 (the 33rd guide), for salons, nail bars, lash studios and barbers in the UK and the UAE. Every claim
// about Google is from the Google sources below, read on 8 Nov 2026. The example reviews and replies are invented.
const READ = "2026-11-08";

export const guide: GuideDoc = {
  slug: "reply-to-reviews-about-no-shows-and-cancellation-fees",
  title: "How do I reply to a review about a cancellation fee?",
  description:
    "Calm Google review replies for salons, nail and lash studios about no-show fees, late arrivals and cancellations, without arguing or sharing details.",
  publishAt: weeklyAt(5),
  updated: READ,
  checked: READ,
  topic: "Reviews",
  answer:
    "Thank the client, state your policy in one plain sentence as clients see it when they book, and invite them to get in touch through the details on your profile. Leave out the amount, the dates and anything about their booking history, and never offer to refund the fee in return for changing the review.",
  inShort: [
    "A client charged a fee had a real dealing with your business, so plan to reply rather than report.",
    "Explain the policy once, calmly, and say what you can and cannot do.",
    "No amounts, card details, dates or booking history in a public reply.",
    "A refund can be offered privately on its merits, never in exchange for the review.",
  ],
  sections: [
    {
      id: "allowed",
      heading: "Can a client review us over a fee if they never came in?",
      answer:
        "Usually, yes. Google says a review should reflect a genuine experience with a business, and booking an appointment and being charged a fee is a dealing with your business. Google also says it removes only reviews that break its policies, not ones a business disagrees with.",
      body: (
        <p>
          So a one-star review about a no-show fee is normally one to answer, not one to report. A
          review is worth reporting only when it breaks a policy, for example when it comes from
          someone who was never a client, from a competitor or a former employee, or when it
          harasses a member of staff. The steps are in{" "}
          <GuideLink slug="report-fake-google-reviews">
            how to report fake or spam reviews on Google
          </GuideLink>
          .
        </p>
      ),
    },
    {
      id: "no-show",
      heading: "How do I reply to a complaint about a no-show fee?",
      answer:
        "Keep it short and kind. Thank them, say you understand that a fee is frustrating, give the reason for the policy in one sentence, and ask them to get in touch so you can talk about their booking in private.",
      body: (
        <>
          <p>
            <b>Example review, 1 star:</b> "Charged me for an appointment I forgot about. Greedy."{" "}
            <b>Reply:</b> "Thank you for your feedback, Dana, and we understand a fee is
            frustrating. Each appointment holds a technician's time for you, which is why our
            booking page asks for notice to cancel. Please get in touch through the details on our
            profile and we will look at your booking together. Polish Nail Bar"
          </p>
          <p>
            Google's tips for negative reviews include being honest, explaining what you can and
            cannot do, and apologising when appropriate. Google's own example is a business that
            cancels an event for bad weather explaining that it sends advance notice when it can.
            The same idea works here: say why the rule exists, not that the client broke it.
          </p>
        </>
      ),
    },
    {
      id: "late",
      heading: "What about a client who arrived late and lost the slot?",
      answer:
        "Say sorry that the visit did not happen, explain once why a late start cannot always be fitted in, and invite them back. Lash sets, nail extensions and colour need a fixed amount of time, and a calm reply that says so reads as fair to the next client.",
      body: (
        <p>
          <b>Example review, 2 stars:</b> "Ten minutes late and they refused to do my lashes."{" "}
          <b>Reply:</b> "We are sorry your appointment did not go ahead, Nour. A full set needs the
          whole appointment, and starting late would have meant rushing your lashes or making the
          next client wait. We would love to see you again, and you can reach us through our profile
          to rebook. Lash Studio" Write only what is true for your studio. If you sometimes do fit a
          late client in, say that instead.
        </p>
      ),
    },
    {
      id: "we-cancelled",
      heading: "How do I reply when we were the ones who cancelled?",
      answer:
        "Apologise plainly and own it. A salon that cancels on a client and then argues in a reply looks worse than the cancellation itself, so say sorry, give the reason only if it helps, and say what you have changed to avoid it.",
      body: (
        <p>
          <b>Example review, 1 star:</b> "Cancelled my bridal trial the night before." <b>Reply:</b>{" "}
          "You are right to be upset, Grace, and we are sorry. Your stylist was ill and we should
          have found you another time straight away. Please get in touch through our profile and we
          will put that right. Rose Lane Salon" Google says a constructive reply and following up on
          concerns can show you care, and may even encourage the client to update their review. It
          is their choice whether they do.
        </p>
      ),
    },
    {
      id: "never-write",
      heading: "What should I never write about a fee in a public reply?",
      answer:
        "Anything private or anything that sounds like a threat. Google says never to share a reviewer's private information or engage in personal attacks, and its content policy treats financial information about a person as personal information.",
      body: (
        <DoDont
          yesTitle="Fine in a reply"
          noTitle="Keep out of a reply"
          yes={[
            "The reason for your policy, in one sentence.",
            "That the policy is shown when clients book, if it is.",
            "An invitation to get in touch through your profile.",
          ]}
          no={[
            "The amount charged, the card or the payment.",
            "How many times they missed or cancelled before.",
            "Debt collection, legal action or a ban.",
            "A refund offered if they change or remove the review.",
          ]}
        />
      ),
    },
    {
      id: "refund",
      heading: "Should I refund the fee to make the review go away?",
      answer:
        "Decide the refund on its merits, privately, and never link it to the review. Google's policy says businesses must not offer incentives, such as payment, discounts or free services, in exchange for posting a review or for revising or removing a negative one.",
      body: (
        <>
          <p>
            If you refund, refund because it is fair, and say nothing about the review when you do.
            If the client then updates the review by choice, that is their decision. Asking for it,
            or making the refund depend on it, is what Google's policy does not allow.
          </p>
          <Callout kind="tip" title="Stop the next review before it starts">
            Put your cancellation and lateness policy on your booking page and in the booking
            confirmation, where clients agree to it. Google says a business description can include
            anything helpful for customers to know, so a line that you work by appointment fits
            there too.
          </Callout>
        </>
      ),
    },
  ],
  kabsi: {
    heading: "What Kabsi does here",
    body: (
      <>
        <p>
          Kabsi emails you at once about a review of 3 stars or less. A complaint about a fee, a
          refund request or a late start gets a careful draft with the issue shown above it, for
          example "They mention a refund. Kabsi didn't promise one." The draft points the client to
          the details on your profile and never contains a phone number, an email or a link. You
          approve it, edit it or skip it.
        </p>
        <p>
          A review that threatens legal action, accuses someone of a crime or names a member of your
          team in a complaint gets no draft: it is marked "This review needs a little more care"
          with a short checklist, and Kabsi writes a short, neutral holding reply only if you ask.
          Kabsi works only with your Google profile: it does not connect to your booking system and
          does not see who booked or paid. <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Can I report a review from someone who never turned up?",
      a: "You can report any review, but Google removes only reviews that break its policies. A client who booked and was charged had a dealing with your business, so a calm reply usually does more.",
    },
    {
      q: "Should I say the policy was in their confirmation email?",
      a: "You can say the policy is shown when clients book. Leave out anything about this client's own emails, card or history, which belong in a private conversation.",
    },
  ],
  sources: [
    {
      title: "Google: Tips to get more reviews",
      url: "https://support.google.com/business/answer/3474122?hl=en",
      read: READ,
    },
    {
      title: "Google: Manage customer reviews",
      url: "https://support.google.com/business/answer/3474050?hl=en",
      read: READ,
    },
    {
      title: "Google Maps: Prohibited and restricted content",
      url: "https://support.google.com/contributionpolicy/answer/7400114?hl=en",
      read: READ,
    },
    {
      title: "Google: Report inappropriate reviews on your Business Profile",
      url: "https://support.google.com/business/answer/4596773?hl=en",
      read: READ,
    },
    {
      title: "Google: Edit your Business Profile",
      url: "https://support.google.com/business/answer/3039617?hl=en",
      read: READ,
    },
  ],
  industries: ["nail-salon", "lash-and-brow-studio", "hair-salon", "barbershop"],
  related: [
    "reply-to-bad-google-review-salon",
    "how-to-respond-to-negative-google-reviews",
    "reply-to-review-that-names-your-stylist",
  ],
  summary:
    "How a salon, nail bar, lash studio or barbershop replies to Google reviews about no-show fees, late arrivals and cancellations: state the policy once, keep details private, never trade a refund for the review.",
};
