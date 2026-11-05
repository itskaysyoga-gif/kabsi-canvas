import { Callout, DoDont, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import type { GuideDoc } from "./types";

// Guides 3, earlier guide rewritten on the template. Every claim about Google is from the sources below, read on 5 Nov 2026.
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "can-you-remove-a-google-review",
  title: "Can you remove a Google review?",
  description:
    "What Google removes and what it does not, how to report a review from your profile or the Reviews Management Tool, and how the one-time appeal works.",
  publishAt: "2026-09-26T00:00:00Z",
  updated: READ,
  checked: READ,
  topic: "Google reviews",
  answer:
    "No, you cannot remove a genuine review yourself, even a negative one. You can report a review that breaks Google's policies, and Google decides whether to remove it.",
  inShort: [
    "Only reviews that break Google's policies are removed, not reviews you simply disagree with.",
    "Report from your profile (Read reviews, then Report) or from Google's Reviews Management Tool.",
    "Google says evaluation typically takes several days, and you can appeal a decision once.",
    "Nobody outside Google can remove a review, whatever they charge.",
  ],
  sections: [
    {
      id: "what-google-removes",
      heading: "Which reviews will Google remove?",
      answer:
        "Google says you can report any review, but only those that violate its policies are eligible for removal. Reviews it finds in breach of its content policies are removed and no longer show on Maps and Search; a genuine negative review stays.",
      body: (
        <>
          <DoDont
            yesTitle="Can be removed"
            noTitle="Will not be removed"
            yes={[
              "Fake engagement, such as reviews paid for or not based on a real experience",
              "Harassment, hate speech or profanity",
              "Off-topic content that is not about a visit",
              "Personal information about someone",
              "Advertising, such as phone numbers or links in a review",
            ]}
            no={[
              "A genuine negative review",
              "A review you simply disagree with or dislike",
              "A dispute between you and a customer",
            ]}
          />
          <p>
            Google's page is clear: do not report a review just because you disagree with it, and Google
            does not get involved in conflict between businesses and customers.
          </p>
        </>
      ),
    },
    {
      id: "report-from-profile",
      heading: "How do I report a review from my profile?",
      answer:
        "Open your Business Profile, select Read reviews, select Report next to the review, choose the reason, for example Spam or Profanity, and select Send report. You can then follow the report in the Reviews Management Tool.",
      body: (
        <Steps
          items={[
            "Sign in to the Google Account that manages your profile and open your Business Profile.",
            <>
              Select <b>Read reviews</b>.
            </>,
            <>
              Next to the review you want to flag, select <b>Report</b>.
            </>,
            "Select the reason, for example 'Spam' or 'Profanity'.",
            <>
              Select <b>Send report</b>.
            </>,
          ]}
        />
      ),
    },
    {
      id: "reviews-management-tool",
      heading: "What is the Reviews Management Tool?",
      answer:
        "It is Google's own page for reporting reviews and checking what happened to your reports. You sign in with the email linked to your Business Profile, choose the business, and report a new review or check the status of one you reported.",
      body: (
        <>
          <Steps
            items={[
              <>
                Open the Reviews Management Tool from Google's help page (linked in the sources below). If
                the email shown is the one linked to your profile, select <b>Confirm</b>; otherwise
                select <b>Switch account</b>.
              </>,
              <>
                Select your business, then <b>Continue</b>.
              </>,
              <>
                Choose <b>Report a new review for removal</b>, then <b>Continue</b>.
              </>,
              <>
                Next to the review, select <b>Report</b>, choose the reason in the new tab and select{" "}
                <b>Submit</b>.
              </>,
            ]}
          />
          <p>Google lists three statuses you may see when you come back:</p>
          <ul>
            <li>
              <b>Decision pending:</b> the review is flagged but not evaluated yet.
            </li>
            <li>
              <b>Report reviewed - no policy violation:</b> Google found no violation. You can submit a
              one-time appeal if you disagree.
            </li>
            <li>
              <b>Escalated - check your email for updates:</b> the appeal has been escalated and you will
              get an email with the final decision.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "appeal",
      heading: "Can I appeal if Google keeps the review?",
      answer:
        "Yes, once. In the Reviews Management Tool choose to check the status of a review you reported, select Appeal eligible reviews, pick the review, fill in the form and submit it. Google emails you the result: a review that breaks its policies is removed, and one that complies stays live.",
      body: (
        <>
          <p>
            Google says you can select up to 10 reviews in one appeal. Because there is only one appeal,
            write it carefully: say which policy you think the review breaks and why, with dates and
            anything that shows the person was never a customer.
          </p>
          <Callout kind="tip" title="Keep your own notes">
            Write down the date you reported each review, the reason you chose and the status Google
            shows. It makes the appeal easier and stops you reporting the same review twice.
          </Callout>
        </>
      ),
    },
    {
      id: "paid-removal",
      heading: "Can someone remove a review for me if I pay?",
      answer:
        "No. Only Google removes reviews, and only when they break its policies, so anyone charging to remove reviews cannot do anything you cannot do yourself for free. Offering a customer something to remove a negative review is also fake engagement under Google's rules.",
      body: (
        <>
          <p>
            Google's policy says merchants may not offer incentives, such as payment, discounts or free
            goods and services, in exchange for posting a review or for revising or removing a negative
            one. Google's restrictions page says a business that breaks its fake engagement policy can
            have new reviews blocked for a set time, existing reviews unpublished for a set time, or a
            warning shown to customers that fake reviews were removed.
          </p>
          <Callout kind="warn" title="Reviews followed by a demand for money">
            If a sudden run of 1 and 2 star reviews comes with someone demanding money or services to
            remove them, Google calls it an extortion scam. Do not pay or engage, gather screenshots, and
            use Google's merchant extortion report form.
          </Callout>
        </>
      ),
    },
    {
      id: "other-sites",
      heading: "What about reviews from other websites on my profile?",
      answer:
        "Your profile may show reviews from websites that are not Google. Google says you cannot choose or stop them, and that you should contact the other website directly about a rating or review that comes from it.",
      body: (
        <p>
          Google says businesses in the European Economic Area can report reviews from other websites
          directly on Google. The UK and the UAE are not in the European Economic Area, so a business in
          either country contacts the other website instead.
        </p>
      ),
    },
    {
      id: "while-you-wait",
      heading: "What should I do while I wait?",
      answer:
        "Reply calmly and briefly. A polite, factual reply helps the next reader more than the review hurts, and it costs you nothing if Google later removes the review.",
      body: (
        <p>
          Google also uses automated spam detection to remove reviews, and says it may sometimes remove a
          genuine review by mistake; if that happens to a real customer's review, contact Google support.
          How to write the reply is in{" "}
          <GuideLink slug="how-to-respond-to-negative-google-reviews">
            how to respond to a negative Google review
          </GuideLink>
          , and fake reviews in particular are covered in{" "}
          <GuideLink slug="report-fake-google-reviews">how to report fake or spam reviews</GuideLink>.
        </p>
      ),
    },
  ],
  kabsi: {
    heading: "What Kabsi does and does not do here",
    body: (
      <>
        <p>
          Kabsi cannot remove a review, does not report one for you and never promises that Google will
          remove it. On Pro, Report this review on a review in Kabsi opens a guide: Google's content
          categories in plain words, an evidence checklist, the steps and a link to Google's Reviews
          Management Tool, and a place to record what happened, with one appeal. Kabsi reminds you a week
          after your last update.
        </p>
        <p>
          On every plan, Kabsi drafts a calm reply for each new review, and nothing goes on Google until
          you approve it. <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Will deleting my profile delete the bad reviews?",
      a: "Do not do it to get rid of reviews. Google's guidelines say not to create more than one profile for each location, so starting a new profile for the same business is not a fix.",
    },
    {
      q: "Can the customer change their own review?",
      a: "Yes. Google says customers can still change their review after reading your reply. You can sort out the problem and leave it to them, but you must not offer anything in exchange for a change.",
    },
  ],
  sources: [
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
      title: "Google: Business Profile restrictions for policy violations",
      url: "https://support.google.com/business/answer/14114287?hl=en",
      read: READ,
    },
    {
      title: "Google: Report negative review extortion scams on your Business Profile",
      url: "https://support.google.com/business/answer/16404809?hl=en",
      read: READ,
    },
    {
      title: "Google: About third-party reviews",
      url: "https://support.google.com/business/answer/10286840?hl=en",
      read: READ,
    },
    {
      title: "Google: Guidelines for representing your business on Google",
      url: "https://support.google.com/business/answer/3038177?hl=en",
      read: READ,
    },
  ],
  industries: ["restaurant", "cafe", "hair-salon"],
  related: [
    "report-fake-google-reviews",
    "how-to-respond-to-negative-google-reviews",
    "how-to-reply-to-google-reviews",
  ],
  summary:
    "You cannot remove a genuine Google review. How to report one that breaks Google's policies, the Reviews Management Tool statuses, the one-time appeal and paid removal offers.",
};
