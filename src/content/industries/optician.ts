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
  categories: {
    primary: "Optician",
    more: ["Optometrist", "Eye care center"],
    note: "Choose the first by what most visits are for, glasses or eye tests, and read the names in your own profile, because they can differ by country.",
  },
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
      "An optician Google Business Profile is where people find the link to book an eye test and your hours. Kabsi checks your website, phone and hours every day, turns a photo of new frames into a post, drafts careful replies that never mention an eye test result, and asks about holiday hours in time. You approve every change.",
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
        text: "Checked every day. When Google shows something else, you choose.",
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
    nearby: { kind: "practice", term: "optician" },
    ai: {
      question: "Which optician in Leeds city centre does children's eye tests on Saturday?",
      answer:
        "Clearsight Opticians in the Victoria Quarter does children's eye tests on Saturdays.",
      sources: ["Clearsight Opticians' Google profile", "Clearsight Opticians' website"],
    },
    related: ["dental-clinic", "pet-grooming"],
    searchText:
      "People search for an eye test, contact lenses or new frames, often with a day in mind. They check the hours, whether the booking link works, and what reviews say about the staff.",
    guide: [
      {
        title: "Booking, hours and the frames on the shelf",
        paras: [
          "The website link on your profile should be the one you want patients to use. Kabsi compares the website, phone and hours on Google with what you confirmed, every day, and asks when they differ.",
          "Frames sell on looks. A photo of the new shelf with one line becomes a post for your yes, and Kabsi checks each photo is sharp and well lit before it reaches Google.",
        ],
      },
      {
        title: "Replies that keep eye health private",
        paras: [
          "An eye test is health care, so a public reply should not mention a result, a prescription or a condition. Kabsi drafts replies that thank the patient and invite them to get in touch through the details on your profile.",
          "You can add anything Kabsi should never say in About your business, and every draft follows it. A hard review comes to you as one that needs more care, so you decide.",
        ],
      },
    ],
  },
  faqs: [
    {
      q: "Will a reply mention someone's prescription?",
      a: "No. Drafts thank the patient and invite them to get in touch, and say nothing about their eyes.",
    },
    {
      q: "Our booking page moved. What happens?",
      a: "Tell Kabsi the new page. When Google shows the old one, Kabsi asks you and puts yours back once you say yes.",
    },
    {
      q: "Can Kabsi post our new frames?",
      a: "Yes, photos you send and approve. Kabsi never writes a price you did not give.",
    },
    {
      q: "Does Kabsi see patient records?",
      a: "No. Kabsi works with your Google profile and its reviews. It does not connect to your practice system.",
    },
    {
      q: "Can our practice manager approve replies?",
      a: "On Pro, yes. You choose who can approve replies and posts, and you still see everything.",
    },
  ],
  guides: ["keep-your-hours-and-details-the-same-everywhere", "how-to-reply-to-google-reviews"],
};
