import { Callout, DoDont, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import type { GuideDoc } from "./types";

// Guides 3, earlier guide rewritten on the template. Every claim about Google is from the sources below, read on 5 Nov 2026.
// Known fix: the replies no longer give a phone number; they point to the details on the profile (facts 8.3).
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "how-to-respond-to-negative-google-reviews",
  title: "How to respond to a negative Google review",
  description:
    "A calm way to answer a bad Google review: what to say, what never to write, when to report it instead, and example replies you can adapt.",
  publishAt: "2026-09-26T00:00:00Z",
  updated: READ,
  checked: READ,
  topic: "Google reviews",
  answer:
    "Wait until you are calm, then reply briefly: thank them, name the problem in one sentence, apologise where it is fair, and ask them to get in touch through the details on your profile. Do not argue, share their details or offer anything for changing the review, and report it only if it breaks Google's rules.",
  inShort: [
    "A calm, short reply helps the next reader more than winning the argument.",
    "Name the problem once and invite them to get in touch through your profile's details.",
    "Never offer a discount or refund for changing or removing a review.",
    "Report a review only when it breaks Google's content policies.",
  ],
  sections: [
    {
      id: "should-i-reply",
      heading: "Should I reply to a bad review at all?",
      answer:
        "Usually yes. Google's own tips say negative reviews are not necessarily a sign of poor business practices, and that constructive replies and following up on concerns can show you care and may even encourage the customer to update their review.",
      body: (
        <p>
          Your reply is public, so you are writing for the next person reading your profile as much
          as for the reviewer. Google also says a mix of positive and negative feedback often feels
          more trustworthy, so one bad review among honest good ones is not a disaster. If the
          review is fake, abusive or about a different business, report it as well as, or instead
          of, replying: see the section on reporting below.
        </p>
      ),
    },
    {
      id: "five-steps",
      heading: "What are the steps to a good reply?",
      answer:
        "Five steps cover almost every bad review: wait until you are calm, thank them, name the problem in one sentence, invite them to get in touch through the details on your profile, and keep it short with a sign-off from the business.",
      body: (
        <>
          <Steps
            items={[
              "Wait until you are calm. You can edit a reply later, but people read it as soon as it is live.",
              "Thank them for telling you, even if you see it differently.",
              "Acknowledge the specific problem in one sentence, without arguing about the details in public.",
              "Ask them to get in touch through the details on your profile, so you can sort it out privately.",
              "Keep it short and sign it as the business, for example 'Luca, owner'.",
            ]}
          />
          <p>
            You reply the same way as to any review: open your Business Profile, select{" "}
            <b>Read reviews</b>, then <b>Reply</b> next to the review. The full steps are in{" "}
            <GuideLink slug="how-to-reply-to-google-reviews">
              how to reply to Google reviews
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "what-google-advises",
      heading: "What does Google itself advise for negative reviews?",
      answer:
        "Google's tips are to protect privacy and avoid personal attacks, be honest and explain limitations, apologise when appropriate, personalise the reply, and respond in a timely manner. For a complex situation it suggests politely asking the reviewer to contact you by phone or email to resolve it privately.",
      body: (
        <ul>
          <li>
            <b>Protect privacy:</b> never share a reviewer's private information, such as what they
            bought, when they came or anything from your booking system.
          </li>
          <li>
            <b>Be honest:</b> admit a mistake if you made one, but Google says not to take
            responsibility for things outside your control. Explain what you can and cannot do.
          </li>
          <li>
            <b>Apologise when it is fair:</b> Google says a genuine apology can go a long way in
            rebuilding trust.
          </li>
          <li>
            <b>Personalise:</b> use their name and answer what they actually wrote.
          </li>
          <li>
            <b>Be prompt:</b> Google says a prompt response shows you value feedback. It gives no
            fixed deadline.
          </li>
        </ul>
      ),
    },
    {
      id: "never-write",
      heading: "What should I never write in a reply?",
      answer:
        'Never argue about who is right, accuse the reviewer of lying, share their details, or offer a discount, refund or free service in exchange for changing or removing the review. Google says offering incentives for customers to change or remove reviews is "fake & misleading content and is strictly prohibited".',
      body: (
        <>
          <DoDont
            yesTitle="Do"
            noTitle="Never"
            yes={[
              "Thank them for the feedback.",
              "Name the problem in one sentence.",
              "Invite them to get in touch through the details on your profile.",
              "Sign it as the business.",
            ]}
            no={[
              "Argue, or accuse them of lying.",
              "Share their name, booking or anything private.",
              "Offer anything to change or remove the review.",
              "Write a phone number, email or link in the reply.",
            ]}
          />
          <p>
            Why no phone number or link: this guide's advice is to leave them out and point to the
            details on your profile, which already shows how to reach you. Google checks every reply
            against its content policies before it shows and asks you to edit one it does not
            approve.
          </p>
        </>
      ),
    },
    {
      id: "examples",
      heading: "What does a calm reply look like?",
      answer:
        "Here are three real kinds of bad review with replies you can adapt. Each one is short, names the problem once, and points to the details on the profile instead of writing a number in the reply.",
      body: (
        <ul>
          <li>
            <b>Slow service, 1 star:</b> "Waited 40 minutes for two sandwiches. Never again." Reply:
            "Thank you for telling us, Daniel, and we are sorry about the wait. That is not the
            service we want to give. Please get in touch through the details on our profile so we
            can hear what happened. Luca, owner"
          </li>
          <li>
            <b>A visit you cannot find, 2 stars:</b> "Rude staff and dirty tables." Reply: "We are
            sorry to read this, and we take it seriously. We would like to understand what happened,
            so please contact us through our profile with the day of your visit. Luca, owner"
          </li>
          <li>
            <b>Something outside your control, 2 stars:</b> "Could not park anywhere near the
            salon." Reply: "Thank you for the feedback, Priya. Parking on our street is limited and
            we cannot change that, but the car park two minutes away usually has space. We hope that
            helps next time. The Juniper team"
          </li>
        </ul>
      ),
    },
    {
      id: "report-instead",
      heading: "When should I report a review instead?",
      answer:
        "Report a review when it breaks Google's content policies, for example spam, fake engagement, profanity, harassment, hate speech, off-topic content or personal information. Google says not to report a review just because you disagree with it or dislike it, and that it does not get involved in conflict between businesses and customers.",
      body: (
        <>
          <p>
            Open your Business Profile, select <b>Read reviews</b>, select <b>Report</b> next to the
            review, choose the reason and select <b>Send report</b>. Google says evaluation
            typically takes several days. The whole process, including the one-time appeal, is in{" "}
            <GuideLink slug="can-you-remove-a-google-review">
              can you remove a Google review
            </GuideLink>
            .
          </p>
          <Callout kind="warn" title="A sudden wave of 1 star reviews and a demand for money">
            Google calls this an extortion scam and has a separate report form for it. Google says
            do not engage with or pay the people behind it, and gather evidence such as screenshots
            of their messages straight away.
          </Callout>
        </>
      ),
    },
    {
      id: "uk-uae",
      heading: "Is anything different in the UK or the UAE?",
      answer:
        "Google's pages here name no separate rule for the UK or the UAE. Reply in the language the customer wrote in, whether that is English or another language.",
    },
  ],
  kabsi: {
    heading: "What Kabsi does here",
    body: (
      <>
        <p>
          Kabsi emails you right away about reviews of 3 stars or less and any review it marks as
          medium or high risk, even if you chose WhatsApp for routine messages. A medium risk review
          gets a calm draft that names no one. A high-risk review, such as one about health, a
          threat, legal action or a complaint that names a member of your team, gets no draft: you
          read it and decide, and Kabsi writes a short, neutral holding reply only if you ask for
          one. It can never be approved on WhatsApp.
        </p>
        <p>
          Every draft points the customer to the details on your profile and never contains a phone
          number, email or link. Nothing goes on Google until you approve it. Kabsi cannot remove a
          review. <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Can I ask the customer to change their review?",
      a: 'You can fix the problem and let them decide. Google\'s tips say a constructive reply may encourage the customer to update their review, but Google says incentives in exchange for changing or removing reviews are fake and misleading content, and its Maps policy says "Incentivized or Biased Reviews" are not allowed.',
    },
    {
      q: "The review is from someone who was never a customer. What do I do?",
      a: "Report it from your profile and choose the reason that fits, then reply briefly and politely saying you cannot find their visit. Google decides whether it breaks its policies.",
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
      title: "Google: Report inappropriate reviews on your Business Profile",
      url: "https://support.google.com/business/answer/4596773?hl=en",
      read: READ,
    },
    {
      title: "Google: Prohibited and restricted content (Maps user contributed content policy)",
      url: "https://support.google.com/contributionpolicy/answer/7400114?hl=en",
      read: READ,
    },
    {
      title: "Google: Report negative review extortion scams on your Business Profile",
      url: "https://support.google.com/business/answer/16404809?hl=en",
      read: READ,
    },
  ],
  industries: ["restaurant", "cafe", "auto-repair", "hair-salon"],
  related: [
    "how-to-reply-to-google-reviews",
    "can-you-remove-a-google-review",
    "report-fake-google-reviews",
  ],
  summary:
    "How to answer a negative Google review calmly: five steps, Google's own advice, what never to write, example replies, and when to report a review instead.",
};
