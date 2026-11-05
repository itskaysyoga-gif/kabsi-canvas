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
  profile: [
    {
      title: "The link patients book with",
      text: "Website, phone and hours checked against yours daily. Kabsi asks when they differ.",
    },
    {
      title: "New frames on the shelf",
      text: "A shelf photo and a line become a post for your yes, checked for sharpness.",
    },
    {
      title: "Eye health stays private",
      text: "Eye tests are health care. Drafts thank the patient and ask them to get in touch.",
    },
    {
      title: "What Kabsi never says",
      text: "Add it in About your business; every draft follows it. Hard reviews come to you.",
    },
  ],
  categories: {
    primary: "Optician",
    more: ["Optometrist", "Eye care center"],
    line: "Choose the first by what most visits are for, glasses or eye tests. Check the names in your own profile; they differ by country.",
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
  guides: [
    "keep-your-hours-and-details-the-same-everywhere",
    "google-posts-for-local-businesses",
    "how-to-reply-to-google-reviews",
  ],
};
