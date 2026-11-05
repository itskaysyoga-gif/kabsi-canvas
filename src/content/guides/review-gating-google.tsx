import { Callout, DoDont } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { scheduledAt } from "./schedule";
import type { GuideDoc } from "./types";

// Guides 3, guide 12. Every claim about Google is from the sources below, read on 5 Nov 2026.
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "review-gating-google",
  title: "What is review gating, and why does Google not allow it?",
  description:
    "Review gating means asking only happy customers for a Google review. What Google's policy says, what counts as gating, the risks, and how to ask without it.",
  publishAt: scheduledAt(11),
  updated: READ,
  checked: READ,
  topic: "Reviews",
  answer:
    "Review gating is asking customers how they felt first and sending only the happy ones to Google, or inviting only the customers you expect to be pleased. Google's policy says merchants may not discourage negative reviews or selectively ask for positive ones, and it treats this as rating manipulation that will be removed.",
  inShort: [
    "Gating is any filter that decides who gets asked for a review based on how they feel.",
    "Google lists selectively asking for positive reviews as rating manipulation.",
    "The fix is simple: the same review link, the same words, for every customer.",
    "In the UK, the regulator's guidance also warns against asking only satisfied customers.",
  ],
  sections: [
    {
      id: "what-is-it",
      heading: "What exactly is review gating?",
      answer:
        "It is a filter in front of your review link. The most common form asks 'How was your visit?' with a rating, sends four and five stars on to Google, and sends anyone lower to a private feedback form instead, so unhappy customers never reach your Google profile.",
      body: (
        <>
          <p>It also comes in quieter forms that do the same thing:</p>
          <ul>
            <li>Handing the QR card only to regulars or to customers who smiled at the till.</li>
            <li>Telling staff to ask only when a customer seemed pleased.</li>
            <li>Leaving out the customers who complained when you send review requests.</li>
            <li>A message that says "If you enjoyed your visit, please review us".</li>
          </ul>
          <p>
            Whatever the tool, the test is the same: does how a customer feels decide whether they
            are asked? If yes, it is gating.
          </p>
        </>
      ),
    },
    {
      id: "google-policy",
      heading: "What does Google's policy say about it?",
      answer:
        "Google's Maps content policy, under rating manipulation, says merchants may not discourage or prohibit negative reviews, or selectively solicit positive reviews from customers. The same policy allows merchants to ask for reviews of a genuine experience, without incentives and without trying to influence the rating or the content.",
      body: (
        <>
          <p>The same part of the policy also says merchants should not:</p>
          <ul>
            <li>
              Require or pressure customers to leave ratings or reviews while on the premises.
            </li>
            <li>Request that specific content be included in a review.</li>
            <li>Ask staff to collect a certain number of reviews.</li>
            <li>Ask staff to collect reviews that name a member of staff.</li>
            <li>
              Offer incentives, such as payment, discounts or free goods or services, for a review
              or for changing or removing a negative one.
            </li>
          </ul>
          <p>
            Google's help page on getting more reviews puts the reason plainly: honest and balanced
            reviews help people decide, and a mix of positive and negative feedback often feels more
            trustworthy.
          </p>
        </>
      ),
    },
    {
      id: "what-happens",
      heading: "What can happen if Google finds gated reviews?",
      answer:
        "Google says incentivised or biased reviews are not allowed and will be removed from Maps, and its policy lists selectively asking for positive reviews as a banned practice; reviews that came through a filter are, in this guide's view, a biased selection. For fake and incentivised reviews, Google's restrictions page adds that a business may lose the ability to receive new reviews for a set period, have its existing reviews unpublished for a set period, or show a warning that fake reviews were removed.",
      body: (
        <>
          <p>
            Google says it emails the owner before it applies a restriction, and that the business
            can appeal and give more context. Google also says reviews removed for policy violations
            are not restored.
          </p>
          <Callout kind="warn" title="The tool does not carry the risk for you">
            Some review apps offer a 'happy or unhappy' screen before the review link. Whatever the
            app does in your name is still your business asking your customers, and it is your
            Business Profile that is affected.
          </Callout>
        </>
      ),
    },
    {
      id: "private-feedback",
      heading: "Can I still ask unhappy customers to tell me first?",
      answer:
        "You can always invite any customer to contact you, and it is good practice to fix problems quickly. What the policy rules out is using that as a filter: the review link must not depend on the answer, and you should not steer unhappy customers away from Google.",
      body: (
        <>
          <p>
            A setup that stays on the right side of the rule gives everyone the same thing: the
            Google review link, and next to it, for anyone, a way to reach the manager. Nobody is
            asked to rate their visit before they see the review link.
          </p>
          <p>
            If a customer leaves a negative review anyway, reply calmly and offer to put it right,
            as in{" "}
            <GuideLink slug="how-to-respond-to-negative-google-reviews">
              how to respond to negative Google reviews
            </GuideLink>
            . Google's help says a constructive reply may even encourage the customer to update
            their review; offering them something to change it is not allowed.
          </p>
        </>
      ),
    },
    {
      id: "ask-without-gating",
      heading: "How do I ask for reviews without gating?",
      answer:
        "Ask every customer, at the same point in every visit, with the same words and the same link. Google's own suggestions are the receipt, the thank-you email, the end of a chat and a printed QR code in your shop, all of which reach everyone equally.",
      body: (
        <>
          <DoDont
            yesTitle="Not gating"
            noTitle="Gating"
            yes={[
              "The QR code at the till for every customer",
              "The link in every receipt or follow-up message",
              "Neutral words: 'tell others how your visit went'",
              "A contact line anyone can use, beside the link",
            ]}
            no={[
              "A star rating screen before the Google link",
              "Asking only regulars or smiling customers",
              "'If you were happy with us, review us'",
              "Leaving complainers off the request list",
            ]}
          />
          <p>
            The step by step version, including where to find the link, is in{" "}
            <GuideLink slug="how-to-ask-for-google-reviews">
              how to ask customers for Google reviews
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "uk-law",
      heading: "Is review gating also against the law in the UK?",
      answer:
        "The Competition and Markets Authority's fake reviews guidance, published on 4 April 2025 under the Digital Markets, Competition and Consumers Act 2024, says a business may break the law if it suppresses genuine negative reviews or selectively promotes positive ones. It says cherry picking can be done by encouraging just those who are satisfied to leave reviews.",
      body: (
        <p>
          The same guidance says businesses should not interfere with customers' ability and
          willingness to leave negative reviews, giving examples such as arbitrarily stopping and
          starting review invitations, and making an offer to resolve a dispute depend on the
          customer not leaving a negative review. It is guidance, not a ruling on your case; if you
          are unsure, ask a legal adviser.
        </p>
      ),
    },
    {
      id: "uae",
      heading: "Is it different in the UAE?",
      answer:
        "Google's content policy names no different rule for the UAE, so gating breaks Google's rules for a business there exactly as it does in the UK. This guide does not cover UAE consumer law, so it makes no claim about the legal position there.",
    },
  ],
  kabsi: {
    heading: "What Kabsi does here",
    body: (
      <>
        <p>
          Kabsi's review link, QR code and printed cards open your own Google review page with no
          rating screen, no filtering and no reward: every customer sees the same thing. If you
          choose to show a short page before Google, it shows the Google review button first, the
          same for every visitor, and, when you have added your WhatsApp number, one line to message
          the manager, open to anyone. The cards say "Leave us a Google review" and never mention
          stars. The ready message for customers and the one staff send from their own WhatsApp are
          the same for everyone, and the staff message never uses words like "if you enjoyed", happy
          or 5 stars. Kabsi records nobody, so there are no staff counts or targets.
        </p>
        <p>
          <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Is it gating if I do not ask a customer who complained?",
      a: "Yes, if you leave people out because of how they felt. Google's policy says merchants may not selectively solicit positive reviews, so the same request should go to every customer.",
    },
    {
      q: "Can I send a satisfaction survey as well?",
      a: "A survey is fine on its own. It becomes gating when its answers decide who receives the Google review link, so send the link to everyone, whatever they answered.",
    },
  ],
  sources: [
    {
      title: "Google Maps: Prohibited and restricted content",
      url: "https://support.google.com/contributionpolicy/answer/7400114?hl=en",
      read: READ,
    },
    {
      title: "Google: Tips to get more reviews",
      url: "https://support.google.com/business/answer/3474122?hl=en",
      read: READ,
    },
    {
      title: "Google: Create a Google link or QR code to request reviews",
      url: "https://support.google.com/business/answer/16816815?hl=en",
      read: READ,
    },
    {
      title: "Google: Business Profile restrictions for policy violations",
      url: "https://support.google.com/business/answer/14114287?hl=en",
      read: READ,
    },
    {
      title: "Google: About missing or delayed reviews",
      url: "https://support.google.com/business/answer/10313341?hl=en",
      read: READ,
    },
    {
      title: "GOV.UK: Fake reviews guidance (CMA208)",
      url: "https://assets.publishing.service.gov.uk/media/67eeb64fe9c76fa33048c790/CMA208_-_Fake_reviews_guidance.pdf",
      read: READ,
    },
  ],
  industries: ["hair-salon", "nail-salon", "restaurant", "spa-and-massage"],
  related: [
    "how-to-ask-for-google-reviews",
    "google-review-link-and-qr-code",
    "report-fake-google-reviews",
  ],
  summary:
    "Review gating, asking only happy customers for a Google review, explained: what Google's policy says, what counts, what can happen, the UK regulator's view, and how to ask everyone the same way.",
};
