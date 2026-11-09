import { MORE_PHOTOS } from "@/components/kabsi/photos-more";
import type { Industry } from "./types";

// Industries 2 (5 Nov 2026, master plan 30.32): the tattoo studio page, written for its own trade. Every Google sentence has
// its row in docs/claims/tattoo-studio.md; the Kabsi sentences follow knowledge/kabsi-facts.md. Black Lantern Tattoo, Manchester, and
// every person and number here are invented (Example).
export const tattooStudio: Industry = {
  slug: "tattoo-studio",
  name: "tattoo studio",
  plural: "Tattoo studios",
  finished: true,
  lead: "Healed work as posts, your house rules right on Google and a calm reply for every review. You approve each one.",
  keyword: "tattoo shop",
  example: {
    business: "Black Lantern Tattoo",
    city: "Manchester",
    kind: "studio",
    rival: "Ink Harbour",
    rival2: "Northline Tattoo",
    near: ["By the market", "Near the canal"],
  },
  photos: [MORE_PHOTOS.tattooWide, MORE_PHOTOS.tattooTall],
  searches: [
    "tattoo shop near me",
    "tattoo artist",
    "fine line tattoo",
    "cover up tattoo",
    "walk in tattoo",
    "tattoo studio",
  ],
  // Industries 3 (master plan 30.33 item 2): every block is a short card. Each line keeps a fact of
  // docs/claims/tattoo-studio.md, whose "Industries 3" section maps it to its row.
  // Industry 1 (R-144): the services this trade lists on Google (Example names, not a full list).
  services: [
    "Custom design",
    "Flash tattoos",
    "Cover ups",
    "Fine line",
    "Blackwork",
    "Touch ups",
    "Tattoo consultation",
  ],
  profile: [
    {
      title: "Say how people book",
      text: "By appointment only? Say so in your description. Kabsi checks it every day.",
    },
    {
      title: "Styles as services",
      text: "Fine line, blackwork, cover ups: each can be a service on Google.",
    },
    {
      title: "Your age rule, written down",
      text: "Put your minimum age policy in the description, in your words.",
    },
    {
      title: "Deposits, stated once",
      text: "If you take a deposit, say how it works in your description.",
    },
  ],
  categories: {
    primary: "Tattoo shop",
    more: ["Tattoo artist", "Body piercing shop"],
    line: "Choose the first by most of your work; add body piercing only if you do it. Names can differ by country.",
  },
  reviews: [
    {
      title: "Thanks passed to the artist",
      text: "A review that names Leo thanks Leo, if he is on your team list.",
    },
    {
      title: "A review about an infection",
      text: "An infection is a safety matter: no draft, a checklist for you.",
    },
    {
      title: "A wait past the booked time",
      text: "One apology and nothing promised that it cannot keep.",
    },
  ],
  holidays: [
    {
      title: "Bank holiday weekends",
      text: "Kabsi asks five days before each and sets the hours you choose.",
    },
    {
      title: "A convention weekend away",
      text: "A few days shut is special hours; seven or more, temporarily closed.",
    },
  ],
  photoCards: [
    {
      title: "Photos are your portfolio",
      text: "Fresh and healed shots both help. Kabsi tells you when one is blurry or dark.",
    },
    {
      title: "Healed, a month on",
      text: "A healed photo shows how the lines settled.",
    },
    {
      title: "The studio, clean",
      text: "Stations wiped down and ready, in bright light.",
    },
  ],
  posts: [
    {
      title: "Flash day",
      text: "The date, the designs and whether it is walk in.",
    },
    {
      title: "A guest artist",
      text: "Their name and the dates they are in.",
    },
    {
      title: "Books open",
      text: "Which month an artist takes new bookings.",
    },
  ],
  page: {
    query: "tattoo shop Google Business Profile",
    title: "Tattoo shop Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your tattoo shop Google Business Profile: house rules right, healed work as posts, and a calm reply to every review for your yes.",
    h1: "Your tattoo studio on Google, inked right.",
    mark: "inked right.",
    line: "Kabsi looks after your tattoo shop Google Business Profile: house rules right, healed work as posts, calm replies.",
    card: "House rules right, healed work as posts.",
    answer:
      "A tattoo shop Google Business Profile should say how to book. Kabsi checks your description daily and prepares healed work posts and replies.",
    watch: {
      business: "Black Lantern Tattoo, Manchester",
      line: "Walk-in or by appointment: your description says which. Kabsi watches it, and your hours, every day.",
      fields: ["Description", "Opening hours", "Website", "Phone", "Main category"],
      what: "Description",
      google: "Walk-ins every day",
      owner: "Appointments only",
      message: "Google's description says walk-ins every day. You told me appointments only.",
    },
    post: {
      owner: "Healed fine line botanical by Leo, 3 weeks on. His books open on the 1st.",
      quote: "Healed fine line botanical by Leo, three weeks on. Leo's books open on the 1st.",
    },
    jobs: [
      {
        title: "Healed work, as posts",
        text: "A photo and a line become a post that names the artist.",
      },
      {
        title: "House rules in your description, kept right",
        text: "Kabsi checks your description and hours every day, and asks before anything changes.",
      },
      {
        title: "Care with hard reviews",
        text: "A review about an infection gets no draft and a short checklist, so you decide.",
      },
    ],
    ai: {
      question: "Which tattoo studio in the Northern Quarter, Manchester does fine line work?",
      answer:
        "Black Lantern Tattoo in the Northern Quarter does fine line work, by appointment only.",
      sources: ["Black Lantern Tattoo's Google profile", "Black Lantern Tattoo's website"],
    },
    related: [
      "barbershop",
      "lash-and-brow-studio",
      "nail-salon",
      "hair-salon",
      "medical-and-aesthetic-clinic",
      "spa-and-massage",
    ],
  },
  faqs: [
    {
      q: "Can Kabsi say we only work by appointment?",
      a: "Yes, write it in your description and posts. Kabsi checks the description every day and tells you when Google shows something else.",
    },
    {
      q: "What happens with a review about an infection?",
      a: "That is a safety matter: no draft, a checklist, and a holding reply only when you ask.",
    },
    {
      q: "Will a reply name the right artist?",
      a: "Only if the review names them and they are on your team list; no guessing.",
    },
    {
      q: "Can Kabsi post photos of fresh tattoos?",
      a: "Yes, once you send them. Blurry or dark shots are flagged before anything is drafted.",
    },
    {
      q: "Does Kabsi post on Instagram too?",
      a: "No, Kabsi posts on Google only; your Instagram stays yours.",
    },
  ],
  guides: [
    "photos-for-google-business-profile",
    "google-business-description-examples",
    "how-to-respond-to-negative-google-reviews",
  ],
};
