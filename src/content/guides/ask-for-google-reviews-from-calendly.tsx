import { Callout, DoDont, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { weeklyAt } from "./schedule";
import type { GuideDoc } from "./types";

// Weekly guide 11 (the 38th guide), for Calendly users. Every claim about Calendly is from Calendly's help centre pages and
// every claim about Google from the Google sources below, all read on 24 Nov 2026.
const READ = "2026-11-24";

export const guide: GuideDoc = {
  slug: "ask-for-google-reviews-from-calendly",
  title: "How do I ask for Google reviews from Calendly?",
  description:
    "How to use a Calendly Automation that sends a thank-you email when an event ends, with your Google review link in it, and the Google rules to follow.",
  publishAt: weeklyAt(10),
  updated: READ,
  checked: READ,
  topic: "Reviews",
  answer:
    "Calendly can send an email when an event ends, and you can put your Google review link in that email. Send the same email for every event type, and never promise a reward for a review.",
  inShort: [
    "Calendly's help pages call this feature Automations.",
    "Choose the trigger Event ends, then write the email.",
    "Add your review link with the link button in the email Body.",
    "Same email for everyone, no reward, no survey that decides who gets the link.",
  ],
  sections: [
    {
      id: "what-it-is",
      heading: "Can Calendly send an email after a meeting ends?",
      answer:
        "Yes. Calendly's help pages describe Automations that can run when an event ends. The list of triggers includes Event ends, and the actions include thanking invitees.",
      body: (
        <>
          <p>
            Calendly says Automations are available on paid plans from Professional through
            Enterprise, and that your role, plan, account creation date and add-ons can affect
            access. Check your own account under Automations.
          </p>
          <p>
            You can create up to 50 per user or team, across all event types. Calendly says updates
            apply only to future meetings, not to meetings booked before the change.
          </p>
        </>
      ),
    },
    {
      id: "set-up",
      heading: "How do I set up the thank-you email?",
      answer:
        "Go to Automations, choose a template or select Create your own automation, choose a trigger and timing, and pick an action. Name the Automation, select the event types it applies to, edit the email and select Save.",
      body: (
        <>
          <Steps
            items={[
              "Go to Automations.",
              'Choose a template and click "Use automation", or click "Create your own automation".',
              "For a custom Automation, choose the trigger Event ends and set its timing.",
              "Pick an action, such as an email to the invitee.",
              "Name the Automation.",
              "Select the event types it applies to.",
              "Edit the email, write your message and click Done.",
              "Click Save.",
            ]}
          />
        </>
      ),
    },
    {
      id: "add-link",
      heading: "How do I put my review link in the email?",
      answer:
        "In the email Body, highlight the text you want to link, select the link button in the editor toolbar, choose a custom link in the Destination dropdown, and paste your review link. Then select Insert, Done and Save.",
      body: (
        <>
          <Steps
            items={[
              "Open your email Automation.",
              "In the Body, highlight the text to link, for example the words leave us a review.",
              "Select the link button in the editor toolbar.",
              "In the Destination dropdown, choose a custom link, then paste your review link.",
              "Select Insert, then Done, then Save.",
            ]}
          />
          <p>
            Calendly says a text message Automation has no link button: you type or paste the URL
            into the Body as plain text. Get your link from Google first, as shown in{" "}
            <GuideLink slug="google-review-link-and-qr-code">
              how to get your Google review link and QR code
            </GuideLink>
            .
          </p>
          <Callout kind="tip" title="Keep it neutral">
            "Thank you for meeting with us. If you have a minute, we would love an honest review on
            Google." The same words for everyone. No stars, no discount, no wording about what to
            write.
          </Callout>
        </>
      ),
    },
    {
      id: "everyone",
      heading: "Should every customer get this email?",
      answer:
        "Yes, the same request for everyone who met you. Google's policy does not allow businesses to discourage or prohibit negative reviews, or selectively solicit positive reviews from customers.",
      body: (
        <>
          <p>
            When you select the event types the Automation applies to, choose every event type your
            customers book, so no group is left out. Calendly says invitees marked as no-shows only
            get no-show Automations, so someone who did not come will not get the thank-you email,
            which is as it should be: they have nothing to review.
          </p>
          <p>
            Calendly's Automations can also send a post-meeting feedback survey. Do not use a survey
            to decide who then gets the review link. Asking first how it went and sending only the
            happy ones to Google is review gating. See{" "}
            <GuideLink slug="review-gating-google">
              what review gating is, and why Google does not allow it
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "rewards",
      heading: "Can I offer a discount for a review in the email?",
      answer:
        "No. Google calls offering free or discounted goods or services in exchange for reviews fake engagement and strictly prohibited. The same policy lists merchants asking staff to collect a certain number of reviews.",
      body: (
        <DoDont
          yesTitle="Allowed"
          noTitle="Not allowed"
          yes={[
            "One thank-you email with the link, for every event type.",
            "One plain line asking for an honest review.",
            "The same link and the same words for every customer.",
          ]}
          no={[
            "10 percent off the next booking for a review.",
            "A free session or a prize draw for reviewers.",
            "A survey that decides who gets the link.",
            "A review target for each team member.",
          ]}
        />
      ),
    },
    {
      id: "other-places",
      heading: "Where else can I put the same link?",
      answer:
        "Google says it can go on receipts, in thank-you emails, at the end of a chat, or as a QR code printed and displayed in your store. Use the same request everywhere so no customer is treated differently.",
      body: (
        <p>
          The Calendly email covers customers who book through Calendly. If you also take walk-ins,
          a card at the till covers them. A full list of places is in{" "}
          <GuideLink slug="where-to-put-your-google-review-link">
            where to put your Google review link
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
          Kabsi gives you a free review link and QR code that open your Google review page, and a
          counter card you can print. You can make a separate link for each place, one for your
          Calendly email and one for the counter, and see how many times each link was tapped. A tap
          is not a review: Google decides which reviews appear.
        </p>
        <p>
          Kabsi never contacts your customers and never receives their details. You paste the link
          once into the email Calendly already sends, and the same email goes to everyone.{" "}
          <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Which Calendly plans have Automations?",
      a: "Calendly lists paid plans from Professional through Enterprise, and says role, plan, account creation date and add-ons can affect access.",
    },
    {
      q: "Can I add the link to a text message instead?",
      a: "Calendly says text message Automations have no link button, so you type or paste the URL into the Body as plain text.",
    },
  ],
  sources: [
    {
      title: "Calendly Help Center: Automations overview",
      url: "https://calendly.com/help/automations-overview",
      read: READ,
    },
    {
      title: "Calendly Help Center: How to create an Automation",
      url: "https://calendly.com/help/how-to-create-an-automation",
      read: READ,
    },
    {
      title: "Calendly Help Center: How to customize emails and texts for Automations",
      url: "https://calendly.com/help/how-to-customize-emails-and-texts-for-automations",
      read: READ,
    },
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
  industries: ["physiotherapy", "yoga-and-pilates-studio", "hair-salon"],
  related: [
    "where-to-put-your-google-review-link",
    "how-to-ask-for-google-reviews",
    "review-gating-google",
    "google-review-link-and-qr-code",
  ],
  summary:
    "How to send a thank-you email from a Calendly Automation when an event ends, with your Google review link in it, the same for every customer and with no reward, survey filter or staff target.",
};
