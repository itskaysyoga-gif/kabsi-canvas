import { MORE_PHOTOS } from "@/components/kabsi/photos-more";
import type { Industry } from "./types";

// Industries 2 (5 Nov 2026, master plan 30.32): the pet grooming salon page, written for its own trade. Every Google sentence has
// its row in docs/claims/pet-grooming.md; the Kabsi sentences follow knowledge/kabsi-facts.md. Muddy Paws Grooming, Dubai, and
// every person and number here are invented (Example).
export const petGrooming: Industry = {
  slug: "pet-grooming",
  name: "pet grooming salon",
  plural: "Pet groomers",
  finished: true,
  lead: "Fresh trims as posts, the areas you cover right on Google and a warm reply for every review. You approve each one.",
  keyword: "pet groomer",
  example: {
    business: "Muddy Paws Grooming",
    city: "Dubai",
    kind: "salon",
    rival: "Fluff and Fold",
    rival2: "Pawfect Grooming",
    near: ["By the park", "Near the villas"],
  },
  photos: [MORE_PHOTOS.petGroomingWide, MORE_PHOTOS.petGroomingTall],
  searches: [
    "dog grooming near me",
    "pet groomer",
    "mobile dog grooming",
    "cat grooming",
    "puppy first groom",
    "dog bath and trim",
  ],
  categories: {
    primary: "Pet groomer",
    more: [],
    note: "Choose the category that matches what most of your work is. A groomer who travels to customers sets a service area on Google instead of showing an address customers cannot visit.",
  },
  page: {
    query: "pet groomer Google Business Profile",
    title: "Pet groomer Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your pet groomer Google Business Profile: service area and hours right, fresh trims as posts, and a warm reply to every review.",
    h1: "Your grooming salon on Google, freshly trimmed.",
    mark: "freshly trimmed.",
    line: "Kabsi looks after your pet groomer Google Business Profile: the areas you cover, fresh trims as posts, warm replies.",
    card: "Areas you cover right, fresh trims as posts.",
    answer:
      "A groomer is judged on photos and reviews. Kabsi looks after your pet groomer Google Business Profile: it turns a photo of a fresh trim into a post, checks your hours and the areas you cover every day, drafts a warm reply to every review, marks a hard one for more care, and asks about holiday hours in time. You approve each one.",
    watch: {
      business: "Muddy Paws Grooming, Dubai",
      line: "A mobile groomer lives by the areas it covers. Kabsi checks your service area and hours every day.",
      fields: ["Service area", "Opening hours", "Phone", "Website", "Special hours"],
      what: "Service area",
      google: "No area shown",
      owner: "Arabian Ranches, Al Barsha",
      message: "Google shows no service area for you. You told me Arabian Ranches and Al Barsha.",
    },
    post: {
      owner: "Teddy bear trim on Biscuit today. Weekend slots are open.",
      quote: "Biscuit's teddy bear trim, fresh this morning. Weekend slots are open.",
    },
    jobs: [
      {
        title: "Fresh trims, as posts",
        text: "A happy photo and one line become a post for your yes.",
      },
      {
        title: "The areas you cover",
        text: "Kabsi checks your service area and hours every day, and asks when they differ.",
      },
      {
        title: "Care with hard reviews",
        text: "A review about a nick or an injury gets no draft and a short checklist.",
      },
    ],
    nearby: { kind: "salon", term: "pet groomer" },
    ai: {
      question: "Which dog groomer in Al Barsha, Dubai comes to your home?",
      answer:
        "Muddy Paws Grooming covers Al Barsha and Arabian Ranches with a mobile van, seven days a week.",
      sources: ["Muddy Paws Grooming's Google profile", "Muddy Paws Grooming's website"],
    },
    related: ["veterinary-clinic", "car-wash"],
    searchText:
      "Owners search for the job, a bath and trim, a first groom for a puppy or a mobile groomer, then look at the photos and read how you treated other people's pets.",
    guide: [
      {
        title: "Photos and the areas you cover",
        paras: [
          "A clean, happy dog on the table is the best photo you have. A photo you send on WhatsApp with one line becomes a post for your yes, and Kabsi checks each photo before it reaches Google.",
          "If you travel to customers, Google lets you set a service area, the towns or districts you cover, and you can hide an address customers cannot visit. Kabsi checks the service area Google shows against the one you confirmed, every day, and asks when they differ.",
        ],
      },
      {
        title: "Replies about pets, warm and careful",
        paras: [
          "A thank you review gets a short, warm reply, with the pet's name when the review gives it. Kabsi uses only what the review and your own facts say.",
          "A review about a shaved coat gets a careful draft that asks the owner to get in touch through the details on your profile, admits nothing and waits for your yes. A review about a nick or an injury gets no draft: it comes to you marked as needing a little more care, with a short checklist and no draft. Kabsi writes a short, neutral holding reply only if you ask.",
        ],
      },
    ],
  },
  faqs: [
    {
      q: "I come to the customer's home. What does my profile show?",
      a: "Google lets a business that travels to customers set a service area and hide its address. Kabsi checks the area Google shows every day.",
    },
    {
      q: "What does Kabsi say to a review about a nick?",
      a: "An injury is a safety matter, so it comes to you marked as needing a little more care, with a short checklist and no draft. Kabsi writes a short, neutral holding reply only if you ask.",
    },
    {
      q: "Can Kabsi post photos of the pets I groom?",
      a: "Yes, photos you send and approve. Ask the owner first if you like.",
    },
    {
      q: "Can Kabsi set our Eid hours?",
      a: "Yes. Before each public holiday, Kabsi asks what you will do and sets special hours once you say yes.",
    },
    {
      q: "Does Kabsi take bookings?",
      a: "No. Kabsi works only with your Google profile. Your booking link and phone stay yours.",
    },
  ],
  guides: ["how-to-reply-to-google-reviews", "keep-your-hours-and-details-the-same-everywhere"],
};
