import { PHOTOS } from "@/components/kabsi/photos";
import type { Industry } from "./types";

// Design 8 (Web 4c, lane R's approval of 1 Nov 2026): the restaurant page written for its own trade. Every Google
// sentence has its row in docs/claims/restaurant.md (written in Web 4c before the page was indexed); the Kabsi
// sentences follow knowledge/kabsi-facts.md (7.1). Cedar Lane Kitchen, Manchester, is invented (Example).
export const restaurant: Industry = {
  slug: "restaurant",
  hub: "food-and-drink",
  name: "restaurant",
  plural: "Restaurants",
  finished: true,
  lead: "Menu photos, dish photos, bank holiday hours and a reply for every review. Kabsi gets each one ready, and you approve it.",
  keyword: "restaurant",
  example: {
    business: "Cedar Lane Kitchen",
    city: "Manchester",
    kind: "restaurant",
    rival: "The Olive Table",
    rival2: "Northern Grill",
    near: ["Near the station", "By the square"],
  },
  photos: [PHOTOS.restaurantDining, PHOTOS.restaurantKitchen],
  focus: "50% 55%",
  searches: [
    "restaurants near me",
    "sunday roast near me",
    "table for two tonight",
    "restaurant open now",
    "christmas lunch",
  ],
  tasks: [
    {
      title: "The menu on Google, the same as on the table",
      text: "When a dish or a price changes, send a photo of the new menu. Kabsi checks it and adds it to your Google profile once you say yes.",
    },
    {
      title: "Kitchen hours apart from opening hours",
      text: "Google has room for more than one set of hours, such as the kitchen. Kabsi checks your details every day and tells you when the hours on Google change.",
    },
    {
      title: "Bank holidays, asked in time",
      text: "Easter Monday, Christmas Day, Boxing Day. Kabsi asks five days before each bank holiday and sets special hours once you say yes.",
    },
    {
      title: "Replies to a busy weekend",
      text: "A full Saturday brings reviews. Each gets a reply drafted from what the guest wrote, never an invented dish or offer.",
    },
    {
      title: "Dish photos, checked",
      text: "Send photos of your best dishes. Kabsi tells you when one is dark, blurry or too small, and adds the rest to Google once you say yes.",
    },
  ],
  faqs: [
    {
      q: "Can Kabsi change my menu on Google?",
      a: "Kabsi does not edit menu items on Google today. Send a photo of the new menu, and Kabsi adds it to your Google profile after your yes.",
    },
    {
      q: "We get reviews on booking and delivery sites too. Does Kabsi reply there?",
      a: "No. Kabsi works only with your Google profile. Reviews people leave on Google, Kabsi does reply to.",
    },
    {
      q: "My manager runs the floor. Can they approve instead of me?",
      a: "On Pro, yes. You choose who can approve replies and posts, and you still see everything that goes out.",
    },
    {
      q: "Can Kabsi promise we come up first for 'restaurants near me'?",
      a: "No one can promise that. Kabsi shows where you show up, what changed, and what you can do next.",
    },
  ],
  guides: ["how-to-reply-to-google-reviews", "someone-changed-my-business-info-on-google"],
  d8: {
    seo: {
      title: "Kabsi for restaurants: menu photos, hours, bank holidays and replies on Google",
      description:
        "Kabsi keeps a restaurant's Google profile right: menu and dish photos, bank holiday hours asked in time, your details checked every day, and a reply for every review.",
    },
    business: "Cedar Lane Kitchen, Manchester",
    card: {
      label: "Menu photo",
      text: "Your new winter menu photo is checked and ready for your Google profile. Post it with this line?",
      quote: "Our winter menu starts today, with Sunday lunch from 12.",
      buttons: ["Yes", "Edit", "Skip"],
      time: "15:30",
    },
    jobsTitle: "The Google jobs that come back for a restaurant.",
    searchText:
      "People choose where to eat on the way there. They search for what is near and open, then read the menu, look at the dishes and check the latest replies before they book.",
    check: [
      { label: "Opening hours", value: "Shown", tone: "ok" },
      { label: "Phone", value: "Shown", tone: "ok" },
      { label: "Website", value: "Missing", tone: "warn" },
      { label: "Reviews", value: "212, rated 4.4", tone: "ok" },
    ],
    checkText:
      "For a restaurant the free check starts with what people look for on the way: your hours, your phone and your website, then your reviews. Example result for an invented restaurant in Manchester.",
    guide: [
      {
        title: "The menu and the hours people check",
        paras: [
          "On Google you edit the menu from your Business Profile, and you can add photos of your menu and your best dishes. When the menu changes, the photo on Google should change the same week, so a guest who chose the lamb shank finds it on the table at the price they read.",
          "A restaurant has more than one set of hours. Google lets you set more hours when different parts of what you offer keep different times, such as the kitchen or takeaway. Special hours cover the days that differ: a bank holiday, Christmas Eve, New Year's Eve, a private hire. In 2027 Christmas Day and Boxing Day fall on a weekend, so the bank holidays in England and Wales move to Monday 27 and Tuesday 28 December. Kabsi asks you five days before each bank holiday and sets the hours once you say yes.",
        ],
      },
      {
        title: "Replies, posts and the booking link",
        paras: [
          "A busy weekend can bring many reviews at once. A reply that names the dish or the table shows someone read it, and Kabsi names a dish only when the guest did and you gave Kabsi the facts. When a review is about a long wait or a cold plate, the reply says sorry once, leaves the kitchen's excuses out and asks the guest to get in touch through the details on your profile.",
          "A post is the place for what is on this week: a Sunday lunch, a set menu for Christmas, a quiz night. Google archives posts after six months unless a date range is set. Google lets you add your own link to your Business Profile, so people can book a table from it; when you change the system you book with, check the link the same day.",
        ],
      },
    ],
    related: ["hair-salon", "barbershop"],
  },
};
