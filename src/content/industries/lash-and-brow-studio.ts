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
  categories: {
    primary: "Eyelash salon",
    more: ["Beauty salon"],
    note: "Google's category names can differ by country, so read the list in your own profile. Add a second category only for work you really do.",
  },
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
      "A lash and brow studio is judged on close photos and reviews. Kabsi looks after your eyelash salon Google Business Profile: it turns a photo of a fresh set into a post, checks your hours every day, asks about holiday hours five days ahead and drafts a reply to every review, thanking the artist the client named. Nothing goes on Google until you say yes.",
    watch: {
      business: "Flutter Lash Studio, London",
      line: "Late hours matter to clients who work. Kabsi checks the hours Google shows against yours every day.",
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
        text: "A close photo and a line become a post. Kabsi checks the photo is sharp first.",
      },
      {
        title: "Replies that thank the artist",
        text: "Only when the review names her, and only names on your team list.",
      },
      {
        title: "Holiday hours, asked ahead",
        text: "Five days before each bank holiday, Kabsi asks and sets your answer.",
      },
    ],
    nearby: { kind: "studio", term: "eyelash salon" },
    ai: {
      question: "Which lash studio in Islington, London does a lash lift on Saturdays?",
      answer:
        "Flutter Lash Studio on Upper Street does lash lifts and is open on Saturdays until 7 pm.",
      sources: ["Flutter Lash Studio's Google profile", "Flutter Lash Studio's website"],
    },
    related: ["nail-salon", "hair-salon"],
    searchText:
      "People look for the treatment by name, a lash lift or brow lamination, then judge you on close photos and on what clients say about the artist and how long the set lasted.",
    guide: [
      {
        title: "Close photos clients trust",
        paras: [
          "A lash set is judged from a few centimetres away, so close photos on your profile matter. Google asks for photos that are in focus and well lit, without heavy filters, so the lashes on Google look like the lashes in the chair. Kabsi checks each photo before it goes to Google and tells you when one is dark, blurry or too small.",
          "Show the work, not the client: a close crop of the eye and lashes is enough, and ask the client first if you like. A photo you send on WhatsApp with one line becomes a post that names the set and the artist, ready for your yes.",
        ],
      },
      {
        title: "Hours, artists and the reviews that name them",
        paras: [
          "Evening and weekend hours matter to clients who work. Kabsi compares the hours Google shows with the hours you confirmed every day, and asks before each bank holiday what you will do.",
          "A review can name the artist. Add your team to Kabsi, and a review that names Mia gets a reply that passes the thanks to Mia. A review about irritation or a reaction gets no draft: it comes to you marked as needing a little more care, with a short checklist and no draft. Kabsi writes a short, neutral holding reply only if you ask.",
        ],
      },
    ],
  },
  faqs: [
    {
      q: "Will Kabsi post photos of my clients' faces?",
      a: "Only photos you send it, and only after you approve the post. A close crop of the lashes is enough.",
    },
    {
      q: "What does Kabsi do with a review about irritation?",
      a: "A reaction is a safety matter, so it comes to you marked as needing a little more care, with a short checklist and no draft. Kabsi writes a short, neutral holding reply only if you ask.",
    },
    {
      q: "Can Kabsi thank the artist by name?",
      a: "Yes, when the review names her and her name is on your team list. Kabsi never guesses a name.",
    },
    {
      q: "Does Kabsi work with my booking app?",
      a: "No. Kabsi works only with your Google profile. Your booking link stays the one you set.",
    },
    {
      q: "Can my senior artist approve instead of me?",
      a: "On Pro, yes. You choose who can approve replies and posts, and you still see everything.",
    },
  ],
  guides: ["how-to-reply-to-google-reviews", "google-review-link-and-qr-code"],
};
