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
  // Industries 3 (master plan 30.33 item 2): every block is a short card. Each line keeps a fact of docs/claims/florist.md,
  // whose "Industries 3" section maps it to its row.
  // Industry 1 (R-144): the services this trade lists on Google (Example names, not a full list).
  services: [
    "Bouquets",
    "Wedding flowers",
    "Funeral flowers",
    "Event flowers",
    "Plants",
    "Flower subscriptions",
  ],
  profile: [
    {
      title: "The phone number, yours",
      text: "Orders come by phone. Kabsi compares phone, hours and website with yours every day.",
    },
    {
      title: "Bouquets with a price",
      text: "Google can show each bouquet as a service with a price.",
    },
    {
      title: "If you deliver, say where",
      text: "Name the areas in your description so callers know before they ring.",
    },
    {
      title: "Same day orders, said clearly",
      text: "If you take them, give the cut off time in your description.",
    },
  ],
  categories: {
    primary: "Florist",
    more: [],
    line: "Pick the category for most of your work; names can differ by country. Say in your description and posts if you deliver.",
  },
  reviews: [
    {
      title: "Weddings and birthdays",
      text: "A warm reply thanks the customer for the occasion they named, adding nothing else.",
    },
    {
      title: "A funeral order",
      text: "Brief and gentle, with nothing the customer did not share.",
    },
    {
      title: "A threat to take it further",
      text: "No draft for a legal threat; the checklist reaches you first.",
    },
  ],
  holidays: [
    {
      title: "Busy days, their own hours",
      text: "Kabsi asks before each public holiday and sets special hours once you say yes.",
    },
    {
      title: "Valentine's week",
      text: "Opening early that week is special hours, set from what you say.",
    },
    {
      title: "Christmas Eve",
      text: "Short hours that day go on Google as special hours.",
    },
  ],
  photoCards: [
    {
      title: "An arrangement, as a post",
      text: "A photo of an arrangement with one line becomes a post for your yes.",
    },
    {
      title: "The bench at work",
      text: "Stems, ribbon and tools on the table, in daylight.",
    },
    {
      title: "The shopfront in bloom",
      text: "Buckets by the door help people recognise the shop.",
    },
  ],
  posts: [
    {
      title: "Valentine's Day orders",
      text: "The last day to order, with its date in the post.",
    },
    {
      title: "Mother's Day",
      text: "What you have ready and when orders close.",
    },
    {
      title: "Sympathy flowers",
      text: "A quiet post that you make them, with no sales words.",
    },
  ],
  page: {
    query: "florist Google Business Profile",
    title: "Florist Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your florist Google Business Profile: the phone and busy season hours right, arrangements as posts, and warm replies for your yes.",
    h1: "Your flower shop on Google, in full bloom.",
    mark: "in full bloom.",
    line: "Kabsi looks after your florist Google Business Profile: the right phone, holiday hours, arrangements as posts.",
    card: "The right phone, arrangements as posts.",
    answer:
      "Orders come by phone, so a florist Google Business Profile needs the right number. Kabsi checks it daily and drafts posts and replies you approve.",
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
        text: "Warm for a wedding, gentle for a funeral, adding nothing the customer did not say.",
      },
    ],
    ai: {
      question: "Which florist in Clifton, Bristol does same day bouquets?",
      answer: "Bloom and Twine in Clifton makes same day bouquets when you order by 1 pm.",
      sources: ["Bloom and Twine's Google profile", "Bloom and Twine's website"],
    },
    related: ["bakery", "cafe", "optician", "restaurant", "nail-salon", "pet-grooming"],
  },
  faqs: [
    {
      q: "Can Kabsi set our Valentine's Day hours?",
      a: "Yes, tell Kabsi the hours, and it sets them as special hours once you say yes. Before public holidays, Kabsi asks you first.",
    },
    {
      q: "How does Kabsi reply to a review after a funeral?",
      a: "Gently and briefly. The draft thanks the customer, adds nothing they did not share, and waits for your yes.",
    },
    {
      q: "Will Kabsi post our arrangements?",
      a: "Yes, send the photo; Kabsi checks it is sharp and bright, then drafts the post.",
    },
    {
      q: "Does Kabsi take flower orders?",
      a: "No, orders stay with you by phone or online; Kabsi looks after the Google profile.",
    },
    {
      q: "Where does the review card go for a florist?",
      a: "Tucked into each bouquet or delivery, or at the counter.",
    },
  ],
  guides: [
    "keep-your-hours-and-details-the-same-everywhere",
    "google-posts-for-local-businesses",
    "how-to-respond-to-negative-google-reviews",
  ],
};
