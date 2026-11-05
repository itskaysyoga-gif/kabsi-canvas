import { PHOTOS } from "@/components/kabsi/photos";
import { MORE_PHOTOS } from "@/components/kabsi/photos-more";
import type { Industry } from "./types";

// Content 1: finished from docs/claims/bakery.md, approved by lane R on 27 Oct 2026 (brief section 18). Corner Bakery is invented
// (Example). The bakery has one photo of its own (bakery-window); a second is an Open row in DESIGN-PROPOSAL.md.
// Every fact on this page has a row in the claim sheet; advice and wording are marked there.
export const bakery: Industry = {
  slug: "bakery",
  name: "bakery",
  plural: "Bakeries",
  finished: true,
  lead: "Early opening hours right on Google, your cakes listed with a starting price, replies drafted. You approve each one.",
  keyword: "bakery",
  example: {
    business: "Corner Bakery",
    city: "London",
    kind: "bakery",
    rival: "Harbor Bakes",
    rival2: "Rye and Crumb",
    near: ["East of the station", "By the school"],
  },
  photos: [PHOTOS.bakeryCounter, MORE_PHOTOS.bakeryWindowTall],
  focus: "50% 50%",
  searches: [
    "bakery",
    "bakery near me",
    "cake shop",
    "fresh bread",
    "sourdough",
    "croissants",
    "birthday cake order",
    "custom cake",
    "gluten free bakery",
  ],
  // Industries 3 (master plan 30.33 item 2): every block is a short card. Each line keeps a fact of docs/claims/bakery.md,
  // whose "Industries 3" section maps it to its row.
  profile: [
    {
      title: "Early opening hours, exact",
      text: "Whatever time the doors open, Google carries it. Special hours cover days that differ.",
    },
    {
      title: "Cakes and breads, with prices",
      text: "Google can show each with a price. Prices come from you; Kabsi never invents one.",
    },
    {
      title: "The cake order page",
      text: "Google lets you add your own link, so it can open your cake order page.",
    },
    {
      title: "What is fresh today",
      text: "A seasonal pastry or a loaf that is back. Kabsi drafts the post; you approve.",
    },
  ],
  reviews: [
    {
      title: "The bread itself",
      text: "The reply names the loaf back and adds nothing you did not say.",
    },
    {
      title: "Sold out when they arrived",
      text: "Sorry once, your hours and order page, and no promise to hold anything.",
    },
    {
      title: "An allergy or a reaction",
      text: "No draft: a short checklist, and a neutral holding reply only if you ask.",
    },
  ],
  categories: {
    primary: "Bakery",
    more: ["Cafe"],
    line: "Google itself uses 'Bakery' in its example. Add 'Cafe' only if people sit and drink there. Google says not to add one per product.",
  },
  holidays: [
    {
      title: "England and Wales: Easter 2027",
      text: "Good Friday 26 March, Easter Monday 29 March. A post names the last order day.",
    },
    {
      title: "Eid al-Fitr, UAE",
      text: "1 to 3 Shawwal. Closed days go on Google; a post gives the order deadline.",
    },
    {
      title: "UK: Christmas week 2027",
      text: "Holidays fall on Monday 27 and Tuesday 28 December. Deadlines go on Google in November.",
    },
  ],
  photoCards: [
    {
      title: "The shelf at its fullest",
      text: "Early, in daylight, every tray in view, in focus and well lit.",
    },
    {
      title: "A cake beside its price card",
      text: "One cake, straight on. A custom order starts from what customers can see.",
    },
    {
      title: "Post ideas",
      text: "The first loaf out, weekend cake order deadlines, a seasonal bake, bank holiday hours.",
    },
  ],
  story: {
    title: "Easter orders, closed on time.",
    lead: "Kabsi asks before the bank holiday. You answer once, and the hours and the order deadline go up together.",
    lines: [
      {
        from: "kabsi",
        text: "Corner Bakery: Good Friday is 26 March and Easter Monday 29 March. Your Google profile shows normal hours. Are you open?",
      },
      {
        from: "owner",
        text: "Open Good Friday 7 to 1. Closed Easter Monday. Orders for hot cross buns close Wednesday.",
      },
      {
        from: "kabsi",
        text: "Ready: Good Friday 7 to 1, Easter Monday closed, and a post: 'Easter orders close on Wednesday. Order on our page.' Reply Yes for both.",
        buttons: ["Yes", "Edit", "Skip"],
      },
      { from: "owner", text: "Yes" },
      {
        from: "kabsi",
        text: "Sent to Google. I check that the hours and the post show on your profile, then tell you.",
      },
    ],
  },
  page: {
    query: "bakery Google Business Profile",
    title: "Bakery Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your bakery Google Business Profile: early hours and holiday hours right, the day's bakes as posts, and a reply to every review.",
    h1: "Your bakery on Google, fresh every morning.",
    mark: "fresh every morning.",
    line: "Kabsi looks after your bakery Google Business Profile: early hours, holiday baking hours, and the day's bakes as posts.",
    card: "Early hours exact, holiday hours set ahead.",
    answer:
      "On a bakery Google Business Profile, early and holiday hours come first. Kabsi checks them, drafts posts and replies, and you approve each.",
    watch: {
      business: "Corner Bakery, London",
      line: "Holiday baking days have their own hours. Kabsi checks Google shows the hours you chose.",
      fields: ["Opening hours", "Special hours", "Phone", "Website", "Address"],
      what: "Christmas Eve",
      google: "Normal hours",
      owner: "06:00 to 14:00",
      message: "Google shows normal hours on Christmas Eve. You told me 06:00 to 14:00.",
    },
    post: {
      owner: "Sourdough with seeds, every Saturday from now.",
      quote: "Seeded sourdough is now baked every Saturday.",
    },
    jobs: [
      {
        title: "Holiday hours, asked ahead",
        text: "Bank holidays asked five days ahead; Christmas Eve hours set once you give them.",
      },
      {
        title: "The day's bake, as a post",
        text: "A photo of the counter becomes a post for your yes.",
      },
      {
        title: "A reply for every review",
        text: "Short and warm, using only what you told Kabsi.",
      },
    ],
    nearby: { kind: "bakery", term: "bakery" },
    ai: {
      question: "Which bakery in Hackney, London sells sourdough on Saturdays?",
      answer: "Corner Bakery in Hackney bakes seeded sourdough every Saturday and opens at 6 am.",
      sources: ["Corner Bakery's Google profile", "Corner Bakery's website"],
    },
    related: ["cafe", "restaurant", "florist", "optician", "pet-grooming", "nail-salon"],
  },
  faqs: [
    {
      q: "Can Kabsi tell Google when we sell out?",
      a: "Kabsi cannot see your shelves. A sold out post comes from what you tell it, and you approve it first.",
    },
    {
      q: "Can Kabsi write the allergens for a cake?",
      a: "No. Kabsi writes only facts you give it; allergen information comes from your recipes and local rules. A review about a reaction gets no draft.",
    },
    {
      q: "Can customers order from my Google profile?",
      a: "If you add an order link, yes. Ordering options depend on your country and provider. Check the link each time your provider changes.",
    },
    {
      q: "Can Kabsi take cake orders on WhatsApp?",
      a: "No. The Kabsi chat is between Kabsi and you. It prepares your hours, posts and replies, and does not talk to your customers.",
    },
    {
      q: "Will Kabsi post prices for cakes?",
      a: "Only prices you give it, in a post you approve. Kabsi never invents a price or an offer.",
    },
  ],
  guides: [
    "how-to-set-holiday-hours-on-google",
    "google-posts-for-local-businesses",
    "how-to-reply-to-google-reviews",
  ],
};
