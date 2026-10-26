import { PHOTOS } from "@/components/kabsi/photos";
import type { Industry } from "./types";

// Finished page (model 2 of 3). Cedar Lane Kitchen is invented (Example).
export const restaurant: Industry = {
  slug: "restaurant",
  hub: "food-and-drink",
  name: "restaurant",
  plural: "Restaurants",
  finished: true,
  lead: "Kabsi keeps your menu, kitchen hours and table booking link right on Google, drafts replies to the dozens of reviews a busy week brings, and turns a photo of tonight's special into a post. You approve each one on WhatsApp.",
  keyword: "restaurant",
  example: {
    business: "Cedar Lane Kitchen",
    city: "Dubai",
    kind: "restaurant",
    rival: "Olive Court",
    rival2: "The Copper Pot",
    near: ["By the marina walk", "Near the office towers"],
  },
  photos: [PHOTOS.restaurantDining, PHOTOS.restaurantKitchen, PHOTOS.restaurantCooks],
  focus: "50% 55%",
  searches: [
    "restaurants near me",
    "lebanese restaurant",
    "dinner with a view",
    "family restaurant",
    "iftar buffet",
    "brunch near me",
    "restaurant open late",
    "table for 2 tonight",
  ],
  tasks: [
    {
      title: "Keep the menu on Google the same as the one on the table",
      text: "Google shows menu items and photos of menus to people deciding where to eat. When a dish or a price changes, the menu on the profile changes too.",
    },
    {
      title: "Set kitchen, brunch and delivery hours apart",
      text: "A restaurant has more than one set of hours. Google has room for each, so 'open' never means the kitchen closed an hour ago.",
    },
    {
      title: "Answer the weekend's reviews by Monday",
      text: "A full Friday can bring twenty reviews. Each gets a reply that mentions the dish or the table they wrote about.",
    },
    {
      title: "Post the special, the event and the set menu",
      text: "Tonight's fish, a live music night, the iftar menu. A post with a photo stays on the profile for people searching this week.",
    },
    {
      title: "Keep the reservation and order links working",
      text: "The booking button and the order link take people straight to a table or a delivery. When you change the system you book with, the links change the same day.",
    },
  ],
  categories: {
    primary: "Lebanese restaurant",
    more: ["Restaurant", "Mediterranean restaurant", "Family restaurant", "Breakfast restaurant"],
    note: "Pick the cuisine as the first category, not plain 'Restaurant'. Google's own advice is to choose the most specific one that fits.",
  },
  reviewThemes: [
    {
      theme: "The dish by name",
      text: "'The lamb shoulder' or 'the fattoush'. A reply that names it shows someone read the review, and tells the next reader what to order.",
    },
    {
      theme: "How long the food took",
      text: "The usual complaint on a full night. Say sorry for the wait and leave the kitchen's reasons out.",
    },
    {
      theme: "The table and the view",
      text: "Terrace, window, booth. People write about where they sat, and the next guest asks for it.",
    },
    {
      theme: "Delivery that arrived cold",
      text: "Reviews of the delivery land on your profile too. The reply says sorry and keeps the driver out of it.",
    },
  ],
  story: {
    title: "A new menu on Monday, on Google by Monday.",
    lead: "Send the new menu as a photo. Kabsi prepares the changes and waits for your yes.",
    lines: [
      {
        from: "owner",
        text: "New menu from Monday. Photo attached. The sea bass is now 89, and we added a mezze platter.",
      },
      {
        from: "kabsi",
        text: "Cedar Lane Kitchen: I have 3 changes ready. The menu photo on your Google profile. Sea bass from 79 to 89 in your menu items. A post: 'From Monday: our new menu, with a mezze platter for two to share.' Reply Yes for all three.",
        buttons: ["Yes", "Edit", "Skip"],
      },
      { from: "owner", text: "Yes" },
      {
        from: "kabsi",
        text: "Done on your Google profile: the photo, the price and the post. Your old winter menu photo is still there. Remove it?",
        buttons: ["Remove it", "Keep it"],
      },
    ],
  },
  posts: [
    "Tonight's catch, with one photo from the kitchen pass.",
    "The iftar set menu and the time the doors open in Ramadan.",
    "A live music night: the date, the time, and whether to book.",
    "A long table for groups: how many it seats and how to reserve it.",
  ],
  photoTips: [
    {
      title: "The dishes people order most",
      text: "Shot on the pass in good light, one plate at a time. These are the photos guests look at before they book.",
    },
    {
      title: "The room at night",
      text: "Lit as guests see it at dinner, with the tables set. Daytime photos of an evening place mislead.",
    },
    {
      title: "The menu itself",
      text: "A sharp photo of each page, replaced when the menu changes, so prices on Google match the bill.",
    },
  ],
  holidays: [
    {
      when: "Ramadan",
      text: "Closed by day, iftar at sunset, suhoor late at night. The hours change every week as sunset moves; Kabsi asks once and sets them all.",
    },
    {
      when: "Eid",
      text: "Families eat out. Longer hours and a post about booking ahead.",
    },
    {
      when: "UK: Christmas, Boxing Day and New Year's Eve",
      text: "Set menus, early closing on Christmas Eve, and New Year's Eve hours that run past midnight.",
    },
    {
      when: "Mother's Day and Valentine's Day",
      text: "Booked out weeks ahead. A post when tables open, and another when they are gone.",
    },
  ],
  faqs: [
    {
      q: "We get reviews on delivery platforms too. Does Kabsi reply there?",
      a: "No. Kabsi looks after your Google profile only. Delivery reviews that people leave on Google, Kabsi does reply to.",
    },
    {
      q: "Can Kabsi change my menu prices on Google?",
      a: "Yes, after your yes. Send the new menu or the price as a message, and Kabsi prepares the change for you to approve.",
    },
    {
      q: "My manager runs the floor. Can they approve instead of me?",
      a: "On Pro, yes. You choose who can approve replies and posts, and you still see everything that goes out.",
    },
    {
      q: "What about a review that says someone got ill?",
      a: "Kabsi does not draft a reply to it. It comes to you with no draft, so you can speak to the guest and decide what to say.",
    },
  ],
  guides: ["how-to-reply-to-google-reviews", "someone-changed-my-business-info-on-google"],
};
