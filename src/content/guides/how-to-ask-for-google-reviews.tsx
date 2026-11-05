import { Callout, DoDont, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { PUBLISH_ALL_AT } from "./schedule";
import type { GuideDoc } from "./types";

// Guides 3, guide 10. Every claim about Google is from the sources below, read on 5 Nov 2026.
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "how-to-ask-for-google-reviews",
  title: "How do I ask customers for Google reviews the right way?",
  description:
    "Where to get your Google review link and QR code, when and how to ask, and what Google does not allow: rewards, staff targets and asking only happy customers.",
  publishAt: PUBLISH_ALL_AT,
  updated: READ,
  checked: READ,
  topic: "Reviews",
  answer:
    "Ask every customer the same way, after a real visit, with the review link or QR code from your Business Profile, and never offer anything in return. Google allows you to ask for reviews of a genuine experience, but not to reward reviews, set staff targets, or ask only the customers you expect to be happy.",
  inShort: [
    "Get your link on your Business Profile under Read reviews, then Get more reviews.",
    "Put it on receipts, thank-you emails and messages, and print the QR code for the counter.",
    "Use the same words for everyone and do not ask for a rating, stars or particular words.",
    "No discounts, gifts or free services for a review: Google treats that as fake engagement.",
  ],
  sections: [
    {
      id: "allowed",
      heading: "Is it allowed to ask customers for Google reviews?",
      answer:
        "Yes. Google's content policy says merchants may ask for content that represents a genuine experience, as long as they offer no incentive and do not try to influence the rating or what the review says. What Google forbids is the way some businesses ask: with a reward, only to happy customers, or with pressure.",
      body: (
        <>
          <p>
            Google's help page on getting more reviews says reviews show next to your Business
            Profile in Maps and Search and that they must reflect a genuine experience. It also says
            an honest mix of positive and negative feedback often feels more trustworthy to people
            deciding where to go.
          </p>
          <p>
            One practical point from the same page: a customer must be signed in to a Google Account
            to leave a review, and they can set one up with an email address that is not Gmail.
          </p>
        </>
      ),
    },
    {
      id: "get-link",
      heading: "How do I get my Google review link or QR code?",
      answer:
        "Open your Business Profile, select Read reviews, then Get more reviews, and copy the link. Google says the review QR code can only be made in a browser on a computer, not on a phone, so download it from a computer.",
      body: (
        <>
          <Steps
            items={[
              "Go to your Business Profile.",
              <>
                Select <b>Read reviews</b>, then <b>Get more reviews</b>.
              </>,
              <>
                To copy the review link, select <b>Copy</b>.
              </>,
              <>
                On a computer, right-click the QR code and select <b>Save image as...</b> to keep it
                for printing.
              </>,
            ]}
          />
          <p>
            More on making, testing and printing the link is in{" "}
            <GuideLink slug="google-review-link-and-qr-code">
              how to get your Google review link and QR code
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "when-where",
      heading: "When and where should I ask?",
      answer:
        "Ask soon after the visit, where the customer already hears from you. Google suggests putting the link on receipts, in thank-you emails and at the end of a chat, and printing the QR code for your shop, and it says you can also send requests by email, WhatsApp message or a Facebook post.",
      body: (
        <ul>
          <li>
            A salon or barber: the QR code at the till, and the link in the booking confirmation or
            the message you already send after an appointment.
          </li>
          <li>
            A cafe or restaurant: the QR code on the table card or the receipt, never only on the
            tables of guests who seemed pleased.
          </li>
          <li>
            A garage: the link at the bottom of the invoice email or the message that says the car
            is ready.
          </li>
          <li>
            Every customer gets the same chance: the same card, the same message, at the same point
            in the visit.
          </li>
        </ul>
      ),
    },
    {
      id: "what-to-say",
      heading: "What should I say when I ask?",
      answer:
        "Keep it short and neutral: thank them for the visit and say a review helps others decide. Google's policy says not to request that specific content be included, and not to require or pressure customers to leave a rating or review while they are still on your premises.",
      body: (
        <>
          <p>
            A message that works for any trade: "Thank you for visiting today. If you have a minute,
            tell others how your visit went: [your link]". Send the same words to everyone.
          </p>
          <DoDont
            yesTitle="Fine to do"
            noTitle="Google does not allow"
            yes={[
              "Ask every customer the same way, after a real visit",
              "Put the QR code where people pay or wait",
              "Add the link to receipts, emails and messages",
              "Reply to the reviews you get, good and bad",
            ]}
            no={[
              "A discount, gift or free service for a review",
              "Asking only customers you expect to be happy",
              "Asking for five stars or for particular words",
              "Pressing customers to review before they leave",
            ]}
          />
        </>
      ),
    },
    {
      id: "rewards",
      heading: "Can I offer a discount or a small gift for a review?",
      answer:
        "No. Google says offering incentives, such as free or discounted goods or services, in exchange for posting, changing or removing a review is fake engagement and strictly prohibited, whatever the review says.",
      body: (
        <>
          <p>
            Google's policy lists payment, discounts and free goods or services as incentives. Its
            restrictions page says that a business breaking the fake engagement policy may, besides
            having the reviews removed, be unable to receive new reviews for a set period, have its
            existing reviews unpublished for a set period, or show a warning that fake reviews were
            removed. Google says it emails the owner before it applies a restriction, and that the
            business can appeal.
          </p>
          <Callout kind="warn" title="Not after a bad review either">
            Offering a refund or a voucher to a customer who changes or deletes a negative review is
            the same breach. Reply to the review instead and invite them to get in touch.
          </Callout>
        </>
      ),
    },
    {
      id: "staff",
      heading: "Can my staff ask, and can I give them targets?",
      answer:
        "Your staff can ask customers, but Google's policy says merchants may not ask staff to collect a certain number of reviews, or reviews with specific content, including content that names a member of staff. So no quotas per person and no 'mention my name' requests.",
      body: (
        <p>
          Give the team the same card and the same words, and make asking part of every visit rather
          than a competition. Google also lists reviews from people with a conflict of interest,
          such as current or former employees and family, as not allowed, so staff and relatives
          should not review the business themselves.
        </p>
      ),
    },
    {
      id: "not-showing",
      heading: "A customer left a review but I cannot see it. Why?",
      answer:
        "Google checks reviews against its policies, and its help page says this can take a few days. Other reasons it gives: customers on older phones or software can have trouble posting and should update the Maps app, and reviews removed for policy violations are not restored.",
      body: (
        <p>
          A burst of reviews in a short time after a campaign can look unusual: Google's policy
          names unusual volumes or patterns of reviews as a sign of rating manipulation. Asking
          steadily, visit by visit, is both the honest way and the one that matches how genuine
          reviews arrive.
        </p>
      ),
    },
    {
      id: "uk-uae",
      heading: "Is anything different in the UK or the UAE?",
      answer:
        "Google's pages here name no separate rule for the UK or the UAE. In the UK there is also the law: the Competition and Markets Authority's fake reviews guidance, published on 4 April 2025 under the Digital Markets, Competition and Consumers Act 2024, says that simply emailing customers to ask if they wish to leave a review, without deciding what they say, is not prohibited.",
      body: (
        <p>
          The same UK guidance bans fake reviews and incentivised reviews that hide the incentive,
          and treats a refund or gift card offered for changing a negative review as commissioning a
          banned review. On Google the rule is simpler and stricter: no incentive at all. This guide
          does not cover UAE consumer law; Google's own rules above apply to a business in the UAE
          in the same way.
        </p>
      ),
    },
  ],
  kabsi: {
    heading: "What Kabsi does here",
    body: (
      <>
        <p>
          Get reviews is free for every business, with or without a plan: a short review link and a
          QR code that open your own Google review page, and a Send review link button so staff can
          send one ready message from their own WhatsApp after a visit. On both plans you also get a
          counter card and a table card ready to print. Every customer sees the same page: no rating
          question, no filtering of unhappy customers, no reward, and Kabsi records nothing about
          who sent a link to whom, so there are no targets or league tables.
        </p>
        <p>
          Kabsi counts how often your link was opened, never who opened it, and an open is not a
          review: Google decides which reviews appear. Without signing in, the{" "}
          <SiteRef to="/google-review-link">free review link tool</SiteRef> finds Google's own link
          for your business. Kabsi cannot make anyone leave a review and does not promise you will
          get more. <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Can I ask a customer to change a bad review?",
      a: "You can reply and try to put things right, and Google's help says a constructive reply may even encourage a customer to update their review. You cannot offer anything in exchange for changing or removing it.",
    },
    {
      q: "Do my customers need a Gmail address to review me?",
      a: "No. Google says they need to be signed in to a Google Account, and they can create one with an email address that is not Gmail.",
    },
  ],
  sources: [
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
      title: "Google Maps: Prohibited and restricted content",
      url: "https://support.google.com/contributionpolicy/answer/7400114?hl=en",
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
  industries: ["hair-salon", "barbershop", "restaurant", "auto-repair"],
  related: [
    "google-review-link-and-qr-code",
    "review-gating-google",
    "how-to-reply-to-google-reviews",
  ],
  summary:
    "How to ask customers for Google reviews within Google's rules: the review link and QR code, when and what to say, and why rewards, staff quotas and asking only happy customers are not allowed.",
};
