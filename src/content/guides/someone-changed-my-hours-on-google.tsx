import { Callout, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { scheduledAt } from "./schedule";
import type { GuideDoc } from "./types";

// Guides 3, guide 4. Every claim about Google is from the sources below, read on 5 Nov 2026.
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "someone-changed-my-hours-on-google",
  title: "Someone changed my hours on Google. How do I fix it?",
  description:
    "Why your opening hours on Google changed without you, how to see who or what changed them, how to put them right and how to stop it happening again.",
  publishAt: scheduledAt(3),
  updated: READ,
  checked: READ,
  topic: "Opening hours",
  answer:
    "Sign in to the Google Account that manages your profile, open Edit profile, then Hours, and set your real hours again. Then find the cause: Google may have updated them from other sources or a customer's suggestion, or someone with access to your profile changed them.",
  inShort: [
    "Google gathers information from other sources, such as user reports, and may update your profile with it.",
    "Information Google changed shows in blue in the profile editor, with a notification at the top of the page.",
    "When Google tells you about a suggested edit, you have 4 days to accept or reject it.",
    "Hours on your own website that match your profile help, because Google checks suggestions against public information such as your website.",
  ],
  sections: [
    {
      id: "who-can-change",
      heading: "Who can change the hours on my Google profile?",
      answer:
        "Several can. The owners and managers of your profile can edit the hours directly; Google itself can update them from other sources such as user reports and licensed content; and any Google Maps user can suggest an edit, which Google may publish.",
      body: (
        <>
          <ul>
            <li>
              <b>Owners and managers.</b> Google's help says managers have mostly the same access as
              owners, including editing main business info like hours and address.
            </li>
            <li>
              <b>Google.</b> Google says it gathers info from different sources, like user reports
              and licensed content, and may update your profile if those sources report that your
              info is incorrect or outdated.
            </li>
            <li>
              <b>The public.</b> Anyone signed in to Google Maps can choose Suggest an edit on a
              place and add, edit or report when it is open each day of the week.
            </li>
            <li>
              <b>Google's automated calls and texts.</b> Google says it may call, text or send a
              WhatsApp message to the phone number on your profile to confirm details such as your
              operating hours, and that what you answer may be used to update the profile.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "was-it-google",
      heading: "How can I tell if Google changed my hours?",
      answer:
        "Open your profile while signed in and select Edit profile. Google's help says that in the profile editor, information changed by Google shows in blue, information with no updates from Google shows in black or white, and that you will find a notification at the top of the page when your profile has Google updates.",
      body: (
        <>
          <Steps
            items={[
              "Sign in to the Google Account linked to your profile and go to your Business Profile. In the Google Maps app, tap Business at the bottom right.",
              <>
                Select <b>Edit profile</b> and look at <b>Hours</b>. Blue text means Google changed
                it.
              </>,
              "Check the email address of the Google Account that manages the profile, including spam, for a message about a suggested edit.",
              <>
                Where Google offers it, select <b>Edit profile</b>, then <b>Collected info</b>.
                Google says this shows information collected from automated calls, texts or WhatsApp
                messages, with its source and the date it was collected.
              </>,
            ]}
          />
          <p>
            Google says the Collected info page is available only in select regions, languages and
            business categories, so you may not see it.
          </p>
        </>
      ),
    },
    {
      id: "put-them-back",
      heading: "How do I put my real hours back?",
      answer:
        "Edit them yourself from your profile. Google's help says you can always update your Business Profile directly to keep it accurate, and that it reviews your changes before they go live, so the right hours may take a little time to show.",
      body: (
        <>
          <Steps
            items={[
              "Go to your Business Profile, signed in to the Google Account linked to it.",
              <>
                Select <b>Edit profile</b>, then <b>Hours</b>.
              </>,
              <>
                In the Business hours section, next to Hours, select <b>Edit</b>, then{" "}
                <b>Open with main hours</b>.
              </>,
              "Tick each day you are open and set the times with the dropdowns. For a lunch break, add a second set of hours for the same day.",
              <>
                Select <b>Save</b>.
              </>,
            ]}
          />
          <p>
            Google says that after you update your hours, customers may see a message on your
            profile confirming the update, and on phones a post on the Updates tab. You can edit
            that post or delete it if you do not want it to show.
          </p>
          <Callout kind="tip" title="Fix the source too">
            If the hours were changed because they were wrong on another site, fix them there too.
            Otherwise the same source can report the old hours to Google again.
          </Callout>
        </>
      ),
    },
    {
      id: "suggested-edits",
      heading: "What happens when a customer suggests different hours?",
      answer:
        "For certain suggested edits, Google says it notifies you by email or inside your profile before it publishes them, and you then have 4 days to accept or reject the suggestion. If you do not answer within 4 days, Google may publish the update when other public information, such as your business website, supports it.",
      body: (
        <>
          <p>
            Google also says it may apply suggested user edits without asking you first when the
            edit is needed to meet its policy guidelines. So a missed email is not the only way a
            change can appear. Check your profile after any holiday or busy period, and answer
            Google's notifications the day they arrive.
          </p>
          <p>
            A suggestion often comes from a customer who found you closed when Google said you were
            open, or the other way round. That is a sign your profile did not match the door on that
            day, which is what special hours are for. See{" "}
            <GuideLink slug="how-to-set-holiday-hours-on-google">
              how to set holiday hours on Google
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "someone-on-the-team",
      heading: "Could someone on my team or an old agency have done it?",
      answer:
        "Yes, if they still have access. Check People and access on your profile: Google says every owner and manager there can edit main business info like hours, and only owners can remove other owners and managers.",
      body: (
        <>
          <Steps
            items={[
              "Go to your Business Profile.",
              <>
                Select <b>More</b>, then <b>Business Profile settings</b>, then{" "}
                <b>People and access</b>.
              </>,
              "Read the list of owners and managers. Ask the people you know about the change.",
              <>
                To take someone off, select them, then <b>Remove person</b>.
              </>,
            ]}
          />
          <p>
            Google says a removed user gets an email and can no longer change business info, but
            their past replies, posts and other actions stay on the profile. If you cannot select a
            user, you may have manager access only, and an owner has to do it. The full walk-through
            is in{" "}
            <GuideLink slug="remove-old-employee-or-agency-from-google-profile">
              how to remove an old employee or agency from your Google profile
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "stop-it",
      heading: "How do I stop my hours being changed again?",
      answer:
        "You cannot switch Google updates off: Google's help says you cannot manage all Google updates through your Business Profile. What you can do is give Google and its sources the same correct hours everywhere, and answer Google's notifications quickly.",
      body: (
        <>
          <ul>
            <li>
              Put the same hours on your website, because Google names your business website as the
              kind of public information it uses to decide whether to publish a suggestion.
            </li>
            <li>
              Keep the hours the same on every other site and app that lists you. See{" "}
              <GuideLink slug="keep-your-hours-and-details-the-same-everywhere">
                keep your hours and details the same everywhere
              </GuideLink>
              .
            </li>
            <li>
              Set special hours before holidays and closures, so customers do not find a closed door
              and suggest new hours. Google says special hours are for up to 6 days in a row, and to
              mark the business temporarily closed for 7 or more days.
            </li>
            <li>
              Watch the inbox of the Google Account that manages the profile, so you can answer a
              suggested edit within the 4 days.
            </li>
            <li>Keep People and access to the people who need it today.</li>
          </ul>
          <Callout kind="warn" title="Check a caller before you answer">
            Google says it will never ask for payment, credit card information or account passwords,
            and that a caller who asks for money to keep your business on Google is not Google. If a
            call or text looks suspicious, do not respond, click links or give any information.
          </Callout>
        </>
      ),
    },
    {
      id: "uk-uae",
      heading: "Is anything different in the UK or the UAE?",
      answer:
        "Google's pages here name no separate rule for the UK or the UAE: the blue text, the 4 days to answer a suggested edit and the way to edit your hours are described once for everyone. What may differ is that Google says Collected info is available only in select regions.",
      body: (
        <p>
          In the UAE, Ramadan hours and public holidays whose dates follow the moon sighting are
          days when your door and your profile can easily disagree. In the UK, bank holidays differ
          between England and Wales, Scotland and Northern Ireland. In both, setting special hours
          for those days before they come is the simplest way to keep Google and your door saying
          the same thing.
        </p>
      ),
    },
  ],
  kabsi: {
    heading: "What Kabsi does here",
    body: (
      <>
        <p>
          With Google Protection, Kabsi compares your Google profile with the details you confirmed,
          including your opening hours, and emails you when they differ, for example "Google shows
          Sunday closing at 18:00. You approved 22:00." The email says whether Google made the
          change itself or Kabsi does not know who did. You choose "Google is right" or "Keep my
          information". Nothing changes on Google unless you say so, and Kabsi never puts anything
          back by itself.
        </p>
        <p>
          Kabsi is a Manager on your profile that you invite with its group ID, never asks for your
          password or a code, and asks you five days before a public holiday what your hours will
          be. Google Protection works once Kabsi is connected to Google; during early access it is
          off. <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Can I stop customers suggesting edits to my profile?",
      a: "Google's pages do not offer a way to turn suggestions off. Google notifies you about certain suggested edits before publishing them, and you have 4 days to accept or reject them.",
    },
    {
      q: "Why did my hours change after an automated call from Google?",
      a: "Google says what you tell an automated call, text or WhatsApp message may be used to update your profile, and that those updates are marked Pending and reviewed, which might take up to 5 business days.",
    },
    {
      q: "I fixed my hours and Google changed them back. What now?",
      a: "Find the source that disagrees: your website, another site that lists you, or a suggested edit you missed. Make them all match, then edit the hours on your profile once more.",
    },
  ],
  sources: [
    {
      title: "Google: Edit your business hours",
      url: "https://support.google.com/business/answer/15300403?hl=en",
      read: READ,
    },
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
      title: "Google: About automated calls and texts from Google to your business",
      url: "https://support.google.com/business/answer/7690269?hl=en",
      read: READ,
    },
    {
      title: "Google: Manage your Business Profile owners & managers",
      url: "https://support.google.com/business/answer/3403100?hl=en",
      read: READ,
    },
    {
      title: "Google Maps: Edit place information in Google Maps",
      url: "https://support.google.com/maps/answer/7084895?hl=en",
      read: READ,
    },
    {
      title: "Google: How to set Special hours",
      url: "https://support.google.com/business/answer/6303076?hl=en",
      read: READ,
    },
  ],
  industries: ["restaurant", "cafe", "hair-salon", "auto-repair"],
  related: [
    "how-to-set-holiday-hours-on-google",
    "keep-your-hours-and-details-the-same-everywhere",
    "remove-old-employee-or-agency-from-google-profile",
  ],
  summary:
    "Why opening hours on Google change without the owner (Google updates, suggested edits, automated calls, other users), how to tell, how to fix them and how to stop it recurring.",
};
