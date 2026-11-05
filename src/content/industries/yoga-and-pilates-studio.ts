import { MORE_PHOTOS } from "@/components/kabsi/photos-more";
import type { Industry } from "./types";

// Industries 2 (5 Nov 2026, master plan 30.32): the yoga studio page, written for its own trade. Every Google sentence has
// its row in docs/claims/yoga-and-pilates-studio.md; the Kabsi sentences follow knowledge/kabsi-facts.md. Still Point Studio, Abu Dhabi, and
// every person and number here are invented (Example).
export const yogaAndPilatesStudio: Industry = {
  slug: "yoga-and-pilates-studio",
  name: "yoga studio",
  plural: "Yoga and pilates studios",
  finished: true,
  lead: "New classes as posts, your address and hours right on Google and a reply for every review. You approve each one.",
  keyword: "yoga studio",
  example: {
    business: "Still Point Studio",
    city: "Abu Dhabi",
    kind: "studio",
    rival: "Lotus Line Yoga",
    rival2: "Core Room Pilates",
    near: ["By the corniche", "Near the mall"],
  },
  photos: [MORE_PHOTOS.yogaPilatesWide, MORE_PHOTOS.yogaPilatesTall],
  searches: [
    "yoga studio near me",
    "pilates classes",
    "reformer pilates",
    "hot yoga",
    "beginner yoga",
    "prenatal yoga",
  ],
  categories: {
    primary: "Yoga studio",
    more: ["Pilates studio"],
    note: "Choose the first by what most of your classes are, and add the other only if you teach it every week.",
  },
  page: {
    query: "yoga studio Google Business Profile",
    title: "Yoga studio Google Business Profile help | Kabsi",
    description:
      "Kabsi looks after your yoga studio Google Business Profile: address and hours checked daily, new classes as posts, and a reply to every review for your yes.",
    h1: "Your yoga and pilates studio, in balance.",
    mark: "in balance.",
    line: "Kabsi looks after your yoga studio Google Business Profile: new classes as posts, address and hours right, replies ready.",
    card: "New classes as posts, address and hours right.",
    answer:
      "A yoga studio Google Business Profile shows your address, your hours and what is new this week. Kabsi checks your address and hours every day, turns a photo and a line about a new class into a post, drafts a reply to every review that thanks the teacher the student named, and asks about holiday hours in time. You approve each one.",
    watch: {
      business: "Still Point Studio, Abu Dhabi",
      line: "After a move, the old address can stay on Google. Kabsi checks your address and hours every day.",
      fields: ["Address", "Opening hours", "Special hours", "Website", "Main category"],
      what: "Address",
      google: "Your old studio",
      owner: "Your new studio",
      message: "Google still shows your old studio's address. You told me the new one.",
    },
    post: {
      owner: "Reformer pilates for beginners, Tuesdays at 7 pm from next week.",
      quote:
        "Reformer pilates for beginners, every Tuesday at 7 pm from next week. Book your place.",
    },
    jobs: [
      {
        title: "New classes, as posts",
        text: "A photo and the class time become a post for your yes.",
      },
      {
        title: "Address and hours, checked daily",
        text: "When Google shows something else, you choose which stays.",
      },
      {
        title: "Replies that thank the teacher",
        text: "Only when the review names her, and only names on your team list.",
      },
    ],
    nearby: { kind: "studio", term: "yoga studio" },
    ai: {
      question:
        "Which studio in Al Reem Island, Abu Dhabi has beginner reformer pilates in the evening?",
      answer:
        "Still Point Studio on Al Reem Island runs beginner reformer pilates on Tuesdays at 7 pm.",
      sources: ["Still Point Studio's Google profile", "Still Point Studio's website"],
    },
    related: ["gym-and-fitness", "physiotherapy"],
    searchText:
      "People search for the kind of class, reformer pilates, hot yoga or yoga for beginners, then check how close you are, the times, and what students say about the teachers.",
    guide: [
      {
        title: "Classes, times and where you are",
        paras: [
          "A student needs your class times and your address. Keep your weekly hours and your address exact, and set special hours for holidays. Kabsi compares what Google shows with what you confirmed, every day, and asks before each public holiday what you will do.",
          "A new class is news. Send a photo of the room with the day and time, and Kabsi prepares a post for your yes. Posts carry the real dates you gave, never a made up offer.",
        ],
      },
      {
        title: "Teachers and the reviews that name them",
        paras: [
          "A review can name the teacher. Add your team to Kabsi, and a review that names Sara gets a reply that passes the thanks to Sara; a name not on your list is never used.",
          "A review about an injury in class gets no draft: it comes to you marked as needing a little more care, with a short checklist and no draft. Kabsi writes a short, neutral holding reply only if you ask. Kabsi never gives health advice.",
        ],
      },
    ],
  },
  faqs: [
    {
      q: "We moved studio. What does Kabsi do?",
      a: "Tell Kabsi the new address. When Google still shows the old one, Kabsi tells you, and nothing changes without your yes.",
    },
    {
      q: "Can Kabsi post our timetable?",
      a: "Kabsi can post a new class with its day and time, from what you send. Your full timetable stays on your website.",
    },
    {
      q: "What happens with a review about an injury?",
      a: "An injury is a safety matter, so it comes to you marked as needing a little more care, with a short checklist and no draft. Kabsi writes a short, neutral holding reply only if you ask.",
    },
    {
      q: "Will a reply thank the right teacher?",
      a: "Only when the review names them and the name is on your team list. Kabsi never guesses.",
    },
    {
      q: "Does Kabsi work with my booking app?",
      a: "No. Kabsi works only with your Google profile.",
    },
  ],
  guides: ["keep-your-hours-and-details-the-same-everywhere", "how-to-reply-to-google-reviews"],
};
