import { Callout, DoDont, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { scheduledAt } from "./schedule";
import type { GuideDoc } from "./types";

// Guides 3, guide 7. Every claim about Google is from the sources below, read on 5 Nov 2026. The four example
// descriptions are for invented businesses, each under Google's 750 character limit (counts in the headings).
const READ = "2026-11-05";

const SALON =
  "Fern and Thread is an independent hair salon in Leeds city centre, open since 2015. Our five stylists cut, colour and style every hair type and length, with a focus on soft, low-upkeep colour, balayage and curly cuts. Every appointment starts with a short consultation, and we will tell you honestly if a look will not suit your hair. We use vegan colour ranges and recycle our foils and colour tubes. The salon is on the ground floor with step-free access, and we cut children's hair on weekday afternoons. New to colour with us? Ask for a patch test before your first colour appointment.";

const CAFE =
  "Saltbush Coffee is a neighbourhood cafe in Al Barsha, Dubai, serving specialty coffee and fresh bakes since 2019. We roast our beans in small batches every week and serve them as espresso, pour over and cold brew. Breakfast is served all day, with eggs, sourdough toast and a daily vegetarian dish, and our pastries are baked here every morning. Inside there are 30 seats and a quiet corner for working on a laptop, with a few outdoor tables in the cooler months. Families are welcome and high chairs are available. We offer oat, almond and soy milk, and decaf all day.";

const GARAGE =
  "Harbourside Motors is a family-run garage in Bedminster, Bristol, servicing and repairing cars since 1998. Our technicians handle servicing, diagnostics, brakes, clutches, tyres and air conditioning for most makes, including hybrid cars. MOT tests are done on site. Before any work starts we explain what your car needs and why, and we show you the old parts if you ask. You can wait in our customer lounge or leave the car with us for the day.";

const PHYSIO =
  "Cedar Line Physiotherapy is a clinic in Khalifa City, Abu Dhabi, treating sports injuries, back and neck pain, and recovery after surgery. Each session is one to one in a private treatment room, and your first visit includes a full assessment and a plan you can follow at home. Our team includes male and female physiotherapists, and you can ask for either when you book. We see adults and teenagers, and we treat runners, footballers and padel players every week. The clinic has its own parking and a lift to the first floor.";

export const guide: GuideDoc = {
  slug: "google-business-description-examples",
  title: "What should I write in my Google business description?",
  description:
    "What Google allows in your Business Profile description, what to leave out, and four example descriptions for a salon, a cafe, a garage and a clinic.",
  publishAt: scheduledAt(6),
  updated: READ,
  checked: READ,
  topic: "Business description",
  answer:
    "Write a plain, honest paragraph of up to 750 characters about what you offer, what makes your business different, how long you have been open and anything else a customer would find useful. Leave out links, which Google does not allow, and do not make the description about promotions, prices or sales.",
  inShort: [
    "Your description shows in the From the business section of your Business Profile.",
    "Google's limit is 750 characters, with no URLs, HTML or links of any type.",
    "Google asks you to focus on your business, not on promotions, prices or sales.",
    "The four examples below are for invented businesses: change every detail to your own.",
  ],
  sections: [
    {
      id: "where-and-how-long",
      heading: "Where does my description show, and how long can it be?",
      answer:
        "Google says the business description shows in the From the business section of your Business Profile, and that it must not exceed 750 characters. That is room for one solid paragraph.",
      body: (
        <p>
          The description is the one place on your profile where you describe the business in your
          own words. Your name, address, hours, phone number, website and categories all have their
          own fields, so the description does not need to repeat them. Google's guidelines say to
          add details like your address, hours and category in those other sections, not in your
          name.
        </p>
      ),
    },
    {
      id: "what-to-include",
      heading: "What should I put in my description?",
      answer:
        "Google lists four things to include: what you offer, what makes you special, how long you have been in business, and anything else that is helpful for customers to know. Its guidelines add the services and products you offer, and the mission and history of your business.",
      body: (
        <>
          <ul>
            <li>
              <b>What you do</b>, in the words a customer would use: the main services or the kind
              of food, in a sentence or two.
            </li>
            <li>
              <b>What is different about you:</b> your speciality, how you work, who you suit.
            </li>
            <li>
              <b>How long you have been open</b>, if it is a while.
            </li>
            <li>
              <b>Useful facts</b> a customer checks before coming: step-free access, parking,
              children welcome, seating, languages spoken.
            </li>
            <li>
              <b>Seasonal opening</b>, if it applies: Google's guidelines say a seasonal business
              can say in its description that it is open only for a specific season.
            </li>
          </ul>
          <p>
            Google says to be upfront and honest and to focus on content that is relevant and useful
            to customers. Write only what is true today.
          </p>
        </>
      ),
    },
    {
      id: "not-allowed",
      heading: "What is not allowed in a Google business description?",
      answer:
        "Google's guidelines do not allow links of any type, URLs or HTML code, content focused on special promotions, prices or sales, and low-quality or irrelevant content such as misspellings, gimmicky character use or gibberish. Content with no clear connection to your business is not allowed either.",
      body: (
        <>
          <DoDont
            yesTitle="Write"
            noTitle="Leave out"
            yes={[
              "What you offer and who it is for.",
              "What makes your business different, in plain words.",
              "How long you have been open.",
              "Practical facts customers ask about.",
            ]}
            no={[
              "Any link or web address.",
              "A description that is mostly about prices, sales or offers.",
              "Gimmicky characters or symbols used for attention.",
              "Anything not about your business.",
              "Private or personal information about anyone.",
            ]}
          />
          <p>
            Google's own examples of content not allowed are "Everything on sale, -50%" and "Best
            bagels in town for $5". Google also says its prohibited and restricted content policies
            apply to the whole profile, and if an edit is rejected, its help lists the reasons
            content may be rejected.
          </p>
        </>
      ),
    },
    {
      id: "example-salon",
      heading: "What does a good description look like for a salon?",
      answer:
        "It says what the salon does, how it works with clients and what a first-time client needs to know, without prices or offers. The example below is for an invented salon in Leeds and is 589 characters long.",
      body: (
        <>
          <Callout kind="tip" title="Example: an invented hair salon in Leeds">
            {SALON}
          </Callout>
          <p>
            Notice what it does not do: no price list, no "book now and save", no web address. The
            services and their prices go in the services editor instead; see{" "}
            <GuideLink slug="add-services-and-prices-to-google">
              how to add services and prices to your Google Business Profile
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "example-cafe",
      heading: "What does a good description look like for a cafe or restaurant?",
      answer:
        "It tells a customer what is on offer, when it is served and what the place is like inside. The example below is for an invented cafe in Dubai and is 569 characters long.",
      body: (
        <>
          <Callout kind="tip" title="Example: an invented cafe in Al Barsha, Dubai">
            {CAFE}
          </Callout>
          <p>
            For a restaurant, Google says the menu editor keeps your menu items and prices accurate,
            so the dishes and prices belong there and the description can stay about the place.
          </p>
        </>
      ),
    },
    {
      id: "example-garage-clinic",
      heading: "What about a garage or a clinic?",
      answer:
        "The same rules apply: say what you fix or treat, how you work and the practical facts. The two examples below are for an invented garage in Bristol (444 characters) and an invented physiotherapy clinic in Abu Dhabi (526 characters).",
      body: (
        <>
          <Callout kind="tip" title="Example: an invented garage in Bristol">
            {GARAGE}
          </Callout>
          <Callout kind="tip" title="Example: an invented physiotherapy clinic in Abu Dhabi">
            {PHYSIO}
          </Callout>
          <p>
            A clinic should describe its treatments plainly and avoid promising results. Google says
            content must be honest and relevant to your business.
          </p>
        </>
      ),
    },
    {
      id: "keywords",
      heading: "Should I fill my description with keywords and area names?",
      answer:
        "No. Google says the description should be relevant and useful to customers, and does not allow gimmicky or distracting content. Name your area once, naturally, and use the words your customers use for what you do.",
      body: (
        <p>
          Write it for the person reading it, not for a search engine. Your categories are what tell
          Google what kind of business you are; see{" "}
          <GuideLink slug="choose-google-business-profile-categories">
            how to choose your Google Business Profile categories
          </GuideLink>
          .
        </p>
      ),
    },
    {
      id: "how-to-edit",
      heading: "How do I add or change my description?",
      answer:
        "Sign in to the Google Account linked to your profile, open Edit profile, write your description in the business description field and save. Google says it reviews changes before they show on your profile.",
      body: (
        <>
          <Steps
            items={[
              "Go to your Business Profile on Google Search, or tap Business at the bottom right of the Google Maps app.",
              <>
                Select <b>Edit profile</b>.
              </>,
              "Find the business description and type or paste your text, up to 750 characters.",
              <>
                Select <b>Save</b>.
              </>,
            ]}
          />
          <p>
            Google says AI can help you write a description, but that this is available only in
            select regions and languages. Whoever writes it, read it before you save it: every fact
            in it should be true.
          </p>
          <p>
            Google's pages here name no separate rule for the UK or the UAE. Google's page does not
            set a language for the description, so write it in the language most of your customers
            use when they search.
          </p>
        </>
      ),
    },
  ],
  kabsi: {
    heading: "What Kabsi does here",
    body: (
      <>
        <p>
          Profile Coach, on Essentials and Pro, lists the description among the things a complete
          Google profile has, and shows what yours is missing. On Pro, Kabsi will write a draft
          description of up to 750 characters from the facts you confirmed, with no links, offers or
          contact details, once its AI credit is switched on. Until then the screen says so and
          nothing is written.
        </p>
        <p>
          Nothing reaches Google without your approval, and Kabsi never suggests keywords for your
          business name. Until Kabsi is connected to Google, these profile items show as not checked
          yet. <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Can I put my phone number or email in the description?",
      a: "Your phone number and website have their own fields on your profile, so there is no need. Google's description rules do not allow links of any type.",
    },
    {
      q: "Can I mention an offer for new customers?",
      a: "Not in the description. Google asks you to focus on details about your business instead of promotions, prices or sales, and gives sale and price lines as examples of content that is not allowed.",
    },
  ],
  sources: [
    {
      title: "Google: Edit your Business Profile",
      url: "https://support.google.com/business/answer/3039617?hl=en",
      read: READ,
    },
    {
      title: "Google: Guidelines for representing your business on Google",
      url: "https://support.google.com/business/answer/3038177?hl=en",
      read: READ,
    },
  ],
  industries: ["hair-salon", "cafe", "auto-repair", "physiotherapy"],
  related: [
    "choose-google-business-profile-categories",
    "add-services-and-prices-to-google",
    "photos-for-google-business-profile",
  ],
  summary:
    "What to write in a Google Business Profile description under Google's rules (750 characters, no links, no prices or promotions), with four example descriptions for invented businesses.",
};
