import { Callout, DoDont, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { PUBLISH_ALL_AT } from "./schedule";
import type { GuideDoc } from "./types";

// Guides 3, guide 8. Every claim about Google is from the sources below, read on 5 Nov 2026.
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "google-posts-for-local-businesses",
  title: "Google posts for a local business: what and how often?",
  description:
    "What to put in a Google post, which kind to use, how often to post, and why Google may not approve a post, for a local business in the UK or the UAE.",
  publishAt: PUBLISH_ALL_AT,
  updated: READ,
  checked: READ,
  topic: "Google posts",
  answer:
    "Post when you have something true and useful to tell customers: news, a new service, an offer with real dates, or an event. Google's help sets no number of posts, so a steady rhythm you can keep, such as one every week or two, beats a burst followed by months of silence.",
  inShort: [
    "Google offers three kinds of post: Update, Offer and Event.",
    "Customers see posts on your profile on Search and Maps, on a phone and on a computer.",
    "Google archives posts older than 6 months unless the post has a date range.",
    "Leave phone numbers out of the text: Google says it may reject them. Use the Call now button.",
  ],
  sections: [
    {
      id: "what-is-a-post",
      heading: "What is a Google post, and where do customers see it?",
      answer:
        "A post is a short message from you that shows on your Business Profile on Google Search and Maps, with text, a photo or a video, and often a button. Google says that on a phone customers find posts in the Updates or Overview tabs of your profile, and on a computer in the From the owner section.",
      body: (
        <>
          <p>
            Google describes posts as a way to share announcements, offers, updates and event
            details directly with customers, and says they help customers decide to visit. Posts do
            not replace the facts on your profile: your hours, address and services still live in
            their own fields, and a post is the place for what is new.
          </p>
          <p>
            Google also shows featured posts on some profiles on a phone: posts about events, deals
            or specials, taken from your Facebook or Instagram or from posts you made on your
            profile. Google says this is available in English for single-location food and drink
            businesses in the US, the UK, Canada, Australia and New Zealand, and that it can appear
            in place of reviews on the phone view.
          </p>
        </>
      ),
    },
    {
      id: "which-kind",
      heading: "Which kind of post should I use?",
      answer:
        "Use an Update for news and everyday information, an Offer only for a real promotion with a title and dates, and an Event for something that happens at a set time. Each kind asks for different details, and Google adds a View Offer button to every Offer by itself.",
      body: (
        <ul>
          <li>
            <b>Update:</b> a description, a photo or video, and an action button with a link, for
            example to book, order online or learn more. Google says the button should go to a
            website where the customer can complete that action.
          </li>
          <li>
            <b>Offer:</b> needs a title, dates and a time. You can add a description, a photo or
            video, a coupon code, a link, and terms and conditions.
          </li>
          <li>
            <b>Event:</b> needs a title, start and end dates, and times. Google says that without a
            start or end time the event shows as lasting 24 hours on its dates.
          </li>
        </ul>
      ),
    },
    {
      id: "what-to-post",
      heading: "What should a local business actually post about?",
      answer:
        "Post what a customer would want to know before they come: something new on the menu or price list, a change to how you work, a seasonal offer, an event, or a photo of recent work. Google's own tips ask for complete and relevant details, such as a descriptive title, event times and the offer's terms.",
      body: (
        <>
          <DoDont
            yesTitle="Good posts"
            noTitle="Posts to avoid"
            yes={[
              "A cafe: 'New autumn menu from Monday: pumpkin soup and a spiced latte.' with a photo of both.",
              "A barber: 'Hot towel shaves start this week.' with a photo of the chair and the towels.",
              "A garage: 'Winter tyre checks in November, ask at the desk.' with a photo of the workshop.",
              "A salon: an Event for a bridal hair evening with its date and times.",
            ]}
            no={[
              "The same text every week with a different photo.",
              "A phone number, email or social handle typed into the text.",
              "Words that add nothing, misspellings or text written only to fill space.",
              "An offer with no end date or no terms.",
            ]}
          />
          <p>
            Google's tips also ask you to keep posts professional, respectful and family friendly,
            and to link only to websites you trust. If details change after you post, Google says
            you can edit the post so it stays correct.
          </p>
        </>
      ),
    },
    {
      id: "how-often",
      heading: "How often should I post on my Google profile?",
      answer:
        "Google's help pages on posts do not give a number, so nobody can tell you Google wants a post every week. What Google does say is that posts older than 6 months are archived unless a date range is set, so a profile with no new post for half a year shows nothing recent.",
      body: (
        <>
          <p>
            A rhythm you can keep is the honest answer. For most salons, cafes and garages that is
            one post every week or two, each about one real thing. A post that repeats last week's
            words helps nobody, so skip a week rather than post filler.
          </p>
          <p>
            Google lets you plan ahead: when you create a post you can turn on{" "}
            <b>Schedule this post</b> and pick the date and time it publishes, and the{" "}
            <b>Repeats</b> menu lets a post come back weekly, monthly or on a custom schedule. Use
            repeats only for something that really repeats, such as a weekly class.
          </p>
        </>
      ),
    },
    {
      id: "how-to-post",
      heading: "How do I create a post on my Business Profile?",
      answer:
        "Sign in to the Google Account that manages your profile, open your Business Profile, select Posts and then Add post, choose the kind, fill it in and select Post. The steps below follow Google's help page as it reads today.",
      body: (
        <>
          <Steps
            items={[
              "Go to your Business Profile while signed in to the account that manages it.",
              "Select Posts, then Add post.",
              "Choose Update, Offer or Event.",
              "Add your text, a photo or video, and any extra details, such as Button or Coupon code.",
              "To publish later, turn on Schedule this post and choose the date and time. To repeat it, choose how often from the Repeats menu.",
              "Select Post. If you manage several profiles, Google asks which ones to share it on; select Skip to post on one.",
            ]}
          />
          <p>
            To change or remove a post later, open Posts, then at the right of the post select More
            and Edit, or More and Delete.
          </p>
        </>
      ),
    },
    {
      id: "not-approved",
      heading: "Why does my post say Pending or Not approved?",
      answer:
        "Google reviews every post against its posts content policy after you publish it. Pending means it is still uploading or processing, or that your profile is not verified, and Not approved means Google found a policy problem; neither shows to customers until the post is Live.",
      body: (
        <>
          <p>Google names these causes on its pages:</p>
          <ul>
            <li>
              Contact details in the text. Google says it may remove posts with unverified phone
              numbers, email addresses or social media handles, and suggests a Call now button,
              which uses the verified phone number on your profile.
            </li>
            <li>
              Regulated goods and services. Businesses in industries such as alcohol, tobacco,
              pharmaceutical products, health and medical devices, gambling and financial services
              can post, but Google says not to include content about those products.
            </li>
            <li>
              Hotels. Google says hotels cannot create Offer posts or any post about deals,
              promotions, special offers or discounts.
            </li>
            <li>
              Inappropriate or offensive language, sexually suggestive or explicit content, or links
              to malware, viruses, phishing or pornographic material.
            </li>
          </ul>
          <Callout kind="tip" title="Check the question mark">
            Google says a question mark next to Not approved shows which content policy the post
            breaks. Fix that one thing, then post it again.
          </Callout>
        </>
      ),
    },
    {
      id: "uk-uae",
      heading: "Is anything different in the UK or the UAE?",
      answer:
        "Google's pages here name no separate rule for the UK or the UAE on the kinds of post, the steps or the content policy. The one difference Google names is featured posts, which today are for single-location food and drink businesses in a list of countries that includes the UK and does not include the UAE.",
      body: (
        <p>
          Your country's own rules on advertising still apply: Google's content policy says you are
          responsible for making sure your posts follow all applicable laws. That matters most for
          offers, prices and anything to do with alcohol. Holiday notices belong in special hours
          rather than only in a post, which is covered in{" "}
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
          Kabsi prepares Google posts for you to approve: 2 a month on Essentials and one every week
          on Pro. Each is an Update, an Offer or an Event that can have one of your own checked
          photos and one button, and Kabsi writes it only from facts you confirmed and photos you
          approved. An offer or an event is only one you typed in: Kabsi never invents a price, an
          offer or a date. When it has nothing true to say, it asks you one question instead,
          "Anything new this month? A dish, a service, an event?", and until Kabsi's own AI writing
          is switched on you write the post in your words on Posts. You can also send a photo with a
          line about it on WhatsApp, and Kabsi turns it into a post and shows you the exact words
          first.
        </p>
        <p>
          Before you see a post, and again when you approve it, Kabsi checks it: no phone numbers,
          emails, links or social handles in the text, a button only to your own website, no prices
          or offers that are not in your facts, no "best" or "number one", and no Offer posts for
          hotels. Nothing goes on Google until you say yes, and Kabsi does not promise that posts
          change where you come up. <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Do Google posts help my ranking?",
      a: "Google's help pages on posts do not say they change where you come up. They describe posts as a way to keep customers informed and help them decide to visit. Post for your customers, not for a ranking.",
    },
    {
      q: "Can I post from my phone?",
      a: "Usually, yes. Google's help says you can open and edit your profile in the Google Maps app by tapping Business at the bottom right, and that certain features may differ between Search and Maps and your device's operating system. If you cannot find Posts in the app, use Google Search while signed in to the Google Account linked to your profile.",
    },
    {
      q: "Can I put the same post on several of my locations?",
      a: "Yes. When you select Post, Google lets you choose the other profiles you manage to share it on, or select Skip to post on one profile only.",
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
      title: "Google: Edit your Business Profile",
      url: "https://support.google.com/business/answer/14368911?hl=en",
      read: READ,
    },
  ],
  industries: ["restaurant", "cafe", "hair-salon", "auto-repair"],
  related: [
    "photos-for-google-business-profile",
    "how-to-set-holiday-hours-on-google",
    "google-business-description-examples",
  ],
  summary:
    "What a local business should put in Google posts, the three kinds (Update, Offer, Event), how often to post, how to create one and why Google may not approve it.",
};
