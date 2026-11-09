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
  // Industry 1 (R-144): the services this trade lists on Google (Example names, not a full list).
  services: [
    "Hand wash",
    "Valet",
    "Interior clean",
    "Full detail",
    "Ceramic coating",
    "Engine bay clean",
  ],
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
      title: "Each wash with a price",
      text: "Google can show a service with a price. Keep prices out of custom names.",
    },
    {
      title: "How drivers can pay",
      text: "Card, cash or an app: say it plainly in your description.",
    },
  ],
  categories: {
    primary: "Car wash",
    more: ["Car detailing service"],
    line: "Add detailing as a second category only if you do it. Read the names in your own profile, because they can differ by country.",
  },
  reviews: [
    {
      title: "A scratch after the wash",
      text: "A calm draft: no argument, no fault admitted, no refund promised.",
    },
    {
      title: "A long queue",
      text: "One apology for the wait, and nothing it cannot keep.",
    },
    {
      title: "A claim or a legal threat",
      text: "No draft: a legal threat comes to you with a checklist.",
    },
  ],
  holidays: [
    {
      title: "National Day weekend",
      text: "Kabsi asks five days before 2 and 3 December what your hours are.",
    },
    {
      title: "Eid al-Fitr",
      text: "1 to 3 Shawwal, by the moon. Say which days you open.",
    },
    {
      title: "Washing after iftar",
      text: "Later Ramadan hours become special hours once you say yes.",
    },
  ],
  photoCards: [
    {
      title: "A finished car, as a post",
      text: "Kabsi checks your photo is sharp, then prepares a post for your yes.",
    },
    {
      title: "The bay from the road",
      text: "Show the entrance and the queue lane, so drivers know where to turn.",
    },
    {
      title: "Interior detail, close",
      text: "Seats and dashboard after a valet, in good light.",
    },
  ],
  posts: [
    {
      title: "Wash prices this month",
      text: "Your price list, posted exactly as you send it.",
    },
    {
      title: "Open late in summer",
      text: "The evening hours you keep, as a post.",
    },
    {
      title: "A detailing package",
      text: "An offer post with what it includes and an end date.",
    },
  ],
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
        text: "Read daily. If Google differs, you pick which stays.",
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
      a: "Yes, the prices you send, exactly as written, in a post you approve.",
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
      q: "Where does the review card go at a car wash?",
      a: "Where customers pay or collect their keys, offered to everyone the same way.",
    },
  ],
  guides: [
    "keep-your-hours-and-details-the-same-everywhere",
    "photos-for-google-business-profile",
    "how-to-respond-to-negative-google-reviews",
  ],
};
