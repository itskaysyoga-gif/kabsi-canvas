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
  // Industries 3 (master plan 30.33 item 2): the two old guide sections as short cards. Each line keeps a fact of
  // docs/claims/restaurant.md, whose "Industries 3" section maps it to its row.
  profile: [
    {
      title: "The menu, as on the table",
      text: "Edit the menu from your Business Profile. Add photos of the menu and dishes.",
    },
    {
      title: "Kitchen hours, set apart",
      text: "Google lets you set more hours, such as the kitchen or takeaway.",
    },
    {
      title: "Special hours for odd days",
      text: "A bank holiday, Christmas Eve, New Year's Eve, a private hire.",
    },
    {
      title: "The booking link",
      text: "Your own link lets people book a table. Check it when you change systems.",
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
      "For a restaurant Google Business Profile, Kabsi checks your hours daily, prepares review replies and turns dish photos into posts, all for your yes.",
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
      owner: "Lamb shoulder is back on Sundays, tables from 12.",
      quote: "Slow roast lamb shoulder is back on the Sunday menu. Tables from 12.",
    },
    jobs: [
      {
        title: "A reply for every review",
        text: "In the guest's language. An illness review gets a checklist and no draft.",
      },
      {
        title: "Dish photos, as posts",
        text: "A photo from the pass and one line become a post for your yes.",
      },
      {
        title: "Bank holiday hours",
        text: "Five days ahead, Kabsi asks what you will do, then sets it after your yes.",
      },
    ],
    nearby: { kind: "restaurant", term: "restaurant" },
    ai: {
      question: "Which restaurant in the Northern Quarter, Manchester serves a Sunday roast?",
      answer:
        "Cedar Lane Kitchen in the Northern Quarter serves slow roast lamb on Sundays from 12.",
      sources: ["Cedar Lane Kitchen's Google profile", "Cedar Lane Kitchen's website"],
    },
    related: ["cafe", "bakery", "florist", "gym-and-fitness", "hair-salon", "car-wash"],
  },
  faqs: [
    {
      q: "Can Kabsi change my menu on Google?",
      a: "Kabsi does not edit menu items on Google today. Send a photo of the new menu, and Kabsi adds it after your yes.",
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
  guides: [
    "google-profile-checklist-restaurants-cafes",
    "how-to-reply-to-google-reviews",
    "how-to-set-holiday-hours-on-google",
  ],
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
  },
};
