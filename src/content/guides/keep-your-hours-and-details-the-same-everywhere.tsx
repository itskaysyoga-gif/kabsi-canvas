import { Callout, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import type { GuideDoc } from "./types";

// Guides 3, earlier guide rewritten on the template. Every claim about Google is from the sources below, read on 5 Nov 2026.
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "keep-your-hours-and-details-the-same-everywhere",
  title: "How do I keep my hours and details the same everywhere?",
  description:
    "Your name, address, phone and hours appear on Google, your website and other sites. How to keep them the same, what to change first, and holidays.",
  publishAt: "2026-11-04T00:00:00Z",
  updated: READ,
  checked: READ,
  topic: "Opening hours",
  answer:
    "Write your name, address, phone, website and hours the same way everywhere, keep a list of every place they appear, and when something changes, change your Google profile first, then your website, then the rest. For a holiday or a short closure, set special hours instead of changing your normal week.",
  inShort: [
    "Customers read your details on your Google profile, your website and many other sites.",
    "Google may update your profile from other sources, including your own website.",
    "When something changes: Google profile first, then your website, then everything else.",
    "Use special hours for holidays, and Temporarily closed for 7 or more days in a row.",
  ],
  sections: [
    {
      id: "why-it-matters",
      heading: "Why does it matter if my details differ between sites?",
      answer:
        "Because customers act on whichever page they find, and Google reads other pages too. Google says it gathers information from different sources, such as user reports and licensed content, and may update your profile if those sources say your information is wrong or out of date.",
      body: (
        <>
          <p>
            Google also says that when a suggested edit needs your review you have 4 days to accept
            or reject it, and that if you do not respond, Google may publish the update when it is
            supported by other public information, such as your business website. An old opening
            time on your own website can therefore end up on your Google profile.
          </p>
          <p>
            Google's ranking help adds that if your business information is not accurate, your
            profile might not show up for relevant searches in your area. The same old details can
            also reach answers from AI assistants, as explained in{" "}
            <GuideLink slug="why-chatgpt-describes-your-business-wrongly">
              why ChatGPT describes your business wrongly
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "which-details",
      heading: "Which details need to match?",
      answer:
        "Your business name, address, phone number, website and opening hours. Google's guidelines say your name should reflect your real-world name as used consistently on your storefront, website and stationery and as known to customers, and that you should give your regular customer-facing hours.",
      body: (
        <ul>
          <li>
            <b>Name:</b> the name on your sign, with no extra words. Google does not allow marketing
            taglines, opening hours or phone numbers in the business name.
          </li>
          <li>
            <b>Address:</b> Google asks for a precise, accurate address. Write it the same way each
            time, including the unit or floor.
          </li>
          <li>
            <b>Phone:</b> Google asks for a number that connects to your own location, a local
            number rather than a central call centre where possible, and under your business's
            direct control.
          </li>
          <li>
            <b>Website:</b> one address for your business, used everywhere.
          </li>
          <li>
            <b>Hours:</b> the hours customers can come in, for every day, the same on each site.
          </li>
        </ul>
      ),
    },
    {
      id: "when-it-changes",
      heading: "Something changed. What do I update first?",
      answer:
        "Change your Google profile first. Then change your website everywhere the detail appears, and then the social pages, booking sites and directories that list you.",
      body: (
        <>
          <Steps
            items={[
              <>
                On your Google profile: open your Business Profile, select <b>Edit profile</b>,
                change the detail, for example under <b>Hours</b>, and select <b>Save</b>.
              </>,
              "On your website: the contact page, the footer, the booking page and any old page that mentions hours or prices.",
              "On your social pages, booking sites and directories, starting with the ones customers use most.",
              "Tick each one off your list, so the next change is quicker.",
            ]}
          />
          <p>
            Google says it reviews changes before they go live on your profile. In the Google Maps
            app you can do the same from the <b>Business</b> tab, then <b>Edit profile</b>. Google
            also notes that changing your business name or moving to a new address after
            verification may mean verifying again.
          </p>
        </>
      ),
    },
    {
      id: "hours",
      heading: "How do I set my normal opening hours on Google?",
      answer:
        "Open your Business Profile, select Edit profile, then Hours. Next to Hours in the Business hours section, select Edit, choose Open with main hours, tick each day you are open, set the times and select Save.",
      body: (
        <p>
          For a lunch break, Google says to create two entries for the same day, for example 9:00 to
          14:00 and 17:00 to 22:00, using Add hours. Google's guidelines say businesses with varied
          schedules, or that work only by appointment, should not give hours. Seasonal hours can be
          used as your regular hours during the season.
        </p>
      ),
    },
    {
      id: "holidays",
      heading: "How do I show holiday hours without changing my normal week?",
      answer:
        "Set special hours. Google says special hours are for days when your hours change briefly, such as holidays or special events, so your regular hours do not change, and that they show on Google only on the days you set.",
      body: (
        <>
          <Steps
            items={[
              <>
                Open your Business Profile, select <b>Edit profile</b>, then <b>Hours</b>.
              </>,
              <>
                Next to "Special hours", select <b>Edit</b>.
              </>,
              <>
                Confirm a suggested date with <b>Review</b>, or select <b>Add a date</b>.
              </>,
              'Untick "Closed" and enter your hours, or leave "Closed" ticked if you are shut.',
              <>
                Select <b>Save</b>.
              </>,
            ]}
          />
          <p>
            Google says it is a good idea to confirm your hours for official holidays even when they
            are the same as usual, so customers know the hours are right. Special hours only show if
            your profile is set to Open with main hours. The holidays themselves differ between the
            UK and the UAE. The full walk-through is in{" "}
            <GuideLink slug="how-to-set-holiday-hours-on-google">
              how to set holiday hours on Google
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "longer-closure",
      heading: "What if I close for a week or more?",
      answer:
        "Mark the business as temporarily closed. Google's special hours page says special hours cover a closure of up to 6 days in a row, and that for 7 or more days in a row, or an unknown period, you should mark your business as Temporarily closed.",
      body: (
        <>
          <p>
            To do it: open your Business Profile, select <b>Edit profile</b>, then <b>Hours</b>,
            select <b>Edit</b> next to Hours, choose <b>Temporarily closed</b> and select{" "}
            <b>Save</b>. Your profile then shows "Temporarily closed" on Google Maps and Search.
            When you reopen, mark the business as reopened and set your regular hours again.
          </p>
          <Callout kind="warn" title="Do not use Permanently closed for a break">
            Permanently closed is for a business that has closed for good. For a holiday, a refit or
            the off-season, use special hours or Temporarily closed, and update your website with
            the same dates.
          </Callout>
        </>
      ),
    },
    {
      id: "check-regularly",
      heading: "How often should I check my details?",
      answer:
        "Check your Google profile whenever you get a notice from Google about an update, and look over your details once a month. Google says text shown in blue in the profile editor is information Google changed, and that a notification shows at the top when there are Google updates.",
      body: (
        <p>
          If someone else's edit changed your hours, the fix and how to stop it happening again are
          in{" "}
          <GuideLink slug="someone-changed-my-hours-on-google">
            someone changed my hours on Google
          </GuideLink>
          . Google's pages here name no separate rule for the UK or the UAE.
        </p>
      ),
    },
  ],
  kabsi: {
    heading: "What Kabsi does here",
    body: (
      <>
        <p>
          Once Kabsi is connected to Google, it checks your Google profile every day and tells you
          when it shows something different from what you confirmed, with Google is right or Keep my
          information for you to choose. It never puts anything back by itself. Five days before a
          public holiday it asks what you will do: normal hours, closed or custom hours, and it
          sends special hours to Google only after you confirm.
        </p>
        <p>
          On Pro, Kabsi can read your public website and compare its name, phone, address and
          opening times with your Google profile, and each difference becomes a task. Your website
          and the other sites stay yours to change. <SiteRef to="/scan">Run the free check</SiteRef>
          .
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Do I have to update every directory that lists me?",
      a: "Start with your Google profile and your website, then the sites customers actually use to find you, such as a booking site. An old page nobody visits matters less than the ones people read.",
    },
  ],
  sources: [
    {
      title: "Google: Guidelines for representing your business on Google",
      url: "https://support.google.com/business/answer/3038177?hl=en",
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
      title: "Google: Edit your business hours",
      url: "https://support.google.com/business/answer/15300403?hl=en",
      read: READ,
    },
    {
      title: "Google: How to set special hours",
      url: "https://support.google.com/business/answer/6303076?hl=en",
      read: READ,
    },
    {
      title: "Google: Mark your business as closed",
      url: "https://support.google.com/business/answer/15300196?hl=en",
      read: READ,
    },
    {
      title: "Google: Tips to improve your local ranking on Google",
      url: "https://support.google.com/business/answer/7091?hl=en",
      read: READ,
    },
  ],
  industries: ["restaurant", "cafe", "hair-salon", "gym-and-fitness"],
  related: [
    "how-to-set-holiday-hours-on-google",
    "someone-changed-my-hours-on-google",
    "why-chatgpt-describes-your-business-wrongly",
  ],
  summary:
    "How to keep your name, address, phone, website and hours the same on Google, your website and other sites, what to change first, and special hours for holidays.",
};
