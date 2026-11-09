import { Callout, DoDont, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import type { GuideDoc } from "./types";

// Guides 3, earlier guide rewritten on the template. Every claim about Google is from the sources below, read on 5 Nov 2026.
// Known fix: the examples no longer put a phone number in a reply (facts 8.3).
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "how-to-reply-to-google-reviews",
  title: "How to reply to Google reviews (with examples)",
  description:
    "The steps to reply to a Google review on a computer or phone, what Google checks, what a good reply says, and examples you can adapt.",
  publishAt: "2026-09-26T00:00:00Z",
  updated: READ,
  checked: READ,
  topic: "Google reviews",
  answer:
    "Open your Business Profile, select Read reviews, then Reply next to the review, write your reply and select Reply. Keep it short, polite and about what the customer said, because Google checks every reply against its content policies before it shows it.",
  inShort: [
    "Your profile must be verified before you can reply to reviews.",
    "Reply from your Business Profile: Read reviews, then Reply.",
    "Google checks each reply first, usually within 10 minutes, sometimes up to 30 days.",
    "Short, specific and polite works best. Leave phone numbers, emails and links out.",
  ],
  sections: [
    {
      id: "steps",
      heading: "How do I reply to a review on Google?",
      answer:
        "Go to your Business Profile, select Read reviews, then select Reply next to the review you want to answer. Type your reply in the box and select Reply again.",
      body: (
        <>
          <Steps
            items={[
              "Go to your Business Profile.",
              <>
                Select <b>Read reviews</b>.
              </>,
              <>
                Next to the review you want to answer, select <b>Reply</b>.
              </>,
              "Write your reply in the box that opens.",
              <>
                Select <b>Reply</b>.
              </>,
            ]}
          />
          <p>
            Google's help says you must verify your business before you can reply, and that reviews
            are available only in certain countries or regions and for certain business categories.
            Google's pages here name no separate rule for the UK or the UAE.
          </p>
        </>
      ),
    },
    {
      id: "after-you-reply",
      heading: "What happens after I press Reply?",
      answer:
        "Google reviews your reply to make sure it follows its content policies. Google says this usually takes up to 10 minutes but can sometimes take up to 30 days, and that if your reply is not approved you will be asked to edit it.",
      body: (
        <ul>
          <li>
            Once approved, the reply is public under the customer's review. It appears as your
            business, and your personal name is not shown.
          </li>
          <li>The person who wrote the review is told that you replied.</li>
          <li>
            The customer can still change their review after reading your reply. If they do, the
            date on the review changes to show the latest update.
          </li>
          <li>Google's pages here name no separate rule for the UK or the UAE.</li>
        </ul>
      ),
    },
    {
      id: "good-reply",
      heading: "What should a good reply say?",
      answer:
        "Google's own tips are to be professional and polite, keep it short and simple, and be conversational rather than promotional. In practice that means two to four sentences in the customer's language, one detail from what they wrote, and a sign-off from the business.",
      body: (
        <>
          <DoDont
            yesTitle="Do"
            noTitle="Avoid"
            yes={[
              "Thank them, using their name if they gave one.",
              "Mention one thing they said, so it does not read like a template.",
              "Reply in the language they wrote in.",
              "Sign off the same way each time, for example 'Luca, owner'.",
            ]}
            no={[
              "Deals, discount codes or promotions. Google says to avoid them in replies.",
              "Phone numbers, email addresses or links. Your profile already shows how to reach you.",
              "Long paragraphs. Google warns people may stop reading before the main point.",
              "Promises you will not keep.",
            ]}
          />
          <p>
            Google also suggests that instead of sending the same "thank you" to everyone, you focus
            on reviews where you can share a helpful update or answer a question. A reply that
            answers something shows the next reader that you listen.
          </p>
        </>
      ),
    },
    {
      id: "contact-details",
      heading: "Can I put my phone number or website in a reply?",
      answer:
        "This guide's advice is to leave them out and point to the details on your profile. Google checks every reply against its content policies and asks you to edit one it does not approve.",
      body: (
        <>
          <p>
            Your Business Profile already shows your phone number and website, so you lose nothing
            by leaving them out. When you want to talk to someone, ask them to get in touch through
            the details on your profile. Google's own tips say that for a complex situation you can
            politely ask the reviewer to contact you by phone or email to sort it out privately: you
            can say that without writing the number itself.
          </p>
          <Callout kind="warn" title="Keep it out of the reply">
            No phone numbers, emails, links, social media handles or discount codes. They make a
            reply look like advertising, and a reply Google does not approve has to be edited before
            it shows.
          </Callout>
        </>
      ),
    },
    {
      id: "examples",
      heading: "What does a good reply look like?",
      answer:
        "Here are short examples for a cafe and a salon. Each thanks the customer, picks up one thing they said and signs off as the business, and none of them carries a phone number, a link or an offer.",
      body: (
        <ul>
          <li>
            <b>5 stars:</b> "Lovely place, great coffee, and they remembered my order." Reply:
            "Thank you, Emma. We are glad you enjoyed the coffee, and the team will be happy to hear
            they remembered your order. See you again soon. Luca, owner"
          </li>
          <li>
            <b>4 stars, in Spanish:</b> "Muy buen ambiente y el café riquísimo. Solo tardaron un
            poco en atendernos." Reply: "Muchas gracias, Lucía. Nos alegra que te gustaran el
            ambiente y el café, y sentimos la espera. Te esperamos pronto. Luca, dueño"
          </li>
          <li>
            <b>5 stars, a question inside:</b> "Great cut. Do you do beard trims too?" Reply: "Thank
            you, Sam. Yes, we do beard trims, and you can add one to your next cut. Glad you liked
            it. The Juniper team"
          </li>
          <li>
            <b>2 stars, in French:</b> "Commande arrivée froide et en retard." Reply: "Merci pour
            votre retour, et nous sommes désolés que votre commande soit arrivée froide et en
            retard. Ce n'est pas ce que nous voulons. Contactez-nous via les coordonnées de notre
            fiche pour en parler. Luca, propriétaire"
          </li>
        </ul>
      ),
    },
    {
      id: "edit-or-delete",
      heading: "Can I change or delete a reply later?",
      answer:
        "Yes. Open your Business Profile, select Read reviews, then select Edit under the reply. Change the text and select Update, or select Delete to remove the reply.",
      body: (
        <p>
          If a customer changes their review after your reply, read it again: a short update to your
          reply, or a thank you, is often worth it.
        </p>
      ),
    },
    {
      id: "how-fast",
      heading: "How quickly should I reply?",
      answer:
        "Google's advice is to respond in a timely manner, because a prompt response shows you value the feedback. It gives no fixed number of hours, so set yourself a habit you can keep, such as checking new reviews once a day.",
      body: (
        <p>
          A bad review needs the most care and the calmest reply. The steps for that are in{" "}
          <GuideLink slug="how-to-respond-to-negative-google-reviews">
            how to respond to a negative Google review
          </GuideLink>
          . Whether to answer every short five star review is covered in{" "}
          <GuideLink slug="should-you-reply-to-every-google-review">
            should you reply to every Google review
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
          Once Kabsi is a Manager on your profile, every new review reaches you on WhatsApp or by
          email, whichever you chose, with a reply already drafted in the reviewer's language. You
          tap Approve reply, Edit or Skip, and nothing goes on Google until you approve it. Kabsi's
          drafts never include phone numbers, emails, links, social media handles or hashtags: a
          draft that does is stopped before you see it as ready.
        </p>
        <p>
          After you approve, Kabsi shows where the reply is: Approved, Sent to Google, then Live on
          Google once it has seen it there, or that Google did not accept it, with what to do next.
          Kabsi never asks for your Google password or a code.{" "}
          <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Can customers see who wrote the reply?",
      a: "Google says the reply appears as your business and your personal name is not shown. If you want to sign it, use the business name or a first name and role, such as 'Luca, owner'.",
    },
    {
      q: "Why can I not see a Reply button?",
      a: "Google says you must verify your business before you can reply. Reviews are also available only in certain countries, regions and business categories.",
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
      title: "Google: Prohibited and restricted content (Maps user contributed content policy)",
      url: "https://support.google.com/contributionpolicy/answer/7400114?hl=en",
      read: READ,
    },
    {
      title: "Google: Report inappropriate reviews on your Business Profile",
      url: "https://support.google.com/business/answer/4596773?hl=en",
      read: READ,
    },
  ],
  industries: ["hair-salon", "barbershop", "restaurant", "cafe"],
  related: [
    "how-to-respond-to-negative-google-reviews",
    "should-you-reply-to-every-google-review",
    "how-to-ask-for-google-reviews",
  ],
  summary:
    "How to reply to a Google review step by step, what Google checks before a reply shows, what a good reply says, and examples without phone numbers or links.",
};
