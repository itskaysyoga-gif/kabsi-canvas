import { Callout, DoDont } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { scheduledAt } from "./schedule";
import type { GuideDoc } from "./types";

// Guides 3, guide 15. Every claim about Google is from the sources below, read on 5 Nov 2026.
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "google-profile-checklist-hair-salons-barbers",
  title: "Google Business Profile checklist for salons and barbers",
  description:
    "What a hair salon or barbershop should have on its Google profile, item by item, from Google's own help pages: category, hours, services, booking, photos.",
  publishAt: scheduledAt(14),
  updated: READ,
  checked: READ,
  topic: "Checklist",
  answer:
    "A salon or barbershop profile needs a specific main category, true weekly and holiday hours, a list of services with prices, a way to book, real photos of the shop and the work, a short description and replies to reviews. Google's own help pages describe each of these, and you edit all of them from your profile while signed in.",
  inShort: [
    "Pick the most specific main category from Google's list, and add others only for what you really offer.",
    "Set weekly hours with breaks, then special hours for every holiday, even when you open as normal.",
    "List your services with prices and a booking link, keeping prices out of custom service names.",
    "Add at least three photos each of the outside, the inside, your work and your team.",
  ],
  sections: [
    {
      id: "category",
      heading: "Which category should a hair salon or barbershop choose?",
      answer:
        "Choose the most specific main category from the list Google offers, because Google says the categories you select affect your local ranking and that you cannot create your own. Google's own example is to pick 'Nail salon' rather than the general 'Salon', so a barbershop should look for its own category rather than a broad one.",
      body: (
        <>
          <p>
            Open Edit profile, then next to Business category select Edit, type in the Primary
            category box and pick from the list that shows up. You can add up to 9 more categories
            with Add another category. Google asks you to use as few as possible, not to use
            categories as keywords and not to add one for every service: the services list is where
            each treatment goes.
          </p>
          <p>
            Google says health and beauty businesses can add a booking button and a list of services,
            so the right category also decides which of the later items you see. Google also warns
            that adding or editing a category can mean you are asked to verify your business again,
            so make the change once, when you are sure.
          </p>
        </>
      ),
    },
    {
      id: "hours",
      heading: "How do I set hours, lunch breaks and holiday hours?",
      answer:
        "Set the normal week under Edit profile, Hours, and show a break by making two entries for the same day. For a holiday or a short closure, use special hours, which Google keeps apart from the normal week, and confirm official holidays even when you open as usual.",
      body: (
        <>
          <p>
            Google's example of a break is a day open 9 AM to 2 PM, then again 5 PM to 10 PM: tick
            the day, set the first period, select Add hours and set the second.
          </p>
          <p>
            Special hours are for days when you temporarily change your hours or stay closed for 6
            days in a row or fewer. Google says it is a good idea to confirm your hours for official
            holidays even if they match your regular hours, so customers can see the special hours
            are accurate. Closed for 7 or more days in a row, or for an unknown time, Google says to
            mark the business as Temporarily closed instead.
          </p>
          <p>
            Google keeps a list of holidays for both the UK and the UAE on which your profile may
            warn people that your hours might differ. For the UK it lists Christmas Eve, Christmas
            Day and Boxing Day, with Boxing Day observed on Monday 28 December 2026. Set those dates
            in advance. The full walk-through is in{" "}
            <GuideLink slug="how-to-set-holiday-hours-on-google">
              how to set holiday hours on Google
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "services",
      heading: "How do I list my services and prices?",
      answer:
        "Select Edit services on your profile, tick the suggested services that match what you do, then open each one to add a price and a description. If a treatment is not suggested, select Add custom service, and keep prices and phone numbers out of its name, because Google automatically rejects custom service names that include them.",
      body: (
        <>
          <p>
            Google says that when someone searches for an offering you provide, that service may be
            highlighted on your profile, and that on the Google Maps app customers can view the full
            list under Services. You can group services into categories, for example cuts, colour
            and beard work, so the list stays easy to read on a phone.
          </p>
          <p>
            Services also feed your reviews: Google says a customer reviewing a service business may
            be asked to choose the service they had, from your list. More detail is in{" "}
            <GuideLink slug="add-services-and-prices-to-google">
              how to add services and prices to Google
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "booking",
      heading: "How can clients book from my Google profile?",
      answer:
        "There are two ways. If your booking system works with Reserve with Google, select Bookings on your profile, then Get started and your provider; if not, add your own booking link, and Google lets you add up to 10 links per category, such as booking an appointment.",
      body: (
        <>
          <p>
            Google says a provider may charge you when people book through Google, so check with
            yours, and that booking providers show on your profile within a week. Which providers
            are available depends on your country, so a salon in the UK and one in the UAE may see
            different names under Reserve with Google.
          </p>
          <p>
            To add your own link, on Google Search select Booking, then Add link, enter the address
            and Save. With more than one link, Set preferred link marks one as Business preferred.
            Google says some booking links can appear on your profile automatically from third-party
            providers; to take one off, select Booking, then Remove Provider, and Google says the
            provider must remove it within 5 days of your request.
          </p>
          <Callout kind="tip" title="Test the link after every change">
            When you move to a new booking tool, open your profile on a phone and tap the booking
            button yourself the same day. An old link sends a ready client to an error page.
          </Callout>
        </>
      ),
    },
    {
      id: "photos",
      heading: "Which photos should a salon or barbershop add?",
      answer:
        "Google suggests at least three exterior photos, three interior photos, three photos at work and three team photos, plus a logo and a cover photo. Photos show only once the profile is verified, and Google asks for photos in focus, well lit and without significant alterations or excessive use of filters or AI.",
      body: (
        <>
          <DoDont
            yesTitle="What Google asks for"
            noTitle="What to avoid"
            yes={[
              "JPG or PNG, between 10 KB and 5 MB, 720 by 720 pixels recommended.",
              "The front from each direction clients walk up, at different times of day.",
              "Your team at work on different services, and your specialty work.",
              "A less formal team photo that shows who clients will meet.",
            ]}
            no={[
              "Heavy filters that change the colour of a cut or a colour job.",
              "Anything smaller than the 250 by 250 pixel minimum.",
              "A client's face without asking them first.",
            ]}
          />
          <p>
            Google says it can take 24 to 48 hours for photos to show, and that the cover photo you
            choose may not always be the first image people see. More on choosing photos is in{" "}
            <GuideLink slug="photos-for-google-business-profile">
              which photos to add to your Business Profile
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "attributes-description",
      heading: "What goes in the attributes and the description?",
      answer:
        "Attributes are yes or no facts such as a wheelchair-accessible entrance, Wi-Fi or payment options, set under Edit profile, More. The description is up to 750 characters about what you offer and what makes you different, with no links, focused on the business rather than prices or offers.",
      body: (
        <>
          <p>
            Google says some attributes can only be changed in certain countries or business
            categories, so a salon in the UK and one in the UAE may see a different list, and that a
            review of your edits usually takes about 10 minutes but can take up to 30 days. Answer
            only what is true: Google's accessibility attributes have exact rules, for example an
            entrance at least one meter wide with no steps.
          </p>
          <p>
            For the description, Google suggests what you offer, what makes you special, how long
            you have been in business and anything else helpful. Examples are in{" "}
            <GuideLink slug="google-business-description-examples">
              what to write in your Google business description
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "posts-reviews",
      heading: "Do posts and review replies belong on the checklist?",
      answer:
        "Yes. Google describes posts as a way to share updates, offers and events on Search and Maps, and says replying to reviews shows customers you value their feedback. Google also says posts older than 6 months are archived unless a date range is set.",
      body: (
        <>
          <p>
            For a salon, a post can announce a new stylist, a new service or Saturday walk-in times,
            with a button to your booking page. Google warns that a post with a phone number in it
            might be rejected if the number cannot be verified as the business's.
          </p>
          <p>
            For reviews, ask every client the same way, with your review link or QR code. Google
            does not allow incentives, such as a free or discounted service, for a review, and its
            content policy says businesses must not discourage negative reviews or ask only happy
            clients. How to ask is in{" "}
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
          Once Kabsi is a Manager on your profile, Profile Coach lists what a complete Google profile
          has and what yours is missing, services and profile details included, with a reason for
          each. Kabsi does not edit services, attributes or the booking link on Google today: you add
          those yourself, and Kabsi checks your details every day and tells you when something on
          Google changes.
        </p>
        <p>
          Five days before a public holiday Kabsi asks what you will do, normal hours, closed or
          custom, and sets special hours once you say yes. It drafts posts (2 a month on Essentials,
          every week on Pro), checks each photo for light, focus and size before it goes up, and
          prepares a reply for every new review that thanks a stylist only when the review names
          someone on your team list. Nothing goes on Google until you approve it.{" "}
          <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Why can't I see Edit services or Bookings on my profile?",
      a: "Google says services are an option for businesses in certain categories, and that you find booking providers available in your country through Reserve with Google. Check your main category first. If the option is still missing, add your own booking link under Booking.",
    },
    {
      q: "Can I give a discount to clients who leave a review?",
      a: "No. Google's help says offering incentives, like free or discounted goods or services, in exchange for reviews is strictly prohibited. Ask every client the same way and offer nothing for it.",
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
      title: "Google: Manage your services on your Business Profile",
      url: "https://support.google.com/business/answer/9455399?hl=en",
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
      title: "Google: Manage your Business Profile photos & videos",
      url: "https://support.google.com/business/answer/6103862?hl=en",
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
  industries: ["hair-salon", "barbershop"],
  related: [
    "add-services-and-prices-to-google",
    "how-to-set-holiday-hours-on-google",
    "photos-for-google-business-profile",
  ],
  summary:
    "A checklist for a hair salon or barbershop's Google profile from Google's help pages: category, hours and holiday hours, services and prices, booking, photos, attributes, description, posts and reviews.",
};
