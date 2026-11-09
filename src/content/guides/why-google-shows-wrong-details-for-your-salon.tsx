import { Callout, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { weeklyAt } from "./schedule";
import type { GuideDoc } from "./types";

// Weekly guide 8 (the 35th guide), for salons and barbershops in the UK and the UAE. Every claim about Google is from
// the Google sources below, read on 8 Nov 2026.
const READ = "2026-11-08";

export const guide: GuideDoc = {
  slug: "why-google-shows-wrong-details-for-your-salon",
  title: "Why does Google show the wrong details for my salon?",
  description:
    "Why a salon's Google profile can show wrong hours, a closed sign or a booking link you never added, and how to check what changed and fix it.",
  publishAt: weeklyAt(7),
  updated: READ,
  checked: READ,
  topic: "Profile details",
  answer:
    "Google gathers details from more than you: suggestions from people on Maps, other public sources such as websites, its own automated calls and messages, and booking partners. Open Edit profile to see what Google changed, which shows in blue, then correct it and make your website and booking page say the same.",
  inShort: [
    "Anyone can suggest an edit to your salon on Google Maps, and Google may publish it.",
    "Changes made by Google show in blue in your profile editor, with a notice at the top.",
    "A booking link you never added usually comes from a third-party partner, and only that partner can take it off.",
    "A salon that works only by appointment may be asked by Google's guidelines not to show hours at all.",
  ],
  sections: [
    {
      id: "where-from",
      heading: "Where do the details on my Google profile come from?",
      answer:
        "Not only from you. Google says it gathers information from different sources, such as user reports and licensed content, and that if those sources report your profile information is incorrect or outdated, Google may update your profile.",
      body: (
        <>
          <p>
            Google also says that, in some regions and categories, it may contact the verified phone
            number on your profile with automated calls, texts or WhatsApp messages to confirm your
            details, and that what you answer may be used to update your profile. If a junior member
            of staff answers the salon phone and says you close at 6 on Saturdays, that can end up
            on Google.
          </p>
          <p>
            Where it is available, Edit profile, then Collected info, shows the information Google
            collected this way, with its source and the date it was collected. You can delete an
            item there, and Google says deleting it removes it from Google's records without
            changing the other details already on your profile.
          </p>
        </>
      ),
    },
    {
      id: "check",
      heading: "How do I see what Google changed on my profile?",
      answer:
        "Sign in to the Google Account linked to your profile and select Edit profile. Google says that in the profile editor, information changed by Google shows in blue, and that when your profile has Google updates you find a notification at the top of the page.",
      body: (
        <>
          <Steps
            items={[
              "Search your salon's name and town on a phone, signed out, and read it as a client would: hours, phone, address, website and the booking button.",
              <>
                Signed in, select <b>Edit profile</b> and look for text in blue and a notice at the
                top.
              </>,
              <>
                Open <b>Hours</b> and check both your main hours and your <b>Special hours</b>.
              </>,
              "Check the email address linked to your profile for messages about suggested edits.",
            ]}
          />
          <p>
            If the wrong detail is your hours, the full steps are in{" "}
            <GuideLink slug="someone-changed-my-hours-on-google">
              someone changed my hours on Google
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "suggested-edits",
      heading: "Can clients change my salon's details on Google?",
      answer:
        "They can suggest changes. Google Maps lets anyone signed in suggest an edit to a place's name, category, address, hours, phone number and website, or report it closed. Google says it reviews all edits, and may tell you about certain suggested edits before they are published.",
      body: (
        <>
          <p>
            When Google asks you, by email or in your profile, you have 4 days to accept or reject
            the suggestion. Google says that if you do not respond in time, it may publish the edit
            when it is supported by other public information, such as your website, and that in some
            cases it may apply an edit without asking you, where the edit is needed to meet its
            policy guidelines.
          </p>
          <Callout kind="tip" title="Your website is your evidence">
            If your website still shows last year's hours or your old phone number, it can support
            the wrong suggestion. Update your website and your booking page whenever you change your
            Google profile.
          </Callout>
        </>
      ),
    },
    {
      id: "booking-link",
      heading: "Why does my profile show a booking link I never added?",
      answer:
        "Google says links for appointments and reservations can appear on your profile automatically through third-party partners. You cannot delete those yourself in your profile settings: you contact the provider through its opt-out link, support form or account page.",
      body: (
        <>
          <p>
            Google says third-party providers are required to process opt-out requests within 5
            business days, and that if a provider does not remove the link in that time, you can
            report a third-party violation. It happens to salons that tried a booking app once and
            moved on: clients tap the old button and land on a page that is no longer yours.
          </p>
          <p>
            Your own link is separate. Google lets you add up to 10 links for booking an
            appointment, and with more than one, Set preferred link marks yours as Business
            preferred at the top. Tap the booking button yourself on a phone after any change.
          </p>
        </>
      ),
    },
    {
      id: "closed",
      heading: "Why does Google say my salon is closed?",
      answer:
        "Check Edit profile, then Hours, first: someone may have marked the business temporarily or permanently closed, or a closure you set may still be on. Google says that if a business is mistakenly marked permanently closed, you can reopen it from your profile.",
      body: (
        <p>
          A rename or a new owner can cause this too. Google Maps tells people who see a new
          business at a location, or a business whose name changed a lot, to mark the old one
          permanently closed and add the new one. If you renamed your salon, change the name on your
          own profile and sign, and Google says you may need to verify again after a name change or
          a move. If the result is two profiles for one salon, see{" "}
          <GuideLink slug="duplicate-google-listings">
            duplicate Google profiles: how to find and fix them
          </GuideLink>
          .
        </p>
      ),
    },
    {
      id: "appointment-only",
      heading: "We only work by appointment. Should we show hours?",
      answer:
        "Possibly not. Google's guidelines say businesses that operate only by appointment should not provide hours. If clients can walk in during set hours, show them; if every visit is booked, you can choose Open with no main hours under Edit profile, Hours.",
      body: (
        <p>
          A home studio or a room in a shared building with no reception is often appointment only.
          Hours that do not match reality invite suggested edits from clients who find the door
          locked. Google also says special hours show only when your hours are set to Open with main
          hours, so a salon with no main hours uses posts and the booking page for holiday news.
        </p>
      ),
    },
    {
      id: "fix",
      heading: "How do I fix the wrong details and keep them right?",
      answer:
        "Select Edit profile, correct the detail and select Save. Google says it reviews your changes before they go live, so check again a day later, then make sure your website, booking page and social profiles say the same thing.",
      body: (
        <>
          <p>
            Answer suggested-edit emails within the 4 days, and check who can edit your profile in
            Business Profile settings, People and access. Google says owners and managers can both
            edit information, so an old stylist or agency with access can change details too; see{" "}
            <GuideLink slug="remove-old-employee-or-agency-from-google-profile">
              how to remove an old employee or agency from your profile
            </GuideLink>
            .
          </p>
          <p>
            Nobody can lock a Google profile or stop people suggesting edits. What works is checking
            often and answering quickly. More on keeping every site in step is in{" "}
            <GuideLink slug="keep-your-hours-and-details-the-same-everywhere">
              how to keep your hours and details the same everywhere
            </GuideLink>
            .
          </p>
        </>
      ),
    },
  ],
  kabsi: {
    heading: "What Kabsi does and does not do here",
    body: (
      <>
        <p>
          Once Kabsi is connected to Google, Google Protection checks your business name, phone,
          website, address, opening hours, main category, open status and map pin every day against
          the details you confirmed. When Google shows something different, you get one email that
          explains it, for example "Google shows Sunday closing at 18:00. You approved 22:00.", and
          says whether Google made the change itself or Kabsi does not know who did. You choose
          "Google is right" or "Keep my information", and Kabsi never puts anything back by itself.
        </p>
        <p>
          Kabsi cannot lock your profile or stop suggested edits. It does not edit services,
          attributes or the booking link on Google, so a third-party booking link is yours to remove
          with the provider. Nothing changes on Google until you say so.{" "}
          <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Can I stop Google changing my salon's details?",
      a: "No. Google says it may update profiles from other sources and may publish suggested edits. You can answer each suggestion within 4 days, keep your website matching, and correct anything wrong in Edit profile.",
    },
    {
      q: "How do I remove a booking button from an app I no longer use?",
      a: "Contact that booking provider through its opt-out link or support form. Google says providers must process the request within 5 business days, and you can report a third-party violation if they do not.",
    },
  ],
  sources: [
    {
      title: "Google: Understand Google updates on your Business Profile",
      url: "https://support.google.com/business/answer/3480441?hl=en",
      read: READ,
    },
    {
      title: "Google: Edit your Business Profile",
      url: "https://support.google.com/business/answer/3039617?hl=en",
      read: READ,
    },
    {
      title: "Google Maps: Edit place information in Google Maps",
      url: "https://support.google.com/maps/answer/7084895?hl=en",
      read: READ,
    },
    {
      title: "Google: Manage your local business links",
      url: "https://support.google.com/business/answer/6218037?hl=en",
      read: READ,
    },
    {
      title: "Google: Mark your business as closed",
      url: "https://support.google.com/business/answer/15300196?hl=en",
      read: READ,
    },
    {
      title: "Google: Edit your business hours",
      url: "https://support.google.com/business/answer/15300403?hl=en",
      read: READ,
    },
    {
      title: "Google: How to set Special hours",
      url: "https://support.google.com/business/answer/6303076?hl=en",
      read: READ,
    },
    {
      title: "Google: Guidelines for representing your business on Google",
      url: "https://support.google.com/business/answer/3038177?hl=en",
      read: READ,
    },
    {
      title: "Google: Manage your Business Profile owners & managers",
      url: "https://support.google.com/business/answer/3403100?hl=en",
      read: READ,
    },
  ],
  industries: ["hair-salon", "barbershop", "beauty-salon", "nail-salon"],
  related: [
    "someone-changed-my-hours-on-google",
    "keep-your-hours-and-details-the-same-everywhere",
    "duplicate-google-listings",
  ],
  summary:
    "Why a salon or barbershop's Google profile can show wrong hours, a closed sign or an unknown booking link: suggested edits, Google's other sources, automated calls and booking partners, and how to check and fix each.",
};
