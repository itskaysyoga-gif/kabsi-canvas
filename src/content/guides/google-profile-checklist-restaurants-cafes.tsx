import { Callout, DoDont } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { PUBLISH_ALL_AT } from "./schedule";
import type { GuideDoc } from "./types";

// Guides 3, guide 16. Every claim about Google is from the sources below, read on 5 Nov 2026.
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "google-profile-checklist-restaurants-cafes",
  title: "Google Business Profile checklist for restaurants and cafes",
  description:
    "What a restaurant or cafe should have on its Google profile, from Google's own help pages: category, hours, menu, ordering, table booking, photos and replies.",
  publishAt: PUBLISH_ALL_AT,
  updated: READ,
  checked: READ,
  topic: "Checklist",
  answer:
    "A restaurant or cafe profile needs a specific main category, true hours with holiday dates set in advance, a menu people can read, working order and booking links, food and room photos, a few honest attributes and a reply under each review. Google's help pages describe each of these, and food and drink businesses have their own menu editor and ordering settings.",
  inShort: [
    "Choose the most specific category from Google's list, as in Google's example of 'Nail salon' instead of 'Salon'.",
    "Keep the menu current with the menu editor, and fix any customer menu photo that is out of date.",
    "Check who takes your orders under Food ordering, and set a preferred provider for pickup and delivery.",
    "Set special hours for each holiday, and use More hours for times such as delivery or takeout.",
  ],
  sections: [
    {
      id: "category",
      heading: "Which category should a restaurant or cafe choose?",
      answer:
        "Pick the most specific main category from Google's list. Google's example is a primary category of 'Pizza restaurant', which it says might show your business when people search for restaurants, Italian restaurants or pizza.",
      body: (
        <>
          <p>
            Open Edit profile and, next to Business category, select Edit. Add extra categories only
            for real parts of the business: Google's example is a grocery store with a bakery and a
            deli adding 'Bakery' and 'Deli'. A cafe run separately inside another business, such as
            a health club, should have its own profile with 'Cafe' as its main category rather than
            be added to the club's.
          </p>
          <p>
            The category also opens features. Google says restaurants can add links for online
            orders, reservations and menus, and can add menu items directly. Google warns that
            changing a category can mean you are asked to verify again, so change it once.
          </p>
        </>
      ),
    },
    {
      id: "hours",
      heading: "How do I set opening, delivery and holiday hours?",
      answer:
        "Set the normal week under Edit profile, Hours, with two entries on one day for a break between lunch and dinner. Use More hours for services that keep different times, such as delivery and takeout in Google's own example, and special hours for holidays and closures of 6 days or fewer.",
      body: (
        <>
          <p>
            Google says it is a good idea to confirm hours for official holidays even when they are
            the same as usual, so customers know they are accurate. Closed for 7 or more days in a
            row, such as a refit, Google says to mark the business Temporarily closed instead. For
            special hours to show at all, the main hours must be set to Open with main hours.
          </p>
          <p>
            Google keeps a holiday list for the UK and for the UAE, and on those dates your profile
            may warn people that your hours might differ. For the UK it lists Christmas Eve,
            Christmas Day and Boxing Day, with Boxing Day observed on Monday 28 December 2026, and
            New Year's Day. Step by step:{" "}
            <GuideLink slug="how-to-set-holiday-hours-on-google">
              how to set holiday hours on Google
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "menu",
      heading: "How do I put my menu on Google?",
      answer:
        "On your profile select Edit menu, then add sections such as starters and mains, and items with descriptions and prices. Google says changes can take 24 to 48 hours to show, and customers then find the items under Menu.",
      body: (
        <>
          <p>There are three more menu settings worth checking once:</p>
          <ul>
            <li>
              <b>Menu photos:</b> under Edit menu, Photos of menu, upload a photo or a PDF. Google
              says customers can add menu photos too, so flag an old one for removal and upload the
              current menu yourself.
            </li>
            <li>
              <b>Menu link:</b> under Edit profile, Business information, Contact, Menu link, add
              the page on your website where the menu lives.
            </li>
            <li>
              <b>Preferred menu:</b> when Google finds more than one menu source, choose yours from
              the Full menu tab. Google says it may also copy menu data from your website, and you
              can opt out.
            </li>
          </ul>
          <p>
            Google also offers an experimental way to build the menu from one photo or PDF of it.
            Google says the full menu must fit on one page, and blurry photos may not work well, so
            read the result before you publish it.
          </p>
        </>
      ),
    },
    {
      id: "dishes",
      heading: "Customers added dish photos with the wrong names. Can I fix them?",
      answer:
        "Yes, in the Google Maps app. Open your restaurant, tap Menu, tap the dish, then Suggest an edit to change the name, mark it incorrect or say it is not served here; Google says dish names you add take priority over names from customers.",
      body: (
        <p>
          To add a dish yourself, tap Menu, then Add, add a photo and enter the name. Google says it
          aims to post dish name edits within a few days, but does not promise they will be
          published, and that photos added this way also appear in your general photos.
        </p>
      ),
    },
    {
      id: "ordering-booking",
      heading: "How do people order or book a table from my profile?",
      answer:
        "Ordering lives under Food ordering on your profile, where Accept orders on your profile turns all ordering options on or off and you can set a preferred provider for pickup and for delivery. Table booking lives under Bookings, through a Reserve with Google provider, or as your own booking link.",
      body: (
        <>
          <p>
            Google says delivery and ordering providers who state they have an authorised
            relationship with your business can appear on your profile automatically. To take one
            off, select it under Food ordering, then Remove link; Google says providers must remove
            the link within 5 business days. Where the buttons sit differs by country: in some, the
            options appear under an Order online button, and in others Place an order links appear
            separately, so a cafe in the UK and one in the UAE may see a different layout.
          </p>
          <p>
            For tables, Google says a provider may charge you for bookings through Google, and that
            restaurants can also add a waitlist through a Reserve with Google provider. You can add
            up to 10 of your own links per type, such as reservations or food orders, and mark one
            as Business preferred.
          </p>
          <Callout kind="tip" title="Tap every button yourself">
            Once a month, open your profile on a phone signed out and tap Order, Reserve and Menu. A
            link to a provider you left sends a hungry customer nowhere.
          </Callout>
        </>
      ),
    },
    {
      id: "photos",
      heading: "Which photos should a restaurant or cafe add?",
      answer:
        "Google suggests at least three photos of the food or drinks you serve, three of the outside, three of the inside and three of the team. Your photos show only once the profile is verified, and Google asks for photos in focus, well lit and showing reality, without excessive filters or AI.",
      body: (
        <DoDont
          yesTitle="Google's suggestions"
          noTitle="What to avoid"
          yes={[
            "Your most popular dishes and drinks, evenly lit.",
            "The front from each direction people arrive, at different times of day.",
            "The room as a guest sees it, with its atmosphere.",
            "JPG or PNG, 10 KB to 5 MB, 720 by 720 pixels recommended.",
          ]}
          no={[
            "A dish that looks nothing like what arrives at the table.",
            "Heavy filters or AI changes to the food.",
            "Old photos of a room you have since changed.",
          ]}
        />
      ),
    },
    {
      id: "attributes-description",
      heading: "Which attributes and description should I set?",
      answer:
        "Attributes are yes or no facts such as Wi-Fi, outdoor seating, payment options and wheelchair access, set under Edit profile, More. The description is up to 750 characters on what you serve and what makes you different, with no links.",
      body: (
        <p>
          Google says some attributes depend on your country or category, and that subjective ones,
          such as whether a place is popular with locals, come from people who visited. Answer only
          what is true: Google's wheelchair-accessible seating, for example, means a main area with
          no steps and room to reach and sit at a table. In the description, Google asks you to
          focus on the business rather than prices or promotions. Examples are in{" "}
          <GuideLink slug="google-business-description-examples">
            what to write in your Google business description
          </GuideLink>
          .
        </p>
      ),
    },
    {
      id: "posts-reviews",
      heading: "What should I post, and how do I handle reviews?",
      answer:
        "Post what is new, such as a seasonal menu, an event or an offer, because Google archives posts older than 6 months unless a date range is set. Reply to reviews from Read reviews on your profile, and ask every guest the same way, with nothing offered in return.",
      body: (
        <>
          <p>
            Two rules matter for food and drink. Google allows posts from businesses in regulated
            industries, alcohol included, but says not to include content about those products. And
            Google says featured posts, which can appear in place of reviews on a mobile profile,
            are available in English for single-location food and drink businesses in the US, the
            UK, Canada, Australia and New Zealand, so a UK restaurant may see them, while the UAE is
            not on that list today.
          </p>
          <p>
            For reviews, Google does not allow incentives such as a free dessert or a discount, and
            its policy says businesses must not discourage negative reviews or ask only happy
            guests. More in{" "}
            <GuideLink slug="how-to-ask-for-google-reviews">
              how to ask customers for Google reviews
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
          Kabsi does not edit menu items, ordering settings or booking links on Google today, and it
          works only with your Google profile, not with delivery or booking platforms. Once it is a
          Manager on your profile, Profile Coach lists what your profile is missing, and Kabsi
          checks your details every day, hours and phone included, and tells you when something on
          Google changes.
        </p>
        <p>
          Send a photo of a new menu or a dish and Kabsi checks it for light, focus and size, then
          adds it to your profile once you say yes. Five days before a public holiday it asks what
          you will do and sets special hours after your yes. It drafts posts (2 a month on
          Essentials, every week on Pro) and a reply for each new review, naming a dish only when
          the guest did. Nothing goes on Google until you approve it.{" "}
          <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "A delivery app I left still shows on my profile. How do I remove it?",
      a: "Go to Food ordering on your profile, select that provider and choose Remove link. Google says providers must remove it within 5 business days, and that you can report a violation if one does not.",
    },
    {
      q: "Can I offer a free coffee for a review?",
      a: "No. Google's help says offering free or discounted goods or services in exchange for reviews is strictly prohibited. Ask every customer the same way and offer nothing for it.",
    },
  ],
  sources: [
    {
      title: "Google: Manage your business category",
      url: "https://support.google.com/business/answer/7249669?hl=en",
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
      title: "Google: About holidays on Google",
      url: "https://support.google.com/business/answer/6333474?hl=en",
      read: READ,
    },
    {
      title: "Google: About the menu editor",
      url: "https://support.google.com/business/answer/9455840?hl=en",
      read: READ,
    },
    {
      title: "Google: Manage your restaurant's popular dish names",
      url: "https://support.google.com/business/answer/9322475?hl=en",
      read: READ,
    },
    {
      title: "Google: Manage online ordering options",
      url: "https://support.google.com/business/answer/10842217?hl=en",
      read: READ,
    },
    {
      title: "Google: Set up bookings through a provider",
      url: "https://support.google.com/business/answer/7475773?hl=en",
      read: READ,
    },
    {
      title: "Google: Manage your local business links",
      url: "https://support.google.com/business/answer/6218037?hl=en",
      read: READ,
    },
    {
      title: "Google: Tips for business-specific photos on your Business Profile",
      url: "https://support.google.com/business/answer/6123536?hl=en",
      read: READ,
    },
    {
      title: "Google: Manage your business attributes",
      url: "https://support.google.com/business/answer/9049526?hl=en",
      read: READ,
    },
    {
      title: "Google: Edit your Business Profile",
      url: "https://support.google.com/business/answer/3039617?hl=en",
      read: READ,
    },
    {
      title: "Google: Create & manage posts on your Business Profile",
      url: "https://support.google.com/business/answer/7342169?hl=en",
      read: READ,
    },
    {
      title: "Google: Manage customer reviews",
      url: "https://support.google.com/business/answer/3474050?hl=en",
      read: READ,
    },
    {
      title: "Google: Tips to get more reviews",
      url: "https://support.google.com/business/answer/3474122?hl=en",
      read: READ,
    },
    {
      title: "Google Maps: Prohibited and restricted content",
      url: "https://support.google.com/contributionpolicy/answer/7400114?hl=en",
      read: READ,
    },
  ],
  industries: ["restaurant", "cafe"],
  related: [
    "how-to-set-holiday-hours-on-google",
    "photos-for-google-business-profile",
    "google-posts-for-local-businesses",
  ],
  summary:
    "A checklist for a restaurant or cafe's Google profile from Google's help pages: category, hours, menu editor, dish names, food ordering and table booking, photos, attributes, posts and reviews.",
};
