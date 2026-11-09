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
  profile: [
    {
      title: "Photos are your portfolio",
      text: "Fresh and healed shots both help. Kabsi tells you when one is blurry or dark.",
    },
    {
      title: "Say how people book",
      text: "By appointment only? Say so in your description. Kabsi checks it every day.",
    },
    {
      title: "Thanks passed to the artist",
      text: "A review that names Leo thanks Leo, if he is on your team list.",
    },
    {
      title: "A review about an infection",
      text: "No draft, a short checklist, and a neutral holding reply only if you ask.",
    },
  ],
  categories: {
    primary: "Tattoo shop",
    more: ["Tattoo artist", "Body piercing shop"],
    line: "Choose the first by most of your work; add body piercing only if you do it. Names can differ by country.",
  },
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
    nearby: { kind: "studio", term: "tattoo shop" },
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
      a: "Yes. Write it in your description and posts. Kabsi checks the description every day and tells you when Google shows something else.",
    },
    {
      q: "What happens with a review about an infection?",
      a: "An infection is a safety matter: no draft and a short checklist. Kabsi writes a neutral holding reply only if you ask.",
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
  guides: [
    "photos-for-google-business-profile",
    "google-business-description-examples",
    "how-to-respond-to-negative-google-reviews",
  ],
};
