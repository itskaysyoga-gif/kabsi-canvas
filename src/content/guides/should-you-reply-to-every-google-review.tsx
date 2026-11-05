import { Callout, DoDont, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { scheduledAt } from "./schedule";
import type { GuideDoc } from "./types";

// Guides 3, guide 13. Every claim about Google is from the sources below, read on 5 Nov 2026.
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "should-you-reply-to-every-google-review",
  title: "Should you reply to every Google review?",
  description:
    "What Google advises about replying to reviews, which to answer first, what to do with star-only reviews, and how to reply on your Business Profile.",
  publishAt: scheduledAt(12),
  updated: READ,
  checked: READ,
  topic: "Reviews",
  answer:
    "Google recommends replying to reviews as best practice, but it also warns against sending the same thank-you to everyone. So aim to answer every review with something real, and put negative reviews, questions and detailed reviews first.",
  inShort: [
    "Google's advice is to reply to reviews and share your perspective, promptly.",
    "A copied 'thank you' on every review is the thing Google tells you to avoid.",
    "Answer negative reviews and questions first; they matter most to people reading.",
    "Replies are public, show as the business, and the reviewer is notified.",
  ],
  sections: [
    {
      id: "every-review",
      heading: "Does Google want me to reply to every review?",
      answer:
        "Google's help says that, as best practice, you should reply to reviews and share your perspective, and that a prompt response shows you value feedback. It also says that instead of sending the same 'thank you' to everyone, you should focus on reviews where you can share a helpful update or answer a question.",
      body: (
        <p>
          Read together, the advice is not 'reply to everything with the same line' and not 'only
          reply to complaints'. It is: reply where you have something worth saying, and say it in your
          own words. For most small businesses that means a short, specific reply to nearly every
          review that has text, and a careful one to every negative review.
        </p>
      ),
    },
    {
      id: "what-a-reply-does",
      heading: "What does a reply actually do?",
      answer:
        "Google says replying shows customers that you value their feedback, and that your replies are public. A reply appears under the review as the business, without your personal name, and the person who wrote the review is notified.",
      body: (
        <ul>
          <li>
            Customers can still change their review after reading your reply, and the date on the
            review then changes to the latest update.
          </li>
          <li>
            For a negative review, Google says a constructive reply and following up on the concern
            can show you care and may even encourage the customer to update their review.
          </li>
          <li>
            Everyone who reads your reviews later reads your replies too, so a reply is written as
            much for the next customer as for the reviewer.
          </li>
        </ul>
      ),
    },
    {
      id: "which-first",
      heading: "Which reviews should I answer first?",
      answer:
        "Negative reviews first, then reviews that ask a question or mention something you can update, then detailed positive reviews. Google's tips single out negative reviews as a chance to understand customer expectations, and say a timely reply shows you are committed to good service.",
      body: (
        <ol>
          <li>One-star to three-star reviews, especially any that describe a real problem.</li>
          <li>Reviews that ask something: opening times, parking, whether you offer a service.</li>
          <li>Reviews that mention a person, a dish or a service you can thank them for by name.</li>
          <li>Short positive reviews, with a brief, personal line.</li>
        </ol>
      ),
    },
    {
      id: "star-only",
      heading: "What about reviews with only stars and no text?",
      answer:
        "The Google help pages behind this guide set no separate rule for star-only reviews, so replying is your choice. A one-line thank-you that sounds like you is fine; the same pasted line on dozens of reviews is what Google's advice warns against.",
      body: (
        <p>
          If you do reply, keep it to a sentence and vary it: thank them for coming in, or mention the
          day or the service if you know it. If you have nothing to add, putting your time into the
          reviews with text is the better use of it.
        </p>
      ),
    },
    {
      id: "how-to-reply",
      heading: "How do I reply to a review on Google?",
      answer:
        "Open your Business Profile, select Read reviews, select Reply next to the review, write your reply and select Reply. Google says you must verify your business before you can reply to reviews.",
      body: (
        <>
          <Steps
            items={[
              "Sign in to the Google Account that manages your profile and go to your Business Profile.",
              <>
                Select <b>Read reviews</b>.
              </>,
              <>
                Next to the review, select <b>Reply</b>.
              </>,
              <>
                Enter your reply in the box and select <b>Reply</b>.
              </>,
            ]}
          />
          <p>
            To change a reply later, select <b>Edit</b> under it, change the text and select{" "}
            <b>Update</b>; to remove it, select <b>Edit</b>, then <b>Delete</b> and confirm. The full walk-through, with examples, is
            in{" "}
            <GuideLink slug="how-to-reply-to-google-reviews">how to reply to Google reviews</GuideLink>.
          </p>
        </>
      ),
    },
    {
      id: "after-reply",
      heading: "Why does my reply not show straight away?",
      answer:
        "Google checks every reply against its content policies before posting it. It says this usually takes up to 10 minutes but can sometimes take up to 30 days, and if a reply is not approved you will be asked to edit it.",
      body: (
        <Callout kind="tip" title="Keep it clean so it goes through">
          A reply has to follow the same content policies as reviews. Stay polite, leave out personal
          details about the customer, and do not turn it into an advert.
        </Callout>
      ),
    },
    {
      id: "good-reply",
      heading: "What should a good reply say, and leave out?",
      answer:
        "Google's tips are to be professional and polite, keep it short, be conversational rather than promotional, and personalise it by addressing the reviewer by name and signing off. For negative reviews it adds: protect privacy, avoid personal attacks, apologise when appropriate, and explain honestly what you can and cannot do.",
      body: (
        <DoDont
          yesTitle="Google's tips"
          noTitle="Google says to avoid"
          yes={[
            "Use the reviewer's name and mention what they said",
            "Keep it short and direct",
            "Apologise when it is deserved",
            "Ask them to contact you by phone or email to sort it out",
          ]}
          no={[
            "The same 'thank you' on every review",
            "Offers, deals or promotions in the reply",
            "Sharing a reviewer's private information",
            "Personal attacks or arguing in public",
          ]}
        />
      ),
    },
    {
      id: "uk-uae",
      heading: "Is anything different in the UK or the UAE?",
      answer:
        "No. Google's steps and advice for replies are the same in both countries. Google does say reviews are available only in certain countries or regions and for certain business categories, so if you cannot see reviews at all, that may be why.",
      body: (
        <p>
          The practical difference is language: in either country you may get reviews in more than one language, such as English and Arabic in the UAE. Replying in the language the customer wrote in is a natural way to make the reply personal.
        </p>
      ),
    },
  ],
  kabsi: {
    heading: "What Kabsi does here",
    body: (
      <>
        <p>
          Every new review reaches you with a reply already drafted in the reviewer's language, on
          WhatsApp or by email, and you tap Approve reply, Edit or Skip; nothing goes on Google until
          you approve it. A review with only stars gets a short thank-you draft, and a draft that reads
          like a reply you already posted fails Kabsi's checks, so you are not pasting the same line.
          Complaints get a careful draft with the issue shown above it, and a review with a legal
          threat, a safety problem or a named member of your team gets no draft, only a short
          checklist, so you decide what to say. You can also choose "I'll reply myself".
        </p>
        <p>
          When you first connect, Kabsi drafts replies for your most recent unanswered reviews too.{" "}
          <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Can I delete a reply I regret?",
      a: "Yes. On your Business Profile, select Read reviews, then under your reply select Edit, then Delete. You can also edit it and select Update.",
    },
    {
      q: "Should I reply to an old review I missed?",
      a: "Yes, if you have something useful to say. The reviewer is notified when you reply, and anyone reading your reviews sees that you answered.",
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
  ],
  industries: ["restaurant", "cafe", "hair-salon", "spa-and-massage"],
  related: [
    "how-to-reply-to-google-reviews",
    "how-to-respond-to-negative-google-reviews",
    "report-fake-google-reviews",
  ],
  summary:
    "Whether to reply to every Google review: Google's advice to reply but avoid the same thank-you everywhere, which reviews to answer first, star-only reviews, and how replies are checked.",
};
