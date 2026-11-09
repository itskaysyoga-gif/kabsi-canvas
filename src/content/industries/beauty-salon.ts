import { MORE_PHOTOS } from "@/components/kabsi/photos-more";
import type { Industry } from "./types";

// Site 2 (5 Nov 2026, master plan 30.34 item 4): the beauty salon page, the 21st industry, on the Industries 3 template and
// written for its own trade. Every Google sentence has its row in docs/claims/beauty-salon.md; the Kabsi sentences follow
// knowledge/kabsi-facts.md. Amber Glow Beauty, Dubai, and every person and number here are invented (Example).
export const beautySalon: Industry = {
  slug: "beauty-salon",
  name: "beauty salon",
  plural: "Beauty salons",
  finished: true,
  lead: "Facials, makeup and waxing shown as posts, opening times watched, and calm answers to reviews. Nothing goes up without your say.",
  keyword: "beauty salon",
  example: {
    business: "Amber Glow Beauty",
    city: "Dubai",
    kind: "salon",
    rival: "Luna Beauty Lounge",
    rival2: "Pearl Room",
    near: ["By the mall", "Near the metro"],
  },
  photos: [MORE_PHOTOS.beautySalonWide, MORE_PHOTOS.beautySalonTall],
  focus: "50% 35%",
  searches: [
    "beauty salon near me",
    "makeup artist near me",
    "facial near me",
    "waxing near me",
    "eyebrow threading near me",
    "bridal makeup",
  ],
  profile: [
    {
      title: "One menu, many treatments",
      text: "Facials, waxing, makeup and brows: list what you do, so searches find it.",
    },
    {
      title: "Hours checked every day",
      text: "Kabsi compares the hours Google shows with yours, daily.",
    },
    {
      title: "Photos of the work",
      text: "In focus and well lit. Kabsi checks each photo before it goes up.",
    },
  ],
  reviews: [
    {
      title: "Praise for the therapist",
      text: "The reply passes the thanks on, using only names on your team list.",
    },
    {
      title: "A wait or a late start",
      text: "One apology, no promise it cannot keep, and a way to reach you.",
    },
    {
      title: "A reaction after a treatment",
      text: "No draft: a short checklist, and a neutral holding reply only if you ask.",
    },
  ],
  categories: {
    primary: "Beauty salon",
    more: ["Eyelash salon", "Nail salon", "Day spa"],
    line: "Category names can differ by country, so check the list in your own profile. Add one only for work you do.",
  },
  holidays: [
    {
      title: "Wedding season",
      text: "Bridal slots fill early. A dated post says when you have room.",
    },
    {
      title: "Eid and National Day",
      text: "Busy days for makeup. Kabsi asks your special hours before each one.",
    },
  ],
  photoCards: [
    {
      title: "Before a big day",
      text: "Bridal or party makeup as a post, with the client's yes first.",
    },
    {
      title: "The room, ready",
      text: "Chair, mirror and lights, no client. Kabsi checks focus and light.",
    },
  ],
  page: {
    query: "beauty salon Google Business Profile",
    title: "Beauty salon Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your beauty salon Google Business Profile: treatments as posts, hours checked daily, review replies prepared, all for your yes.",
    h1: "Your beauty salon, ready for its close up.",
    mark: "ready for its close up.",
    line: "Your beauty salon Google Business Profile, cared for: treatment posts, true opening times, and review answers you sign off.",
    card: "Makeup, facials and waxing as posts.",
    answer:
      "For a beauty salon Google Business Profile, Kabsi turns treatments into posts, checks your hours daily and prepares review replies, all for your yes.",
    watch: {
      business: "Amber Glow Beauty, Dubai",
      line: "Clients book around work. Kabsi checks the hours Google shows against yours every day.",
      fields: ["Opening hours", "Special hours", "Phone", "Website", "Main category"],
      what: "Friday",
      google: "10:00 to 18:00",
      owner: "10:00 to 22:00",
      message: "Google shows Friday 10:00 to 18:00. You told me 10:00 to 22:00.",
    },
    post: {
      owner: "Soft glam for a bride this morning. Noor has Saturday slots.",
      quote: "Soft glam makeup by Noor. She has slots this Saturday, book online.",
    },
    jobs: [
      {
        title: "Treatments, as posts",
        text: "A photo and a line become a post. Kabsi checks the photo first.",
      },
      {
        title: "Replies that thank the team",
        text: "Only when the review names someone on your team list.",
      },
      {
        title: "Holiday hours, asked ahead",
        text: "Before each public holiday, Kabsi asks your hours and sets your answer.",
      },
    ],
    nearby: { kind: "salon", term: "beauty salon" },
    ai: {
      question: "Which beauty salon in Dubai Marina does bridal makeup on Fridays?",
      answer:
        "Amber Glow Beauty in Dubai Marina offers bridal makeup and is open on Fridays until 10 pm.",
      sources: ["Amber Glow Beauty's Google profile", "Amber Glow Beauty's website"],
    },
    related: [
      "nail-salon",
      "lash-and-brow-studio",
      "hair-salon",
      "spa-and-massage",
      "medical-and-aesthetic-clinic",
      "barbershop",
    ],
  },
  faqs: [
    {
      q: "Will Kabsi post photos of my clients?",
      a: "Only photos you send, and only after you approve the post. Ask the client first.",
    },
    {
      q: "What happens with a review about a skin reaction?",
      a: "It comes to you with no draft and a short checklist. Kabsi writes a neutral holding reply only if you ask.",
    },
    {
      q: "A client praised our makeup artist. Will the reply mention her?",
      a: "If the client named her and she is on your team list, the draft passes the thanks to her.",
    },
    {
      q: "Can Kabsi take bookings for my treatments?",
      a: "No. Clients still book the way they do today; Kabsi only looks after your Google profile.",
    },
    {
      q: "We also do nails and lashes. Which category comes first?",
      a: "The one that describes most of your work, usually Beauty salon. Add the others only if you offer them.",
    },
  ],
  guides: [
    "photos-for-google-business-profile",
    "how-to-reply-to-google-reviews",
    "choose-google-business-profile-categories",
  ],
};
