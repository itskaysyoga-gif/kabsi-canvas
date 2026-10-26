import { PHOTOS } from "@/components/kabsi/photos";
import type { Industry } from "./types";

// Content 1: finished from docs/claims/bakery.md, noindex until lane R approves it. Corner Bakery is invented
// (Example). The bakery has one photo of its own (bakery-window); a second is an Open row in DESIGN-PROPOSAL.md.
// Every fact on this page has a row in the claim sheet; advice and wording are marked there.
export const bakery: Industry = {
  slug: "bakery",
  hub: "food-and-drink",
  name: "bakery",
  plural: "Bakeries",
  finished: false,
  lead: "Kabsi tells Google when the first loaf is out, lists your cakes with a starting price, and replies to reviews of the bread without promising what is left on the shelf. You approve each one on WhatsApp.",
  keyword: "bakery",
  example: {
    business: "Corner Bakery",
    city: "London",
    kind: "bakery",
    rival: "Harbor Bakes",
    rival2: "Rye and Crumb",
    near: ["East of the station", "By the school"],
  },
  photos: [PHOTOS.bakeryWindow],
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
  tasks: [
    {
      title: "Say when the first loaf is out",
      text: "Whatever time the first loaf comes out, the hours on Google carry it. Kabsi sets special hours for the days that differ, so the door and the profile agree.",
    },
    {
      title: "List cakes and breads with a starting price",
      text: "Birthday cake, sourdough loaf, a box of croissants. Google can show a service with a price and a description. Prices come from you, because Kabsi never invents one.",
    },
    {
      title: "Link the page where cakes are ordered",
      text: "Real bakery profiles on Google show an Order online link. Yours can open the cake order page, with the sizes, and a post can say how many days ahead an order must be placed.",
    },
    {
      title: "Post what is fresh today",
      text: "A seasonal pastry, a new loaf, the sourdough that is back. Kabsi writes the draft after the morning rush so it matches what actually came out of the oven.",
    },
    {
      title: "Photograph the shelf at its fullest",
      text: "Early, before the first customer, with the whole shelf in view. Google asks for photos between 10 KB and 5 MB, at least 250 pixels on each side and best at 720 or more, in focus and well lit.",
    },
  ],
  categories: {
    primary: "Bakery",
    more: ["Cafe"],
    note: "'Bakery' is the name Google itself uses when it explains extra categories: a grocery store might add 'Bakery' and 'Deli'. Add 'Cafe' only if people sit and drink at the bakery. Google says not to add a category for every product.",
  },
  reviewThemes: [
    {
      theme: "The bread itself",
      text: "A customer names the sourdough or the croissant. The reply names it back and adds no fact the owner did not give.",
    },
    {
      theme: "Sold out when they arrived",
      text: "The reply says sorry once, points to the opening hours and the order page, and does not promise any item will be held.",
    },
    {
      theme: "A cake that was not like the picture",
      text: "The reply stays calm, asks the writer to get in touch through the details on the profile and offers no refund unless you said so.",
    },
    {
      theme: "An allergy or a reaction",
      text: "This is a health review. It comes to you with no draft and a route to a person at Kabsi, and you write any reply yourself.",
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
  posts: [
    "The first loaf is out at 6.30, and what is on the shelf now.",
    "Cake orders for the weekend close on Thursday, with the order link.",
    "A new seasonal bake, in one line, with the price.",
    "Hours for the bank holiday weekend.",
  ],
  photoTips: [
    {
      title: "The shelf at its fullest",
      text: "Early, in daylight, with every tray in view. It answers 'is there anything left' better than words.",
    },
    {
      title: "A cake with its size and price card",
      text: "One cake, straight on, with the card beside it. A custom order starts from what the customer can see.",
    },
    {
      title: "The door with the opening time",
      text: "Take the front from across the street with the hours sign readable. Google says an outside photo helps people recognise the place when they come.",
    },
  ],
  holidays: [
    {
      when: "UK: the Easter weekend",
      text: "In England and Wales Good Friday is 26 March 2027 and Easter Monday 29 March. Hours go on Google, and a post names the day orders close.",
    },
    {
      when: "Eid al-Fitr, UAE",
      text: "1 to 3 Shawwal, with day 30 of Ramadan counted as a holiday in a 30 day month. A bakery that closes for the days says so on Google and posts the last day for orders.",
    },
    {
      when: "UAE National Day, 2 and 3 December",
      text: "Two public holidays. Put special hours on a few days ahead and use a post for any cake or box made for the day.",
    },
    {
      when: "UK: Christmas week 2027",
      text: "Christmas Day is a Saturday, so the holidays fall on Monday 27 and Tuesday 28 December. Order deadlines and closed days go on Google in November.",
    },
  ],
  faqs: [
    {
      q: "Can Kabsi tell Google when we sell out?",
      a: "Kabsi keeps your hours true and posts what you tell it. It cannot see your shelves, so a sold out message comes from you, and you approve it first.",
    },
    {
      q: "Can Kabsi write the allergens for a cake?",
      a: "No. Kabsi writes only the facts you give it, and allergen information must come from your own recipes and your local rules. A review that mentions a reaction comes to you with no draft.",
    },
    {
      q: "Can customers order from my Google profile?",
      a: "If you add an order link, yes. Whether Google shows ordering options depends on your country and the provider you use. Kabsi keeps the link right when the page changes.",
    },
    {
      q: "Can Kabsi take cake orders on WhatsApp?",
      a: "No. The Kabsi chat is between Kabsi and you. It prepares your hours, posts and replies, and it does not talk to your customers.",
    },
  ],
  guides: ["how-to-set-holiday-hours-on-google", "how-to-get-more-google-reviews"],
};
