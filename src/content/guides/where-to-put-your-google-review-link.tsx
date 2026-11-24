import { Callout, DoDont, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { SITE3_PUBLISH_AT } from "./schedule";
import type { GuideDoc } from "./types";

// Weekly guide 9 (the 36th guide), for any business. The salon version is where-to-put-your-google-review-link-salon.
// Every claim about Google is from the Google sources below, read on 24 Nov 2026.
const READ = "2026-11-24";

export const guide: GuideDoc = {
  slug: "where-to-put-your-google-review-link",
  title: "Where should I put my Google review link?",
  description:
    "Where to put your Google review link and QR code: receipt, thank-you email, email signature, the till. Google's rules: ask everyone, no rewards, no filtering.",
  publishAt: SITE3_PUBLISH_AT,
  updated: READ,
  checked: READ,
  topic: "Reviews",
  answer:
    "Put the link in the messages customers already get after a real visit, and the QR code where they pay or wait. Send the same request to every customer, and never offer a reward for a review.",
  inShort: [
    "Google suggests receipts, thank-you emails, the end of a chat and a QR code printed in your store.",
    "You can also send the request by email, WhatsApp or a Facebook post.",
    "Ask every customer the same way. Do not pick only the ones who seem happy.",
    "No free or discounted goods or services in exchange for a review.",
  ],
  sections: [
    {
      id: "get-the-link",
      heading: "How do I get the link and the QR code?",
      answer:
        "On a computer, go to your Business Profile and select Read reviews, then Get more reviews. Select Copy for the review link, or right-click the QR code and select Save image as. Google says review QR codes can only be made on a computer browser, not on a phone.",
      body: (
        <>
          <Steps
            items={[
              "On a computer, go to your Business Profile.",
              "Select Read reviews, then Get more reviews.",
              "To copy the review link, select Copy.",
              "To save the QR code, right-click it and select Save image as.",
            ]}
          />
          <p>
            Open the link on your own phone before you print or send anything. The longer
            walk-through is in{" "}
            <GuideLink slug="google-review-link-and-qr-code">
              how to get your Google review link and QR code
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "where",
      heading: "Which places work best for the link?",
      answer:
        "The places Google itself names: receipts, thank-you emails, the end of a chat, and a QR code printed and displayed in your store. Google also says you can send review requests by email, WhatsApp or a Facebook post.",
      body: (
        <>
          <p>
            Google's list is short. The places below build on it, and some, such as the invoice, the
            booking confirmation and your email signature, are this guide's own suggestions. Pick
            the ones that match how your customers already hear from you, so the request feels like
            part of the visit and not a new chore.
          </p>
          <ul>
            <li>
              <b>The receipt:</b> the QR code or a short link printed at the bottom, in the same
              place every time.
            </li>
            <li>
              <b>The invoice:</b> for work that is paid later, put the link in the note under the
              total, or in the email that carries the invoice.
            </li>
            <li>
              <b>The thank-you email:</b> one line and the link, sent after the visit or the job.
            </li>
            <li>
              <b>The booking confirmation for a return visit:</b> only for a customer who has
              already used you. A first-time customer has nothing to review yet.
            </li>
            <li>
              <b>Your email signature:</b> a small line under your name, the same on every email.
            </li>
            <li>
              <b>The QR code at the till:</b> a small card by the card machine, where every customer
              stops once.
            </li>
            <li>
              <b>The end of a chat:</b> a last message once the question is answered, with the link.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "when",
      heading: "When is the right moment to ask?",
      answer:
        "After the visit or the job is done, in the same words for every customer. Google's policy says merchants should not require or pressure users to leave ratings or write reviews while on the premises.",
      body: (
        <>
          <p>
            Google's policy says only that merchants should not require or pressure users to leave
            reviews while on the premises. As this guide's own illustration, standing next to a
            customer while they type, or handing over a tablet and waiting, would feel like that
            pressure. A card on the counter with one friendly line is this guide's advice, not
            Google's statement. A message that arrives after they have left gives them time to
            decide.
          </p>
          <Callout kind="tip" title="One line for everyone">
            "If you have a minute, we would love an honest review on Google." Same words, every
            customer, every time.
          </Callout>
        </>
      ),
    },
    {
      id: "everyone",
      heading: "Do I have to send it to every customer?",
      answer:
        "Yes, send the same request to everyone you would normally thank. Google's policy does not allow businesses to discourage or prohibit negative reviews, or selectively solicit positive reviews from customers.",
      body: (
        <>
          <p>
            That means no asking first how the visit went and sending only the happy ones to Google.
            It also means no leaving someone out because you think they were unhappy. This is often
            called review gating, and{" "}
            <GuideLink slug="review-gating-google">
              what review gating is, and why Google does not allow it
            </GuideLink>{" "}
            explains it in full.
          </p>
          <p>
            The same policy lists merchants requesting that staff solicit a certain number of
            reviews. So no targets per person on your team, and no prize for whoever collects the
            most.
          </p>
        </>
      ),
    },
    {
      id: "rewards",
      heading: "Can I give a discount or a free item for a review?",
      answer:
        "No. Google calls offering free or discounted goods or services in exchange for reviews fake engagement and says it is strictly prohibited. The policy also covers incentives to change a review or remove a negative one.",
      body: (
        <DoDont
          yesTitle="Allowed"
          noTitle="Not allowed"
          yes={[
            "A QR code at the till and on the receipt.",
            "The link in every customer's thank-you email.",
            "One plain line asking for an honest review.",
          ]}
          no={[
            "10 percent off your next visit for a review.",
            "A free product or a prize draw for reviewers.",
            "Sending the link only to customers you think are happy.",
            "A target number of reviews for each member of staff.",
          ]}
        />
      ),
    },
    {
      id: "wording",
      heading: "What should the message say?",
      answer:
        "Something short and neutral that asks for an honest review and nothing more. Do not mention stars, and do not tell the customer what to write.",
      body: (
        <>
          <Steps
            items={[
              'On the receipt or card: your business name, the QR code and "Tell us how your visit went."',
              'In the email: "Thank you for choosing us. If you have a minute, tell others how it went:" followed by the link.',
              "In your email signature: the same words and the same link every time.",
            ]}
          />
          <p>
            Check every few months that the link still opens your own review page, and test it again
            if you change your business name or move. For a salon or barbershop there is a version
            with more detail:{" "}
            <GuideLink slug="where-to-put-your-google-review-link-salon">
              where a salon or barbershop puts its review link
            </GuideLink>
            .
          </p>
        </>
      ),
    },
  ],
  kabsi: {
    heading: "What Kabsi does here",
    body: (
      <>
        <p>
          Kabsi gives you a free review link and QR code that open your Google review page, and a
          counter card you can print. You can make a separate link for each place, one for the
          receipt, one for the till and one for your email signature, and see how many times each
          link was tapped. A tap is not a review: Google decides which reviews appear.
        </p>
        <p>
          Kabsi never contacts your customers and never receives their details. You paste the link
          once into a message your own tools already send, and the same message goes to everyone.{" "}
          <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Can I put the link in my email signature?",
      a: "Google does not name email signatures, but it names thank-you emails and review requests sent by email. A signature line is the same link in the same words for everyone you write to.",
    },
    {
      q: "Can I ask customers to leave five stars?",
      a: "No. Ask for an honest review and let the customer choose the rating. Google's policy allows asking for reviews without attempting to influence the rating or the contents of the review.",
    },
    {
      q: "Can I put the QR code on my phone to scan from the app?",
      a: "Google says QR codes can only be made on a computer browser, not on a mobile device. Make the code on a computer, save it, then print it or add it to your messages.",
    },
  ],
  sources: [
    {
      title: "Google: Create a Google link or QR code to request reviews",
      url: "https://support.google.com/business/answer/16816815",
      read: READ,
    },
    {
      title: "Google: Tips to get more reviews",
      url: "https://support.google.com/business/answer/3474122",
      read: READ,
    },
    {
      title: "Google Maps: Prohibited and restricted content",
      url: "https://support.google.com/contributionpolicy/answer/7400114",
      read: READ,
    },
  ],
  industries: ["cafe", "restaurant", "auto-repair", "dental-clinic"],
  related: [
    "google-review-link-and-qr-code",
    "how-to-ask-for-google-reviews",
    "review-gating-google",
    "where-to-put-your-google-review-link-salon",
  ],
  summary:
    "Where any business can put its Google review link and QR code: receipt, invoice, thank-you email, email signature and the till, with Google's rules against rewards, filtering and staff targets.",
};
