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
  lead: "Healed work as posts, your booking rules right on Google and a calm reply for every review. You approve each one.",
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
  categories: {
    primary: "Tattoo shop",
    more: ["Tattoo artist", "Body piercing shop"],
    note: "Choose the first by what most of your work is, and add body piercing only if you do it. Read the names in your own profile, because they can differ by country.",
  },
  page: {
    query: "tattoo shop Google Business Profile",
    title: "Tattoo shop Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your tattoo shop Google Business Profile: booking rules right, healed work as posts, and a calm reply to every review for your yes.",
    h1: "Your tattoo studio on Google, inked right.",
    mark: "inked right.",
    line: "Kabsi looks after your tattoo shop Google Business Profile: booking rules right, healed work as posts, calm replies.",
    card: "Booking rules right, healed work as posts.",
    answer:
      "A tattoo shop Google Business Profile should show the work and say how to book. Kabsi turns a photo of healed work into a post that names the artist, checks your description and hours every day, drafts a reply to every review, and asks about holiday hours in time. You approve each one.",
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
        title: "Booking rules, kept right",
        text: "Kabsi checks your description and hours every day, and asks before anything changes.",
      },
      {
        title: "Care with hard reviews",
        text: "A review about an infection gets no draft and a short checklist, so you decide.",
      },
    ],
    nearby: { kind: "studio", term: "tattoo shop" },
    ai: {
      question: "Which tattoo studio in the Northern Quarter, Manchester does fine line work?",
      answer:
        "Black Lantern Tattoo in the Northern Quarter does fine line work, by appointment only.",
      sources: ["Black Lantern Tattoo's Google profile", "Black Lantern Tattoo's website"],
    },
    related: ["barbershop", "lash-and-brow-studio"],
    searchText:
      "People search for a style first, fine line, cover up or a walk in, then look through the photos and read how the artist handled the client and the healing.",
    guide: [
      {
        title: "The portfolio and the booking rules",
        paras: [
          "Your photos are your portfolio on Google. Fresh and healed shots both help, and a post can say which artist did the piece and when their books open. Kabsi checks each photo before it goes to Google and tells you when one is dark, blurry or too small.",
          "Say how people book. If you work by appointment only, your description and your posts should say so, so nobody turns up at the door for a walk in. Kabsi compares the description and hours Google shows with what you confirmed, every day, and asks you when they differ.",
        ],
      },
      {
        title: "Reviews about the artist and the healing",
        paras: [
          "A review can name the artist. Add your team to Kabsi, and a review that names Leo gets a reply that passes the thanks to Leo; a name not on your list is never used.",
          "A review about an infection or another safety problem gets no draft: it comes to you marked as needing a little more care, with a short checklist and no draft. Kabsi writes a short, neutral holding reply only if you ask. Kabsi never gives medical advice.",
        ],
      },
    ],
  },
  faqs: [
    {
      q: "Can Kabsi say we only work by appointment?",
      a: "Yes. Write it in your description on Google and in your posts; Kabsi checks the description every day and tells you when Google shows something else.",
    },
    {
      q: "What happens with a review about an infection?",
      a: "An infection is a safety matter, so it comes to you marked as needing a little more care, with a short checklist and no draft. Kabsi writes a short, neutral holding reply only if you ask.",
    },
    {
      q: "Will a reply name the right artist?",
      a: "Only when the review names them and the name is on your team list. Kabsi never guesses.",
    },
    {
      q: "Can Kabsi post photos of fresh tattoos?",
      a: "Yes, photos you send and approve. Kabsi checks each one is sharp and well lit first.",
    },
    {
      q: "Does Kabsi post on Instagram too?",
      a: "No. Kabsi works only with your Google profile.",
    },
  ],
  guides: ["how-to-reply-to-google-reviews", "how-to-respond-to-negative-google-reviews"],
};
