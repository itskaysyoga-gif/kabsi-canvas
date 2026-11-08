import { Callout, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { weeklyAt } from "./schedule";
import type { GuideDoc } from "./types";

// Weekly guide 1 (the 28th guide), for UAE salons and barbershops. Every claim about Google is from the Google sources
// below and the UAE holidays from the UAE government portal, all read on 8 Nov 2026. No Eid date is given: the portal
// says the Islamic holidays follow the moon sighting.
const READ = "2026-11-08";

export const guide: GuideDoc = {
  slug: "uae-national-day-and-eid-hours-on-google",
  title: "UAE National Day and Eid hours on Google for salons",
  description:
    "How a UAE salon or barbershop sets its Google hours for National Day on 2 and 3 December, and for Eid, which follows the moon sighting.",
  publishAt: weeklyAt(0),
  updated: READ,
  checked: READ,
  topic: "Holiday hours",
  answer:
    "Set special hours on your Google profile for 2 and 3 December now, because National Day has fixed dates. For Eid, wait until the days are announced after the moon sighting, then add each day the same way.",
  inShort: [
    "National Day is 2 and 3 December, a Wednesday and a Thursday in 2026.",
    "Eid follows the moon sighting, so set it once the days are announced, not from a calendar printed months ahead.",
    "Special hours change up to 6 days in a row and leave your normal week as it is.",
    "A late opening on the evening before Eid is special hours too, so clients see it.",
  ],
  sections: [
    {
      id: "which-days",
      heading: "Which UAE holidays should a salon plan hours for?",
      answer:
        "The UAE government portal lists the public holidays for the public and private sectors: New Year on 1 January, Eid Al Fitr, Arafah Day, Eid Al Adha, the Hijri New Year, the Prophet Mohammed's birthday, and National Day on 2 and 3 December. Every one of them except New Year and National Day is set by the moon sighting.",
      body: (
        <>
          <ul>
            <li>
              <b>National Day:</b> 2 and 3 December, two days. In 2026 that is Wednesday 2 and
              Thursday 3 December.
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
            The portal also says that, under Cabinet Resolution No. 27 of 2024, a public holiday is
            not moved to another day when it falls on a weekend or on another public holiday.
            Whether your salon or barbershop opens on these days is your decision. What matters on
            Google is that your profile says what you decided, before clients start checking.
          </p>
        </>
      ),
    },
    {
      id: "national-day-steps",
      heading: "How do I set National Day hours on my profile?",
      answer:
        "Sign in to the Google Account linked to your profile, select Edit profile, then Hours, and next to Special hours select Edit. Add 2 December and 3 December, then leave Closed ticked or untick it and enter the hours you will open.",
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
                For a date Google suggests, select <b>Review</b>. For another day, select{" "}
                <b>Add a date</b> and enter it.
              </>,
              "Closed all day: leave the Closed box ticked. Open: untick Closed and enter your times.",
              <>
                Select <b>Save</b>.
              </>,
            ]}
          />
          <p>
            Google's own holiday list for the UAE, read on 8 November 2026, shows 2 December but not
            3 December, so add the 3rd yourself with Add a date. Google says special hours show on
            your profile only if your business hours are set to Open with main hours, so check that
            first. After saving, you find the dates under Special hours in Edit profile.
          </p>
        </>
      ),
    },
    {
      id: "same-hours",
      heading: "Should I set special hours if I am open as normal?",
      answer:
        "Yes, it is worth the minute it takes. Google says that on the holidays it lists, a warning may appear on your profile telling people your hours might differ, and that it is a good idea to confirm your hours for official holidays even when they match your regular hours.",
      body: (
        <p>
          Google's list for the UAE also includes 30 November (Commemoration Day) and, in January
          2027, 1 January and two days for Isra and Mi'raj. Of these, only 1 January is on the
          government portal's list of public holidays, so a warning may show on days your salon is
          open as usual. To confirm normal hours, add the date under Special hours, untick Closed
          and enter your usual times.
        </p>
      ),
    },
    {
      id: "eid",
      heading: "When should I set my Eid hours on Google?",
      answer:
        "Once the days are announced. The portal says Eid Al Fitr, Arafah Day and Eid Al Adha are determined by moon sighting, so a date you set weeks ahead from a printed calendar can be a day out, and clients who check your profile that morning would see the wrong answer.",
      body: (
        <>
          <Steps
            items={[
              "Before Ramadan, decide your hours for each Eid day and for the evenings before.",
              <>
                When the moon sighting is announced, add each Eid day under <b>Special hours</b>{" "}
                with <b>Add a date</b>.
              </>,
              <>
                If the days move, open the date and change it. To take off a closed day, select{" "}
                <b>Delete</b> next to it; to take off an open day, select <b>More</b>, then{" "}
                <b>Remove day</b>.
              </>,
              "The evening before Eid, open your profile on a phone and check what a client sees.",
            ]}
          />
          <Callout kind="warn" title="Closing for a week or more?">
            Google says special hours are for closures of up to 6 days in a row. If your salon
            closes for 7 days or more, or for a time you do not know yet, Google says to mark the
            business as Temporarily closed instead, and to reopen it on the profile when you are
            back.
          </Callout>
        </>
      ),
    },
    {
      id: "busy-evenings",
      heading: "What about late nights before Eid and National Day?",
      answer:
        "Set them as special hours too. A late opening the evening before Eid changes your hours for one day, and Google says special hours are for days when your business temporarily adjusts its hours, as well as for holidays and special events.",
      body: (
        <>
          <p>
            For a day with a break, select More, then Add hours, and enter a second set of times.
            Google's own example of a break is open 9 AM to 2 PM, then again 5 PM to 10 PM. If you
            take bookings online, close the same times in your booking system on the same day, so a
            client does not book a slot your profile says is closed.
          </p>
          <p>
            A short Update post can say the days and the times, with a Book button to your booking
            page. Google says a post with a phone number in its text might be rejected if the number
            cannot be verified as the business's, and suggests a Call now button instead, which uses
            the phone number on your profile.
          </p>
        </>
      ),
    },
    {
      id: "ramadan",
      heading: "Do Ramadan hours work the same way?",
      answer:
        "No. Ramadan lasts about a month, much longer than the 6 days special hours are meant for, and Google's guidelines say you may use your current seasonal hours as your regular hours. So change your main hours for the month and add the Eid days as special hours.",
      body: (
        <p>
          Under Edit profile, Hours, change the times next to each day to your Ramadan hours before
          the month starts, and put your regular hours back after Eid. Google says that after you
          update your hours, a post on your profile may confirm the change, and you can edit or
          delete that post. The full walk-through, with the UK dates too, is in{" "}
          <GuideLink slug="how-to-set-holiday-hours-on-google">
            how to set holiday hours on Google
          </GuideLink>
          .
        </p>
      ),
    },
    {
      id: "after",
      heading: "What if a client finds us closed, or Google changes our hours?",
      answer:
        "Set or fix the special hours as soon as you know, even on the day. If someone suggests different hours on Google, Google may tell you first, and you have 4 days to accept or reject the suggestion.",
      body: (
        <p>
          Google says it may publish a suggested edit you have not answered when other public
          information, such as your website, supports it. Put your holiday hours on your website and
          in your booking page too, so they agree with your profile, and check your profile the
          morning after each holiday. If your normal week has changed, see{" "}
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
          Five days before a UAE public holiday, Kabsi asks you by email, and in Kabsi under Hours,
          what your salon will do: normal hours, closed or custom hours. It never assumes. Closed or
          custom hours become special hours for those days once you tap Confirm and save to Google,
          and Kabsi checks that Google shows them. A holiday that follows the moon, such as Eid, is
          marked "expected", and you can move the days up to three either way. Ramadan is asked
          once, before the month starts: normal hours or different hours for the whole month.
        </p>
        <p>
          On Hours you can also set a special day for any date, such as a late night before Eid.
          Kabsi checks your hours on Google every day and tells you when Google shows something
          different. Nothing goes on Google until you say yes.{" "}
          <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Can I set National Day hours weeks in advance?",
      a: "Yes. Google says you can set special hours in advance for the holidays it lists, and they show to customers only on those dates. National Day is always 2 and 3 December, so you can set it now.",
    },
    {
      q: "Why not set Eid hours from this year's calendar?",
      a: "Because the portal says Eid follows the moon sighting. A day set from a calendar can be a day out. Add the days once they are announced, and check your profile the evening before.",
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
      title: "Google: Mark your business as closed",
      url: "https://support.google.com/business/answer/15300196?hl=en",
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
      title: "Google: Create & manage posts on your Business Profile",
      url: "https://support.google.com/business/answer/7342169?hl=en",
      read: READ,
    },
    {
      title: "Google: Business Profile photos, videos & posts content policy",
      url: "https://support.google.com/business/answer/7213077?hl=en",
      read: READ,
    },
    {
      title: "The Official Portal of the UAE Government: Public holidays",
      url: "https://u.ae/en/information-and-services/public-holidays-and-religious-affairs/public-holidays",
      read: READ,
    },
  ],
  industries: ["hair-salon", "barbershop", "beauty-salon", "nail-salon"],
  related: [
    "how-to-set-holiday-hours-on-google",
    "christmas-and-bank-holiday-hours-on-google-uk",
    "someone-changed-my-hours-on-google",
  ],
  summary:
    "How a UAE salon or barbershop sets Google special hours for National Day on 2 and 3 December, Eid once the moon sighting is announced, late evenings before Eid, and Ramadan hours.",
};
