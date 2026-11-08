import { Callout, DoDont, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { weeklyAt } from "./schedule";
import type { GuideDoc } from "./types";

// Weekly guide 4 (the 31st guide), for barbershops in the UK and the UAE. Every claim about Google is from the Google
// sources below, read on 8 Nov 2026. The example posts are invented.
const READ = "2026-11-08";

export const guide: GuideDoc = {
  slug: "what-to-post-on-google-as-a-barber",
  title: "What should a barbershop post on Google?",
  description:
    "Post ideas for a barbershop's Google profile: fresh cuts, a new barber, walk-in times and holiday hours, with Google's photo and post rules.",
  publishAt: weeklyAt(3),
  updated: READ,
  checked: READ,
  topic: "Posts",
  answer:
    "Post what a client needs to know before walking in: a photo of a fresh cut, a new barber, walk-in times, a new service or your holiday hours. Use an Update with a Book button for most of it, an Offer only when you have a real offer with dates, and post when something changes.",
  inShort: [
    "A clear photo of real work, taken with the client's OK, is the simplest post a barber can make.",
    "Updates suit news and walk-in times, Offers need a title and dates, and Events need start and end dates.",
    "Keep phone numbers, emails and social handles out of the text: Google may reject the post.",
    "Google archives posts older than 6 months unless they have a date range.",
  ],
  sections: [
    {
      id: "what-a-post-is",
      heading: "What is a Google post, and where do clients see it?",
      answer:
        "A post is a short update on your Google profile, with text, a photo or a video, and often a button. Google says clients find posts in the Updates or Overview tab of your profile on a phone, and in the From the owner section on a computer, on both Search and Maps.",
      body: (
        <p>
          Google describes three kinds of post. An <b>Update</b> shares news and can have a
          description, a photo or video and a button that links to your own website, such as your
          booking page. An <b>Offer</b> needs a title, dates and times, and gets a View Offer button
          by itself. An <b>Event</b> needs a title and start and end dates; Google says that without
          times, it shows as lasting 24 hours on each date. The general guide for every kind of
          business is{" "}
          <GuideLink slug="google-posts-for-local-businesses">
            Google posts for a local business
          </GuideLink>
          .
        </p>
      ),
    },
    {
      id: "ideas",
      heading: "What should a barber actually post about?",
      answer:
        "Anything true that helps someone choose you or turn up at the right time. For a barbershop that usually means the work itself, the people, when to come in and what is new.",
      body: (
        <ul>
          <li>
            <b>A fresh cut:</b> a skin fade, a beard shape-up or a kids' cut, photographed in good
            light, with one line about it.
          </li>
          <li>
            <b>A new barber:</b> their name, what they are good at and the days they work, with
            their OK.
          </li>
          <li>
            <b>Walk-ins:</b> which days you take walk-ins and when it is usually quieter.
          </li>
          <li>
            <b>A new service:</b> a hot towel shave, beard colour, or a longer appointment for
            textured hair.
          </li>
          <li>
            <b>Hours that change:</b> late nights before Eid or Christmas, a closed day, a new
            Sunday opening.
          </li>
          <li>
            <b>A real offer:</b> a student price on weekdays, with the dates it runs and its terms.
          </li>
        </ul>
      ),
    },
    {
      id: "examples",
      heading: "What does a good barbershop post look like?",
      answer:
        "Short, specific and true, with one clear button. Two or three sentences are enough: what it is, when, and what to do next.",
      body: (
        <>
          <Callout kind="tip" title="Example: an Update with a Book button">
            "Jay has joined the team. He specialises in skin fades and beard work, and he is in
            Tuesday to Saturday. Book with Jay on our page."
          </Callout>
          <Callout kind="tip" title="Example: an Offer with dates">
            "Student cut, weekdays before 2pm. Show a valid student card. Runs from 1 to 31 March."
          </Callout>
          <p>
            Google's tips are to keep posts professional, with no misspellings, extra characters,
            text that adds no value or distracting content, and to add a descriptive title, start
            and end dates and offer details. An offer is between you and your clients: never tie it
            to leaving a review, which Google's policy does not allow.
          </p>
        </>
      ),
    },
    {
      id: "photos",
      heading: "What makes a good photo for a barber's post?",
      answer:
        "A real photo of real work, in focus and well lit. Google asks for photos without significant alterations or excessive use of filters or AI, so that the image represents reality, and a heavy filter on a fade does the opposite.",
      body: (
        <>
          <DoDont
            yesTitle="Do"
            noTitle="Avoid"
            yes={[
              "JPG or PNG, between 10 KB and 5 MB, ideally 720 by 720 pixels or more.",
              "The back and side of the cut, in daylight or under even light.",
              "Ask the client before their face is in the photo.",
              "Your own shop: the chairs, the front, the team at work.",
            ]}
            no={[
              "Photos taken from another barber's account.",
              "Filters that change the colour of hair or skin.",
              "Screenshots of your social media posts.",
              "A client's face without asking.",
            ]}
          />
          <p>
            Google's content policy treats someone's face in a photograph, posted without their
            consent, as personal information, so a quick question in the chair saves trouble later.
            For your profile's own photos, Google suggests at least three photos at work and three
            team photos. More is in{" "}
            <GuideLink slug="photos-for-google-business-profile">
              which photos to add to your Business Profile
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "how-often",
      heading: "How often should a barbershop post?",
      answer:
        "Google does not set a number. Post when something changes or when you have new work to show, and keep at least one post current, because Google says posts older than 6 months are archived unless a date range is set.",
      body: (
        <p>
          A steady habit is easier than a burst: one new photo of the week's best cut, or a line
          about next week's hours, is enough. Kabsi does not promise that posting changes where you
          come up on Google. Posts are there so a client looking at your profile today sees what is
          true today.
        </p>
      ),
    },
    {
      id: "steps",
      heading: "How do I post on my Google profile from my phone?",
      answer:
        "Sign in to the Google Account linked to your profile, go to your Business Profile and select Posts, then Add post. Choose Update, Offer or Event, add the text, the photo and a button, and select Post.",
      body: (
        <>
          <Steps
            items={[
              "Go to your Business Profile.",
              <>
                Select <b>Posts</b>, then <b>Add post</b>.
              </>,
              "Choose Update, Offer or Event.",
              "Add the text, a photo and, for an Update, a button that links to your booking page.",
              <>
                To post later, turn on <b>Schedule this post</b> and choose the date and time.
              </>,
              <>
                Select <b>Post</b>.
              </>,
            ]}
          />
          <p>
            Google checks each post against its content policy. Live means it shows on Search and
            Maps; Pending means it is still being processed, or your profile is not verified; Not
            approved means it broke a policy, and the question mark next to the status says which.
          </p>
        </>
      ),
    },
    {
      id: "rejected",
      heading: "Why might Google reject a barber's post?",
      answer:
        "The usual reason is contact details in the text. Google says it may remove posts with unverified contact information, including phone numbers, email addresses and social media handles, and suggests a Call now button instead, which uses the phone number on your profile.",
      body: (
        <p>
          Google also asks that buttons link only to websites you trust, that posts stay respectful
          and family friendly, and that businesses in regulated industries do not include content
          about regulated products. If a post is not approved, fix the part the question mark points
          to and post it again. Holiday hours themselves belong under Special hours, not only in a
          post: see{" "}
          <GuideLink slug="christmas-and-bank-holiday-hours-on-google-uk">
            Christmas and bank holiday hours on Google for UK salons
          </GuideLink>{" "}
          or{" "}
          <GuideLink slug="uae-national-day-and-eid-hours-on-google">
            UAE National Day and Eid hours on Google for salons
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
          Kabsi prepares Google posts for you to approve: 2 a month on Essentials and one every week
          on Pro. Send a photo of a fresh cut with a line about it on WhatsApp, and Kabsi turns it
          into a post with that photo, shows you the exact words and asks for your yes. Kabsi writes
          only from facts you confirmed and photos you approved, and never invents a price, an offer
          or a date. Until Kabsi's own AI writing is switched on, you write the post in your words
          on Posts.
        </p>
        <p>
          Before a photo goes up, Kabsi checks it for light, focus, size, a repeat of one you
          already added and a likely screenshot, and removes the location and other hidden details.
          It does not check faces, so ask the client first. Each post is checked for phone numbers,
          emails, links and social handles in the text. Nothing goes on Google until you say yes.{" "}
          <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Can I put my Instagram handle in a Google post?",
      a: "Better not. Google says it may remove posts with unverified contact information, social media handles included. Google lets you add social media links to the profile itself, where they are available.",
    },
    {
      q: "Can I post a client's photo?",
      a: "Ask first. Google's content policy treats a person's face posted without their consent as personal information. A photo of the back and side of the cut often shows the work just as well.",
    },
  ],
  sources: [
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
      title: "Google: Tips for business-specific photos on your Business Profile",
      url: "https://support.google.com/business/answer/6123536?hl=en",
      read: READ,
    },
    {
      title: "Google: Manage your Business Profile photos & videos",
      url: "https://support.google.com/business/answer/6103862?hl=en",
      read: READ,
    },
    {
      title: "Google Maps: Prohibited and restricted content",
      url: "https://support.google.com/contributionpolicy/answer/7400114?hl=en",
      read: READ,
    },
    {
      title: "Google: Edit your Business Profile",
      url: "https://support.google.com/business/answer/3039617?hl=en",
      read: READ,
    },
  ],
  industries: ["barbershop", "hair-salon"],
  related: [
    "google-posts-for-local-businesses",
    "photos-for-google-business-profile",
    "google-profile-checklist-hair-salons-barbers",
  ],
  summary:
    "What a barbershop can post on its Google profile: fresh cuts, a new barber, walk-in times, new services, holiday hours and real offers, with Google's post types, photo rules and reasons for rejection.",
};
