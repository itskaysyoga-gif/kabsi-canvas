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
  // Industries 3 (master plan 30.33 item 2): every block is a short card. Each line keeps a fact of docs/claims/car-wash.md,
  // whose "Industries 3" section maps it to its row.
  profile: [
    {
      title: "Hours and open status, right",
      text: "Kabsi compares them with what you confirmed every day, and asks before public holidays.",
    },
    {
      title: "If you also come to customers",
      text: "Google lets you set the areas you cover, alongside your address.",
    },
    {
      title: "A finished car, as a post",
      text: "Kabsi checks your photo is sharp, then prepares a post for your yes.",
    },
    {
      title: "Reviews about a scratch or wait",
      text: "A wait gets one apology. Damage gets a calm draft, no argument, no refund promised.",
    },
  ],
  categories: {
    primary: "Car wash",
    more: ["Car detailing service"],
    line: "Add detailing as a second category only if you do it. Read the names in your own profile, because they can differ by country.",
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
      "A car wash Google Business Profile must show you are open. Kabsi checks that daily, and drafts posts and calm replies for your yes.",
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
    related: ["auto-repair", "pet-grooming", "barbershop", "florist", "optician", "cafe"],
  },
  faqs: [
    {
      q: "What does Kabsi say to a review about a scratch?",
      a: "A calm draft asking the customer to get in touch. It never argues, admits fault or promises a refund, and waits for you.",
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
  guides: [
    "keep-your-hours-and-details-the-same-everywhere",
    "photos-for-google-business-profile",
    "how-to-respond-to-negative-google-reviews",
  ],
};
