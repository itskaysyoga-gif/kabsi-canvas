import { MORE_PHOTOS } from "@/components/kabsi/photos-more";
import type { Industry } from "./types";

// Industries 2 (5 Nov 2026, master plan 30.32): the car wash page, written for its own trade. Every Google sentence has
// its row in docs/claims/car-wash.md; the Kabsi sentences follow knowledge/kabsi-facts.md. Shine Bay Car Wash, Dubai, and
// every person and number here are invented (Example).
export const carWash: Industry = {
  slug: "car-wash",
  name: "car wash",
  plural: "Car washes and detailing",
  finished: true,
  lead: "Your open status and hours right, before and after shots as posts and calm replies to every review. You approve each one.",
  keyword: "car wash",
  example: {
    business: "Shine Bay Car Wash",
    city: "Dubai",
    kind: "car wash",
    rival: "Gloss Garage",
    rival2: "Bubble Bay Wash",
    near: ["By the mall", "Near the metro"],
  },
  photos: [MORE_PHOTOS.carWashWide, MORE_PHOTOS.carWashTall],
  searches: [
    "car wash near me",
    "car detailing",
    "hand car wash",
    "ceramic coating",
    "interior car cleaning",
    "mobile car wash",
  ],
  categories: {
    primary: "Car wash",
    more: ["Car detailing service"],
    note: "Add detailing as a second category only if you do it. Read the names in your own profile, because they can differ by country.",
  },
  page: {
    query: "car wash Google Business Profile",
    title: "Car wash Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your car wash Google Business Profile: open status and hours checked daily, detailing work as posts, and calm replies for your yes.",
    h1: "Your car wash on Google, spotless.",
    mark: "spotless.",
    line: "Kabsi looks after your car wash Google Business Profile: open status and hours right, detailing work as posts.",
    card: "Open status right, detailing work as posts.",
    answer:
      "A car wash Google Business Profile has to show the right hours and that you are open. Kabsi checks your open status and hours every day, turns a photo of a finished car into a post, drafts a calm reply to every review, including one about a scratch, and asks about holiday hours in time. You approve each one.",
    watch: {
      business: "Shine Bay Car Wash, Dubai",
      line: "Your open status and hours tell drivers you are there. Kabsi checks them every day.",
      fields: ["Open status", "Opening hours", "Special hours", "Address", "Phone"],
      what: "Open status",
      google: "Permanently closed",
      owner: "Open",
      message: "Google shows you as permanently closed. You told me you are open.",
    },
    post: {
      owner: "Full interior detail on a family SUV, sand gone.",
      quote:
        "Full interior detail on a family SUV: seats, mats and every grain of sand. Book a slot today.",
    },
    jobs: [
      {
        title: "Open status and hours",
        text: "Checked every day. When Google shows something else, you choose.",
      },
      {
        title: "Your best work, as posts",
        text: "A photo of a finished car and one line become a post for your yes.",
      },
      {
        title: "Calm replies about damage",
        text: "A review about a scratch gets a calm draft with no argument, for your yes.",
      },
    ],
    nearby: { kind: "car wash", term: "car wash" },
    ai: {
      question: "Which car wash in Dubai Marina does interior detailing on Fridays?",
      answer:
        "Shine Bay Car Wash near Dubai Marina Mall does full interior detailing and is open on Fridays from 8 am.",
      sources: ["Shine Bay Car Wash's Google profile", "Shine Bay Car Wash's website"],
    },
    related: ["auto-repair", "pet-grooming"],
    searchText:
      "Drivers search for a wash near them or for the job itself, detailing, a ceramic coat or an interior clean, then check the hours and the photos.",
    guide: [
      {
        title: "Open now, and what you do",
        paras: [
          "Keep your hours and open status right. Kabsi compares them with what you confirmed every day, and asks before each public holiday what you will do. If you also come to customers, Google lets you set the areas you cover.",
          "A photo of a finished car shows the work better than any words. Send it on WhatsApp with a line, and Kabsi prepares a post with it for your yes, after checking the photo is sharp and well lit.",
        ],
      },
      {
        title: "Reviews about a scratch or a wait",
        paras: [
          "A review may be about the shine or the wait. A thank you reply can be short; a review about a long wait gets an apology once, with no promise you cannot keep.",
          "A review that says the car was damaged gets a calm draft that asks the customer to get in touch through the details on your profile. It never argues, admits fault or promises a refund, and it waits for your yes.",
        ],
      },
    ],
  },
  faqs: [
    {
      q: "What does Kabsi say to a review about a scratch?",
      a: "It drafts a calm reply that asks the customer to get in touch. It never argues, admits fault or promises a refund, and it waits for you.",
    },
    {
      q: "Will Kabsi post our prices?",
      a: "Only prices you give it, in a post you approve. Kabsi never invents a price or an offer.",
    },
    {
      q: "Google says we are closed. What can I do?",
      a: "When your open status on Google differs from what you confirmed, Kabsi asks you which is right. Nothing changes without your yes.",
    },
    {
      q: "We also wash cars at customers' homes. Can Google show that?",
      a: "Google lets a business that travels to customers set a service area. Kabsi checks the area Google shows every day.",
    },
    {
      q: "Can my shift manager approve replies?",
      a: "On Pro, yes. You choose who can approve replies and posts, and you still see everything.",
    },
  ],
  guides: ["keep-your-hours-and-details-the-same-everywhere", "how-to-reply-to-google-reviews"],
};
