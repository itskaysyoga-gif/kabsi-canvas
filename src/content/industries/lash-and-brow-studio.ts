import { MORE_PHOTOS } from "@/components/kabsi/photos-more";
import type { Industry } from "./types";

// Industries 2 (5 Nov 2026, master plan 30.32): the lash studio page, written for its own trade. Every Google sentence has
// its row in docs/claims/lash-and-brow-studio.md; the Kabsi sentences follow knowledge/kabsi-facts.md. Flutter Lash Studio, London, and
// every person and number here are invented (Example).
export const lashAndBrowStudio: Industry = {
  slug: "lash-and-brow-studio",
  name: "lash studio",
  plural: "Lash and brow studios",
  finished: true,
  lead: "New sets as posts, your hours right, holiday hours asked in time and a reply for every review. You approve each one.",
  keyword: "eyelash salon",
  example: {
    business: "Flutter Lash Studio",
    city: "London",
    kind: "studio",
    rival: "Halo Lash Room",
    rival2: "Arch Studio",
    near: ["By the high street", "Near the station"],
  },
  photos: [MORE_PHOTOS.lashBrowWide, MORE_PHOTOS.lashBrowTall],
  searches: [
    "eyelash extensions near me",
    "lash lift",
    "brow lamination",
    "eyebrow threading",
    "lash salon",
    "brow tint near me",
  ],
  // Industries 3 (master plan 30.33 item 2): the two old guide sections as short cards. Each line keeps a fact of
  // docs/claims/lash-and-brow-studio.md, whose "Industries 3" section maps it to its row.
  // Industry 1 (R-144): the services this trade lists on Google (Example names, not a full list).
  services: [
    "Classic lash extensions",
    "Hybrid lashes",
    "Volume lashes",
    "Lash lift",
    "Brow lamination",
    "Brow tint",
    "Brow threading",
    "Lash removal",
  ],
  profile: [
    {
      title: "Brows as their own services",
      text: "Lamination, tint and threading each get a line and a price.",
    },
    {
      title: "Every set and lift listed",
      text: "Classic, hybrid, volume, lifts and lamination, each as its own service.",
    },
    {
      title: "A price on each service",
      text: "Keep the price out of a custom service name; Google rejects that.",
    },
    {
      title: "The booking link, checked",
      text: "Clients book from your profile, so test the link after any change.",
    },
  ],
  categories: {
    primary: "Eyelash salon",
    more: ["Beauty salon"],
    line: "Eyelash salon first when lashes are most of the work. Labels vary by country, so check your own box.",
  },
  reviews: [
    {
      title: "The artist, by name",
      text: "Thanks reach her when the review names her and she is on your list.",
    },
    {
      title: "A set that shed fast",
      text: "A calm draft inviting the client back in touch, with no blame.",
    },
    {
      title: "Irritation or swelling",
      text: "No draft for a health complaint; Kabsi sends a checklist instead.",
    },
  ],
  holidays: [
    {
      title: "Before weddings and parties",
      text: "Saturdays fill early, so a dated post names the free slots.",
    },
    {
      title: "England's bank holidays",
      text: "Asked five days ahead; your answer goes on Google after your yes.",
    },
    {
      title: "Christmas party season",
      text: "December Saturdays book up, so post the dates still free.",
    },
  ],
  photoCards: [
    {
      title: "Close photos clients trust",
      text: "Sharp lashes in soft daylight. Kabsi flags a dark or blurry close up.",
    },
    {
      title: "The work, not the client",
      text: "A close crop of the lashes is enough; ask the client first if you like.",
    },
    {
      title: "Brows in two photos",
      text: "The same angle and light before and after, with the client's yes.",
    },
  ],
  posts: [
    {
      title: "A new lift or tint",
      text: "What it is, how long it takes and how to book.",
    },
    {
      title: "Gaps in this week's diary",
      text: "A dated update for the free slots, in your own words.",
    },
    {
      title: "Your patch test rule",
      text: "When clients need one, said the way your studio says it.",
    },
  ],
  page: {
    query: "eyelash salon Google Business Profile",
    title: "Eyelash salon Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your eyelash salon Google Business Profile: new sets as posts, hours checked daily, holiday hours asked, a reply to every review.",
    h1: "Your lash and brow studio, looking its best.",
    mark: "looking its best.",
    line: "Kabsi looks after your eyelash salon Google Business Profile: new sets as posts, exact hours, replies for your yes.",
    card: "Fresh sets as posts, hours kept exact.",
    answer:
      "For an eyelash salon Google Business Profile, Kabsi turns fresh sets into posts, checks your hours daily and prepares review replies, all for your yes.",
    watch: {
      business: "Flutter Lash Studio, London",
      line: "Late hours matter to clients who work, and Kabsi compares your hours with Google's every day.",
      fields: ["Opening hours", "Special hours", "Website", "Phone", "Main category"],
      what: "Saturday",
      google: "10:00 to 16:00",
      owner: "09:00 to 19:00",
      message: "Google shows Saturday 10:00 to 16:00. You told me 09:00 to 19:00.",
    },
    post: {
      owner: "Wispy hybrid set from this morning. Mia has Thursday slots.",
      quote: "A wispy hybrid set by Mia. She has slots this Thursday, book online.",
    },
    jobs: [
      {
        title: "Fresh sets, as posts",
        text: "A close photo and a line become a post. Kabsi checks it is sharp.",
      },
      {
        title: "Replies that thank the artist",
        text: "Only when the review names her, and only names on your team list.",
      },
      {
        title: "Bank holiday hours, set early",
        text: "Five days before each bank holiday, Kabsi asks and sets your answer.",
      },
    ],
    ai: {
      question: "Which lash studio in Islington, London does a lash lift on Saturdays?",
      answer:
        "Flutter Lash Studio on Upper Street does lash lifts and is open on Saturdays until 7 pm.",
      sources: ["Flutter Lash Studio's Google profile", "Flutter Lash Studio's website"],
    },
    related: [
      "nail-salon",
      "hair-salon",
      "spa-and-massage",
      "medical-and-aesthetic-clinic",
      "barbershop",
      "tattoo-studio",
    ],
  },
  faqs: [
    {
      q: "Will Kabsi post photos of my clients' faces?",
      a: "Only the photos you choose to send, once you approve the post; a close crop of the lashes is enough.",
    },
    {
      q: "What does Kabsi do with a review about irritation?",
      a: "You see it before anyone else, with a checklist and no draft. A short holding reply is written only on request.",
    },
    {
      q: "Can Kabsi thank the artist by name?",
      a: "Yes, when the review names her and her name is on your team list. Kabsi never guesses a name.",
    },
    {
      q: "Can Kabsi connect to my lash booking app?",
      a: "No, Kabsi looks after the studio's Google profile, and your booking link stays the one you set.",
    },
    {
      q: "Can a post say how long lashes last?",
      a: "Only what you tell Kabsi, in your words. It adds no promise of its own.",
    },
  ],
  guides: [
    "photos-for-google-business-profile",
    "how-to-respond-to-negative-google-reviews",
    "how-to-set-holiday-hours-on-google",
  ],
};
