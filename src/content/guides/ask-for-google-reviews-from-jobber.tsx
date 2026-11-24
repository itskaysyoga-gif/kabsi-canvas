import { Callout, DoDont, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { SITE3_PUBLISH_AT } from "./schedule";
import type { GuideDoc } from "./types";

// Weekly guide 10 (the 37th guide), for Jobber users. Every claim about Google is from the Google sources below, read on
// 24 Nov 2026. Jobber's help centre page did not load as raw text that day (a bot check), so the Jobber lines stay general:
// no menu paths, triggers, timings, plans or limits.
const READ = "2026-11-24";

export const guide: GuideDoc = {
  slug: "ask-for-google-reviews-from-jobber",
  title: "How do I ask for Google reviews from Jobber?",
  description:
    "How to ask every Jobber client for a Google review with Jobber's reviews tool, what to check in Jobber, and how to stay inside Google's review rules.",
  publishAt: SITE3_PUBLISH_AT,
  updated: READ,
  checked: READ,
  topic: "Reviews",
  answer:
    "Jobber's help centre has an article on a Reviews tool in its Marketing Tools. Check in Jobber how it sends requests, keep it on for every client, and do not leave out clients you think were unhappy.",
  inShort: [
    "In Jobber, look for the reviews tool. Jobber's help centre covers it in an article called Reviews (Marketing Tools).",
    "Check in Jobber when the request goes out, how it is sent and who it goes to.",
    "Send the same request to every client who finishes a job.",
    "No discount or gift for a review, and no switching clients off because they seemed unhappy.",
  ],
  sections: [
    {
      id: "what-it-is",
      heading: "Does Jobber have a way to ask for Google reviews?",
      answer:
        "Jobber's help centre has an article called Reviews (Marketing Tools), so look for the reviews tool in Jobber. Which plans, countries and users can use it is up to Jobber, so check your own account.",
      body: (
        <>
          <p>
            Check which users in your account can manage the review settings. If your Google
            Business Profile is not verified yet, start with{" "}
            <GuideLink slug="how-to-verify-google-business-profile">
              how to verify your Google Business Profile
            </GuideLink>
            .
          </p>
          <p>
            Check your own plan, and any add-on, inside Jobber. This guide does not quote Jobber's
            plans or prices.
          </p>
        </>
      ),
    },
    {
      id: "set-up",
      heading: "How do I set up Reviews in Jobber?",
      answer:
        "In Jobber, look for the reviews tool and follow its setup steps. Read what access it asks for on your Google account before you grant it, and read the message before you turn it on.",
      body: (
        <>
          <Steps
            items={[
              "In Jobber, look for the reviews tool.",
              "Follow Jobber's setup steps to connect your Google Business Profile.",
              "Read what access Jobber asks for before you grant it.",
              "Read the message Jobber will send.",
              "Finish the setup.",
            ]}
          />
          <p>
            If Jobber also sends its own follow-up emails or texts after a job, check your Jobber
            settings so clients are not asked for a review twice.
          </p>
        </>
      ),
    },
    {
      id: "when",
      heading: "When does Jobber send the request?",
      answer:
        "Jobber's help centre describes when its reviews tool sends the request. Check the options in your own account, and pick a moment that every client reaches, such as when the work is done.",
      body: (
        <>
          <ul>
            <li>
              <b>The same moment for everyone:</b> one point every client reaches, so nobody is
              skipped.
            </li>
            <li>
              <b>Email or text:</b> check which ones Jobber offers and which your clients can
              receive.
            </li>
            <li>
              <b>Reminders:</b> check whether Jobber sends reminders and how often, so clients are
              not asked too many times.
            </li>
          </ul>
          <p>
            This guide does not repeat Jobber's exact timings or limits. They are in Jobber's help
            centre and in your account, and Jobber can change them.
          </p>
        </>
      ),
    },
    {
      id: "message",
      heading: "Can I change what the message says?",
      answer:
        "Check in Jobber which parts of the message and any reminders you can edit. Whatever you can edit, ask for an honest review, in the same words for every client.",
      body: (
        <>
          <p>
            Read the message before you turn the tool on. If you are not sure whether you can change
            the review link in it, leave the link as Jobber has it.
          </p>
          <Callout kind="tip" title="Keep it neutral">
            "Thank you for choosing us. If you have a minute, we would love an honest review." The
            same words for every client. No stars, no discount, no wording about what to write.
          </Callout>
          <p>
            If any wording in the message or a reminder only invites happy clients, such as "if
            you're happy with our work", change it where Jobber lets you. Google's policy does not
            allow businesses to selectively solicit positive reviews, so the message should ask
            everyone for an honest review.
          </p>
        </>
      ),
    },
    {
      id: "exclude",
      heading: "Can I leave some clients out?",
      answer:
        "If Jobber lets you turn review requests off for one client, do not use it to skip clients who seemed unhappy. Google's policy does not allow businesses to selectively solicit positive reviews from customers.",
      body: (
        <>
          <p>
            There are good reasons to turn requests off for one client, such as a client who has
            asked not to be contacted. Check Jobber's client settings for how to do it. The reason
            must never be how you think the job went.
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
          For the van sign, the business card or the counter, use a link or QR code from Google. The same rules apply: one request for
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
      a: "Check your plan in Jobber or in Jobber's help centre. This guide does not quote Jobber's plans, add-ons or prices.",
    },
    {
      q: "Does Jobber only ask happy clients?",
      a: "Read the message and any reminders before you turn the tool on. If any wording only invites happy clients, change it where Jobber lets you, and never pick who gets the request by how you think the job went. Google does not allow selectively soliciting positive reviews.",
    },
    {
      q: "How often can the same client be asked?",
      a: "Check Jobber's settings and help centre for how often it asks the same client and whether it sends reminders. This guide does not repeat Jobber's limits.",
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
    "How to use Jobber's reviews tool to ask every client for a Google review: what to check in Jobber, the message, and Google's rules against filtering, rewards and staff targets.",
};
