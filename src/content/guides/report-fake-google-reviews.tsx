import { Callout, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { scheduledAt } from "./schedule";
import type { GuideDoc } from "./types";

// Guides 3, guide 11. Every claim about Google is from the sources below, read on 5 Nov 2026.
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "report-fake-google-reviews",
  title: "How do I report fake or spam reviews on Google?",
  description:
    "Which reviews Google removes, how to report one from your profile or the Reviews Management Tool, how to appeal once, and what to do about review extortion.",
  publishAt: scheduledAt(10),
  updated: READ,
  checked: READ,
  topic: "Reviews",
  answer:
    "Open your Business Profile, select Read reviews, select Report next to the review, choose the reason and send the report, then follow it in Google's Reviews Management Tool. Google removes only reviews that break its content policies, such as fake engagement, spam or harassment, not reviews that are simply negative.",
  inShort: [
    "Only Google can remove a review, and only one that breaks its policies.",
    "Report it from your profile or in the Reviews Management Tool, where you can see the status.",
    "If Google finds no violation, you can appeal once, up to 10 reviews at a time.",
    "If someone demands money to remove bad reviews, do not pay: use Google's extortion form.",
  ],
  sections: [
    {
      id: "what-google-removes",
      heading: "Which reviews will Google actually remove?",
      answer:
        "Google says you can report any review, but only those that violate its policies are eligible for removal. It also says not to report a review just because you disagree with it or dislike it, and that it does not get involved in conflicts between businesses and customers.",
      body: (
        <p>
          So a harsh one-star review from a real customer usually stays, however unfair it feels. The
          honest answer to that is a calm public reply, covered in{" "}
          <GuideLink slug="how-to-respond-to-negative-google-reviews">
            how to respond to negative Google reviews
          </GuideLink>
          . A review written by someone who was never a customer, posted from several accounts, or
          full of abuse is a different matter, and that is what reporting is for.
        </p>
      ),
    },
    {
      id: "what-counts",
      heading: "What counts as a fake review under Google's rules?",
      answer:
        "Google's Maps content policy says contributions must reflect a genuine experience at a place, and that fake engagement is not allowed and will be removed. That includes content not based on a real experience, reviews paid for in money or in kind, content posted from several accounts by one person, and content posted on a competitor to damage its reputation.",
      body: (
        <>
          <p>The policy also names, among other things:</p>
          <ul>
            <li>
              Reviews based on a conflict of interest, such as current or former employment, a
              contract with the business, a competitor or a family relationship.
            </li>
            <li>
              Unusual volumes or patterns of reviews that suggest an effort to manipulate a rating.
            </li>
            <li>
              Harassment, hate speech, personal information posted without consent, profanity used to
              offend, and off-topic content such as general political or social commentary.
            </li>
            <li>The same content posted several times, from one account or many.</li>
          </ul>
          <p>
            When you report, pick the reason that matches what the review breaks, for example
            "Spam" or "Profanity", the examples Google gives.
          </p>
        </>
      ),
    },
    {
      id: "report-from-profile",
      heading: "How do I report a review from my Business Profile?",
      answer:
        "Sign in to the Google Account that manages your profile, open your Business Profile, select Read reviews, then select Report next to the review. Choose the reason and select Send report; Google says the evaluation typically takes several days.",
      body: (
        <Steps
          items={[
            "Go to your Business Profile while signed in.",
            <>
              Select <b>Read reviews</b>.
            </>,
            <>
              Next to the review you want to flag, select <b>Report</b>.
            </>,
            "Select the reason, for example \"Spam\" or \"Profanity\".",
            <>
              Select <b>Send report</b>.
            </>,
          ]}
        />
      ),
    },
    {
      id: "reviews-management-tool",
      heading: "How do I follow up in the Reviews Management Tool?",
      answer:
        "Google's Reviews Management Tool lets you report a review and check where your report stands. You confirm the email address that manages the profile, choose your business, and either report a new review or check one you reported before.",
      body: (
        <>
          <Steps
            items={[
              <>
                Open the Reviews Management Tool. If the email shown is the one that manages your
                profile, select <b>Confirm</b>; otherwise select <b>Switch account</b>.
              </>,
              <>
                Select your business, then <b>Continue</b>.
              </>,
              <>
                To report, choose <b>Report a new review for removal</b>, then <b>Continue</b>, select{" "}
                <b>Report</b> next to the review, choose the reason in the new tab and select{" "}
                <b>Submit</b>.
              </>,
              "To check a report, come back to the tool and look at its status.",
            ]}
          />
          <p>The statuses Google lists are:</p>
          <ul>
            <li>
              <b>Decision pending</b>: flagged, not evaluated yet.
            </li>
            <li>
              <b>Report reviewed - no policy violation</b>: evaluated, and Google found no violation.
            </li>
            <li>
              <b>Escalated - check your email for updates</b>: your appeal is being looked at and the
              final decision comes by email.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "appeal",
      heading: "What if Google says the review does not break its rules?",
      answer:
        "You can submit a one-time appeal from the Reviews Management Tool. Google says you can select up to 10 reviews, that you get an email with the result, and that a review found to break its policies is removed while one that complies stays live.",
      body: (
        <>
          <Steps
            items={[
              <>
                In the Reviews Management Tool, confirm your account, select your business and choose{" "}
                <b>Check the status of a review I reported previously and appeal options</b>, then{" "}
                <b>Continue</b>.
              </>,
              <>
                At the bottom, select <b>Appeal eligible reviews</b>.
              </>,
              <>
                Select the reviews to appeal, then <b>Continue</b> and <b>Submit an appeal</b>.
              </>,
              <>
                Fill out the form in the new tab and select <b>Submit</b>.
              </>,
            ]}
          />
          <Callout kind="tip" title="Use your one appeal well">
            Since you get one appeal, write down what shows the review breaks the policy before you
            send it: no record of a visit on that date, the same wording on other reviews, or a link
            to a competitor or a former employee.
          </Callout>
        </>
      ),
    },
    {
      id: "extortion",
      heading: "Someone wants money to remove bad reviews. What do I do?",
      answer:
        "Do not pay or engage with them, and report it on Google's merchant extortion report form. Google says these scams may involve a sudden increase in one-star and two-star reviews followed by a demand for money, goods or services to remove them, and says paying can encourage more attempts.",
      body: (
        <ul>
          <li>
            Take screenshots of every demand, by email, WhatsApp, Telegram or social media, showing
            the date, time and the sender's details where you can.
          </li>
          <li>Collect links to each suspicious review and note when the reviews started.</li>
          <li>Note any names, numbers or profiles used by the people making the demands.</li>
          <li>
            Use the extortion form only for an actual demand. Google says other policy breaches,
            such as spam, go through the normal report.
          </li>
        </ul>
      ),
    },
    {
      id: "reply-meanwhile",
      heading: "Should I reply to a review I think is fake?",
      answer:
        "A short, calm reply is usually wise, because people read it while Google decides. Google's tips for negative reviews apply: stay professional and polite, never share a reviewer's private information or attack them personally, and invite them to contact you to sort it out privately.",
      body: (
        <p>
          A reply like "We cannot find a visit matching this, and we would like to understand what
          happened. Please contact us so we can look into it." says what matters without accusing
          anyone. Google also uses automated
          spam detection, and it says this can occasionally remove a genuine review by mistake; if
          that happens, Google asks you to contact support.
        </p>
      ),
    },
    {
      id: "uk-uae",
      heading: "Is anything different in the UK or the UAE?",
      answer:
        "Google's report, appeal and extortion steps are the same in both countries. In the UK, the Competition and Markets Authority's fake reviews guidance says the ban on fake reviews covers negative ones too, and that a review is not fake just because the business does not like or agree with it.",
      body: (
        <p>
          That UK guidance, published on 4 April 2025 under the Digital Markets, Competition and
          Consumers Act 2024, mainly sets duties for whoever writes, commissions or publishes reviews;
          asking Google to remove a review still goes through Google's own report. This guide does not
          cover UAE law, and Google's steps above work the same for a business in the UAE.
        </p>
      ),
    },
  ],
  kabsi: {
    heading: "What Kabsi does and does not do here",
    body: (
      <>
        <p>
          On Pro, Report this review on a review in Kabsi opens a guide for a review you believe
          breaks Google's rules: Google's content categories in plain words, an evidence checklist
          (you keep the evidence; Kabsi remembers only which boxes you ticked), the steps and a link
          to the Reviews Management Tool, and a place to record what happened, with a reminder a week
          later. Every new review also reaches you with a reply drafted, and a review with a threat,
          harassment or an accusation of a crime gets no draft, only a short checklist, so you decide what to
          say.
        </p>
        <p>
          Kabsi cannot remove a review, does not report it for you, never promises a removal and
          gives no legal advice: Google decides. <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Can I pay someone to remove a bad review?",
      a: "No one outside Google can remove a review. Google removes reviews that break its policies, whoever reports them, and a review that follows its policies stays.",
    },
    {
      q: "Can I report the person who wrote it?",
      a: "Yes. In the Google Maps app, tap Business, then Reviews, tap the reviewer's name, then More and Report, and choose a reason. Google then reviews their activity for policy violations.",
    },
  ],
  sources: [
    {
      title: "Google: Report inappropriate reviews on your Business Profile",
      url: "https://support.google.com/business/answer/4596773?hl=en",
      read: READ,
    },
    {
      title: "Google Maps: Prohibited and restricted content",
      url: "https://support.google.com/contributionpolicy/answer/7400114?hl=en",
      read: READ,
    },
    {
      title: "Google: Report negative review extortion scams on your Business Profile",
      url: "https://support.google.com/business/answer/16404809?hl=en",
      read: READ,
    },
    {
      title: "Google: Tips to get more reviews",
      url: "https://support.google.com/business/answer/3474122?hl=en",
      read: READ,
    },
    {
      title: "GOV.UK: Fake reviews guidance (CMA208)",
      url: "https://assets.publishing.service.gov.uk/media/67eeb64fe9c76fa33048c790/CMA208_-_Fake_reviews_guidance.pdf",
      read: READ,
    },
  ],
  industries: ["restaurant", "hair-salon", "medical-and-aesthetic-clinic", "auto-repair"],
  related: [
    "can-you-remove-a-google-review",
    "how-to-respond-to-negative-google-reviews",
    "review-gating-google",
  ],
  summary:
    "How to report a fake or spam Google review: what Google removes, the report and Reviews Management Tool steps and statuses, the one-time appeal, and review extortion scams.",
};
