import { Callout, DoDont, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { PUBLISH_ALL_AT } from "./schedule";
import type { GuideDoc } from "./types";

// Guides 3, guide 6. Every claim about Google is from the sources below, read on 5 Nov 2026.
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "choose-google-business-profile-categories",
  title: "How do I choose my Google Business Profile categories?",
  description:
    "How to pick the primary category and the additional ones on your Google profile, what Google's rules say not to do, and how to change them safely.",
  publishAt: PUBLISH_ALL_AT,
  updated: READ,
  checked: READ,
  topic: "Categories",
  answer:
    "Pick the one most specific category from Google's list that says what your business is, and make it your primary category. Then add only the few extra categories that describe other parts of the same business, because Google asks you to use as few categories as possible.",
  inShort: [
    "The category in the first field is your primary category.",
    "Choose categories that complete the sentence 'This business IS a', not 'this business HAS a'.",
    "You can add up to 9 more categories, but Google asks for the fewest that describe your core business.",
    "Changing a category can make Google ask you to verify your business again.",
  ],
  sections: [
    {
      id: "primary",
      heading: "What is the primary category, and why does it matter?",
      answer:
        "It is the main category of your business, the one in the first category field. Google says your categories tell customers what your business does.",
      body: (
        <>
          <p>
            Google gives an example: if your primary category is "Pizza restaurant", it might show
            your business when someone searches for Restaurants, Italian Restaurants or Pizza.
            Google also says that, based on your business type, your categories might be used to
            give your business a label on its profile.
          </p>
          <p>
            Nobody outside Google can promise a position. More on that in{" "}
            <GuideLink slug="how-google-chooses-local-results">
              how Google chooses which businesses to show nearby
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "pick-primary",
      heading: "How do I pick the right primary category?",
      answer:
        "Choose the most specific category on Google's list that describes your business as a whole. Google's own example is to choose 'Nail salon' instead of 'Salon', and to pick a more general category only when no specific one fits.",
      body: (
        <>
          <ul>
            <li>
              <b>Use the sentence test.</b> Google says to choose categories that complete the
              statement "This business IS a" rather than "this business HAS a".
            </li>
            <li>
              <b>Choose from the list.</b> Type a few words and pick from the list that shows up.
              Google says you cannot create your own category.
            </li>
            <li>
              <b>Skip the general ones.</b> Google says that when you choose a specific category, it
              includes the more general ones behind the scenes, so you can leave out a category that
              seems redundant with a more specific one.
            </li>
            <li>
              <b>Describe the core business.</b> Google's examples include a gym chain whose correct
              category is "Health club", not "Gym" plus "Swimming pool", and a fast food burger
              restaurant whose correct category is "Fast food restaurant".
            </li>
          </ul>
          <Callout kind="tip" title="Ask what customers would call you">
            If a customer would describe you as a barber, a bakery or a physiotherapy clinic, look
            for that on Google's list first. Then check the specific choices under it before you
            settle on a general one.
          </Callout>
        </>
      ),
    },
    {
      id: "how-many",
      heading: "How many additional categories should I add?",
      answer:
        "Only as many as it takes to describe your core business. Google allows up to 9 categories after the primary one, but its guidelines say to choose the fewest number of categories it takes, and not to add a category for every product or service.",
      body: (
        <>
          <p>
            Additional categories are for real departments or services that are part of your own
            business. Google's example is a grocery store with a bakery and a deli: "Grocery store"
            as the primary category, then "Bakery" and "Deli" as additional ones.
          </p>
          <p>
            Your full list of services belongs in the services or menu editor, not in categories.
            See{" "}
            <GuideLink slug="add-services-and-prices-to-google">
              how to add services and prices to your Google Business Profile
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "what-not-to-do",
      heading: "What should I not use categories for?",
      answer:
        "Google says not to use categories only as keywords or to describe features of your business, and not to use categories that belong to other businesses nearby or related to yours. A business inside your premises that you do not own and run needs its own profile.",
      body: (
        <>
          <DoDont
            yesTitle="Do"
            noTitle="Do not"
            yes={[
              "Pick the most specific category for what your business is.",
              "Add a category for a real part of your own business.",
              "Choose a more general category when no specific one fits.",
            ]}
            no={[
              "Add categories as keywords to come up in more searches.",
              "Use a category for a feature, such as having a pool or Wi-Fi.",
              "Add the category of a separate business inside yours, or the one you are inside.",
            ]}
          />
          <p>
            Google's example: a health club with an independently run cafe should not add "Cafe".
            The cafe should have its own profile with "Cafe" as its primary category.
          </p>
        </>
      ),
    },
    {
      id: "change",
      heading: "How do I add or change my categories?",
      answer:
        "Sign in to the Google Account linked to your profile, open Edit profile and select Edit next to Business category. Google warns that adding or editing a category might mean you are asked to verify your business again.",
      body: (
        <>
          <Steps
            items={[
              "Go to your Business Profile.",
              <>
                Select <b>Edit profile</b>. Next to Business category, select <b>Edit</b>.
              </>,
              "In the Primary category box, type a category and select it from the list.",
              <>
                For an additional category, select <b>Add another category</b>, type it and select
                it from the list. To take one off, select <b>Remove</b> next to it.
              </>,
              <>
                Select <b>Save</b>.
              </>,
            ]}
          />
          <Callout kind="warn" title="Make one careful change">
            Google says it reviews your changes before they go live, and that a category change
            might lead to a new verification. Decide on the right category first, change it once,
            and do not change your business name or address at the same time.
          </Callout>
          <p>
            If you run several locations of the same business, Google says all of them must share a
            primary category.
          </p>
        </>
      ),
    },
    {
      id: "features",
      heading: "Does my category change what I can add to my profile?",
      answer:
        "Yes. Google says some features depend on your category: restaurants can add links for online orders, reservations and menus, and health and beauty businesses can add a booking button and update their list of services.",
      body: (
        <p>
          So if an option you expect is missing from your profile, check your primary category
          first. Google also says it can detect category information from your website and from
          mentions of your business around the web, so describe your business the same way on your
          website as on your profile.
        </p>
      ),
    },
    {
      id: "uk-uae",
      heading: "Are the category rules different in the UK and the UAE?",
      answer:
        "Google's pages here name no separate rule for the UK or the UAE on categories or the steps to change one. You pick from Google's own list in either country and cannot add a category of your own.",
      body: (
        <p>
          What can differ is the words customers use for the same kind of business, such as
          hairdresser, salon or barber. Pick the category on Google's list that matches what you
          are, and use your business description for the words customers use. See{" "}
          <GuideLink slug="google-business-description-examples">
            what to write in your Google business description
          </GuideLink>
          .
        </p>
      ),
    },
  ],
  kabsi: {
    heading: "What Kabsi does and does not do here",
    body: (
      <>
        <p>
          Profile Coach lists what your Google profile is missing, including more categories, with a
          plain reason for each. On Pro, Kabsi can suggest up to three extra categories that belong
          with your main one; you choose them and approve before anything reaches Google, and Google
          gets one such change a week. Kabsi never changes your main category, and only the
          signed-in owner can change categories at all.
        </p>
        <p>
          Google Protection watches your main category and tells you if Google shows something
          different from what you confirmed, and Kabsi warns that changing it can make Google ask
          you to verify again. A check that compares your categories with nearby businesses is
          coming, not live yet. <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Can I change my primary category to try a different one?",
      a: "You can, but Google says a category change might mean you have to verify your business again. Change it only when the new category describes your business better.",
    },
    {
      q: "Why did my category change on its own?",
      a: "Google says it gathers information from other sources, like user reports, and may update your profile. Information Google changed shows in blue in the profile editor.",
    },
  ],
  sources: [
    {
      title: "Google: Manage your business category",
      url: "https://support.google.com/business/answer/7249669?hl=en",
      read: READ,
    },
    {
      title: "Google: Guidelines for representing your business on Google",
      url: "https://support.google.com/business/answer/3038177?hl=en",
      read: READ,
    },
    {
      title: "Google: Edit your Business Profile",
      url: "https://support.google.com/business/answer/3039617?hl=en",
      read: READ,
    },
    {
      title: "Google: Understand Google updates on your Business Profile",
      url: "https://support.google.com/business/answer/3480441?hl=en",
      read: READ,
    },
  ],
  industries: ["hair-salon", "barbershop", "nail-salon", "restaurant"],
  related: [
    "google-business-description-examples",
    "add-services-and-prices-to-google",
    "how-google-chooses-local-results",
  ],
  summary:
    "How to choose a Google Business Profile primary category and additional categories under Google's guidelines, what not to do, and how to change them without surprises.",
};
