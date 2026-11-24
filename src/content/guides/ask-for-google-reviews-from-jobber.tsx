import { Callout, DoDont, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { weeklyAt } from "./schedule";
import type { GuideDoc } from "./types";

// Weekly guide 10 (the 37th guide), for Jobber users. Every claim about Jobber is from Jobber's help centre page and every
// claim about Google from the Google sources below, all read on 24 Nov 2026.
const READ = "2026-11-24";

export const guide: GuideDoc = {
  slug: "ask-for-google-reviews-from-jobber",
  title: "How do I ask for Google reviews from Jobber?",
  description:
    "How to use Jobber's Reviews tool to ask every client for a Google review, what it needs, when it sends, and how to stay inside Google's review rules.",
  publishAt: weeklyAt(9),
  updated: READ,
  checked: READ,
  topic: "Reviews",
  answer:
    "Jobber has a Reviews tool under Marketing that sends a review request after a visit, a closed job or a paid invoice. Keep it on for every client, and do not leave out clients you think were unhappy.",
  inShort: [
    "In Jobber, select Marketing, then Reviews, then Connect. You need a verified Google Business Profile.",
    "Jobber sends the request after a completed visit, a closed job or a paid invoice.",
    "The request goes to every client unless you turn off Ask for review on a client's profile.",
    "No discount or gift for a review, and no switching clients off because they seemed unhappy.",
  ],
  sections: [
    {
      id: "what-it-is",
      heading: "Does Jobber have a way to ask for Google reviews?",
      answer:
        "Yes. Jobber's help centre describes a Reviews tool, part of Jobber's Marketing Suite. It is available in the United States, Canada and the United Kingdom on all plans as part of the Marketing Suite. Add-on details are in a separate Jobber article, so check your plan in Jobber.",
      body: (
        <>
          <p>
            Only admin users, or users with the Marketing Suite permission, can view the Reviews
            dashboard or manage the review settings. You also need a verified Google Business
            Profile. If yours is not verified yet, start with{" "}
            <GuideLink slug="how-to-verify-google-business-profile">
              how to verify your Google Business Profile
            </GuideLink>
            .
          </p>
          <p>
            Check your own plan inside Jobber. The page points to a separate Jobber article for
            add-on details and gives no price.
          </p>
        </>
      ),
    },
    {
      id: "set-up",
      heading: "How do I set up Reviews in Jobber?",
      answer:
        "Select Marketing, then Reviews, then Connect. Choose your Google Business account and grant Jobber access, review the sample message, then select Complete Setup.",
      body: (
        <>
          <Steps
            items={[
              "Select Marketing, then Reviews.",
              "Click Connect.",
              "Choose your Google Business account and grant Jobber access.",
              "Review the sample message.",
              "Select Complete Setup.",
            ]}
          />
          <p>
            Jobber says the Google permission covers seeing, editing, creating and deleting Google
            Business listings, that it needs it to pull review data, and that it will not edit or
            delete any listing. Jobber also says you can turn off its job follow-ups under Settings,
            then Emails & Text Messages, then Jobs, so clients are not asked twice.
          </p>
        </>
      ),
    },
    {
      id: "when",
      heading: "When does Jobber send the request?",
      answer:
        "The first request is triggered by one of three events: Visit is completed, Job closes, or Invoice is paid. You can send it by email or text, and Jobber sends at most one request per client every six months.",
      body: (
        <>
          <ul>
            <li>
              <b>Visit is completed:</b> the ask goes out after a completed visit.
            </li>
            <li>
              <b>Job closes:</b> the ask goes out when the job is closed.
            </li>
            <li>
              <b>Invoice is paid:</b> partial payments do not trigger the ask until the balance is
              0.00.
            </li>
          </ul>
          <p>
            Jobber says requests triggered by a closed job or a completed visit between 9 PM and 9
            AM local time go by email only, and that a client needs a phone number that can receive
            texts for a text request. If a client does not click the link, Jobber sends up to two
            reminders, the first three days after the first ask and the second five days after that.
          </p>
        </>
      ),
    },
    {
      id: "message",
      heading: "Can I change what the message says?",
      answer:
        "Yes, the first message can be edited. The text message template is not customizable unless you have a dedicated phone number, and the reminder text is not customizable.",
      body: (
        <>
          <p>
            You can add details such as the client's name to the first message. Jobber's page does
            not say you can use a different review link, so leave the link part as Jobber has it.
          </p>
          <Callout kind="tip" title="Keep it neutral">
            "Thank you for choosing us. If you have a minute, we would love an honest review." The
            same words for every client. No stars, no discount, no wording about what to write.
          </Callout>
          <p>
            Jobber's default follow-up wording asks clients to leave a review "if you're happy with
            our work". Google's policy does not allow businesses to selectively solicit positive
            reviews, so edit the first message to ask for an honest review. Jobber's reminder text
            cannot be edited, so accept the reminders knowingly, and never use that wording to steer
            happy clients towards Google.
          </p>
        </>
      ),
    },
    {
      id: "exclude",
      heading: "Can I leave some clients out?",
      answer:
        "Jobber lets you turn off Ask for review on one client's profile, but do not use it to skip clients who seemed unhappy. Google's policy does not allow businesses to selectively solicit positive reviews from customers.",
      body: (
        <>
          <p>
            In Jobber, open the client's profile, select Edit, go to Communication settings and
            toggle off Ask for review. There are good reasons to use it, such as a client who has
            asked not to be contacted. Jobber also says that if a client's name matches an existing
            Google reviewer, it flags it and turns the toggle off. The reason must never be how you
            think the job went.
          </p>
          <DoDont
            yesTitle="Fine"
            noTitle="Not allowed"
            yes={[
              "The same request to every client who finishes a job.",
              "Turning it off for a client who asked not to be contacted.",
              "One plain line asking for an honest review.",
            ]}
            no={[
              "Turning it off for clients who complained.",
              "A discount or a free visit in exchange for a review.",
              "A review target for each crew member.",
              "Asking clients to leave five stars.",
            ]}
          />
          <p>
            Google's policy also lists merchants requesting that staff solicit a certain number of
            reviews, so keep the targets for the crew out of it. More in{" "}
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
      heading: "Can I offer a discount for a review?",
      answer:
        "No. Google calls offering incentives, like free or discounted goods or services, in exchange for reviews fake and misleading and says it is strictly prohibited. That applies to Jobber messages the same as any other.",
      body: (
        <p>
          That includes a discount on the next job, a free extra visit or an entry into a prize
          draw. A review should reflect a genuine experience, so thank clients for the job, ask for
          an honest review, and leave it there.
        </p>
      ),
    },
    {
      id: "other-places",
      heading: "Where else can I put my review link?",
      answer:
        "Anywhere your clients already look: Google says it can go on receipts, in thank-you emails, at the end of a chat, or as a QR code printed and displayed in your store. Jobber's tool covers the message it sends. Printed things are up to you.",
      body: (
        <p>
          Jobber's page does not describe printed items, so use a link or QR code from Google for
          the van sign, the business card or the counter. The same rules apply: one request for
          everyone, no reward. The full list is in{" "}
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
          counter card you can print. You can make a separate link for each place, such as the van,
          the business card and the counter, and see how many times each link was tapped. A tap is
          not a review: Google decides which reviews appear.
        </p>
        <p>
          Kabsi never contacts your clients and never receives their details. Jobber keeps sending
          its own request as you set it up above, and Kabsi is not part of that message.{" "}
          <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Do I need a Jobber add-on to ask for reviews?",
      a: "Jobber says Reviews is available in the United States, Canada and the United Kingdom on all plans as part of its Marketing Suite. Add-on details are in a separate Jobber article, so check your plan in Jobber.",
    },
    {
      q: "Does Jobber only ask happy clients?",
      a: "Jobber sends by trigger, not by rating. Its default reminder wording refers to being happy with the work, and the reminder text cannot be edited. Accept the reminders knowingly, and never use that wording to steer happy clients to Google, which does not allow selectively soliciting positive reviews.",
    },
    {
      q: "How often can the same client be asked?",
      a: "Jobber says it sends at most one request per client every six months, with up to two reminders if the client does not click the link, the first three days after the first ask and the second five days after that.",
    },
  ],
  sources: [
    {
      title: "Jobber Help Center: Reviews (Marketing Tools)",
      url: "https://help.getjobber.com/hc/en-us/articles/20621046897559-Reviews-Marketing-Tools",
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
  industries: ["auto-repair", "car-wash", "pet-grooming"],
  related: [
    "where-to-put-your-google-review-link",
    "how-to-ask-for-google-reviews",
    "review-gating-google",
    "google-review-link-and-qr-code",
  ],
  summary:
    "How to use Jobber's Reviews tool to ask every client for a Google review: setup, the three triggers, editing the message, and Google's rules against filtering, rewards and staff targets.",
};
