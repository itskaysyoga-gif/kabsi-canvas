import { MORE_PHOTOS } from "@/components/kabsi/photos-more";
import type { Industry } from "./types";

// Industries 2 (5 Nov 2026, master plan 30.32): the optician page, written for its own trade. Every Google sentence has
// its row in docs/claims/optician.md; the Kabsi sentences follow knowledge/kabsi-facts.md. Clearsight Opticians, Leeds, and
// every person and number here are invented (Example).
export const optician: Industry = {
  slug: "optician",
  name: "optician",
  plural: "Opticians",
  finished: true,
  lead: "Your eye test page and hours right on Google, new frames as posts, and careful replies. You approve each one.",
  keyword: "optician",
  example: {
    business: "Clearsight Opticians",
    city: "Leeds",
    kind: "practice",
    rival: "Frame and Lens",
    rival2: "Northgate Eyecare",
    near: ["By the arcade", "Near the university"],
  },
  photos: [MORE_PHOTOS.opticianWide, MORE_PHOTOS.opticianTall],
  searches: [
    "optician near me",
    "eye test",
    "contact lenses",
    "glasses frames",
    "kids eye test",
    "opticians open saturday",
  ],
  // Industries 3 (master plan 30.33 item 2): the two guide sections are now short cards. Each line keeps a fact of
  // docs/claims/optician.md, whose "Industries 3" section maps it to its row.
  // Industry 1 (R-144): the services this trade lists on Google (Example names, not a full list).
  services: [
    "Eye test",
    "Contact lens fitting",
    "Children's eye test",
    "Glasses repairs",
    "Sunglasses",
    "Varifocals",
    "Frame adjustments",
    "Lens replacement",
  ],
  profile: [
    {
      title: "The link patients book with",
      text: "Website, phone and hours checked against yours daily. Kabsi asks when they differ.",
    },
    {
      title: "Eye tests as a service",
      text: "Google can show each service with a description, an eye test included.",
    },
    {
      title: "What Kabsi never says",
      text: "Add it in About your business; every draft follows it. Hard reviews come to you.",
    },
    {
      title: "Home visits, if you do them",
      text: "A service area shows where you travel; the shop keeps its address.",
    },
  ],
  categories: {
    primary: "Optician",
    more: ["Optometrist", "Eye care center"],
    line: "Choose the first by what most visits are for, glasses or eye tests. Check the names in your own profile; they differ by country.",
  },
  reviews: [
    {
      title: "Eye health stays private",
      text: "Eye tests are health care. Drafts thank patients and ask them to get in touch.",
    },
    {
      title: "Glasses not ready on time",
      text: "One apology and an invitation to contact the practice.",
    },
    {
      title: "A complaint about a result",
      text: "No draft; a checklist comes to you, and you decide.",
    },
  ],
  holidays: [
    {
      title: "Bank holidays in Leeds",
      text: "Kabsi asks five days before each and sets your hours after your yes.",
    },
    {
      title: "A Saturday clinic",
      text: "A Saturday unlike the rest of the week is special hours for that date.",
    },
    {
      title: "Between Christmas and New Year",
      text: "Closed days that week go on Google as special hours.",
    },
  ],
  photoCards: [
    {
      title: "New frames on the shelf",
      text: "A shelf photo and a line become a post for your yes, checked for sharpness.",
    },
    {
      title: "The testing room",
      text: "Equipment tidy and the room empty, in good light.",
    },
    {
      title: "The front of the shop",
      text: "Your sign from the pavement, so a first visit finds you.",
    },
  ],
  posts: [
    {
      title: "New frames in",
      text: "The brand or style, from the photo you send.",
    },
    {
      title: "Eye test slots",
      text: "Days with free test times, as a dated update.",
    },
    {
      title: "Contact lens checks",
      text: "When you offer them, in your own words.",
    },
  ],
  page: {
    query: "optician Google Business Profile",
    title: "Optician Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your optician Google Business Profile: the eye test page and hours checked daily, new frames as posts, careful replies for your yes.",
    h1: "Your optician on Google, in clear focus.",
    mark: "in clear focus.",
    line: "Kabsi looks after your optician Google Business Profile: the eye test link and hours right, new frames as posts.",
    card: "Eye test link right, new frames as posts.",
    answer:
      "Kabsi looks after your optician Google Business Profile: the eye test link and hours checked daily, new frames as posts, careful replies for your yes.",
    watch: {
      business: "Clearsight Opticians, Leeds",
      line: "Your website link is where patients go to book. Kabsi checks it, and your hours, every day.",
      fields: ["Website", "Opening hours", "Phone", "Main category", "Special hours"],
      what: "Website",
      google: "Your old website",
      owner: "Your eye test page",
      message: "Google shows your old website. You told me your eye test page.",
    },
    post: {
      owner: "New acetate frames in tortoiseshell and clear, in today.",
      quote: "New acetate frames are in today, in tortoiseshell and clear. Come and try them on.",
    },
    jobs: [
      {
        title: "The eye test link and hours",
        text: "Read every day; when Google differs, you choose.",
      },
      {
        title: "New frames, as posts",
        text: "A photo of the shelf and a line become a post for your yes.",
      },
      {
        title: "Replies that keep eyes private",
        text: "No result, no prescription, just thanks and an invitation to get in touch.",
      },
    ],
    ai: {
      question: "Which optician in Leeds city centre does children's eye tests on Saturday?",
      answer:
        "Clearsight Opticians in the Victoria Quarter does children's eye tests on Saturdays.",
      sources: ["Clearsight Opticians' Google profile", "Clearsight Opticians' website"],
    },
    related: [
      "dental-clinic",
      "medical-and-aesthetic-clinic",
      "physiotherapy",
      "veterinary-clinic",
      "florist",
      "hair-salon",
    ],
  },
  faqs: [
    {
      q: "Will a reply mention someone's prescription?",
      a: "No, drafts thank the patient and invite them to get in touch, and say nothing about their eyes.",
    },
    {
      q: "Our booking page moved. What happens?",
      a: "Tell Kabsi the new page. When Google shows the old one, Kabsi asks you and puts yours back once you say yes.",
    },
    {
      q: "Can Kabsi post our new frames?",
      a: "Yes, send a photo of the frames; prices appear only if you give them.",
    },
    {
      q: "Where does the review card go at an optician?",
      a: "At the desk when glasses are collected, the same for every patient.",
    },
    {
      q: "Will a reply say someone had an eye test?",
      a: "No, a public reply never confirms that someone is a patient.",
    },
  ],
  guides: [
    "keep-your-hours-and-details-the-same-everywhere",
    "google-posts-for-local-businesses",
    "how-to-reply-to-google-reviews",
  ],
};
