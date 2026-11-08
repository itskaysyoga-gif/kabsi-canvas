import { Callout, DoDont } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { weeklyAt } from "./schedule";
import type { GuideDoc } from "./types";

// Weekly guide 5 (the 32nd guide), for salons, barbershops, nail, lash and beauty studios in the UK and the UAE. Every
// claim about Google is from the Google sources below, read on 8 Nov 2026. The example reviews and replies are invented.
const READ = "2026-11-08";

export const guide: GuideDoc = {
  slug: "reply-to-review-that-names-your-stylist",
  title: "How do I reply to a review that names my stylist?",
  description:
    "How a salon or barbershop replies when a Google review names a stylist or barber: thanks for praise, care with complaints, and Google's staff rules.",
  publishAt: weeklyAt(4),
  updated: READ,
  checked: READ,
  topic: "Reviews",
  answer:
    "When a review praises a stylist by name, thank the client and say you will pass it on, using the first name the client used and only with the stylist's OK. When a review blames a named stylist, reply as the salon without repeating the name, and deal with it in private.",
  inShort: [
    "Praise: use the first name the client wrote, and nothing more about the stylist.",
    "A complaint about a named stylist: no name, no blame and no defence in public.",
    "Never ask clients to mention a stylist: Google's policy does not allow it.",
    "No review targets per stylist or barber: Google's policy does not allow those either.",
  ],
  sections: [
    {
      id: "is-it-ok",
      heading: "Is it all right to use a stylist's name in my reply?",
      answer:
        "Yes, when the client named them first and the stylist is happy for it. Google's tips say to personalise a reply and acknowledge the reviewer's specific feedback, and thanking the person they praised does exactly that.",
      body: (
        <>
          <p>
            Ask each member of your team once, when they join, whether they are happy to be thanked
            by name in replies, and use only the first name the client used. Google's content policy
            treats someone's full name or last name posted without their consent as personal
            information, so a surname, a personal social account or where they live never belongs in
            a reply.
          </p>
          <p>
            Your replies show as your business, not as you, and the reviewer is notified when you
            reply. Google checks every reply against its content policies before it appears, usually
            within 10 minutes and sometimes up to 30 days.
          </p>
        </>
      ),
    },
    {
      id: "praise",
      heading: "How do I reply to praise for a named stylist or barber?",
      answer:
        "Thank the client, name the stylist once, mention one thing from the review and say you will pass the words on. Google's advice is to keep replies short, conversational rather than promotional, and focused on something real the client said.",
      body: (
        <>
          <p>
            <b>Example review, 5 stars:</b> "Maya fixed a colour another salon ruined and actually
            listened to what I wanted." <b>Reply:</b> "Thank you, Leila. Maya will be so pleased to
            read this, and we know how much it matters to be listened to after a bad experience. See
            you next time. Rose Lane Salon"
          </p>
          <p>
            <b>Example review, 5 stars:</b> "Best fade I have had in years, Sami takes his time."{" "}
            <b>Reply:</b> "Thanks, Chris. I have shown Sami your review. Good to hear the extra
            minutes are worth it. The Fade Room"
          </p>
          <p>
            Leave out offers, prices and booking pushes. Google says your reviewers are already
            customers, so a reply should share a detail that reinforces their experience rather than
            a deal.
          </p>
        </>
      ),
    },
    {
      id: "left",
      heading: "What if the review names someone who has left?",
      answer:
        "Thank the client for the kind words and say the team appreciates them. Do not say where the stylist has gone or why they left, and do not suggest a replacement in the same breath.",
      body: (
        <p>
          <b>Example reply:</b> "Thank you, Anna, that is lovely to read. Jess is no longer with us,
          and we will make sure she hears your words. We hope to see you again." If the person left
          on bad terms, a reply that does not name them at all is fine. Their personal details stay
          out of public view either way.
        </p>
      ),
    },
    {
      id: "complaint",
      heading: "How do I reply when a review blames a named stylist?",
      answer:
        "Reply as the salon, not as the stylist, and leave their name out of your reply. Speak to the stylist privately before you write anything, then thank the client, say you are sorry it went wrong and ask them to get in touch through the details on your profile.",
      body: (
        <>
          <p>
            <b>Example review, 1 star:</b> "Emma was rude and rushed my cut. Would not go back."{" "}
            <b>Reply:</b> "We are sorry your visit felt rushed, and thank you for telling us. That
            is not how we want anyone to feel here. Please get in touch through the details on our
            profile so the owner can hear what happened. Rose Lane Salon"
          </p>
          <DoDont
            yesTitle="Do"
            noTitle="Do not"
            yes={[
              "Hear the stylist's side in private first.",
              "Apologise for the experience once.",
              "Move the conversation to a phone call or an email.",
            ]}
            no={[
              "Repeat the stylist's name in your reply.",
              "Defend or blame the stylist in public.",
              "Say what the client said or did in the chair.",
            ]}
          />
          <p>
            Google's tips for negative reviews are to protect privacy, avoid personal attacks, be
            honest and apologise when appropriate. A public argument about a named person helps
            nobody, and it stays under your profile.
          </p>
        </>
      ),
    },
    {
      id: "asking",
      heading: "Can I ask clients to mention their stylist in a review?",
      answer:
        "No. Google's policy says merchants must not ask staff to collect reviews that include specific content, including content that identifies a staff member, and must not ask staff to collect a certain number of reviews. Ask every client for an honest review in the same way, and let them decide what to write.",
      body: (
        <>
          <p>
            That rules out cards that say "Mention my name", review counts per chair, prizes for the
            stylist with the most reviews, and asking only the clients you think were happy.
            Google's policy also says businesses must not discourage negative reviews or offer
            incentives, such as discounts or free services, for a review.
          </p>
          <Callout kind="tip" title="What staff can say">
            "If you have a minute, we would love an honest review on Google. Here is the link." The
            same words for every client, after every appointment. More is in{" "}
            <GuideLink slug="how-to-ask-for-google-reviews">
              how to ask customers for Google reviews
            </GuideLink>
            .
          </Callout>
        </>
      ),
    },
    {
      id: "report",
      heading: "When should I report a review that names a stylist?",
      answer:
        "When it breaks Google's policies, not when it is simply unfair. Google removes reviews that harass people, post personal information without consent, are fake, or come from a conflict of interest such as a former employee or a competitor.",
      body: (
        <p>
          To report it, open your profile, select Read reviews, select Report next to the review,
          choose the reason and select Send report. Google says evaluation typically takes several
          days and that you can follow it in the Reviews Management Tool, with a one-time appeal if
          no violation is found. While you wait, a calm reply that names no one is still the best
          thing under the review. The steps for any bad review are in{" "}
          <GuideLink slug="reply-to-bad-google-review-salon">
            how a salon should reply to a bad Google review
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
          Add your team's names in About your business. A reply Kabsi drafts thanks a stylist or a
          barber by name only when the review names them and they are on your team list; a name that
          is not on the list is never used, and Kabsi asks you to check the list again after 180
          days. You approve, edit or skip every reply.
        </p>
        <p>
          A complaint that names a member of your team gets no draft. It is marked "This review
          needs a little more care" with a short checklist, Kabsi writes a short, neutral holding
          reply only if you ask, and on WhatsApp it comes with no draft and no Approve button. Your
          review link and QR code are the same for every client, with no counts per stylist and no
          targets. Nothing goes on Google until you approve it.{" "}
          <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Can I reply from the stylist's own account?",
      a: "Replies on your profile are posted as the business, and Google does not show the personal name of whoever wrote them. Write as the salon and sign with the salon's name or the owner's.",
    },
    {
      q: "Can I give the stylist with the most reviews a bonus?",
      a: "No. Google's policy does not allow asking staff to collect a certain number of reviews, or reviews that identify a staff member. Ask every client the same way and reward your team for their work instead.",
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
      title: "Google Maps: Prohibited and restricted content",
      url: "https://support.google.com/contributionpolicy/answer/7400114?hl=en",
      read: READ,
    },
    {
      title: "Google: Report inappropriate reviews on your Business Profile",
      url: "https://support.google.com/business/answer/4596773?hl=en",
      read: READ,
    },
  ],
  industries: ["hair-salon", "barbershop", "beauty-salon", "nail-salon", "lash-and-brow-studio"],
  related: [
    "reply-to-bad-google-review-salon",
    "how-to-reply-to-google-reviews",
    "how-to-ask-for-google-reviews",
  ],
  summary:
    "How a salon or barbershop replies to a Google review that names a stylist or barber, for praise, for a complaint and for someone who has left, and why Google does not allow asking clients to name staff.",
};
