import { Callout, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { weeklyAt } from "./schedule";
import type { GuideDoc } from "./types";

// Weekly guide 2 (the 29th guide), for UK salons and barbershops. Every claim about Google is from the Google sources
// below and the bank holidays from GOV.UK, all read on 8 Nov 2026.
const READ = "2026-11-08";

export const guide: GuideDoc = {
  slug: "christmas-and-bank-holiday-hours-on-google-uk",
  title: "Christmas and bank holiday hours on Google for UK salons",
  description:
    "The Christmas and New Year dates a UK salon or barbershop should set on Google, nation by nation, and how to show late nights and a closed week.",
  publishAt: weeklyAt(1),
  updated: READ,
  checked: READ,
  topic: "Holiday hours",
  answer:
    "Add every day from Christmas Eve to the first Monday of January under Special hours on your Google profile, open or closed, including the days you open as usual. Use your own nation's bank holidays: Scotland has two more than England and Wales over this period.",
  inShort: [
    "Christmas Day is Friday 25 December 2026 and Boxing Day's bank holiday moves to Monday 28 December.",
    "Scotland adds St Andrew's Day on 30 November and a 2nd January holiday on Monday 4 January 2027.",
    "Google may warn clients that your hours might differ on Christmas Eve and Saturday 26 December too.",
    "Closed for 7 days or more in a row? Google says to mark the business temporarily closed.",
  ],
  sections: [
    {
      id: "dates",
      heading: "Which dates do UK salons and barbers need this Christmas?",
      answer:
        "GOV.UK lists separate bank holidays for England and Wales, for Scotland and for Northern Ireland. Over Christmas and New Year 2026 all three share Christmas Day, the Boxing Day substitute day and New Year's Day, and Scotland adds two more days.",
      body: (
        <>
          <ul>
            <li>
              <b>England and Wales, and Northern Ireland:</b> Christmas Day, Friday 25 December
              2026; Boxing Day (substitute day), Monday 28 December; New Year's Day, Friday 1
              January 2027.
            </li>
            <li>
              <b>Scotland:</b> St Andrew's Day, Monday 30 November 2026; Christmas Day, Friday 25
              December; Boxing Day (substitute day), Monday 28 December; New Year's Day, Friday 1
              January 2027; 2nd January (substitute day), Monday 4 January 2027.
            </li>
          </ul>
          <p>
            GOV.UK says that when a bank holiday falls on a weekend, a substitute weekday becomes a
            bank holiday, normally the following Monday. Boxing Day 2026 is a Saturday, which is why
            its bank holiday is Monday 28 December, and 2 January 2027 is a Saturday, which is why
            Scotland's holiday is Monday 4 January. A salon in Glasgow and one in Belfast can have
            different answers on the same day, so check the list for your own nation.
          </p>
        </>
      ),
    },
    {
      id: "google-list",
      heading: "Which days will Google flag on my profile?",
      answer:
        "Google keeps its own holiday list, and on those days a warning may appear on your profile telling people your hours might differ. Its UK list for this period includes Christmas Eve, Christmas Day, Boxing Day on Saturday 26 December, Boxing Day observed on Monday 28 December and New Year's Day.",
      body: (
        <>
          <p>
            For Scotland it also lists St Andrew's Day and 2nd January, with the observed day on 4
            January. Christmas Eve and Saturday 26 December are not bank holidays, but they are on
            Google's list, and both are normally busy days for a salon or a barbershop.
          </p>
          <p>
            Google says it is a good idea to confirm your hours for official holidays even when they
            are the same as your regular hours, so customers can see your special hours are
            accurate. If you open as normal on Saturday 26 December, add that date with your usual
            Saturday times.
          </p>
        </>
      ),
    },
    {
      id: "steps",
      heading: "How do I add Christmas hours to my Google profile?",
      answer:
        "Use special hours, which change chosen dates and leave your normal week as it is. Google says special hours are for holidays, special events and other exceptional circumstances, and for closures of up to 6 days in a row.",
      body: (
        <>
          <Steps
            items={[
              "Sign in to the Google Account linked to your profile and go to your Business Profile.",
              <>
                Select <b>Edit profile</b>, then <b>Hours</b>.
              </>,
              <>
                Next to Special hours, select <b>Edit</b>.
              </>,
              <>
                For a date Google suggests, select <b>Review</b>. For any other day, select{" "}
                <b>Add a date</b>.
              </>,
              "Leave Closed ticked for a day you are shut, or untick it and enter your times.",
              <>
                Select <b>Save</b>, then repeat for each date.
              </>,
            ]}
          />
          <p>
            Google says special hours show only if your business hours are set to Open with main
            hours. You can add the dates now: Google says you can set special hours in advance for
            the holidays it lists, and they show to customers only on those dates.
          </p>
        </>
      ),
    },
    {
      id: "late-nights",
      heading: "How do I show late nights before Christmas?",
      answer:
        "Add each late night as a special hours date with your longer times. A salon open until 9 PM on a Thursday in December is a temporary change of hours for that day, which is what Google says special hours are for.",
      body: (
        <>
          <p>
            For a day with a break, select More, then Add hours, and enter the second set of times.
            A short Update post with a Book button can say which evenings you are open late. Google
            says a post with a phone number in its text might be rejected if the number cannot be
            verified as the business's, so use the Call now button, which uses the number on your
            profile.
          </p>
          <p>
            If clients book online, change the same days in your booking system. When the two
            disagree, a client sees one answer on Google and another when they try to book.
          </p>
        </>
      ),
    },
    {
      id: "closed-week",
      heading: "What if we close for the whole Christmas break?",
      answer:
        "Count the days. Christmas Eve to New Year's Day is 9 days in a row, and Google says that for 7 or more days in a row, or for a closure of unknown length, you should mark the business as Temporarily closed rather than add special hours.",
      body: (
        <>
          <Callout kind="tip" title="Up to 6 days, or 7 and more">
            Closed from Friday 25 December to Monday 28 December is 4 days: add each one as special
            hours. Closed from Thursday 24 December to Monday 4 January is 12 days: mark the
            business Temporarily closed under Edit profile, Hours, then reopen it when you are back.
          </Callout>
          <p>
            Google says that marking a business temporarily closed helps people who search for you
            by name understand that the closure is only temporary. Put a date in your diary to
            reopen the profile on your first day back.
          </p>
        </>
      ),
    },
    {
      id: "after",
      heading: "What if Google shows the wrong hours after Christmas?",
      answer:
        "Check your profile on a phone the first morning after each holiday. If someone has suggested different hours, Google may notify you, and you have 4 days to accept or reject the suggestion before Google may publish it.",
      body: (
        <p>
          Google says it may publish a suggested edit you have not answered when other public
          information, such as your website, supports it. Put the same Christmas hours on your
          website and booking page, and if your normal week changed, see{" "}
          <GuideLink slug="someone-changed-my-hours-on-google">
            someone changed my hours on Google
          </GuideLink>
          . The steps for every other UK bank holiday in 2027 are in{" "}
          <GuideLink slug="how-to-set-holiday-hours-on-google">
            how to set holiday hours on Google
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
          Five days before a bank holiday, Kabsi asks you by email, and in Kabsi under Hours, what
          your salon will do: normal hours, closed or custom hours. It never assumes. It uses the
          GOV.UK bank holidays for your own nation, read from your Google address, so a salon in
          Scotland is asked about St Andrew's Day and one in Northern Ireland gets its own dates.
          Closed or custom hours become special hours once you tap Confirm and save to Google, and
          Kabsi checks that Google shows them.
        </p>
        <p>
          Christmas Eve and Saturday 26 December are not bank holidays, so set them yourself on
          Hours, where you can add a special day for any date, late nights included. Kabsi checks
          your hours on Google every day and tells you when Google shows something different.
          Nothing goes on Google until you say yes. <SiteRef to="/scan">Run the free check</SiteRef>
          .
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Do I need to set Boxing Day if I open on Saturday 26 December?",
      a: "It helps. Boxing Day is on Google's holiday list, so a warning may show that your hours might differ. Add 26 December under Special hours with your usual Saturday times.",
    },
    {
      q: "Is Christmas Eve a bank holiday?",
      a: "No. It is not on the GOV.UK list for any UK nation, but it is on Google's UK holiday list, so confirm your hours for it under Special hours.",
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
      title: "GOV.UK: UK bank holidays",
      url: "https://www.gov.uk/bank-holidays",
      read: READ,
    },
  ],
  industries: ["hair-salon", "barbershop", "beauty-salon", "nail-salon"],
  related: [
    "how-to-set-holiday-hours-on-google",
    "uae-national-day-and-eid-hours-on-google",
    "someone-changed-my-hours-on-google",
  ],
  summary:
    "The Christmas and New Year 2026 dates a UK salon or barbershop should set as special hours on Google, by nation, with Google's own holiday list, late nights and a closed week.",
};
