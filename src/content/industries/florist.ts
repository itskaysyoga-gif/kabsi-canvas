import { MORE_PHOTOS } from "@/components/kabsi/photos-more";
import type { Industry } from "./types";

// Industries 2 (5 Nov 2026, master plan 30.32): the florist page, written for its own trade. Every Google sentence has
// its row in docs/claims/florist.md; the Kabsi sentences follow knowledge/kabsi-facts.md. Bloom and Twine, Bristol, and
// every person and number here are invented (Example).
export const florist: Industry = {
  slug: "florist",
  name: "florist",
  plural: "Florists",
  finished: true,
  lead: "Seasonal flowers as posts, the phone and busy season hours right, and replies for every review. You approve each one.",
  keyword: "florist",
  example: {
    business: "Bloom and Twine",
    city: "Bristol",
    kind: "shop",
    rival: "Petal Post",
    rival2: "The Stem Room",
    near: ["By the old town", "Near the station"],
  },
  photos: [MORE_PHOTOS.floristWide, MORE_PHOTOS.floristTall],
  searches: [
    "florist near me",
    "flower delivery",
    "same day flowers",
    "wedding flowers",
    "funeral flowers",
    "flower shop",
  ],
  categories: {
    primary: "Florist",
    more: [],
    note: "Choose the category that matches most of your work, and read the names in your own profile, because they can differ by country. Say in your description and posts if you deliver.",
  },
  page: {
    query: "florist Google Business Profile",
    title: "Florist Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your florist Google Business Profile: the phone and busy season hours right, arrangements as posts, and warm replies for your yes.",
    h1: "Your flower shop on Google, in full bloom.",
    mark: "in full bloom.",
    line: "Kabsi looks after your florist Google Business Profile: the right phone, busy season hours, arrangements as posts.",
    card: "The right phone, arrangements as posts.",
    answer:
      "Orders come by phone, so a florist Google Business Profile has to show the right number. Kabsi checks your phone and hours every day, asks about public holiday hours in time, sets busy day hours you give it, turns a photo of an arrangement into a post, and drafts a warm reply for a celebration and a gentle one for a sympathy order. You approve each one.",
    watch: {
      business: "Bloom and Twine, Bristol",
      line: "Flower orders often start with a call. Kabsi checks the phone Google shows against yours every day.",
      fields: ["Phone", "Opening hours", "Special hours", "Website", "Address"],
      what: "Phone",
      google: "An old number",
      owner: "Your shop's number",
      message: "Google shows a phone number that is not the one you gave me.",
    },
    post: {
      owner: "First ranunculus of spring, in the window today.",
      quote: "The first ranunculus of spring are in the window today. Call to order a bunch.",
    },
    jobs: [
      {
        title: "The right phone number",
        text: "Checked every day, because orders start with a call.",
      },
      {
        title: "Busy day hours",
        text: "Kabsi asks before public holidays, and sets the hours you give it for Valentine's Day.",
      },
      {
        title: "Gentle replies",
        text: "Warm for a wedding, gentle for a funeral, never adding what the customer did not say.",
      },
    ],
    nearby: { kind: "shop", term: "florist" },
    ai: {
      question: "Which florist in Clifton, Bristol does same day bouquets?",
      answer: "Bloom and Twine in Clifton makes same day bouquets when you order by 1 pm.",
      sources: ["Bloom and Twine's Google profile", "Bloom and Twine's website"],
    },
    related: ["bakery", "cafe"],
    searchText:
      "People search for the moment, same day flowers, a wedding or a funeral, then check whether you deliver, what your arrangements look like and how you treated customers at a hard time.",
    guide: [
      {
        title: "The phone, the busy days and the photos",
        paras: [
          "When orders come by phone, the number on Google has to be yours. Kabsi compares your phone, hours and website on Google with what you confirmed, every day, and asks when they differ.",
          "Busy days have their own hours. Before each public holiday Kabsi asks what you will do and sets special hours once you say yes, and you can add a late night before a busy day the same way. A photo of an arrangement with one line becomes a post for your yes.",
        ],
      },
      {
        title: "Replies for happy days and hard ones",
        paras: [
          "Reviews after a wedding or a birthday can get a warm reply that thanks the customer for the occasion they named. Kabsi never adds details the customer did not share.",
          "Reviews after a funeral need a gentle reply. Kabsi keeps it short and kind, adds nothing the customer did not share, and waits for your yes.",
        ],
      },
    ],
  },
  faqs: [
    {
      q: "Can Kabsi set our Valentine's Day hours?",
      a: "Yes. Tell Kabsi the hours, and it sets them as special hours once you say yes. Before public holidays, Kabsi asks you first.",
    },
    {
      q: "How does Kabsi reply to a review after a funeral?",
      a: "Gently and briefly. The draft thanks the customer, adds nothing they did not share, and waits for your yes.",
    },
    {
      q: "Will Kabsi post our arrangements?",
      a: "Yes, photos you send and approve. Kabsi checks each photo is sharp and well lit first.",
    },
    {
      q: "Does Kabsi take flower orders?",
      a: "No. Kabsi works only with your Google profile. Orders stay with you.",
    },
    {
      q: "Can my shop manager approve posts?",
      a: "On Pro, yes. You choose who can approve replies and posts, and you still see everything.",
    },
  ],
  guides: ["how-to-reply-to-google-reviews", "google-review-link-and-qr-code"],
};
