import { PHOTOS } from "@/components/kabsi/photos";
import type { Industry } from "./types";

// Content 1: finished from docs/claims/cafe.md, approved by lane R on 27 Oct 2026 (brief section 18). Brew Lane Cafe is invented
// (Example). Every fact on this page has a row in the claim sheet; advice and wording are marked there.
export const cafe: Industry = {
  slug: "cafe",
  name: "cafe",
  plural: "Cafes",
  finished: true,
  lead: "Opening time exact on Google, the menu shown, your laptop rule in a post. You approve every draft.",
  keyword: "cafe",
  example: {
    business: "Brew Lane Cafe",
    city: "London",
    kind: "cafe",
    rival: "Daily Grind",
    rival2: "The Corner Cup",
    near: ["Near the station", "By the park"],
  },
  photos: [PHOTOS.cafeCounter, PHOTOS.cafeBarista],
  focus: "50% 30%",
  searches: [
    "cafe",
    "coffee shop",
    "cafe near me",
    "breakfast cafe",
    "specialty coffee",
    "cafe with wifi",
    "cafe open early",
    "quiet cafe to work",
    "oat milk latte",
  ],
  // Industries 3 (master plan 30.33 item 2): every block is a short card. Each line keeps a fact of docs/claims/cafe.md,
  // whose "Industries 3" section maps it to its row.
  profile: [
    {
      title: "Opening time to the minute",
      text: "Weekly hours say when the doors open; special hours cover days that differ.",
    },
    {
      title: "Drinks, with prices",
      text: "Google can show menu items; a real coffee shop lists drinks with prices.",
    },
    {
      title: "What the room offers",
      text: "A coffee shop profile can show Free Wi-Fi and Good for working on laptop.",
    },
    {
      title: "The order link",
      text: "When your order page changes, tell Kabsi. The link follows once you say yes.",
    },
  ],
  reviews: [
    {
      title: "The coffee itself",
      text: "The reply names the drink back and adds nothing you did not say.",
    },
    {
      title: "The queue at eight",
      text: "Sorry for the wait, once, with no promise of a shorter one.",
    },
    {
      title: "Feeling unwell after a meal",
      text: "No draft: a short checklist, and a neutral holding reply only if you ask.",
    },
  ],
  categories: {
    primary: "Cafe",
    more: ["Coffee shop", "Breakfast restaurant"],
    line: "Google shows all three on real profiles. Choose the first by what most of your sales are.",
  },
  holidays: [
    {
      title: "Ramadan, UAE",
      text: "Private sector hours drop by two a day. Kabsi sets yours once you say yes.",
    },
    {
      title: "England and Wales bank holidays",
      text: "Early May bank holiday is 3 May 2027, the spring one 31 May.",
    },
    {
      title: "Eid al-Adha, UAE",
      text: "Set by the moon, from 10 Dhu al-Hijjah. Kabsi asks five days ahead.",
    },
  ],
  photoCards: [
    {
      title: "A drink by the window",
      text: "One cup in daylight, no filter. Google asks for photos in focus and well lit.",
    },
    {
      title: "The counter and the cabinet",
      text: "What is on show at ten answers 'is there food' before anyone asks.",
    },
    {
      title: "Post ideas",
      text: "A seasonal drink, a new blend, wifi hours, bank holiday opening.",
    },
  ],
  story: {
    title: "Drafts that wait until the rush is over.",
    lead: "You send a photo and a line in the evening. Kabsi sends the drafts after the morning rush, when the queue has gone.",
    lines: [
      {
        from: "owner",
        text: "Photo sent: cinnamon buns. Out of the oven at 7 every weekday.",
      },
      {
        from: "kabsi",
        text: "Brew Lane Cafe: the morning rush is over, so here are your drafts. A post with the buns photo: 'Cinnamon buns out of the oven at 7 on weekdays.' And a reply to Tom's 5-star review: 'Thank you, Tom. Glad the flat white was just right.' Reply Yes for both.",
        buttons: ["Yes", "Edit", "Skip"],
      },
      { from: "owner", text: "Yes" },
      {
        from: "kabsi",
        text: "Sent to Google. I check that the post and the reply show, then tell you.",
      },
    ],
  },
  page: {
    query: "cafe Google Business Profile",
    title: "Cafe Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your cafe Google Business Profile: the opening time exact, what is fresh as posts, and a reply to every review, each for your yes.",
    h1: "Your cafe on Google, open on time.",
    mark: "open on time.",
    line: "Kabsi looks after your cafe Google Business Profile: an exact opening time, fresh bakes as posts, replies after the rush.",
    card: "Opening time exact, fresh bakes as posts.",
    answer:
      "On a cafe Google Business Profile, the opening time comes first. Kabsi checks it daily, turns fresh bakes into posts and drafts every reply.",
    watch: {
      business: "Brew Lane Cafe, London",
      line: "The first customer of the day reads your opening time on Google. Kabsi checks it every day.",
      fields: ["Opening hours", "Special hours", "Website", "Phone", "Attributes"],
      what: "Monday opening",
      google: "08:00",
      owner: "07:00",
      message: "Google shows you opening at 08:00 on Monday. You told me 07:00.",
    },
    post: {
      owner: "Pumpkin loaf is back from today.",
      quote: "Pumpkin loaf is back on the counter from today, while it lasts.",
    },
    jobs: [
      {
        title: "An exact opening time",
        text: "Checked every day, so the first customer finds you open.",
      },
      {
        title: "What is fresh, as posts",
        text: "A photo of today's bake becomes a post, written after the rush.",
      },
      {
        title: "A reply for every review",
        text: "In the language of the review, ready for your yes.",
      },
    ],
    nearby: { kind: "cafe", term: "cafe" },
    ai: {
      question: "Which cafe near Brick Lane, London opens before 8 am?",
      answer:
        "Brew Lane Cafe near Brick Lane opens at 7 am on weekdays, with pastries baked that morning.",
      sources: ["Brew Lane Cafe's Google profile", "Brew Lane Cafe's website"],
    },
    related: ["bakery", "restaurant", "florist", "optician", "nail-salon", "hair-salon"],
  },
  faqs: [
    {
      q: "Where should the review QR code go in a cafe?",
      a: "By the coffee machine, at the till or on a cup sleeve, as a QR code or a link. Ask everyone the same way.",
    },
    {
      q: "Will Kabsi change my menu prices on Google?",
      a: "Only when you tell it a price changed, and only after you reply Yes. Kabsi never invents a dish, a price or an offer.",
    },
    {
      q: "Does Kabsi post to Instagram or my delivery platforms?",
      a: "No. Kabsi works with your Google profile only. It does not post anywhere else and it does not manage your delivery platforms.",
    },
    {
      q: "A customer says they were ill after eating here. What does Kabsi do?",
      a: "It comes to you with no draft and a short checklist. Kabsi writes a neutral holding reply only if you ask.",
    },
    {
      q: "Can Kabsi reply to reviews in other languages?",
      a: "Yes. Each draft is written in the language of the review, and you approve it like any other.",
    },
  ],
  guides: [
    "google-profile-checklist-restaurants-cafes",
    "how-to-set-holiday-hours-on-google",
    "google-posts-for-local-businesses",
  ],
};
