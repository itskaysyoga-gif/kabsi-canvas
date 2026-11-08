import { Callout, DoDont, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { weeklyAt } from "./schedule";
import type { GuideDoc } from "./types";

// Weekly guide 7 (the 34th guide), for salons and barbershops in the UK and the UAE. Every claim about Google is from
// the Google sources below, read on 8 Nov 2026.
const READ = "2026-11-08";

export const guide: GuideDoc = {
  slug: "where-to-put-your-google-review-link-salon",
  title: "Where should a salon or barbershop put its review link?",
  description:
    "Where a salon or barbershop puts its Google review link and QR code, when to ask, and Google's rules: ask every client, never only happy ones, no rewards.",
  publishAt: weeklyAt(6),
  updated: READ,
  checked: READ,
  topic: "Reviews",
  answer:
    "Put the QR code where clients pay and wait, and the link in the message they get after the appointment. Ask every client the same way, never only the ones who seemed happy, and never offer a discount, a free product or a prize for a review.",
  inShort: [
    "Google suggests receipts, thank-you emails, the end of a chat and a QR code printed in your shop.",
    "For a salon: the reception desk, each station, the appointment card and the follow-up message.",
    "Google's policy does not allow asking only happy clients or pressing anyone to review in the shop.",
    "A discount, a free product or a prize draw for reviews is not allowed, whatever the review says.",
  ],
  sections: [
    {
      id: "get-the-link",
      heading: "How do I get my Google review link and QR code?",
      answer:
        "On your Business Profile, select Read reviews, then Get more reviews, and select Copy for the link. Google says the QR code can only be made on a computer browser, not on a phone: right-click it and select Save image as.",
      body: (
        <p>
          Customers must be signed in to a Google Account to leave a review, and Google says they
          can set one up with an email address that is not Gmail. Test the link on your own phone
          before you print anything. The full walk-through is in{" "}
          <GuideLink slug="google-review-link-and-qr-code">
            how to get your Google review link and QR code
          </GuideLink>
          .
        </p>
      ),
    },
    {
      id: "where",
      heading: "Where in the shop should the QR code go?",
      answer:
        "Where clients have a free minute and a phone in hand. Google's own suggestions are on receipts, in thank-you emails, at the end of a chat, and as a QR code printed and displayed in your store. In a salon or a barbershop that means a few fixed places.",
      body: (
        <ul>
          <li>
            <b>Reception and the till:</b> a small card by the card machine, where every client
            stands once.
          </li>
          <li>
            <b>Each station:</b> a card by the mirror, where clients wait for colour to develop or
            for the next barber.
          </li>
          <li>
            <b>The waiting area:</b> one card on the table, at eye level, not on the floor.
          </li>
          <li>
            <b>The appointment card and the receipt:</b> the QR code printed small on the back.
          </li>
          <li>
            <b>The follow-up message:</b> the link in the thank-you message or booking confirmation.
            Google says you can also send review requests by email, WhatsApp message or a Facebook
            post.
          </li>
        </ul>
      ),
    },
    {
      id: "when",
      heading: "When is the right moment to ask?",
      answer:
        "After the work is done, in the same words for every client: at the till, or in the message that follows the visit. Google's policy says businesses should not require or pressure people to leave ratings or write reviews while they are on the premises.",
      body: (
        <>
          <p>
            A card on the desk and one friendly line is fine. Handing a client a tablet, waiting
            while they type, or asking them to review before they leave the chair is the pressure
            Google's policy describes. A message after the visit gives them time to decide.
          </p>
          <Callout kind="tip" title="The same line for everyone">
            "If you have a minute, we would love an honest review on Google. The code is on the
            desk." Every client, every time.
          </Callout>
        </>
      ),
    },
    {
      id: "only-happy",
      heading: "Why can't I ask only the clients who seemed happy?",
      answer:
        "Because Google's policy says businesses must not discourage or prohibit negative reviews, or selectively ask for positive ones. Choosing who gets the link by how the visit went is exactly that, whether you do it by eye or with a form.",
      body: (
        <>
          <p>
            This is often called review gating: asking clients first how their visit was, and
            sending only the happy ones to Google. Google's own advice is to value all reviews, and
            it says a mix of positive and negative feedback often feels more trustworthy to people
            deciding where to go. More is in{" "}
            <GuideLink slug="review-gating-google">
              what review gating is, and why Google does not allow it
            </GuideLink>
            .
          </p>
          <p>
            The same policy says merchants must not ask staff to collect a certain number of
            reviews, or reviews that identify a staff member. So no targets per stylist, no prize
            for the barber with the most reviews, and no card that says "mention my name".
          </p>
        </>
      ),
    },
    {
      id: "rewards",
      heading: "Can I give a discount or a free product for a review?",
      answer:
        "No. Google says offering incentives, like free or discounted goods or services, in exchange for posting reviews, changing reviews or removing negative ones is fake engagement and strictly prohibited, and that reviews must reflect a genuine experience.",
      body: (
        <DoDont
          yesTitle="Allowed"
          noTitle="Not allowed"
          yes={[
            "A QR code on the desk and at each station.",
            "The link in every client's follow-up message.",
            "One plain line asking for an honest review.",
          ]}
          no={[
            "10 percent off your next cut for a review.",
            "A free product or a prize draw for reviewers.",
            "Sending the link only to clients you think are happy.",
            "Standing over a client while they write it.",
          ]}
        />
      ),
    },
    {
      id: "wording",
      heading: "What should the card and the message say?",
      answer:
        "Something neutral that asks for an honest review and nothing more: no stars, no 'five star' and no wording that tells the client what to write. Google's policy says businesses should not request that specific content be included.",
      body: (
        <>
          <Steps
            items={[
              'On the card: your salon\'s name, the QR code and "Tell us how your visit went."',
              'In the message: "Thank you for coming in today. If you have a minute, tell others how your visit went:" followed by the link.',
              "On the website or the booking confirmation: the same link, with the same words.",
            ]}
          />
          <p>
            Keep a spare card behind the desk, and check every few months that the code still opens
            your own review page. If you change your business name or move, test it again.
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
          Get reviews is free for every business: a short review link and a QR code that open your
          Google review page, with no rating screen, no filtering and no reward. You can make up to
          5 links, for example one for reception and one for the stations, and see how often each
          was opened. An open is not a review: Google decides which reviews appear. Without signing
          in, the <SiteRef to="/google-review-link">free review link tool</SiteRef> gives you a
          printable counter card that says "Scan to review us on Google", with no stars.
        </p>
        <p>
          On WhatsApp, send "ask a customer" and Kabsi sends back one ready message with your link
          to forward after a real visit, the same for every client. Kabsi never receives your
          client's number, never messages your clients and keeps no counts per stylist or barber.{" "}
          <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Can I put the QR code on a sign that says 'Love us? Leave 5 stars'?",
      a: 'No. Google\'s policy says businesses should not ask for specific content or only for positive reviews. Use neutral words such as "Tell us how your visit went."',
    },
    {
      q: "Can my stylists send the link from their own phones?",
      a: "Yes, as long as every client gets the same message and nobody is given a target. Google's policy does not allow asking staff to collect a certain number of reviews.",
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
      title: "Google Maps: Prohibited and restricted content",
      url: "https://support.google.com/contributionpolicy/answer/7400114?hl=en",
      read: READ,
    },
    {
      title: "Google: Manage customer reviews",
      url: "https://support.google.com/business/answer/3474050?hl=en",
      read: READ,
    },
  ],
  industries: ["hair-salon", "barbershop", "beauty-salon", "nail-salon"],
  related: [
    "google-review-link-and-qr-code",
    "how-to-ask-for-google-reviews",
    "review-gating-google",
  ],
  summary:
    "Where a salon or barbershop puts its Google review link and QR code, when to ask, what the card should say, and Google's rules against asking only happy clients, staff targets and rewards.",
};
