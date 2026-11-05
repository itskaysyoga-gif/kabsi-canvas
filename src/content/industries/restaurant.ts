import { PHOTOS } from "@/components/kabsi/photos";
import type { Industry } from "./types";

// Design 8 (Web 4c, lane R's approval of 1 Nov 2026): the restaurant page written for its own trade. Every Google
// sentence has its row in docs/claims/restaurant.md (written in Web 4c before the page was indexed); the Kabsi
// sentences follow knowledge/kabsi-facts.md (7.1). Cedar Lane Kitchen, Manchester, is invented (Example).
export const restaurant: Industry = {
  slug: "restaurant",
  name: "restaurant",
  plural: "Restaurants",
  finished: true,
  lead: "Menu photos, dish photos, bank holiday hours and a reply for every review. You approve each one.",
  keyword: "restaurant",
  example: {
    business: "Cedar Lane Kitchen",
    city: "Manchester",
    kind: "restaurant",
    rival: "The Olive Table",
    rival2: "Northern Grill",
    near: ["Near the station", "By the square"],
  },
  photos: [PHOTOS.restaurantDining, PHOTOS.restaurantTables],
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
  page: {
    query: "restaurant Google Business Profile",
    title: "Restaurant Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your restaurant Google Business Profile: hours right for every service, dish photos as posts, and a reply to every review for your yes.",
    h1: "Your restaurant on Google, ready for service.",
    mark: "ready for service.",
    line: "Kabsi looks after your restaurant Google Business Profile: closing times, dish photos as posts, and a reply to every review.",
    card: "Closing times right, dish photos as posts.",
    answer:
      "Diners check a restaurant Google Business Profile for the closing time, the menu and the reviews. Kabsi checks your hours every day, drafts a reply to every review in the guest's language, turns a dish photo into a post, and asks about bank holiday hours five days ahead. Reviews about illness get a calm draft with no quick yes. You approve every change.",
    watch: {
      business: "Cedar Lane Kitchen, Manchester",
      line: "A guest who reads the wrong closing time does not come. Kabsi checks your hours every day.",
      fields: ["Opening hours", "Special hours", "Phone", "Website", "Address"],
      what: "Sunday",
      google: "Closes 21:00",
      owner: "Closes 22:30",
      message: "Google shows you closing at 21:00 on Sunday. You told me 22:30.",
    },
    post: {
      owner: "Lamb shoulder is back on Sundays.",
      quote: "Slow roast lamb shoulder is back on the Sunday menu. Tables from 12.",
    },
    jobs: [
      {
        title: "A reply for every review",
        text: "In the guest's language. Illness and hygiene reviews get a calm draft, never a quick yes.",
      },
      {
        title: "Dish photos, as posts",
        text: "A photo from the pass and one line become a post for your yes.",
      },
      {
        title: "Bank holiday hours",
        text: "Five days ahead, Kabsi asks what you will do and sets it once you say yes.",
      },
    ],
    nearby: { kind: "restaurant", term: "restaurant" },
    ai: {
      question: "Which restaurant in the Northern Quarter, Manchester serves a Sunday roast?",
      answer:
        "Cedar Lane Kitchen in the Northern Quarter serves slow roast lamb on Sundays from 12.",
      sources: ["Cedar Lane Kitchen's Google profile", "Cedar Lane Kitchen's website"],
    },
    related: ["cafe", "bakery"],
  },
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
      a: "No one can promise that. Kabsi shows what changed on your profile and what you can do next.",
    },
    {
      q: "Can Kabsi set our Christmas hours?",
      a: "Yes. Five days before each bank holiday, Christmas included, Kabsi asks what you will do and sets special hours once you say yes.",
    },
  ],
  guides: ["how-to-reply-to-google-reviews", "someone-changed-my-business-info-on-google"],
  d8: {
    seo: {
      title: "Kabsi for restaurants: Google photos, hours and review replies",
      description:
        "Kabsi keeps a restaurant's Google profile right: menu and dish photos, bank holiday hours asked in time, your details checked daily, and a reply for every review.",
    },
    business: "Cedar Lane Kitchen, Manchester",
    card: {
      label: "Menu photo",
      text: "Your new winter menu photo is checked and ready for your Google profile. Post it with this line?",
      quote: "Our winter menu starts today, with Sunday lunch from 12.",
      buttons: ["Yes", "Edit", "Skip"],
      time: "15:30",
    },
    jobsTitle: "Google jobs that come back.",
    searchText:
      "People choose where to eat on the way there. They search for what is near and open, then read the menu, look at the dishes and check the latest replies before they book.",
    check: [
      { label: "Opening hours", value: "Shown", tone: "ok" },
      { label: "Phone", value: "Shown", tone: "ok" },
      {
        label: "Photos",
        value: "3",
        tone: "warn",
        next: "Kabsi asks for photos of your dishes and your room from your phone, checks each one and sends it to Google once you say yes.",
      },
      { label: "Reviews", value: "212, rated 4.4", tone: "ok" },
    ],
    checkText:
      "For a restaurant the free check starts with what people look for on the way: your hours, your phone and your photos, then your reviews. Example result for an invented restaurant in Manchester.",
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
  },
};
