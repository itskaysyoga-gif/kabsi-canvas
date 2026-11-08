import { Callout, DoDont, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { weeklyAt } from "./schedule";
import type { GuideDoc } from "./types";

// Weekly guide 3 (the 30th guide), for hair salons, barbers and beauty salons in the UK and the UAE. Every claim about
// Google is from the Google sources below, read on 8 Nov 2026. The example reviews and replies are invented.
const READ = "2026-11-08";

export const guide: GuideDoc = {
  slug: "reply-to-bad-google-review-salon",
  title: "How should a salon reply to a bad Google review?",
  description:
    "Calm replies for the bad reviews salons get: a colour gone wrong, a long wait, a price complaint, and what to do when a review mentions a reaction.",
  publishAt: weeklyAt(2),
  updated: READ,
  checked: READ,
  topic: "Reviews",
  answer:
    "Reply within a day or two in three or four calm sentences: thank them, name the problem once, say what you can do, and ask them to get in touch through the details on your profile. When a review mentions a reaction, a burn or an injury, say nothing about what happened in public and speak to your insurer before you reply.",
  inShort: [
    "A colour or a cut gone wrong: no argument about technique in public, and an offer to talk.",
    "A long wait: say sorry once and explain only what is true.",
    "A price complaint: point to the prices on your profile without arguing about the bill.",
    "A reaction or an injury: a short, neutral reply at most, after you speak to your insurer.",
  ],
  sections: [
    {
      id: "why-reply",
      heading: "Should a salon reply to a bad review at all?",
      answer:
        "Yes. Google says replying shows customers you value their feedback, that negative reviews are not necessarily a sign of poor business practices, and that a constructive reply may even encourage the customer to update their review. The reply is mainly read by the next client deciding whether to book.",
      body: (
        <p>
          Google checks every reply against its content policies before it is posted, usually within
          10 minutes but sometimes up to 30 days, and tells the reviewer when you reply. The reply
          shows as your business, not under your own name. Google also says a reviewer can still
          change their review after reading your reply. The general steps for any business are in{" "}
          <GuideLink slug="how-to-respond-to-negative-google-reviews">
            how to respond to a negative Google review
          </GuideLink>
          ; this guide is about the reviews salons and barbers get.
        </p>
      ),
    },
    {
      id: "colour-or-cut",
      heading: "How do I reply when a client hated their colour or cut?",
      answer:
        "Thank them, say you are sorry it was not what they wanted, and ask them to get in touch so you can talk it through. Do not explain in public why the colour lifted that way or whose fault it was: the reader sees a salon arguing with a client.",
      body: (
        <>
          <p>
            <b>Example review, 1 star:</b> "Asked for a soft caramel balayage and came out brassy
            orange. Paid a fortune." <b>Reply:</b> "Thank you for telling us, Hannah, and we are
            sorry the colour was not what you asked for. We would like to see it and talk about what
            we can do, so please get in touch through the details on our profile. Mia, salon owner"
          </p>
          <p>
            If you offer a correction appointment or a refund, do it privately, and never in return
            for changing or removing the review. Google's policy says businesses must not offer
            incentives, such as payment, discounts or free services, in exchange for a review or for
            revising or removing a negative one.
          </p>
        </>
      ),
    },
    {
      id: "waiting",
      heading: "What do I say when a client waited too long?",
      answer:
        "Say sorry once and explain only what is true and useful, such as a running late policy or how you now let clients know. Google's advice is to be honest, acknowledge mistakes, and not take responsibility for things outside your control.",
      body: (
        <p>
          <b>Example review, 2 stars:</b> "Booked for 2pm, sat for 35 minutes before anyone started.
          Nobody said a word." <b>Reply:</b> "We are sorry, Omar. A 35 minute wait without a word
          from us is not good enough. When a barber is running late we now message clients before
          they arrive. Please get in touch through our profile if you would like to talk about it.
          The Fade Room" Write the line about messaging clients only if you really do it. A reply
          that promises a change you never make reads worse a month later.
        </p>
      ),
    },
    {
      id: "price",
      heading: "How do I answer a complaint about the price?",
      answer:
        "Do not argue about the bill in public. Thank them, say where your prices are shown, and invite them to get in touch about their visit. If prices start from a figure and depend on hair length or time, say that plainly once.",
      body: (
        <>
          <p>
            <b>Example review, 2 stars:</b> "Quoted one price, charged nearly double for a cut and
            blow dry." <b>Reply:</b> "Thank you for the feedback, Sarah. Our prices are listed on
            our profile, and longer hair takes more time, which our stylists explain before they
            start. We are sorry if that did not happen at your visit. Please get in touch so we can
            look at it. Rose Lane Salon"
          </p>
          <p>
            Google lets salons list services with prices on the profile, under Edit services, and
            says a customer reviewing a service business may be asked to choose the service they
            had. Keeping that list accurate answers many price questions before they become reviews.
            The steps are in{" "}
            <GuideLink slug="add-services-and-prices-to-google">
              how to add services and prices to Google
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "reaction-or-injury",
      heading: "What if a review mentions an allergic reaction, a burn or an injury?",
      answer:
        "Treat it differently from every other bad review. Do not discuss what happened, the products, a patch test or any medical detail in public, do not admit or deny fault in the reply, and speak to your insurer before you write anything. Then reply briefly and take it private.",
      body: (
        <>
          <Steps
            items={[
              "Do not reply in the first hour. Read it, then save a copy with the date.",
              "Write down what your records show: the appointment, the products, any patch test and who did the work. Keep it private.",
              "Call your insurer or adviser and ask how they want you to respond. This guide is not legal advice.",
              "If you reply, keep it short and neutral, with no details of the treatment, and ask the client to get in touch through the details on your profile.",
              "Have the conversation in private, by phone or email, not under the review.",
            ]}
          />
          <p>
            Google's own tip for complex situations is to protect the reviewer's privacy and
            politely ask them to contact you by phone or email to resolve it privately. Its content
            policy also does not allow posting someone's medical information, so a reply that
            discusses the client's skin or scalp in detail can do harm on more than one front.
          </p>
          <Callout kind="warn" title="A holding reply, for example">
            "Thank you for letting us know. We take this seriously and would like to speak with you
            directly. Please contact us through the details on our profile. Rose Lane Salon"
          </Callout>
        </>
      ),
    },
    {
      id: "never-write",
      heading: "What should a salon never write in a reply?",
      answer:
        "Anything that makes the next reader trust you less: an argument, a client's private details, a discount for changing the review, or blame on a named member of staff. Google says never to share a reviewer's private information or engage in personal attacks.",
      body: (
        <DoDont
          yesTitle="Do"
          noTitle="Do not"
          yes={[
            "Thank them, even when it stings.",
            "Name the problem in one sentence.",
            "Point to the details on your profile so they can reach you.",
            "Sign as the salon or the owner.",
          ]}
          no={[
            "Write their appointment details, phone number or what they paid.",
            "Say they were rude or that it never happened.",
            "Offer a discount or a free service to change or remove the review.",
            "Blame a stylist or a barber by name in public.",
          ]}
        />
      ),
    },
    {
      id: "report",
      heading: "When can I report a bad review instead?",
      answer:
        "Only when it breaks Google's policies, for example a review from a competitor or a former employee, a fake review, harassment, or one that posts someone's personal information. Google says not to report a review just because you disagree with it, and only reviews that break its policies are removed.",
      body: (
        <p>
          To report it, open your profile, select Read reviews, select Report next to the review,
          choose the reason and select Send report. Google says the review usually takes several
          days to be evaluated, and you can follow it in the Reviews Management Tool, where a
          one-time appeal is possible if no violation is found. Reply calmly in the meantime. More
          detail is in{" "}
          <GuideLink slug="report-fake-google-reviews">
            how to report fake or spam reviews on Google
          </GuideLink>
          .
        </p>
      ),
    },
  ],
  kabsi: {
    heading: "What Kabsi does here",
    body: (
      <>
        <p>
          Kabsi emails you at once about any review of 3 stars or less, even if you chose WhatsApp
          for routine messages. A complaint, a refund request or a price complaint gets a careful
          draft with the issue shown above it, for example "They mention a refund. Kabsi didn't
          promise one." Every draft points the client to the details on your profile and never
          contains a phone number, an email or a link.
        </p>
        <p>
          A review about an allergy, an injury or another safety problem, a legal threat, or a
          complaint that names a member of your team gets no draft. It is marked "This review needs
          a little more care" with a short checklist, can never be approved on WhatsApp, and Kabsi
          writes a short, neutral holding reply only if you ask for one. Kabsi cannot remove a
          review, and nothing goes on Google until you approve it.{" "}
          <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Can I offer a free correction if they change their review?",
      a: "No. Google's policy does not allow incentives, such as discounts or free services, in exchange for revising or removing a negative review. You can offer to put things right privately, with no link to the review.",
    },
    {
      q: "Should I name the stylist in my reply to a complaint?",
      a: "No. Reply as the salon, keep the stylist's name out, and deal with what happened in private. A name in a public complaint stays on your profile for every future client to read.",
    },
  ],
  sources: [
    {
      title: "Google: Manage customer reviews",
      url: "https://support.google.com/business/answer/3474050?hl=en",
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
      title: "Google: Report inappropriate reviews on your Business Profile",
      url: "https://support.google.com/business/answer/4596773?hl=en",
      read: READ,
    },
    {
      title: "Google: Manage your services on your Business Profile",
      url: "https://support.google.com/business/answer/9455399?hl=en",
      read: READ,
    },
  ],
  industries: ["hair-salon", "barbershop", "beauty-salon"],
  related: [
    "how-to-respond-to-negative-google-reviews",
    "reply-to-review-that-names-your-stylist",
    "report-fake-google-reviews",
  ],
  summary:
    "How a salon or barbershop replies to a bad Google review about a colour or cut, a long wait or the price, and what to do first when a review mentions a reaction or an injury.",
};
