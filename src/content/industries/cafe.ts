import { PHOTOS } from "@/components/kabsi/photos";
import type { Industry } from "./types";

// Content 1: finished from docs/claims/cafe.md, approved by lane R on 27 Oct 2026 (brief section 18). Brew Lane Cafe is invented
// (Example). Every fact on this page has a row in the claim sheet; advice and wording are marked there.
export const cafe: Industry = {
  slug: "cafe",
  hub: "food-and-drink",
  name: "cafe",
  plural: "Cafes",
  finished: true,
  lead: "Kabsi gets your opening time exact on Google, shows the menu, puts your laptop rule in a post, and writes the day's drafts once the morning rush is over. You approve each one on WhatsApp.",
  keyword: "cafe",
  example: {
    business: "Brew Lane Cafe",
    city: "London",
    kind: "cafe",
    rival: "Daily Grind",
    rival2: "The Corner Cup",
    near: ["Near the station", "By the park"],
  },
  photos: [PHOTOS.cafeBarista, PHOTOS.cafeCounter],
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
  tasks: [
    {
      title: "Put the opening time on Google to the minute",
      text: "The weekly hours on Google say when the doors open, and special hours cover the days that differ. Kabsi asks before each public holiday and sets your answer once you say Yes.",
    },
    {
      title: "Show the drinks people ask for, with prices",
      text: "Google can show menu items, and a real coffee shop profile on Google lists its drinks with a price and a line of description. Photos of the menu and the best dishes help people choose before they come.",
    },
    {
      title: "Say what the room offers",
      text: "A coffee shop profile on Google can show 'Free Wi-Fi' under amenities and 'Good for working on laptop' under popular for. If your laptop rule differs at lunch, a post says so before the first complaint does.",
    },
    {
      title: "Post after the morning rush, not during it",
      text: "The week's post suits what is fresh: a seasonal drink, a new blend, a pastry that is back. Kabsi writes the drafts once the rush is over, so you read them with a free hand.",
    },
    {
      title: "Point the order link at the right page",
      text: "Real bakery and breakfast profiles on Google show an Order online link. Whether Google shows ordering options depends on your country and your ordering provider. When your order page changes, tell Kabsi and the link follows once you say Yes.",
    },
  ],
  categories: {
    primary: "Cafe",
    more: ["Coffee shop", "Breakfast restaurant"],
    note: "All three names are shown by Google under real profiles of cafes, coffee shops and breakfast places. Choose the first by what most of your sales are, a cafe or a coffee counter, and add the others only for something you really run.",
  },
  reviewThemes: [
    {
      theme: "The coffee itself",
      text: "A customer names the flat white or the cortado. The reply names it back in one line and adds nothing the owner did not say.",
    },
    {
      theme: "The queue at eight",
      text: "People write about the wait before work. The reply says sorry for the wait once and does not promise a shorter one.",
    },
    {
      theme: "Laptops and the last free table",
      text: "A guest says there was no seat, or that someone camped. The reply states the rule you gave Kabsi and invites a chat in person.",
    },
    {
      theme: "Feeling unwell after a meal",
      text: "This is a health review. It comes to you with no draft and a route to a person at Kabsi, and you write the reply.",
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
  posts: [
    "A seasonal drink, with its price and the week it ends.",
    "A new blend on the bar, in one line.",
    "Wifi and laptop hours, in plain words.",
    "Opening hours for the bank holiday Monday.",
  ],
  photoTips: [
    {
      title: "A drink by the window, in daylight",
      text: "One cup, one surface, no filter. Google asks for photos in focus and well lit.",
    },
    {
      title: "The counter and the cabinet",
      text: "What is on show at ten in the morning. It answers 'is there food' before anyone asks.",
    },
    {
      title: "The seats and the sockets",
      text: "Show the tables and the sockets, and write the laptop rule in a post.",
    },
  ],
  holidays: [
    {
      when: "Ramadan, UAE",
      text: "The UAE cuts private sector working hours by two hours a day for the month. A cafe sets its own hours for Ramadan, and Kabsi sets the new time on Google once you say Yes, so the old opening time never shows.",
    },
    {
      when: "UK: bank holiday Mondays",
      text: "In England and Wales the early May holiday is Monday 3 May 2027 and the spring holiday Monday 31 May. Tell Google if the doors open at the usual time.",
    },
    {
      when: "UAE New Year's Day and UK Christmas",
      text: "1 January is a public holiday in the UAE. In England and Wales Christmas Day 2026 is Friday 25 December, and Boxing Day moves to Monday 28 December.",
    },
    {
      when: "Eid al-Adha, UAE",
      text: "Arafah Day on 9 Dhu al-Hijjah and Eid al-Adha on 10 to 12 Dhu al-Hijjah, set by the moon. Kabsi asks five days ahead.",
    },
  ],
  faqs: [
    {
      q: "Where should the review QR code go in a cafe?",
      a: "Google lets you ask customers to scan a QR code or open a link. Cafes put it by the coffee machine, at the till or on a cup sleeve. Ask everyone the same way.",
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
      a: "It sends the review to you with no draft and a way to reach a person at Kabsi. Nothing is published until you write and approve a reply.",
    },
  ],
  guides: ["how-to-get-more-google-reviews", "how-to-set-holiday-hours-on-google"],
};
