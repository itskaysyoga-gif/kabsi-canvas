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
  // Industries 3 (master plan 30.33 item 2): every block is a short card. Each line keeps a fact of
  // docs/claims/pet-grooming.md, whose "Industries 3" section maps it to its row.
  profile: [
    {
      title: "The best photo you have",
      text: "A clean, happy dog, sent with one line, becomes a post for your yes.",
    },
    {
      title: "If you travel to customers",
      text: "Set a service area on Google, and hide an address customers cannot visit.",
    },
    {
      title: "A review about a shaved coat",
      text: "A careful draft that admits nothing and asks the owner to get in touch.",
    },
    {
      title: "A nick or an injury",
      text: "No draft, a short checklist, and a neutral holding reply only if you ask.",
    },
  ],
  categories: {
    primary: "Pet groomer",
    more: [],
    line: "Choose the category that matches what most of your work is.",
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
      "On a pet groomer Google Business Profile, photos and reviews come first. Kabsi turns fresh trims into posts and drafts warm replies for your yes.",
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
    related: ["veterinary-clinic", "barbershop", "hair-salon", "nail-salon", "car-wash", "florist"],
  },
  faqs: [
    {
      q: "I come to the customer's home. What does my profile show?",
      a: "Google lets a business that travels to customers set a service area and hide its address. Kabsi checks the area Google shows every day.",
    },
    {
      q: "What does Kabsi say to a review about a nick?",
      a: "An injury is a safety matter: no draft and a short checklist. Kabsi writes a neutral holding reply only if you ask.",
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
  guides: [
    "google-posts-for-local-businesses",
    "keep-your-hours-and-details-the-same-everywhere",
    "how-to-respond-to-negative-google-reviews",
  ],
};
