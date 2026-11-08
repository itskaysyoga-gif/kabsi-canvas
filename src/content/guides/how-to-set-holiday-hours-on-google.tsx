import { Callout, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { PUBLISH_ALL_AT } from "./schedule";
import type { GuideDoc } from "./types";

// Guides 3, guide 5. Every claim about Google is from the Google sources below; the UK dates are from GOV.UK and the
// UAE rules from the UAE government portal, all read on 5 Nov 2026.
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "how-to-set-holiday-hours-on-google",
  title: "How do I set holiday hours on Google?",
  description:
    "Set special hours on your Google profile for UK bank holidays and UAE public holidays, step by step, with the coming dates and what to do for Ramadan.",
  publishAt: PUBLISH_ALL_AT,
  updated: READ,
  checked: READ,
  topic: "Opening hours",
  answer:
    "Open your profile, select Edit profile, then Hours, and next to Special hours select Edit, then pick the date and set your hours or mark it closed. Google says special hours are for changes of up to 6 days in a row; for 7 or more days, mark the business temporarily closed instead.",
  inShort: [
    "Special hours change one day or a few days without touching your normal week.",
    "Google suggests confirming your hours for official holidays even when they are the same as usual.",
    "UK bank holidays differ between England and Wales, Scotland and Northern Ireland.",
    "In the UAE, Eid and the other Islamic holidays follow the moon sighting, so set them once the days are known.",
  ],
  sections: [
    {
      id: "what-special-hours-are",
      heading: "What are special hours, and when do I use them?",
      answer:
        "Special hours are opening hours for chosen dates that leave your regular hours as they are. Google says to use them when your business temporarily adjusts its hours or is closed for up to 6 days in a row, for holidays, special events and other exceptional circumstances.",
      body: (
        <ul>
          <li>
            <b>Closed for a day, or open different hours:</b> special hours.
          </li>
          <li>
            <b>Closed for 7 or more days in a row, or for an unknown time:</b> Google says to mark
            the business as temporarily closed.
          </li>
          <li>
            <b>Different times for one service</b>, such as delivery or takeout hours: Google calls
            these More hours, which are separate from special hours.
          </li>
          <li>
            <b>Seasonal hours:</b> Google's guidelines say you may use your current seasonal hours
            as your regular hours.
          </li>
        </ul>
      ),
    },
    {
      id: "how-to-set",
      heading: "How do I set holiday hours on my profile?",
      answer:
        "Sign in to the Google Account linked to your profile and follow the steps below. Google says special hours show only if your business hours are set to Open with main hours, so check that first.",
      body: (
        <>
          <Steps
            items={[
              "Go to your Business Profile.",
              <>
                Select <b>Edit profile</b>, then <b>Hours</b>.
              </>,
              <>
                In the Business hours section, next to Special hours, select <b>Edit</b>.
              </>,
              <>
                Pick the date. For a date Google suggests, select <b>Review</b>. For another day,
                select <b>Add a date</b> and enter it.
              </>,
              "Closed all day: leave the Closed box ticked. Open: untick Closed and enter your opening and closing times.",
              <>
                Select <b>Save</b>.
              </>,
            ]}
          />
          <p>
            For two sets of hours on one day, select More, then Add hours. To delete special hours
            on a closed day, select Delete next to the date; on an open day, select More, then
            Remove day. If you upload special hours in a spreadsheet, Google says a set cannot be
            longer than 24 hours: a set that runs from before midnight one day to past noon the next
            is split into one set to the end of the first day and one from midnight on the second.
          </p>
        </>
      ),
    },
    {
      id: "same-hours",
      heading: "Do I need to set anything if I am open as normal?",
      answer:
        "It helps. Google says that on the holidays it lists, a warning may appear on your profile telling people your hours might differ, and that it is a good idea to confirm your hours for official holidays even when they are the same as your regular hours.",
      body: (
        <p>
          To confirm, set special hours for that date with your usual times. Google's own holiday
          list for the UK also includes Christmas Eve, which is not a bank holiday, so a warning may
          show that day too. If you are open as normal on Christmas Eve, confirm it the same way.
        </p>
      ),
    },
    {
      id: "uk-dates",
      heading: "Which UK bank holidays are coming up?",
      answer:
        "It depends on where your business is: GOV.UK lists separate bank holidays for England and Wales, for Scotland and for Northern Ireland. GOV.UK also says that if a bank holiday falls on a weekend, a substitute weekday becomes a bank holiday, normally the following Monday, which is why Boxing Day 2026 is on Monday 28 December.",
      body: (
        <>
          <p>
            <b>All of the UK:</b> Christmas Day, Friday 25 December 2026; Boxing Day (substitute
            day), Monday 28 December; New Year's Day, Friday 1 January 2027; Good Friday, 26 March;
            Early May bank holiday, 3 May; Spring bank holiday, 31 May; and in December 2027 the
            Christmas Day and Boxing Day substitute days, Monday 27 and Tuesday 28 December.
          </p>
          <p>
            <b>England and Wales also:</b> Easter Monday, 29 March 2027; Summer bank holiday, 30
            August 2027.
          </p>
          <p>
            <b>Scotland also:</b> St Andrew's Day, Monday 30 November 2026; 2nd January (substitute
            day), Monday 4 January 2027; Summer bank holiday, 2 August 2027; St Andrew's Day, 30
            November 2027. Scotland has no Easter Monday bank holiday on the GOV.UK list.
          </p>
          <p>
            <b>Northern Ireland also:</b> St Patrick's Day, 17 March 2027; Easter Monday, 29 March;
            Battle of the Boyne (Orangemen's Day), 12 July; Summer bank holiday, 30 August.
          </p>
          <Callout kind="tip" title="Closing for the whole Christmas break?">
            Christmas Eve to New Year's Day is 9 days in a row. For a closure of 7 or more days,
            Google says to mark the business temporarily closed rather than add special hours. For a
            shorter break of up to 6 days, add each date as special hours.
          </Callout>
        </>
      ),
    },
    {
      id: "uae-dates",
      heading: "Which UAE public holidays should I plan for?",
      answer:
        "The UAE government portal lists the public holidays for both the public and private sectors: New Year on 1 January, Eid Al Fitr, Arafah Day, Eid Al Adha, the Hijri New Year, the Prophet Mohammed's birthday, and National Day on 2 and 3 December. The Islamic holidays are determined by moon sighting, so their exact days are known only close to the time.",
      body: (
        <>
          <ul>
            <li>
              <b>National Day:</b> 2 and 3 December, two days. In 2026 that is Wednesday 2 and
              Thursday 3 December. Google's holiday list for the UAE shows 2 December, so set the
              3rd yourself if your hours change that day too.
            </li>
            <li>
              <b>Gregorian New Year:</b> 1 January, a Friday in 2027.
            </li>
            <li>
              <b>Eid Al Fitr:</b> from 1 to 3 Shawwal. The portal says that if Ramadan lasts 30
              days, day 30 is also an official holiday for Eid Al Fitr.
            </li>
            <li>
              <b>Arafah Day and Eid Al Adha:</b> 9 Thu Al Hijjah, then 10 to 12 Thu Al Hijjah.
            </li>
            <li>
              <b>Hijri New Year:</b> 1 Muharram. <b>The Prophet's birthday:</b> 12 Rabi' Awwal.
            </li>
          </ul>
          <p>
            The portal says that under Cabinet Resolution No. 27 of 2024, a public holiday is not
            moved to another day when it falls on a weekend or on another public holiday. Google's
            list for the UAE also marks 30 November, which is not on the portal's list of public
            holidays, so a warning may show on that day; confirm your hours if you are open as
            usual.
          </p>
        </>
      ),
    },
    {
      id: "ramadan",
      heading: "How do I show Ramadan hours on Google?",
      answer:
        "Ramadan lasts about a month, which is longer than the 6 days special hours are meant for. Google's guidelines say you may use your current seasonal hours as your regular hours, so change your main hours for the month and set them back when it ends.",
      body: (
        <>
          <Steps
            items={[
              <>
                Before Ramadan starts, go to <b>Edit profile</b>, then <b>Hours</b>, and change your
                main hours to your Ramadan times.
              </>,
              "Set special hours for the Eid days once they are announced.",
              "When Ramadan ends, put your regular hours back the same way.",
            ]}
          />
          <p>
            Google says that after you update your hours, a post on your profile may confirm the
            change. You can edit or delete that post. The same idea works for UK businesses with
            different summer or winter hours.
          </p>
        </>
      ),
    },
    {
      id: "forgot",
      heading: "What if I forget, or a customer finds me closed?",
      answer:
        "Set the special hours as soon as you remember, even on the day. If a customer suggests different hours after finding you closed, Google may notify you, and you have 4 days to accept or reject the suggestion.",
      body: (
        <p>
          Google says it may publish a suggested edit you do not answer in time when other public
          information, such as your business website, supports it. Put your holiday hours on your
          website too, and check your profile the morning after a holiday. If your regular hours
          changed, see{" "}
          <GuideLink slug="someone-changed-my-hours-on-google">
            someone changed my hours on Google
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
          Five days before a public holiday, Kabsi asks you by email, and in Kabsi under Hours, what
          your business will do: normal hours, closed or custom hours. It never assumes. Closed or
          custom hours become special hours for those days once you tap Confirm and save to Google,
          and Kabsi checks that Google shows them. A holiday that follows the moon, such as Eid,
          says "expected", and you can move the days up to three either way. Ramadan is asked once,
          before the month starts.
        </p>
        <p>
          For the UK, Kabsi uses your own nation's bank holidays from GOV.UK, read from your Google
          address: England and Wales, Scotland or Northern Ireland. On Hours you can also set
          special days for any date. During early access, a person on the Kabsi team sends what you
          approve to Google within one working day. <SiteRef to="/scan">Run the free check</SiteRef>
          .
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Can I set holiday hours months in advance?",
      a: "Yes. Google says you can set special hours in advance for the holidays it lists, and they appear to customers only on those dates. For Eid in the UAE, wait until the days are announced.",
    },
    {
      q: "Do special hours change my normal opening hours?",
      a: "No. Google says special hours let you change hours for a brief period so that your regular hours do not change. On the date, special hours show in place of your regular hours.",
    },
  ],
  sources: [
    {
      title: "Google: How to set Special hours",
      url: "https://support.google.com/business/answer/6303076?hl=en",
      read: READ,
    },
    {
      title: "Google: About holidays on Google",
      url: "https://support.google.com/business/answer/6333474?hl=en",
      read: READ,
    },
    {
      title: "Google: Edit your business hours",
      url: "https://support.google.com/business/answer/15300403?hl=en",
      read: READ,
    },
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
      title: "GOV.UK: UK bank holidays",
      url: "https://www.gov.uk/bank-holidays",
      read: READ,
    },
    {
      title: "The Official Portal of the UAE Government: Public holidays",
      url: "https://u.ae/en/information-and-services/public-holidays-and-religious-affairs/public-holidays",
      read: READ,
    },
  ],
  industries: ["restaurant", "cafe", "hair-salon", "gym-and-fitness"],
  related: [
    "someone-changed-my-hours-on-google",
    "keep-your-hours-and-details-the-same-everywhere",
  ],
  summary:
    "How to set special hours on a Google Business Profile for holidays, with the coming UK bank holidays by nation, the UAE public holiday rules, Ramadan hours and closures over 6 days.",
};
