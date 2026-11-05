import { Callout, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { scheduledAt } from "./schedule";
import type { GuideDoc } from "./types";

// Guides 3, guide 20. Every claim about Google is from the sources below, read on 5 Nov 2026.
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "how-google-chooses-local-results",
  title: "How does Google choose which businesses to show nearby?",
  description:
    "What Google's own help says decides local results on Maps and Search: relevance, distance and popularity, and the parts of your profile you control.",
  publishAt: scheduledAt(19),
  updated: READ,
  checked: READ,
  topic: "Local results",
  answer:
    "Google's help says local results are mainly based on relevance, distance, and popularity, which it explains as how well your profile matches the search, how far you are from the person searching, and how well known your business is. Google also says there is no way to request or pay for a better local ranking, and that it keeps the details of its search algorithm confidential.",
  inShort: [
    "Relevance: how well your Business Profile matches what someone is searching for.",
    "Distance: how far each business is from the customer who is searching.",
    "Popularity: in Google's words, \"how well-known a business is\", including links to it and its reviews.",
    "Nobody outside Google can tell you exactly how these are weighed, or promise a position.",
  ],
  sections: [
    {
      id: "three-factors",
      heading: "What does Google say decides local results?",
      answer:
        "Google's page on local ranking says, in its own words: \"Local results are mainly based on relevance, distance, and popularity. Together, these factors help Google find the best match for customers' searches.\" It then explains relevance, distance and popularity one by one.",
      body: (
        <>
          <p>
            Google describes local results as what a customer finds on Google Maps and Search when
            they look for a business or place near their location, for example "Italian restaurant"
            on their phone. Google says it tries to show customers the kind of nearby business they
            would like to visit.
          </p>
          <Callout kind="warn" title="No one can sell you a position">
            Google says: "There's no way to request or pay for a better local ranking on Google." It
            also says it keeps the search algorithm details confidential to make the ranking system as
            fair as possible for everyone. Anyone who promises you first place is promising something
            Google says is not for sale.
          </Callout>
        </>
      ),
    },
    {
      id: "relevance",
      heading: "What does relevance mean for my profile?",
      answer:
        "Google says relevance is how well a Business Profile matches what someone is searching for, and that to help Google understand your business and match it to relevant searches you should provide complete and detailed business information. In practice that means a profile that says plainly what you are, where you are and when you are open.",
      body: (
        <>
          <p>Google's page lists the information to keep complete:</p>
          <ul>
            <li>Your full address, if customers can visit your business.</li>
            <li>Your business hours, including special hours.</li>
            <li>What kind of business you are, which is your category.</li>
            <li>Other details, such as parking or Wi-Fi.</li>
          </ul>
          <p>
            Google gives an example on its page about where profile information comes from: a hair
            salon might appear for people who search "salons near me" or "salons open now" because
            the owner provided information that includes the address and hours. Choosing the right
            main category is covered in{" "}
            <GuideLink slug="choose-google-business-profile-categories">
              how to choose your Google Business Profile categories
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "distance",
      heading: "Why do I come up from my shop but not from down the road?",
      answer:
        "Because distance is one of the three factors. Google says distance is how far each business is from the customer who is searching, and that if a customer does not share where they are, Google uses what it knows about their location. Where the customer is matters, so the same search made from different places can show different businesses.",
      body: (
        <>
          <p>
            A search you make standing in your own shop is close to your business by definition, so
            it tells you little about what a customer a few streets away sees. To get a fairer idea,
            search for your trade, such as "barber" or "cafe", on a phone in a private window from a
            few places your customers live or work.
          </p>
          <p>
            You cannot change how far you are from a customer. You can make sure Google has your
            location right: the correct address, or the correct service area if you travel to
            customers, and the map marker on your real entrance.
          </p>
        </>
      ),
    },
    {
      id: "popularity",
      heading: "What makes a business popular, in Google's words?",
      answer:
        "For popularity, Google speaks of \"how well-known a business is\", and says prominent places are more likely to show up in search results. Google says this is also based on information like how many websites link to your business and how many reviews you have, and that more reviews and positive ratings can help your business's local ranking.",
      body: (
        <>
          <p>
            Reviews have to be real. Google says reviews must reflect a genuine experience, and that
            offering incentives, like free or discounted goods or services, for posting, changing or
            removing reviews is fake and misleading content and is strictly prohibited. Google
            suggests reminding customers with a Google link or a QR code.
          </p>
          <p>
            Ask every customer the same way, after a real visit: no reward, no asking only the people
            you expect to be happy, no targets per member of staff. How to do that well is in{" "}
            <GuideLink slug="how-to-ask-for-google-reviews">
              how to ask customers for Google reviews the right way
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "what-google-suggests",
      heading: "What does Google suggest I do on my profile?",
      answer:
        "Google's page lists a short set of steps: verify your business, keep your information complete and up to date, respond to reviews, and add photos and videos. Retail stores in eligible countries or regions can also show their in-store products.",
      body: (
        <>
          <Steps
            items={[
              "Verify your business. Google says this tells Google you are authorised to represent the business, so it is more likely to show up in search results.",
              "Keep your information up to date. Google says businesses with complete and accurate information are more likely to show up in local search results, and that a profile with wrong information might not show up for relevant searches in your area.",
              "Respond to reviews. Google says replying shows you value feedback, and that positive reviews and helpful replies can help your business stand out.",
              "Add photos and videos that show what you offer.",
            ]}
          />
          <p>
            Google does not give a number of photos, posts or replies that changes your position, so
            treat any such number you read elsewhere with care.
          </p>
        </>
      ),
    },
    {
      id: "where-info-comes-from",
      heading: "Does Google only use what I put on my profile?",
      answer:
        "No. Google says the information in profiles is compiled from several sources: publicly available information such as a business's official website, licensed data from third parties, people who contribute facts, photos and reviews (including owners who claim profiles), and Google's own interactions with a local place or business.",
      body: (
        <p>
          That is why a detail you never typed, such as a menu link or a customer's photo, can appear
          on your profile, and why your hours and address should match on your website and elsewhere.
          Google says that if you think a profile is wrong you can suggest an edit. Keeping your
          details the same everywhere is covered in{" "}
          <GuideLink slug="keep-your-hours-and-details-the-same-everywhere">
            keep your hours and details the same everywhere
          </GuideLink>
          .
        </p>
      ),
    },
    {
      id: "uk-uae",
      heading: "Is it different in the UK or the UAE?",
      answer:
        "No. Google's page on local ranking gives the same factors and the same advice for every country, and does not describe anything specific to the UK or the UAE. The one exception on the page is in-store products, which Google says are only for retail businesses in eligible countries or regions.",
      body: (
        <p>
          What can differ is how customers word a search: in the UK some add a town or a postcode, and in
          the UAE some add an area such as Jumeirah or Al Barsha. Make sure the address or area on your
          profile is written the way your customers know it.
        </p>
      ),
    },
  ],
  kabsi: {
    heading: "What Kabsi does here",
    body: (
      <>
        <p>
          Kabsi promises no rankings, and does not claim to know what Google's ranking rewards beyond
          what Google's own page says. It takes care of the parts you control: a reply ready for every
          review, complete and accurate details, opening hours kept right, photos and posts you
          approve, and an easy way for every customer to leave a review. Nothing goes to Google
          without your yes.
        </p>
        <p>
          The free check needs no Google access. Its nearby part searches Google Maps from places
          around your business, like a customer standing there, and shows where you came up, labelled
          "Sample Google Maps results, not customer counts." <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Will adding words like 'best' or my area to my business name help?",
      a: "Do not do it. Google's guidelines say your name should be your real-world name, and that including unnecessary information in your business name is not permitted and could result in the suspension of your Business Profile.",
    },
    {
      q: "Why does a business further away come up above me?",
      a: "Google says results are mainly based on relevance, distance and popularity together, so a business further away can still be shown first for a search. Google keeps the details confidential, so nobody outside Google can tell you exactly why for one search.",
    },
  ],
  sources: [
    {
      title: "Google: Tips to improve your local ranking on Google",
      url: "https://support.google.com/business/answer/7091?hl=en",
      read: READ,
    },
    {
      title:
        "Google: Understand how Google sources & uses info in Business Profiles & local search results",
      url: "https://support.google.com/business/answer/2721884?hl=en",
      read: READ,
    },
    {
      title: "Google: Tips to get more reviews",
      url: "https://support.google.com/business/answer/3474122?hl=en",
      read: READ,
    },
    {
      title: "Google: Guidelines for representing your business on Google",
      url: "https://support.google.com/business/answer/3038177?hl=en",
      read: READ,
    },
  ],
  industries: ["hair-salon", "barbershop", "restaurant", "cafe"],
  related: [
    "why-is-my-business-not-on-google-maps",
    "choose-google-business-profile-categories",
    "how-to-ask-for-google-reviews",
  ],
  summary:
    "How Google picks local results, from Google's own help: relevance, distance and popularity, no paid ranking, and the profile details an owner controls.",
};
