import { Callout, DoDont, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import type { GuideDoc } from "./types";

// Guides 3, earlier guide rewritten on the template. Every claim about Google is from the sources below, read on 5 Nov 2026.
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "google-review-link-and-qr-code",
  title: "How to get your Google review link and QR code",
  description:
    "Where to find the link that opens your Google review form, how to save the QR code, where to share them, and the rules Google sets for asking.",
  publishAt: "2026-09-26T00:00:00Z",
  updated: READ,
  checked: READ,
  topic: "Google reviews",
  answer:
    "Open your Business Profile, select Read reviews, then Get more reviews, and select Copy to copy your review link. On a computer you can also right-click the QR code and save it as an image, because Google says review QR codes can only be made on a computer browser.",
  inShort: [
    "Read reviews, then Get more reviews, then Copy gives you the link.",
    "The QR code is only available on a computer browser: right-click it to save it.",
    "Share it on receipts, in thank you emails and messages, and print the QR code in your shop.",
    "Ask every customer the same way. Never offer anything in return for a review.",
  ],
  sections: [
    {
      id: "get-the-link",
      heading: "Where do I find my Google review link?",
      answer:
        "Go to your Business Profile, select Read reviews, then Get more reviews. Google shows the link with a Copy button and other ways to share it.",
      body: (
        <>
          <Steps
            items={[
              "Go to your Business Profile.",
              <>
                Select <b>Read reviews</b>, then <b>Get more reviews</b>.
              </>,
              <>
                Select <b>Copy</b> to copy the review link.
              </>,
            ]}
          />
          <p>
            Paste the link somewhere safe, such as a note on your phone, so you have it ready. It
            opens the review form for your business, so customers do not have to search for you
            first. Google's pages here name no separate rule for the UK or the UAE.
          </p>
        </>
      ),
    },
    {
      id: "qr-code",
      heading: "How do I get the QR code?",
      answer:
        "Do the same steps on a computer. Google says review QR codes can only be generated on a computer browser, not on mobile devices: on the Get more reviews screen, right-click the QR code and select Save image as.",
      body: (
        <>
          <Steps
            items={[
              "On a computer, open your Business Profile.",
              <>
                Select <b>Read reviews</b>, then <b>Get more reviews</b>.
              </>,
              "Right-click the QR code.",
              <>
                Select <b>Save image as...</b> and save it.
              </>,
            ]}
          />
          <p>
            Print it large enough to scan from where people stand, and test it with your own phone
            before you print a batch.
          </p>
        </>
      ),
    },
    {
      id: "where-to-share",
      heading: "Where should I put the link and the QR code?",
      answer:
        "Google suggests putting it on your receipts, in thank you emails, at the end of a chat with a customer and on a printed QR code in your store. It also says you can send review requests by email, WhatsApp message or Facebook post.",
      body: (
        <ul>
          <li>
            <b>In person:</b> a small card with the QR code at the counter, the till or the table,
            where people wait or pay.
          </li>
          <li>
            <b>After the visit:</b> the bottom of a receipt, a thank you email or the end of a
            WhatsApp chat after the visit.
          </li>
          <li>
            <b>Online:</b> your Instagram or Facebook bio and your website's contact page.
          </li>
        </ul>
      ),
    },
    {
      id: "the-rules",
      heading: "What are Google's rules for asking for reviews?",
      answer:
        "Google says reviews must reflect a genuine experience, and that offering incentives such as free or discounted goods or services for posting, changing or removing reviews is fake engagement and strictly prohibited. Its policy also says businesses must not discourage negative reviews or selectively ask only for positive ones.",
      body: (
        <>
          <DoDont
            yesTitle="Allowed"
            noTitle="Not allowed"
            yes={[
              "Asking every customer the same way.",
              "Sharing the link or QR code with everyone.",
              "Reminding customers they can leave a review.",
            ]}
            no={[
              "A discount, gift or prize for a review.",
              "Asking only the customers you expect to be happy.",
              "Setting staff a number of reviews to collect.",
              "Asking people to mention a staff member or certain words.",
            ]}
          />
          <p>
            Google's policy also says businesses should not require or pressure people to leave
            ratings or write reviews while on the premises. Put the QR code where people can use it
            if they want to, and let them choose. More on this is in{" "}
            <GuideLink slug="review-gating-google">
              review gating and why Google does not allow it
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "why-no-review",
      heading: "Someone scanned the code but no review appeared. Why?",
      answer:
        "Opening the link is not the same as leaving a review: an open is not a review. Google also says customers must be signed in to a Google Account to leave a review, and that they can create one with a non-Gmail email address.",
      body: (
        <p>
          If a customer tells you they posted a review that you cannot see, Google's help has a page
          about missing or delayed reviews. Do not ask the customer to post it again from another
          account: Google's policy does not allow content posted from several accounts at one
          person's request.
        </p>
      ),
    },
    {
      id: "staff",
      heading: "How should my staff ask?",
      answer:
        "Give everyone the same simple line and the same link, for every customer, with no reward and no target. For example: 'Thanks for coming in. If you would like to leave a review, here is our link.'",
      body: (
        <>
          <p>
            Google's policy names two things businesses must not do with staff: ask staff to collect
            a certain number of reviews, or ask them to collect reviews with specific content,
            including content that names a staff member. A shared, neutral line keeps everyone
            inside the rules.
          </p>
          <Callout kind="warn" title="Ask everyone, or no one">
            Handing the QR code only to customers who seem pleased is selectively asking for
            positive reviews, which Google's policy does not allow. Ask everyone the same way, as
            they visit.
          </Callout>
          <p>
            For the wider habit of asking, see{" "}
            <GuideLink slug="how-to-ask-for-google-reviews">
              how to ask customers for Google reviews the right way
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
          The <SiteRef to="/google-review-link">free review link and QR tool</SiteRef> works without
          signing in: search your business name and city to get a review link for your Google
          profile, a QR code image and a printable counter card, from any phone. Inside Kabsi, Get
          reviews gives you a short link and a QR code, free for every business, that open your
          Google review page by default; you can set a link to show a short Kabsi page first
          (kabsi.co/review/CODE), with the Google review button first and large. Get Reviews shows
          how often each link was opened. An open is not a review: Google decides which reviews
          appear.
        </p>
        <p>
          Send review link opens a staff member's own WhatsApp with the same message for every
          customer, and Kabsi records nothing about who sent it or how many: no targets, no
          leaderboards, no reward. <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Does the link ever change?",
      a: "Google's page does not say how long a review link lasts. Test your printed QR code from time to time with your own phone, and copy the link again from Get more reviews if it stops opening your review form.",
    },
    {
      q: "Can I put the link on Instagram or in a WhatsApp message?",
      a: "Yes. Google says you can send review requests by email, WhatsApp message or Facebook post. Send it to every customer in the same way, not only the happy ones.",
    },
  ],
  sources: [
    {
      title: "Google: Create a Google link or QR code to request reviews",
      url: "https://support.google.com/business/answer/16816815?hl=en",
      read: READ,
    },
    {
      title: "Google: Tips to get more reviews",
      url: "https://support.google.com/business/answer/3474122?hl=en",
      read: READ,
    },
    {
      title: "Google: Prohibited and restricted content (Maps user contributed content policy)",
      url: "https://support.google.com/contributionpolicy/answer/7400114?hl=en",
      read: READ,
    },
    {
      title: "Google: Manage customer reviews",
      url: "https://support.google.com/business/answer/3474050?hl=en",
      read: READ,
    },
  ],
  industries: ["cafe", "bakery", "hair-salon", "nail-salon"],
  related: [
    "how-to-ask-for-google-reviews",
    "review-gating-google",
    "how-to-reply-to-google-reviews",
  ],
  summary:
    "Where to find your Google review link (Read reviews, Get more reviews, Copy), how to save the QR code on a computer, where to share it, and Google's rules for asking.",
};
